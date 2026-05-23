# Shared Workspace Collaboration

ABF Capacity Calculator v1.18.0 introduces **shared workspaces** so two or more Google accounts can collaborate on the same Products / Forecasts / Capacity Plans / BP Targets / Parameters dataset, while every existing single-user dataset keeps working untouched.

This doc is the source of truth for the workspace data model, role rules, Firestore paths, migration story, and security rules.

---

## 1. Why colleagues couldn't see each other's data before v1.18

Before v1.18 every read and write was scoped under:

```
users/{uid}/projects/{projectId}/...
```

A different Google account has a different `uid`, so each user was reading their own private subtree. v1.18 keeps that path intact for personal data and adds a parallel **shared workspace tree** that members can opt into.

---

## 2. Data model

### 2.1 Personal data (unchanged)

```
users/{uid}/projects/{projectId}/skus/{skuId}
users/{uid}/projects/{projectId}/forecasts/{forecastId}
users/{uid}/projects/{projectId}/capacityPlans/{capacityId}
users/{uid}/projects/{projectId}/parameters/default
users/{uid}/projects/{projectId}/capacityVersions/{versionId}
users/{uid}/projects/{projectId}/skuVersions/{versionId}
```

Default `projectId` is `default`. Nothing changed here: existing v1.17 users see the same data after upgrade.

### 2.2 Shared workspaces (new)

```
workspaces/{workspaceId}
  {
    id, name, ownerId, ownerEmail,
    members: { "<uid>": "owner" | "editor" | "viewer", ... },
    createdAt, updatedAt
  }

workspaces/{workspaceId}/projects/{projectId}/skus/{skuId}
workspaces/{workspaceId}/projects/{projectId}/forecasts/{forecastId}
workspaces/{workspaceId}/projects/{projectId}/capacityPlans/{capacityId}
workspaces/{workspaceId}/projects/{projectId}/parameters/default
workspaces/{workspaceId}/projects/{projectId}/capacityVersions/{versionId}
workspaces/{workspaceId}/projects/{projectId}/skuVersions/{versionId}
```

### 2.3 Per-user workspace index (new)

To let a logged-in user list their workspaces without scanning every `workspaces/*` document:

```
userWorkspaces/{uid}/workspaces/{workspaceId}
  {
    workspaceId, workspaceName, role,
    ownerId, defaultProjectId, updatedAt
  }
```

This index is **denormalized**. The `addWorkspaceMember` / `removeWorkspaceMember` operations write both the workspace `members` map and the matching index entry in a single Firestore batch.

---

## 3. Roles

```ts
type WorkspaceRole = 'owner' | 'editor' | 'viewer';
```

| Capability                                | owner | editor | viewer |
|-------------------------------------------|:-----:|:------:|:------:|
| Read business data                        |   ✅   |   ✅    |   ✅    |
| Edit Products / Forecasts / Capacity / Parameters | ✅ | ✅ |   ❌    |
| Load demo data                            |   ✅   |   ✅    |   ❌    |
| Save / restore versions                   |   ✅   |   ✅    |   ❌    |
| Add / remove / re-role members            |   ✅   |   ❌    |   ❌    |
| Transfer ownership                        |   N/A* |        |        |

\* MVP does **not** support owner transfer or owner deletion. Removing the owner is rejected client-side and by `firestore.rules`.

Viewer protections are enforced at three layers:

1. **`services/projectScope.ts → assertCanWrite(scope)`** — every mutating service helper throws before touching Firestore.
2. **Page UI** — `Products`, `Forecasts`, `CapacityPlan`, `Parameters`, `CapacitySpreadsheet`, `ProductsSpreadsheetLab`, and `Dashboard` disable Save / Import / Delete / Demo buttons when `scope.role === 'viewer'` and show a read-only Alert at the top.
3. **`firestore.rules`** — Firestore rejects writes from any user whose membership role is not `owner` or `editor`. This is the authoritative gate; the client-side disables are UX, not security.

---

## 4. Backward compatibility

- **No data is migrated automatically.** Existing personal data stays in `users/{uid}/projects/default`.
- **Default scope after login is Personal.** Users opening v1.18 for the first time see the exact same data as in v1.17.
- **The Workspace switcher** (header, top-right) is the only way to enter a shared workspace.
- **Personal Workspace is always available.** Even after joining shared workspaces, every user can swap back to Personal via the switcher.
- **Active scope is persisted** in `localStorage` under key `abf.activeScope`. If the persisted workspace is no longer in your membership list (e.g., owner removed you), the context silently falls back to Personal.

---

## 5. Migration: "Create Shared Workspace From My Current Data"

When a Personal-mode user wants to share their plan, the **Workspace Settings** panel on the Parameters page exposes a single action:

> **Create Shared Workspace From My Current Data**

What it does (in `workspaceService.createWorkspaceFromPersonalProject`):

1. Reads the user's personal `skus`, `forecasts`, `capacityPlans`, and `parameters/default` into memory **first** (so a read failure aborts before any workspace state is created).
2. Calls `createWorkspace(...)`, which writes the workspace document and the owner index entry as **two sequential client-side writes** (see §5.1 for why this is not a single batch).
3. Writes the SKUs / forecasts / capacity plans into the workspace's collections, batched in chunks of 400 docs (below Firestore's 500-op batch limit).
4. Writes the parameters doc.
5. Switches the React context's active scope to the new workspace.

Properties:

- **It's a copy, not a move.** Personal data is untouched. If the workspace doesn't work out, users can switch back to Personal and the original data is there.
- **No automatic deletion.** Cleanup of personal data is a manual decision.
- **Failure is safe.** If steps 3–5 fail, the user is left with an empty workspace they can delete (no orphaned personal data).

### 5.1 Why workspace creation uses sequential writes (v1.18.1 hardening)

The earlier v1.18.0 implementation created the workspace doc and the owner's `userWorkspaces/{uid}/workspaces/{wid}` index entry in the *same* `writeBatch`. Mock unit tests passed, but in production the Firestore rules engine denied the index-entry write at runtime.

The reason: the index-entry rule needs to confirm the caller owns the target workspace, which involves a `get(workspaces/{wid})`. Same-batch writes are **not** visible to `get()` / `exists()` during rule evaluation, so the rule could not see the just-created workspace doc and denied the index-entry write.

v1.18.1 fixes this by splitting `createWorkspace` into two sequential writes:

1. `setDoc(workspaces/{wid})` — succeeds standalone (the rule for this path only inspects the request payload, not other docs).
2. `setDoc(userWorkspaces/{ownerUid}/workspaces/{wid})` — runs *after* step 1 commits, so the index-entry rule's `get(workspaces/{wid}).ownerId == auth.uid` check sees the committed workspace doc and passes.

The rules also gained a dedicated **owner-bootstrap allow path** for the initial index write: it keys on the workspace's `ownerId` (a single `get`) rather than the members map, so there is no membership chicken-and-egg.

If the second write fails for any reason (network blip, transient permission issue), `createWorkspace` throws a structured error pointing the caller to `repairOwnerIndex(workspaceId, ownerUid)` — an idempotent helper that completes the handshake once the cause is resolved. The workspace doc is left in place; nothing is silently abandoned.

---

## 6. Invite flow (MVP)

The MVP intentionally avoids email-based invites or Cloud Functions:

1. Each user can see their Google UID in the **Workspace Settings** panel (Parameters page) and copy it to clipboard.
2. The colleague sends their UID to the workspace owner (Slack / email / hallway).
3. The owner pastes the UID into **Workspace Settings → Add member by UID**, picks a role (editor / viewer), and clicks Add.
4. The colleague refreshes / re-logs in; the workspace appears in their Workspace switcher.

Why UID and not email:

- Firebase Auth does not expose other users' UIDs by email lookup from the client without admin SDK.
- Email-based invites would require Cloud Functions or another backend — out of scope for v1.18.
- A future v1.19 could add an `invitations/{token}` collection + email magic link.

---

## 7. Service layer

```
frontend/src/services/projectScope.ts      ← path + role helpers (no Firestore)
frontend/src/services/workspaceService.ts  ← workspace doc + member operations
frontend/src/services/skuService.ts        ← (scope, …) signature
frontend/src/services/forecastService.ts   ← (scope, …) signature
frontend/src/services/capacityService.ts   ← (scope, …) signature
frontend/src/services/parameterService.ts  ← (scope, …) signature
frontend/src/services/versionService.ts    ← (scope, …) signature
frontend/src/services/skuVersionService.ts ← (scope, …) signature
frontend/src/services/demoDataService.ts   ← (scope) signature
```

The shape every page-level call now takes:

```ts
const scope = useActiveScope();          // from WorkspaceContext
const skus = await getSKUs(scope);
await saveForecast(scope, forecast);     // throws on viewer scope
```

Path resolution lives in **one** place — `projectScope.ts` — so a future change (e.g. multi-project per workspace) is a one-file edit.

---

## 8. Firestore Security Rules (`firestore.rules`)

Key invariants:

- `users/{uid}/**` — readable / writable only by that user. Unchanged.
- `workspaces/{wid}` doc — readable by any member, writable only by the owner. `ownerId` and `members[ownerId]==='owner'` are pinned on update (no silent ownership transfer or self-demotion).
- `workspaces/{wid}/projects/**` — readable by any member; writable by owner or editor; viewer is read-only.
- `userWorkspaces/{uid}/workspaces/{wid}` — the user owns their index entry; an owner can also write to a member's index entry (this is how invites land). Three allow paths:
  - **Owner bootstrap** — caller is the workspace owner per `workspaces/{wid}.ownerId` and writes their own index entry as `role='owner'`. Used by the second half of `createWorkspace`. Independent of the workspace's `members` map so it works the moment the workspace doc is committed.
  - **Owner inviting member** — caller is the workspace owner, target UID is someone else, and the written role must match `workspaces/{wid}.members[uid]` (no role injection).
  - **Self-repair** — member rewrites their own entry; written role must equal `members[caller]` (no escalation from editor → owner).

See [`firestore.rules`](../firestore.rules) for the full ruleset with inline comments matching the three allow paths above. The verification harness in [`frontend/src/services/firestoreRules.test.ts`](../frontend/src/services/firestoreRules.test.ts) mirrors every rule predicate as TypeScript and asserts the same boolean outcomes for all critical scenarios (owner bootstrap, owner invite, role-escalation block, non-member read-block, viewer write-block, owner-transfer-block).

For full end-to-end validation involving real OAuth UIDs and the actual Firestore rules engine, see [`WORKSPACE_SMOKE_TEST.md`](./WORKSPACE_SMOKE_TEST.md).

Deploying rules:

```bash
firebase use abf-capacity-calculator
firebase deploy --only firestore:rules
```

Compile-check rules without releasing:

```bash
firebase deploy --only firestore:rules --dry-run
```

---

## 9. Known limitations

- **No real-time presence / cursors.** Users see a stale snapshot until they refresh.
- **No optimistic locking.** Two editors saving the same SKU at the same time → last write wins.
- **No email-based invite.** UID copy/paste only.
- **No owner transfer or workspace deletion UI.** The schema supports it; the UI doesn't expose it yet.
- **Single project per workspace.** Multi-project per workspace is allowed by the path shape (`workspaces/{wid}/projects/{projectId}`) but the UI hardcodes `default`.
- **No audit log.** Edits are not stamped with the acting member's UID beyond Firestore's own `updatedAt`.

These are all natural follow-ups for v1.19+ and explicitly out of the MVP scope.

---

## 10. Quick reference for engineers

To touch a Firestore collection from a page:

```ts
import { useActiveScope } from '../context/WorkspaceContext';
import { canEdit } from '../services/projectScope';
import { getSKUs, saveSKU } from '../services/skuService';

const MyPage: React.FC = () => {
  const scope = useActiveScope();
  const writable = canEdit(scope.role);

  // …read works for everyone
  const skus = await getSKUs(scope);

  // …write throws on viewer (also gate the UI)
  if (writable) await saveSKU(scope, draft);
};
```

To add a new collection:

1. Add a helper or directly use `collectionPath(scope, 'newThing')`.
2. Use the scope-aware path in your service.
3. Add `match /workspaces/{wid}/projects/{projectId}/newThing/{docId}` is **already covered** by the existing recursive `{document=**}` rule under `workspaces/{wid}/projects/{projectId}`.

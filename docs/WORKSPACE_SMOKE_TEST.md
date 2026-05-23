# Shared Workspace — Manual Smoke Test

**When to run this:** before every release that touches `firestore.rules`, `workspaceService.ts`, `WorkspaceContext.tsx`, or any of the page-level `scope` wiring.

**Why this exists:** the unit test suite (`firestoreRules.test.ts`, `workspaceService.test.ts`, `firebaseServices.test.ts`) covers logic, but it cannot validate the actual Firestore rules engine, real OAuth-issued UIDs, or the same-batch / sequential-write timing in production. Two human accounts and one browser session per account is the only way to catch the kind of bug v1.18.0 → v1.18.1 fixed.

**Required:** two Google accounts — call them **Account A** (will own the workspace) and **Account B** (will be invited). Use two separate browser profiles or one regular window + one Incognito window so the sessions don't share auth cookies.

---

## Steps

### Phase 1 — Account A creates the shared workspace

1. **Sign in as Account A** on https://abf-capacity-calculator.web.app.
2. Confirm the header shows the **Personal** chip in the Workspace switcher.
3. Confirm a few SKUs / forecasts exist in Personal (load demo data if empty).
4. Open **Parameters** → scroll to **Workspace Settings**.
5. Click **Create Shared Workspace From My Current Data**.
6. Name it `Smoke Test {today's date}` and confirm.

**Expected:** modal closes, the header Workspace switcher now shows the new workspace name with a gold `owner` tag, and Products / Forecasts / Capacity / Dashboard / Results all show data — copied from your Personal scope.

**If this step fails with `PERMISSION_DENIED` on the userWorkspaces index, the v1.18.1 hardening regressed — stop and re-check `firestore.rules` and `workspaceService.createWorkspace`.**

### Phase 2 — Both accounts exchange UIDs

7. **Account A:** copy workspace name to scratchpad. In Parameters → Workspace Settings, note your own UID is shown.
8. **In another browser profile, sign in as Account B.** Confirm header chip says **Personal**.
9. **Account B:** open Parameters → Workspace Settings → click **Copy** beside your Google UID. Send this UID to Account A by whatever channel you use (Slack / email / chat).

### Phase 3 — Account A invites Account B as editor

10. **Account A:** switcher → confirm you're still in the shared workspace (gold owner tag).
11. Parameters → Workspace Settings → **Invite by Google UID**: paste Account B's UID, role = **Editor**, click **Add member**.
12. Confirm the members table now shows Account B with role `editor`.

**Expected:** no permission errors. The members table re-renders with both accounts.

### Phase 4 — Account B sees the invitation

13. **Account B:** refresh the page (or sign out + back in).
14. Open the header Workspace switcher dropdown.

**Expected:** the shared workspace appears in the dropdown with a blue `editor` tag.

15. Click the shared workspace in the dropdown.

**Expected:** header chip swaps to the workspace name + `editor` tag. Products / Forecasts / Capacity show Account A's data.

### Phase 5 — Editor writes succeed and propagate

16. **Account B:** open Products. Add one SKU named `SMOKE-{date}-{your name}`. Save.

**Expected:** save succeeds without permission errors.

17. **Account A:** refresh Products.

**Expected:** the SKU created by Account B appears in the table.

### Phase 6 — Owner demotes the editor to viewer

18. **Account A:** Parameters → Workspace Settings → in the members table, change Account B's role from `Editor` to `Viewer (read-only)`.

**Expected:** success message; the row's role re-renders as `viewer`.

### Phase 7 — Viewer is blocked

19. **Account B:** refresh the page.
20. Confirm the header chip is now `viewer` (gray tag).
21. Open Products / Forecasts / Capacity / Parameters.

**Expected:**
- A blue `Read-only mode` Alert appears at the top of each editable page.
- All Save / Add / Delete / Import / Demo buttons are visibly disabled.
22. (Optional, prove the wire) In the browser devtools console, try a direct write:
    ```js
    // Replace ws-XXX with the shared workspace id (see header dropdown or Workspace Settings)
    const m = await import('firebase/firestore');
    const { db } = await import('/src/firebase/config.ts');
    await m.setDoc(m.doc(db, 'workspaces/ws-XXX/projects/default/skus/forbidden'), { test: true });
    ```

**Expected:** the request fails with `FirebaseError: Missing or insufficient permissions`. That's the Firestore rules layer working — even when someone bypasses the disabled UI buttons, writes from a viewer are rejected at the server.

### Phase 8 — Non-member is blocked

23. Sign Account B out of the shared workspace by clicking **Personal** in the Workspace switcher. Confirm Personal data still loads (Account B's own personal data, completely separate from the shared workspace).
24. Optional: use a third Google account (Account C) that has NEVER been added. Sign in and confirm:
    - The shared workspace does NOT appear in their Workspace switcher.
    - Devtools-direct read of `workspaces/ws-XXX/projects/default/skus` fails with `PERMISSION_DENIED`.

### Phase 9 — Personal data is untouched

25. **Account A:** Workspace switcher → click **Personal**.

**Expected:** chip flips back to Personal, and the Products / Forecasts / Capacity tables show the *original* personal data from before Phase 1 — including absence of any SKUs that Account B created in the shared workspace.

---

## What to capture in the release report

For each step that this checklist asks you to verify, record one of:

- ✅ pass — exactly as expected
- ⚠️ pass-with-warning — works, but unexpected log / cosmetic bug seen (note details)
- ❌ fail — write what happened, copy the console error verbatim

A release is **only ship-ready when steps 6, 11, 14, 16, 17, 21, 22, 24, 25 all pass.** Those nine steps together prove:

1. Sequential workspace creation works (the v1.18.1 fix).
2. Owner-invite handshake is end-to-end working.
3. Member-side reads work after invite.
4. Editor writes propagate to other members.
5. Viewer UI + viewer Firestore rules both block writes (defense in depth).
6. Non-members cannot read.
7. Personal data is untouched by any of the above.

If any of these nine fail, **do not deploy** — revert or hot-fix first.

---

## Tear-down (optional)

After the smoke test you can leave the smoke workspace in place for the next run, or:

- **Account A:** Parameters → Workspace Settings → remove Account B from members table.
- Personal data for both accounts is unaffected by removing members from the shared workspace.
- Deleting the workspace document itself is not yet exposed in the UI (deferred to a future release).

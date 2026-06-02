/**
 * Workspace service — owns workspaces/{wid} + userWorkspaces/{uid}/workspaces/{wid}
 * documents, plus the "create shared workspace from personal data" copy flow.
 *
 * Invite model (MVP):
 *   Owners paste a colleague's Google UID. The service writes both documents,
 *   workspace-doc first then index-doc (see createWorkspace for why this is
 *   sequential, not batched). When the colleague signs in, getUserWorkspaces()
 *   finds the entry and they can switch into the workspace via the header.
 *
 * The copy flow is intentionally **copy, not move**: original personal data is
 * left untouched so users can revert if anything goes wrong.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Workspace, UserWorkspaceRef, WorkspaceRole } from '../types';
import { personalScope, workspaceScope, collectionPath, parametersDocPath } from './projectScope';
import { getSKUs } from './skuService';
import { getForecasts } from './forecastService';
import { getCapacityPlans } from './capacityService';
import { getParameters } from './parameterService';

if (!db) {
  throw new Error('Firestore not initialized. Check your .env configuration.');
}

// ============================================================
// Paths
// ============================================================

function workspaceDocPath(workspaceId: string): string {
  return `workspaces/${workspaceId}`;
}

function userWorkspacesPath(userId: string): string {
  return `userWorkspaces/${userId}/workspaces`;
}

function userWorkspaceDocPath(userId: string, workspaceId: string): string {
  return `userWorkspaces/${userId}/workspaces/${workspaceId}`;
}

// ============================================================
// Reads
// ============================================================

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  const ref = doc(db!, workspaceDocPath(workspaceId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    id: workspaceId,
    name: (data.name as string) ?? 'Untitled Workspace',
    ownerId: (data.ownerId as string) ?? '',
    members: (data.members as Record<string, WorkspaceRole>) ?? {},
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  };
}

export async function getUserWorkspaces(userId: string): Promise<UserWorkspaceRef[]> {
  const q = query(collection(db!, userWorkspacesPath(userId)), orderBy('workspaceName', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      workspaceId: d.id,
      workspaceName: (data.workspaceName as string) ?? d.id,
      role: (data.role as WorkspaceRole) ?? 'viewer',
      ownerId: (data.ownerId as string) ?? '',
      defaultProjectId: (data.defaultProjectId as string) ?? 'default',
      updatedAt: convertTimestamp(data.updatedAt),
    };
  });
}

// ============================================================
// Writes
// ============================================================

/**
 * Create a workspace and the owner's index entry.
 *
 * **Why two sequential writes instead of one batch:**
 * The Firestore rule for `userWorkspaces/{uid}/workspaces/{wid}` needs to confirm
 * the caller is the owner of the target workspace. That check requires a
 * `get(workspaces/{wid})` which sees committed state only — same-batch writes are
 * NOT visible. If we batched both, the index-doc rule would deny the write
 * because the workspace document doesn't exist yet at rule-evaluation time.
 *
 * Step 1 (workspace doc) succeeds standalone (rule: caller is named owner).
 * Step 2 (owner index) then sees a committed workspace doc and passes.
 *
 * If step 2 fails (network, rule mismatch, partial outage), we surface a
 * structured error so the UI can offer a repair path. The workspace doc is
 * left in place — repairOwnerIndex() can finish the handshake later.
 */
export async function createWorkspace(
  ownerId: string,
  ownerEmail: string,
  workspaceName: string,
  defaultProjectId = 'default'
): Promise<string> {
  const workspaceId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = serverTimestamp();

  // Step 1: workspace document. Self-contained — rule only checks request payload.
  await setDoc(doc(db!, workspaceDocPath(workspaceId)), {
    id: workspaceId,
    name: workspaceName,
    ownerId,
    ownerEmail,
    members: { [ownerId]: 'owner' as WorkspaceRole },
    createdAt: now,
    updatedAt: now,
  });

  // Step 2: owner index entry. Rule does `get(workspaces/{wid}).ownerId == auth.uid`,
  // which now sees the committed doc from step 1.
  try {
    await setDoc(doc(db!, userWorkspaceDocPath(ownerId, workspaceId)), {
      workspaceId,
      workspaceName,
      role: 'owner' as WorkspaceRole,
      ownerId,
      defaultProjectId,
      updatedAt: now,
    });
  } catch (err) {
    // Workspace exists but the owner cannot see it in their switcher. Caller
    // can retry with repairOwnerIndex(workspaceId, ownerId, ...) once the
    // transient cause is resolved.
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Workspace ${workspaceId} was created but the owner index could not be written: ${cause}. ` +
      `Call repairOwnerIndex(${workspaceId}) once the cause is fixed.`,
      { cause: err }
    );
  }

  return workspaceId;
}

/**
 * Re-create the owner index entry for a workspace whose initial handshake
 * partially failed (or whose index was deleted out-of-band).
 *
 * Safe to call multiple times: it is an idempotent `setDoc`.
 * Rule still gates this on the workspace doc saying `ownerId == auth.uid`.
 */
export async function repairOwnerIndex(
  workspaceId: string,
  ownerId: string,
  defaultProjectId = 'default'
): Promise<void> {
  const wsRef = doc(db!, workspaceDocPath(workspaceId));
  const wsSnap = await getDoc(wsRef);
  if (!wsSnap.exists()) {
    throw new Error(`Workspace ${workspaceId} does not exist; nothing to repair.`);
  }
  const data = wsSnap.data() as Record<string, unknown>;
  if (data.ownerId !== ownerId) {
    throw new Error(`Workspace ${workspaceId} owner is not ${ownerId}; refusing to repair index.`);
  }
  await setDoc(doc(db!, userWorkspaceDocPath(ownerId, workspaceId)), {
    workspaceId,
    workspaceName: (data.name as string) ?? workspaceId,
    role: 'owner' as WorkspaceRole,
    ownerId,
    defaultProjectId,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Copy a user's existing personal-project data into a brand-new shared workspace.
 * Does NOT delete the personal data. Failure leaves personal data intact.
 */
export async function createWorkspaceFromPersonalProject(
  ownerId: string,
  ownerEmail: string,
  workspaceName: string,
  options: { projectId?: string } = {}
): Promise<string> {
  const projectId = options.projectId ?? 'default';
  const personal = personalScope(ownerId, projectId);

  // Pull source data FIRST. If reads fail, abort before any workspace writes.
  const [skus, forecasts, capacityPlans, params] = await Promise.all([
    getSKUs(personal),
    getForecasts(personal),
    getCapacityPlans(personal),
    getParameters(personal),
  ]);

  // Filter orphan forecasts: only copy forecasts whose skuId exists in the skus set.
  // This prevents propagating orphan data into the new workspace.
  const skuIdSet = new Set(skus.map(s => s.id));
  const validForecasts = forecasts.filter(f => skuIdSet.has(f.skuId));
  const orphanCount = forecasts.length - validForecasts.length;
  if (orphanCount > 0) {
    console.warn(`[workspace copy] Filtered ${orphanCount} orphan forecast(s) from source workspace.`);
  }

  // Create workspace shell + owner membership entry (two sequential writes;
  // see createWorkspace docstring for why this can't be a single batch).
  const workspaceId = await createWorkspace(ownerId, ownerEmail, workspaceName, projectId);
  const wsScope = workspaceScope(ownerId, workspaceId, 'owner', projectId);

  // Copy collections. Use batch chunks of ≤ 400 to stay under Firestore's 500-op limit.
  await copyDocuments(skus, wsScope, 'skus');
  await copyDocuments(validForecasts, wsScope, 'forecasts');
  await copyDocuments(capacityPlans, wsScope, 'capacityPlans');

  // Single parameters doc.
  await setDoc(doc(db!, parametersDocPath(wsScope)), { ...params, updatedAt: new Date() });

  return workspaceId;
}

async function copyDocuments<T extends { id: string }>(
  rows: T[],
  scope: ReturnType<typeof workspaceScope>,
  collectionName: string
): Promise<void> {
  if (rows.length === 0) return;
  const CHUNK = 400;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = writeBatch(db!);
    for (const row of rows.slice(i, i + CHUNK)) {
      const ref = doc(db!, `${collectionPath(scope, collectionName)}/${row.id}`);
      batch.set(ref, { ...row, updatedAt: new Date() });
    }
    await batch.commit();
  }
}

// ============================================================
// Membership management
//
// These mutate an existing workspace, so the workspace doc is already
// committed and the dependent rule `get(workspaces/{wid}).ownerId == auth.uid`
// works inside a single batch.
// ============================================================

export async function addWorkspaceMember(
  workspaceId: string,
  memberUid: string,
  role: WorkspaceRole
): Promise<void> {
  if (role === 'owner') {
    throw new Error('Cannot grant owner role through addWorkspaceMember; ownership transfer is a separate flow.');
  }
  const wsRef = doc(db!, workspaceDocPath(workspaceId));
  const wsSnap = await getDoc(wsRef);
  if (!wsSnap.exists()) throw new Error(`Workspace ${workspaceId} does not exist.`);
  const ws = wsSnap.data() as Record<string, unknown>;
  const members = { ...((ws.members as Record<string, WorkspaceRole>) ?? {}), [memberUid]: role };

  // Step 1: update workspace members FIRST and wait for commit.
  // The Firestore rule for userWorkspaces index create does
  //   `get(workspaces/{wid}).members[uid]` — same-batch writes are NOT
  //   visible during rule evaluation, so the index write MUST happen
  //   after the workspace doc is committed.
  await updateDoc(wsRef, { members, updatedAt: serverTimestamp() });

  // Step 2: write invitee index entry. Uses setDoc with merge:true so it
  // can also repair a missing index (e.g. workspace.members already has
  // the UID but the index doc was lost).
  try {
    await setDoc(doc(db!, userWorkspaceDocPath(memberUid, workspaceId)), {
      workspaceId,
      workspaceName: ws.name as string,
      role,
      ownerId: ws.ownerId as string,
      defaultProjectId: 'default',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    // Workspace members was updated but the index write failed.
    // Surface a structured error so the UI can display a friendly message.
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Workspace ${workspaceId} members updated but the index for ${memberUid} could not be written: ${cause}`,
      { cause: err }
    );
  }
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  memberUid: string,
  role: WorkspaceRole
): Promise<void> {
  if (role === 'owner') {
    throw new Error('Cannot grant owner role through updateWorkspaceMemberRole; ownership transfer is a separate flow.');
  }
  const wsRef = doc(db!, workspaceDocPath(workspaceId));
  const wsSnap = await getDoc(wsRef);
  if (!wsSnap.exists()) throw new Error(`Workspace ${workspaceId} does not exist.`);
  const ws = wsSnap.data() as Record<string, unknown>;
  const members = { ...((ws.members as Record<string, WorkspaceRole>) ?? {}) };
  if (!(memberUid in members)) throw new Error(`User ${memberUid} is not a member of this workspace.`);
  if (members[memberUid] === 'owner') throw new Error('Cannot change the owner role through this method.');
  members[memberUid] = role;

  // Step 1: update workspace members role FIRST and wait for commit.
  // Same-batch visibility issue as addWorkspaceMember — the index update
  // rule checks `get(workspaces/{wid}).members[uid]` which must see the
  // committed role change.
  await updateDoc(wsRef, { members, updatedAt: serverTimestamp() });

  // Step 2: update invitee index entry with new role.
  try {
    await setDoc(doc(db!, userWorkspaceDocPath(memberUid, workspaceId)), {
      role,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Workspace ${workspaceId} member role updated but the index for ${memberUid} could not be updated: ${cause}`,
      { cause: err }
    );
  }
}

export async function removeWorkspaceMember(
  workspaceId: string,
  memberUid: string
): Promise<void> {
  const wsRef = doc(db!, workspaceDocPath(workspaceId));
  const wsSnap = await getDoc(wsRef);
  if (!wsSnap.exists()) throw new Error(`Workspace ${workspaceId} does not exist.`);
  const ws = wsSnap.data() as Record<string, unknown>;
  const members = { ...((ws.members as Record<string, WorkspaceRole>) ?? {}) };
  if (members[memberUid] === 'owner') {
    throw new Error('Cannot remove the workspace owner.');
  }
  delete members[memberUid];

  const batch = writeBatch(db!);
  batch.update(wsRef, { members, updatedAt: serverTimestamp() });
  batch.delete(doc(db!, userWorkspaceDocPath(memberUid, workspaceId)));
  await batch.commit();
}

// ============================================================
// Helpers
// ============================================================

function convertTimestamp(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

// Re-export removeWorkspace-as-owner placeholder (unused for MVP)
export async function deleteUserWorkspaceEntry(userId: string, workspaceId: string): Promise<void> {
  await deleteDoc(doc(db!, userWorkspaceDocPath(userId, workspaceId)));
}

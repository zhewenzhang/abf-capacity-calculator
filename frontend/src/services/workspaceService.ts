/**
 * Workspace service — owns workspaces/{wid} + userWorkspaces/{uid}/workspaces/{wid}
 * documents, plus the "create shared workspace from personal data" copy flow.
 *
 * Invite model (MVP):
 *   Owners paste a colleague's Google UID. The service writes two docs in a batch:
 *     1. workspaces/{wid}.members[uid] = role
 *     2. userWorkspaces/{memberUid}/workspaces/{wid} = denormalized index entry
 *   When the colleague signs in, getUserWorkspaces() finds the entry and they
 *   can switch into the workspace via the header selector.
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

export async function createWorkspace(
  ownerId: string,
  ownerEmail: string,
  workspaceName: string,
  defaultProjectId = 'default'
): Promise<string> {
  const workspaceId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const batch = writeBatch(db!);
  const now = serverTimestamp();

  batch.set(doc(db!, workspaceDocPath(workspaceId)), {
    id: workspaceId,
    name: workspaceName,
    ownerId,
    ownerEmail,
    members: { [ownerId]: 'owner' as WorkspaceRole },
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(db!, userWorkspaceDocPath(ownerId, workspaceId)), {
    workspaceId,
    workspaceName,
    role: 'owner' as WorkspaceRole,
    ownerId,
    defaultProjectId,
    updatedAt: now,
  });

  await batch.commit();
  return workspaceId;
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

  // Create workspace shell + owner membership entry.
  const workspaceId = await createWorkspace(ownerId, ownerEmail, workspaceName, projectId);
  const wsScope = workspaceScope(ownerId, workspaceId, 'owner', projectId);

  // Copy collections. Use batch chunks of ≤ 400 to stay under Firestore's 500-op limit.
  await copyDocuments(skus, wsScope, 'skus');
  await copyDocuments(forecasts, wsScope, 'forecasts');
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

  const batch = writeBatch(db!);
  batch.update(wsRef, { members, updatedAt: serverTimestamp() });
  batch.set(doc(db!, userWorkspaceDocPath(memberUid, workspaceId)), {
    workspaceId,
    workspaceName: ws.name as string,
    role,
    ownerId: ws.ownerId as string,
    defaultProjectId: 'default',
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
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

  const batch = writeBatch(db!);
  batch.update(wsRef, { members, updatedAt: serverTimestamp() });
  batch.update(doc(db!, userWorkspaceDocPath(memberUid, workspaceId)), {
    role,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
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

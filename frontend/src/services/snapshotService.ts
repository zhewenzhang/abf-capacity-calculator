/**
 * Snapshot service — manages forecast versioning snapshots.
 *
 * Personal mode  → users/{userId}/projects/{projectId}/snapshots/{snapshotId}
 * Workspace mode → workspaces/{workspaceId}/projects/{projectId}/snapshots/{snapshotId}
 *
 * Permissions:
 * - Viewer: can list and view snapshots, cannot create or delete
 * - Editor: can create snapshots, cannot delete others' snapshots
 * - Owner: can manage all snapshots in workspace
 *
 * Phase 6.2: Added support for optional metadata (kind, periodLabel, reviewStatus, note).
 * Snapshots are immutable — once created, they cannot be updated.
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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { ProjectScope } from '../types';
import type { Snapshot, SnapshotListItem, CreateSnapshotPayload, SnapshotMetadata } from '../types/snapshot';
import { projectRoot, isViewer } from './projectScope';

if (!db) {
  throw new Error('Firestore not initialized. Check your .env configuration.');
}

const APP_VERSION = 'v1.54.0';

/**
 * Get the Firestore collection path for snapshots.
 */
function snapshotsPath(scope: ProjectScope): string {
  return `${projectRoot(scope)}/snapshots`;
}

/**
 * Get a single snapshot document path.
 */
function snapshotDocPath(scope: ProjectScope, snapshotId: string): string {
  return `${snapshotsPath(scope)}/${snapshotId}`;
}

/**
 * Generate a unique snapshot ID.
 */
function generateSnapshotId(): string {
  return `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * List all snapshots for a project.
 */
export async function listSnapshots(scope: ProjectScope): Promise<SnapshotListItem[]> {
  const q = query(collection(db!, snapshotsPath(scope)), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      name: (data.name as string) ?? 'Unnamed Snapshot',
      description: data.description as string | undefined,
      createdAt: convertTimestamp(data.createdAt) ?? new Date(),
      createdBy: (data.createdBy as string) ?? '',
      createdByName: data.createdByName as string | undefined,
      sourceAppVersion: (data.sourceAppVersion as string) ?? '',
      derivedHighlights: data.derivedHighlights as SnapshotListItem['derivedHighlights'],
      // Phase 6.2: Optional metadata with safe fallback
      metadata: data.metadata as SnapshotMetadata | undefined,
    };
  });
}

/**
 * Get a single snapshot by ID.
 */
export async function getSnapshot(scope: ProjectScope, snapshotId: string): Promise<Snapshot | null> {
  const ref = doc(db!, snapshotDocPath(scope, snapshotId));
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    name: (data.name as string) ?? 'Unnamed Snapshot',
    description: data.description as string | undefined,
    createdAt: convertTimestamp(data.createdAt) ?? new Date(),
    createdBy: (data.createdBy as string) ?? '',
    createdByName: data.createdByName as string | undefined,
    sourceAppVersion: (data.sourceAppVersion as string) ?? '',
    scope: (data.scope as 'personal' | 'workspace') ?? 'personal',
    workspaceId: data.workspaceId as string | undefined,
    rawInputs: data.rawInputs as Snapshot['rawInputs'],
    derivedHighlights: data.derivedHighlights as Snapshot['derivedHighlights'],
    // Phase 6.2: Optional metadata with safe fallback
    metadata: data.metadata as SnapshotMetadata | undefined,
  };
}

/**
 * Create a new snapshot.
 * Only editors and owners can create snapshots.
 *
 * IMPORTANT: Snapshots are immutable. Once created, they cannot be updated.
 * If metadata needs to be changed, the snapshot must be deleted and recreated.
 */
export async function createSnapshot(
  scope: ProjectScope,
  userId: string,
  userName: string | undefined,
  payload: CreateSnapshotPayload
): Promise<string> {
  // Permission check
  if (isViewer(scope.role)) {
    throw new Error('Viewers cannot create snapshots.');
  }

  const snapshotId = generateSnapshotId();
  const now = serverTimestamp();

  const snapshotData: Record<string, unknown> = {
    id: snapshotId,
    name: payload.name,
    description: payload.description,
    createdAt: now,
    createdBy: userId,
    createdByName: userName,
    sourceAppVersion: APP_VERSION,
    scope: scope.mode,
    rawInputs: payload.rawInputs,
    derivedHighlights: payload.derivedHighlights,
  };

  // Phase 6.2: Include optional metadata if provided
  if (payload.metadata) {
    snapshotData.metadata = payload.metadata;
  }

  if (scope.mode === 'workspace' && scope.workspaceId) {
    snapshotData.workspaceId = scope.workspaceId;
  }

  await setDoc(doc(db!, snapshotDocPath(scope, snapshotId)), snapshotData);

  return snapshotId;
}

/**
 * Delete a snapshot.
 * - Viewer: cannot delete
 * - Editor: can only delete own snapshots
 * - Owner: can delete any snapshot
 *
 * Note: This is the only way to "modify" a snapshot's metadata —
 * delete and recreate with updated metadata.
 */
export async function deleteSnapshot(
  scope: ProjectScope,
  snapshotId: string,
  createdBy: string
): Promise<void> {
  // Permission check
  if (isViewer(scope.role)) {
    throw new Error('Viewers cannot delete snapshots.');
  }

  // Editor can only delete their own snapshots
  if (scope.role === 'editor' && createdBy !== scope.userId) {
    throw new Error('Editors can only delete their own snapshots.');
  }

  // Owner can delete any snapshot
  await deleteDoc(doc(db!, snapshotDocPath(scope, snapshotId)));
}

/**
 * Check if user can delete a specific snapshot.
 */
export function canDeleteSnapshot(
  role: 'owner' | 'editor' | 'viewer',
  snapshotCreatedBy: string,
  currentUserId: string
): boolean {
  if (role === 'owner') return true;
  if (role === 'editor') return snapshotCreatedBy === currentUserId;
  return false; // viewer
}

/**
 * Helper to convert Firestore timestamp to Date.
 */
function convertTimestamp(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

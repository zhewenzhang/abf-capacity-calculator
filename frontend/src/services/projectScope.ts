/**
 * ProjectScope helpers — single source of truth for Firestore paths.
 *
 * Personal mode  → users/{userId}/projects/{projectId}/{collection}
 * Workspace mode → workspaces/{workspaceId}/projects/{projectId}/{collection}
 *
 * Every page-level service call resolves its collection through these helpers,
 * so adding a new collection or moving paths is a one-place change.
 */
import type { ProjectScope, WorkspaceRole } from '../types';

export function personalScope(userId: string, projectId = 'default'): ProjectScope {
  return { mode: 'personal', userId, projectId, role: 'owner' };
}

export function workspaceScope(
  userId: string,
  workspaceId: string,
  role: WorkspaceRole,
  projectId = 'default'
): ProjectScope {
  return { mode: 'workspace', userId, workspaceId, projectId, role };
}

/**
 * Root path for the active scope's project document. All other collections live below it.
 */
export function projectRoot(scope: ProjectScope): string {
  if (scope.mode === 'workspace') {
    if (!scope.workspaceId) {
      throw new Error('workspaceScope is missing workspaceId');
    }
    return `workspaces/${scope.workspaceId}/projects/${scope.projectId}`;
  }
  return `users/${scope.userId}/projects/${scope.projectId}`;
}

export function collectionPath(scope: ProjectScope, collectionName: string): string {
  return `${projectRoot(scope)}/${collectionName}`;
}

/**
 * Parameters collection holds a single document with id `default`.
 */
export function parametersDocPath(scope: ProjectScope): string {
  return `${projectRoot(scope)}/parameters/default`;
}

// ============================================================
// Role helpers — small + explicit so pages don't reinvent them
// ============================================================

export function isViewer(role: WorkspaceRole): boolean {
  return role === 'viewer';
}

export function canEdit(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'editor';
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return role === 'owner';
}

/**
 * Returns a short, throwable error if the scope cannot write.
 * Pages should call this before mutating to fail fast with a clear reason.
 */
export function assertCanWrite(scope: ProjectScope): void {
  if (!canEdit(scope.role)) {
    throw new Error('You do not have permission to modify data in this workspace (viewer role).');
  }
}

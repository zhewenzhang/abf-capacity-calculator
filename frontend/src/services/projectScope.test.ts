import { describe, expect, it } from 'vitest';
import {
  personalScope,
  workspaceScope,
  projectRoot,
  collectionPath,
  parametersDocPath,
  isViewer,
  canEdit,
  canManageMembers,
  assertCanWrite,
} from './projectScope';

describe('projectScope', () => {
  describe('personal mode', () => {
    const scope = personalScope('user-1');

    it('default projectId is "default"', () => {
      expect(scope.projectId).toBe('default');
      expect(scope.mode).toBe('personal');
      expect(scope.role).toBe('owner');
    });

    it('projectRoot points to users/{uid}/projects/{projectId}', () => {
      expect(projectRoot(scope)).toBe('users/user-1/projects/default');
    });

    it('collectionPath nests the collection under the personal project', () => {
      expect(collectionPath(scope, 'skus')).toBe('users/user-1/projects/default/skus');
      expect(collectionPath(scope, 'forecasts')).toBe('users/user-1/projects/default/forecasts');
      expect(collectionPath(scope, 'capacityPlans')).toBe('users/user-1/projects/default/capacityPlans');
    });

    it('parametersDocPath returns the single-doc path', () => {
      expect(parametersDocPath(scope)).toBe('users/user-1/projects/default/parameters/default');
    });
  });

  describe('workspace mode', () => {
    const scope = workspaceScope('user-1', 'ws-42', 'editor');

    it('uses workspaces/{wid}/projects/{projectId} as root', () => {
      expect(projectRoot(scope)).toBe('workspaces/ws-42/projects/default');
    });

    it('collectionPath nests the collection under the workspace project', () => {
      expect(collectionPath(scope, 'skus')).toBe('workspaces/ws-42/projects/default/skus');
      expect(collectionPath(scope, 'capacityVersions')).toBe('workspaces/ws-42/projects/default/capacityVersions');
    });

    it('parametersDocPath also resolves under the workspace', () => {
      expect(parametersDocPath(scope)).toBe('workspaces/ws-42/projects/default/parameters/default');
    });

    it('throws if workspaceId is missing', () => {
      const broken = { ...scope, workspaceId: undefined };
      expect(() => projectRoot(broken)).toThrow();
    });
  });

  describe('role helpers', () => {
    it('isViewer matches only viewer', () => {
      expect(isViewer('viewer')).toBe(true);
      expect(isViewer('owner')).toBe(false);
      expect(isViewer('editor')).toBe(false);
    });

    it('canEdit allows owner and editor', () => {
      expect(canEdit('owner')).toBe(true);
      expect(canEdit('editor')).toBe(true);
      expect(canEdit('viewer')).toBe(false);
    });

    it('canManageMembers allows only owner', () => {
      expect(canManageMembers('owner')).toBe(true);
      expect(canManageMembers('editor')).toBe(false);
      expect(canManageMembers('viewer')).toBe(false);
    });

    it('assertCanWrite throws for viewer scope and is silent for editor/owner', () => {
      expect(() => assertCanWrite(workspaceScope('u', 'w', 'viewer'))).toThrow(/viewer/);
      expect(() => assertCanWrite(workspaceScope('u', 'w', 'editor'))).not.toThrow();
      expect(() => assertCanWrite(workspaceScope('u', 'w', 'owner'))).not.toThrow();
      // Personal scope defaults to owner → must not throw.
      expect(() => assertCanWrite(personalScope('u'))).not.toThrow();
    });
  });
});

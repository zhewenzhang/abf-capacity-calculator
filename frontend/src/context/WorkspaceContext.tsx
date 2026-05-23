/**
 * WorkspaceContext — single source of truth for "what scope is this session reading/writing"?
 *
 * App-level lifecycle:
 *   1. User signs in → context loads userWorkspaces/{uid}/workspaces.
 *   2. Default scope is Personal (mode='personal'). Never auto-switches to a workspace,
 *      because users coming back from v1.17 expect their personal data on first paint.
 *   3. Header workspace switcher calls setActiveScope() to swap to a workspace.
 *
 * Backward compatibility:
 *   When workspace list is empty (e.g. v1.17 user), the only available scope is Personal,
 *   pointing at users/{uid}/projects/default — identical to the old data path.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { ProjectScope, UserWorkspaceRef, WorkspaceRole } from '../types';
import { personalScope, workspaceScope } from '../services/projectScope';
import {
  getUserWorkspaces,
  createWorkspaceFromPersonalProject,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  getWorkspace,
} from '../services/workspaceService';
import type { Workspace } from '../types';

interface WorkspaceContextValue {
  user: User;
  scope: ProjectScope;
  loading: boolean;
  workspaces: UserWorkspaceRef[];
  /** Persisted preference: which scope to load after auth (key in localStorage). */
  setActiveScope: (scope: ProjectScope) => void;
  switchToPersonal: () => void;
  switchToWorkspace: (workspaceId: string) => void;
  reloadWorkspaces: () => Promise<void>;
  // Workspace operations
  createFromPersonal: (workspaceName: string) => Promise<string>;
  addMember: (workspaceId: string, memberUid: string, role: WorkspaceRole) => Promise<void>;
  updateMemberRole: (workspaceId: string, memberUid: string, role: WorkspaceRole) => Promise<void>;
  removeMember: (workspaceId: string, memberUid: string) => Promise<void>;
  getWorkspaceDetail: (workspaceId: string) => Promise<Workspace | null>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const ACTIVE_SCOPE_STORAGE_KEY = 'abf.activeScope';

interface PersistedScope {
  mode: 'personal' | 'workspace';
  workspaceId?: string;
}

function readPersistedScope(): PersistedScope | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SCOPE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedScope;
    if (parsed.mode !== 'personal' && parsed.mode !== 'workspace') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedScope(scope: ProjectScope): void {
  try {
    const payload: PersistedScope = scope.mode === 'workspace'
      ? { mode: 'workspace', workspaceId: scope.workspaceId }
      : { mode: 'personal' };
    localStorage.setItem(ACTIVE_SCOPE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota errors */
  }
}

export const WorkspaceProvider: React.FC<{ user: User; children: React.ReactNode }> = ({ user, children }) => {
  const [workspaces, setWorkspaces] = useState<UserWorkspaceRef[]>([]);
  const [scope, setScope] = useState<ProjectScope>(() => personalScope(user.uid));
  const [loading, setLoading] = useState(true);

  const reloadWorkspaces = useCallback(async () => {
    const list = await getUserWorkspaces(user.uid);
    setWorkspaces(list);
    return list;
  }, [user.uid]);

  // Initial load — resolve persisted scope against current workspace membership.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await getUserWorkspaces(user.uid);
        if (cancelled) return;
        setWorkspaces(list);

        const persisted = readPersistedScope();
        if (persisted?.mode === 'workspace' && persisted.workspaceId) {
          const match = list.find((w) => w.workspaceId === persisted.workspaceId);
          if (match) {
            setScope(workspaceScope(user.uid, match.workspaceId, match.role, match.defaultProjectId));
            return;
          }
        }
        // Fallback to personal; keep persisted value coherent with reality.
        const next = personalScope(user.uid);
        setScope(next);
        writePersistedScope(next);
      } catch (err) {
        // Surface failures to the console but never block the app — fall back to personal.
        // eslint-disable-next-line no-console
        console.warn('[WorkspaceContext] Failed to load workspaces:', err);
        if (!cancelled) {
          setWorkspaces([]);
          setScope(personalScope(user.uid));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  const setActiveScope = useCallback((next: ProjectScope) => {
    setScope(next);
    writePersistedScope(next);
  }, []);

  const switchToPersonal = useCallback(() => {
    setActiveScope(personalScope(user.uid));
  }, [setActiveScope, user.uid]);

  const switchToWorkspace = useCallback((workspaceId: string) => {
    const target = workspaces.find((w) => w.workspaceId === workspaceId);
    if (!target) {
      // eslint-disable-next-line no-console
      console.warn(`[WorkspaceContext] No membership found for workspace ${workspaceId}`);
      return;
    }
    setActiveScope(workspaceScope(user.uid, target.workspaceId, target.role, target.defaultProjectId));
  }, [setActiveScope, workspaces, user.uid]);

  const createFromPersonal = useCallback(async (workspaceName: string) => {
    const wsId = await createWorkspaceFromPersonalProject(
      user.uid,
      user.email ?? '(no email)',
      workspaceName
    );
    const updated = await reloadWorkspaces();
    const next = updated.find((w) => w.workspaceId === wsId);
    if (next) {
      setActiveScope(workspaceScope(user.uid, next.workspaceId, next.role, next.defaultProjectId));
    }
    return wsId;
  }, [reloadWorkspaces, setActiveScope, user.email, user.uid]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    user,
    scope,
    loading,
    workspaces,
    setActiveScope,
    switchToPersonal,
    switchToWorkspace,
    reloadWorkspaces: async () => { await reloadWorkspaces(); },
    createFromPersonal,
    addMember: addWorkspaceMember,
    updateMemberRole: updateWorkspaceMemberRole,
    removeMember: removeWorkspaceMember,
    getWorkspaceDetail: getWorkspace,
  }), [
    user, scope, loading, workspaces,
    setActiveScope, switchToPersonal, switchToWorkspace, reloadWorkspaces, createFromPersonal,
  ]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>.');
  return ctx;
}

export function useActiveScope(): ProjectScope {
  return useWorkspace().scope;
}

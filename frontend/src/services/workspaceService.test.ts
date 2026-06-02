/**
 * Lightweight workspaceService tests with mocked Firestore — keeps the suite fast,
 * focuses on routing + role rules. The real owner/member rule enforcement happens
 * in firestore.rules; here we cover the client-side guardrails.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workspace, WorkspaceRole } from '../types';

const firestoreMock = vi.hoisted(() => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
  serverTimestamp: vi.fn(),
  batchSet: vi.fn(),
  batchUpdate: vi.fn(),
  batchDelete: vi.fn(),
  batchCommit: vi.fn(),
}));

vi.mock('../firebase/config', () => ({
  db: { kind: 'mock-db' },
  isConfigured: true,
}));

vi.mock('firebase/firestore', () => ({
  collection: firestoreMock.collection,
  doc: firestoreMock.doc,
  getDocs: firestoreMock.getDocs,
  getDoc: firestoreMock.getDoc,
  setDoc: firestoreMock.setDoc,
  updateDoc: firestoreMock.updateDoc,
  deleteDoc: firestoreMock.deleteDoc,
  query: firestoreMock.query,
  orderBy: firestoreMock.orderBy,
  where: firestoreMock.where,
  writeBatch: firestoreMock.writeBatch,
  serverTimestamp: firestoreMock.serverTimestamp,
}));

function makeWorkspaceDoc(workspace: Workspace) {
  return {
    exists: () => true,
    data: () => ({
      name: workspace.name,
      ownerId: workspace.ownerId,
      members: workspace.members,
    }),
  };
}

describe('workspaceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.collection.mockImplementation((_db, path: string) => ({ type: 'collection', path }));
    firestoreMock.doc.mockImplementation((_db: unknown, pathOrId: string, maybeId?: string) => {
      const path = maybeId ? `${pathOrId}/${maybeId}` : pathOrId;
      return { type: 'doc', path };
    });
    firestoreMock.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
    firestoreMock.writeBatch.mockReturnValue({
      set: firestoreMock.batchSet,
      update: firestoreMock.batchUpdate,
      delete: firestoreMock.batchDelete,
      commit: firestoreMock.batchCommit,
    });
    firestoreMock.batchCommit.mockResolvedValue(undefined);
    firestoreMock.setDoc.mockResolvedValue(undefined);
    firestoreMock.updateDoc.mockResolvedValue(undefined);
    firestoreMock.deleteDoc.mockResolvedValue(undefined);
  });

  it('getUserWorkspaces returns parsed UserWorkspaceRef entries', async () => {
    firestoreMock.getDocs.mockResolvedValue({
      docs: [
        {
          id: 'ws-1',
          data: () => ({
            workspaceName: 'Team Alpha',
            role: 'editor',
            ownerId: 'owner-uid',
            defaultProjectId: 'default',
          }),
        },
      ],
    });
    const { getUserWorkspaces } = await import('./workspaceService');
    const out = await getUserWorkspaces('user-1');
    expect(out).toEqual([
      {
        workspaceId: 'ws-1',
        workspaceName: 'Team Alpha',
        role: 'editor',
        ownerId: 'owner-uid',
        defaultProjectId: 'default',
        updatedAt: undefined,
      },
    ]);
    expect(firestoreMock.collection).toHaveBeenCalledWith({ kind: 'mock-db' }, 'userWorkspaces/user-1/workspaces');
  });

  it('createWorkspace writes workspace doc THEN owner index sequentially (not batched) to avoid same-batch rule races', async () => {
    const { createWorkspace } = await import('./workspaceService');
    const wsId = await createWorkspace('owner-uid', 'owner@example.com', 'Team Alpha');

    expect(wsId).toMatch(/^ws-\d+-/);
    // Two setDoc calls, no writeBatch.
    expect(firestoreMock.writeBatch).not.toHaveBeenCalled();
    expect(firestoreMock.setDoc).toHaveBeenCalledTimes(2);
    // First call: workspace document.
    expect(firestoreMock.setDoc.mock.calls[0][0]).toMatchObject({ path: `workspaces/${wsId}` });
    expect(firestoreMock.setDoc.mock.calls[0][1]).toMatchObject({
      ownerId: 'owner-uid',
      ownerEmail: 'owner@example.com',
      name: 'Team Alpha',
      members: { 'owner-uid': 'owner' as WorkspaceRole },
    });
    // Second call: owner index entry (after workspace is committed).
    expect(firestoreMock.setDoc.mock.calls[1][0]).toMatchObject({ path: `userWorkspaces/owner-uid/workspaces/${wsId}` });
    expect(firestoreMock.setDoc.mock.calls[1][1]).toMatchObject({
      workspaceId: wsId,
      workspaceName: 'Team Alpha',
      role: 'owner',
      ownerId: 'owner-uid',
      defaultProjectId: 'default',
    });
  });

  it('createWorkspace surfaces a repair-pointing error if the owner index write fails', async () => {
    firestoreMock.setDoc
      .mockResolvedValueOnce(undefined) // workspace doc write succeeds
      .mockRejectedValueOnce(new Error('PERMISSION_DENIED')); // index entry fails
    const { createWorkspace } = await import('./workspaceService');
    await expect(createWorkspace('owner-uid', 'owner@example.com', 'Team Alpha'))
      .rejects.toThrow(/repairOwnerIndex/);
  });

  it('repairOwnerIndex rewrites the owner index entry when workspace ownerId matches', async () => {
    firestoreMock.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ownerId: 'owner-uid', name: 'Team Alpha' }),
    });
    const { repairOwnerIndex } = await import('./workspaceService');
    await repairOwnerIndex('ws-1', 'owner-uid');
    expect(firestoreMock.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'userWorkspaces/owner-uid/workspaces/ws-1' }),
      expect.objectContaining({
        workspaceId: 'ws-1',
        workspaceName: 'Team Alpha',
        role: 'owner',
        ownerId: 'owner-uid',
      })
    );
  });

  it('repairOwnerIndex refuses when ownerId does not match', async () => {
    firestoreMock.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ownerId: 'owner-uid', name: 'Team Alpha' }),
    });
    const { repairOwnerIndex } = await import('./workspaceService');
    await expect(repairOwnerIndex('ws-1', 'someone-else')).rejects.toThrow(/owner is not/);
  });

  it('addWorkspaceMember rejects owner role to prevent accidental ownership grants', async () => {
    const { addWorkspaceMember } = await import('./workspaceService');
    await expect(addWorkspaceMember('ws-1', 'new-user', 'owner')).rejects.toThrow(/owner/);
  });

  it('addWorkspaceMember uses sequential writes: updateDoc BEFORE setDoc (not batched) to avoid same-batch rule races', async () => {
    firestoreMock.getDoc.mockResolvedValue(makeWorkspaceDoc({
      id: 'ws-1', name: 'Alpha', ownerId: 'owner', members: { 'owner': 'owner' },
    }));
    firestoreMock.updateDoc.mockResolvedValue(undefined);
    firestoreMock.setDoc.mockResolvedValue(undefined);
    const { addWorkspaceMember } = await import('./workspaceService');
    await addWorkspaceMember('ws-1', 'colleague-uid', 'editor');

    // updateDoc must be called before setDoc (sequential, not batched)
    expect(firestoreMock.updateDoc).toHaveBeenCalled();
    expect(firestoreMock.setDoc).toHaveBeenCalled();
    // Verify ordering: updateDoc resolves before setDoc is called
    const updateCallOrder = firestoreMock.updateDoc.mock.invocationCallOrder[0];
    const setCallOrder = firestoreMock.setDoc.mock.invocationCallOrder[0];
    expect(updateCallOrder).toBeLessThan(setCallOrder);
  });

  it('addWorkspaceMember surfaces a structured error if the index write fails', async () => {
    firestoreMock.getDoc.mockResolvedValue(makeWorkspaceDoc({
      id: 'ws-1', name: 'Alpha', ownerId: 'owner', members: { 'owner': 'owner' },
    }));
    firestoreMock.updateDoc.mockResolvedValue(undefined); // workspace update succeeds
    firestoreMock.setDoc.mockRejectedValueOnce(new Error('PERMISSION_DENIED')); // index fails
    const { addWorkspaceMember } = await import('./workspaceService');
    await expect(addWorkspaceMember('ws-1', 'colleague-uid', 'editor'))
      .rejects.toThrow(/members updated but the index/);
  });

  it('addWorkspaceMember writes members map + index entry when role is editor', async () => {
    firestoreMock.getDoc.mockResolvedValue(makeWorkspaceDoc({
      id: 'ws-1', name: 'Alpha', ownerId: 'owner', members: { 'owner': 'owner' },
    }));
    const { addWorkspaceMember } = await import('./workspaceService');
    await addWorkspaceMember('ws-1', 'colleague-uid', 'editor');

    // Step 1: updateDoc on workspace (NOT batch)
    expect(firestoreMock.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'workspaces/ws-1' }),
      expect.objectContaining({
        members: { 'owner': 'owner', 'colleague-uid': 'editor' },
      })
    );
    // Step 2: setDoc on invitee index (NOT batch), uses merge:true
    expect(firestoreMock.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'userWorkspaces/colleague-uid/workspaces/ws-1' }),
      expect.objectContaining({
        workspaceId: 'ws-1',
        workspaceName: 'Alpha',
        role: 'editor',
        ownerId: 'owner',
      }),
      { merge: true }
    );
    // No batch used for invite flow
    expect(firestoreMock.writeBatch).not.toHaveBeenCalled();
  });

  it('updateWorkspaceMemberRole refuses to demote/promote the owner', async () => {
    firestoreMock.getDoc.mockResolvedValue(makeWorkspaceDoc({
      id: 'ws-1', name: 'Alpha', ownerId: 'owner', members: { 'owner': 'owner', 'mem': 'editor' },
    }));
    const { updateWorkspaceMemberRole } = await import('./workspaceService');
    await expect(updateWorkspaceMemberRole('ws-1', 'owner', 'editor')).rejects.toThrow(/owner/);
  });

  it('updateWorkspaceMemberRole uses sequential writes: updateDoc BEFORE setDoc', async () => {
    firestoreMock.getDoc.mockResolvedValue(makeWorkspaceDoc({
      id: 'ws-1', name: 'Alpha', ownerId: 'owner', members: { 'owner': 'owner', 'mem': 'editor' },
    }));
    firestoreMock.updateDoc.mockResolvedValue(undefined);
    firestoreMock.setDoc.mockResolvedValue(undefined);
    const { updateWorkspaceMemberRole } = await import('./workspaceService');
    await updateWorkspaceMemberRole('ws-1', 'mem', 'viewer');

    expect(firestoreMock.updateDoc).toHaveBeenCalled();
    expect(firestoreMock.setDoc).toHaveBeenCalled();
    const updateCallOrder = firestoreMock.updateDoc.mock.invocationCallOrder[0];
    const setCallOrder = firestoreMock.setDoc.mock.invocationCallOrder[0];
    expect(updateCallOrder).toBeLessThan(setCallOrder);
    // setDoc uses merge:true
    expect(firestoreMock.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'userWorkspaces/mem/workspaces/ws-1' }),
      expect.objectContaining({ role: 'viewer' }),
      { merge: true }
    );
  });

  it('removeWorkspaceMember refuses to remove the owner', async () => {
    firestoreMock.getDoc.mockResolvedValue(makeWorkspaceDoc({
      id: 'ws-1', name: 'Alpha', ownerId: 'owner', members: { 'owner': 'owner', 'mem': 'editor' },
    }));
    const { removeWorkspaceMember } = await import('./workspaceService');
    await expect(removeWorkspaceMember('ws-1', 'owner')).rejects.toThrow(/owner/);
  });

  it('removeWorkspaceMember deletes members entry + userWorkspaces index for non-owners', async () => {
    firestoreMock.getDoc.mockResolvedValue(makeWorkspaceDoc({
      id: 'ws-1', name: 'Alpha', ownerId: 'owner', members: { 'owner': 'owner', 'mem': 'editor' },
    }));
    const { removeWorkspaceMember } = await import('./workspaceService');
    await removeWorkspaceMember('ws-1', 'mem');

    expect(firestoreMock.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'workspaces/ws-1' }),
      expect.objectContaining({ members: { 'owner': 'owner' } })
    );
    expect(firestoreMock.batchDelete).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'userWorkspaces/mem/workspaces/ws-1' })
    );
  });

  it('getWorkspace returns null when document does not exist', async () => {
    firestoreMock.getDoc.mockResolvedValue({ exists: () => false });
    const { getWorkspace } = await import('./workspaceService');
    const out = await getWorkspace('ws-missing');
    expect(out).toBeNull();
  });
});

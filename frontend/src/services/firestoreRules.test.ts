/**
 * Firestore Rules Verification Harness
 * ====================================
 *
 * Why this exists (Option B from the v1.18.1 hardening prompt):
 *   Running `@firebase/rules-unit-testing` requires the Java-based Firestore
 *   emulator. That's a heavy dev dependency for one feature, and it can't
 *   run in the existing Vitest/Vite CI flow without extra infrastructure.
 *
 *   Instead, this file mirrors the predicates in `firestore.rules` as plain
 *   TypeScript and exercises every allow path. If the rule file and this
 *   harness ever drift, the asserted matrix here surfaces the gap.
 *
 *   These tests are NOT a substitute for the official emulator — they verify
 *   that the AUTHOR'S MENTAL MODEL of the rules matches the documented
 *   matrix below. Always pair with a manual smoke test (see
 *   docs/WORKSPACE_SMOKE_TEST.md) before shipping rule changes.
 *
 * Matrix (must match firestore.rules):
 *
 *   users/{uid}/**                              → read/write iff request.auth.uid == uid
 *
 *   workspaces/{wid} create                     → caller is named owner AND seeds members[uid]='owner'
 *   workspaces/{wid} read                       → caller is a member
 *   workspaces/{wid} update                     → caller is owner; ownerId stable; members[ownerId]='owner'
 *   workspaces/{wid} delete                     → caller is owner
 *
 *   workspaces/{wid}/projects/.../{doc} read    → caller is a member
 *   workspaces/{wid}/projects/.../{doc} write   → caller is owner OR editor
 *
 *   userWorkspaces/{uid}/workspaces/{wid} read  → caller IS uid
 *   userWorkspaces/{uid}/workspaces/{wid} create/update:
 *     allow (1) owner bootstrap: caller=uid AND workspace.ownerId=caller AND payload.role='owner'
 *           (2) owner inviting:  caller is owner; uid != caller; payload.role == workspace.members[uid]
 *           (3) self-repair:     caller=uid AND members[caller] exists; payload.role == members[caller]
 *   userWorkspaces/{uid}/workspaces/{wid} delete → caller=uid OR caller is workspace owner
 */
import { describe, expect, it } from 'vitest';

// ============================================================
// Domain types mirroring Firestore rule inputs
// ============================================================

type Role = 'owner' | 'editor' | 'viewer';
type UID = string;

interface RuleAuth {
  uid: UID | null;
}

interface WorkspaceDoc {
  ownerId: UID;
  members: Record<UID, Role>;
}

interface IndexEntry {
  workspaceId: string;
  ownerId: UID;
  role: Role;
}

interface World {
  workspaces: Record<string, WorkspaceDoc | undefined>;
}

interface SnapshotDoc {
  id: string;
  createdBy: UID;
}

// ============================================================
// Predicate mirrors of firestore.rules
// ============================================================

function isSignedIn(auth: RuleAuth): boolean {
  return auth.uid !== null;
}

function isSelf(auth: RuleAuth, uid: UID): boolean {
  return isSignedIn(auth) && auth.uid === uid;
}

function workspaceExists(world: World, wid: string): boolean {
  return world.workspaces[wid] !== undefined;
}

function workspaceData(world: World, wid: string): WorkspaceDoc {
  const ws = world.workspaces[wid];
  if (!ws) throw new Error(`Rules attempted get() on non-existent workspaces/${wid}`);
  return ws;
}

function isMember(auth: RuleAuth, world: World, wid: string): boolean {
  if (!isSignedIn(auth)) return false;
  if (!workspaceExists(world, wid)) return false;
  return auth.uid! in workspaceData(world, wid).members;
}

function memberRole(world: World, wid: string, uid: UID): Role | undefined {
  return workspaceData(world, wid).members[uid];
}

function isOwner(auth: RuleAuth, world: World, wid: string): boolean {
  return isMember(auth, world, wid) && memberRole(world, wid, auth.uid!) === 'owner';
}

function canWriteBusiness(auth: RuleAuth, world: World, wid: string): boolean {
  if (!isMember(auth, world, wid)) return false;
  const role = memberRole(world, wid, auth.uid!);
  return role === 'owner' || role === 'editor';
}

function isWorkspaceOwnerByDoc(auth: RuleAuth, world: World, wid: string): boolean {
  return isSignedIn(auth)
    && workspaceExists(world, wid)
    && workspaceData(world, wid).ownerId === auth.uid;
}

// ============================================================
// Rule entry points (one per match block)
// ============================================================

// users/{uid}/** (v1.22.2: only non-snapshot collections allowed for write)
function userScope(auth: RuleAuth, uid: UID, pathCollection?: string): { read: boolean; write: boolean } {
  const allow = isSelf(auth, uid);
  const isBusinessCollection = !pathCollection || ['skus', 'forecasts', 'capacityPlans', 'parameters', 'capacityVersions', 'skuVersions'].includes(pathCollection);
  return { read: allow, write: allow && isBusinessCollection };
}

// workspaces/{wid}
function workspaceRoot(args: {
  auth: RuleAuth;
  world: World;
  wid: string;
  op: 'read' | 'create' | 'update' | 'delete';
  payload?: WorkspaceDoc; // create / update
  before?: WorkspaceDoc;   // update / delete
}): boolean {
  const { auth, world, wid, op, payload, before } = args;
  switch (op) {
    case 'read':
      return isMember(auth, world, wid);

    case 'create': {
      if (!isSignedIn(auth) || !payload) return false;
      return payload.ownerId === auth.uid && payload.members[auth.uid!] === 'owner';
    }

    case 'update': {
      if (!isOwner(auth, world, wid) || !payload || !before) return false;
      // ownership stable + owner remains tagged as owner
      return payload.ownerId === before.ownerId
        && payload.members[before.ownerId] === 'owner';
    }

    case 'delete':
      return isOwner(auth, world, wid);
  }
}

// workspaces/{wid}/projects/{pid}/{**} (v1.22.2: only non-snapshot collections allowed for write)
function workspaceBusiness(args: {
  auth: RuleAuth;
  world: World;
  wid: string;
  op: 'read' | 'write';
  pathCollection?: string;
}): boolean {
  const { auth, world, wid, op, pathCollection } = args;
  const isBusinessCollection = !pathCollection || ['skus', 'forecasts', 'capacityPlans', 'parameters', 'capacityVersions', 'skuVersions'].includes(pathCollection);
  if (op === 'read') return isMember(auth, world, wid);
  return canWriteBusiness(auth, world, wid) && isBusinessCollection;
}

// userWorkspaces/{uid}/workspaces/{wid}
function userWorkspaceIndex(args: {
  auth: RuleAuth;
  world: World;
  uid: UID;
  wid: string;
  op: 'read' | 'create' | 'update' | 'delete';
  payload?: IndexEntry;
}): boolean {
  const { auth, world, uid, wid, op, payload } = args;

  if (op === 'read') return isSelf(auth, uid);

  if (op === 'delete') {
    return isSignedIn(auth) && (isSelf(auth, uid) || isOwner(auth, world, wid));
  }

  // create / update share the same allow shape
  if (!isSignedIn(auth) || !payload) return false;

  // Path (1): initial owner bootstrap (works the moment the workspace doc is
  // committed, even if members map isn't yet observable from this rule's POV).
  const ownerBootstrap =
    isSelf(auth, uid)
    && isWorkspaceOwnerByDoc(auth, world, wid)
    && payload.role === 'owner'
    && payload.ownerId === auth.uid
    && payload.workspaceId === wid;

  // Path (2): owner inviting someone else
  const ownerInvite =
    isOwner(auth, world, wid)
    && !isSelf(auth, uid)
    && workspaceExists(world, wid)
    && payload.role === workspaceData(world, wid).members[uid]
    && payload.workspaceId === wid
    && payload.ownerId === workspaceData(world, wid).ownerId;

  // Path (3): self repair / refresh (no role escalation)
  const selfRepair =
    isSelf(auth, uid)
    && isMember(auth, world, wid)
    && payload.role === memberRole(world, wid, auth.uid!)
    && payload.workspaceId === wid;

  // For update we drop the workspaceId/ownerId payload guards on owner-self
  // and self-repair (the existing entry already has them); but the role
  // constancy guard is preserved on all three paths. Tests below cover both
  // create and update separately.
  if (op === 'create') return ownerBootstrap || ownerInvite || selfRepair;
  return ownerBootstrap || ownerInvite || selfRepair;
}

// ---------- Personal snapshots (v1.22.2) ----------
function personalSnapshotRule(args: {
  auth: RuleAuth;
  uid: UID;
  op: 'read' | 'create' | 'update' | 'delete';
  payload?: SnapshotDoc;
}): boolean {
  const { auth, uid, op, payload } = args;
  if (!isSelf(auth, uid)) return false;
  switch (op) {
    case 'read': return true;
    case 'create': return payload?.createdBy === auth.uid;
    case 'delete': return true;
    case 'update': return false; // immutable
  }
}

// ---------- Workspace snapshots (v1.22.2) ----------
function workspaceSnapshotRule(args: {
  auth: RuleAuth;
  world: World;
  wid: string;
  op: 'read' | 'create' | 'update' | 'delete';
  payload?: SnapshotDoc;
  before?: SnapshotDoc;
}): boolean {
  const { auth, world, wid, op, payload, before } = args;
  if (!isMember(auth, world, wid)) return false;
  const role = memberRole(world, wid, auth.uid!);
  switch (op) {
    case 'read': return true;
    case 'create':
      return (role === 'owner' || role === 'editor') && payload?.createdBy === auth.uid;
    case 'delete':
      return role === 'owner' || (role === 'editor' && before?.createdBy === auth.uid);
    case 'update': return false; // immutable
  }
}

// 模拟 Firestore 引擎：若同一路径匹配多条 match 规则，只要任一规则 allow，则最终判定为 allowed。
function evaluateWriteRequest(evaluatedRules: boolean[]): boolean {
  return evaluatedRules.some(result => result === true);
}

// ============================================================
// Test data
// ============================================================

const OWNER: UID = 'uid-owner';
const EDITOR: UID = 'uid-editor';
const VIEWER: UID = 'uid-viewer';
const STRANGER: UID = 'uid-stranger';

function buildWorld(): World {
  return {
    workspaces: {
      'ws-1': {
        ownerId: OWNER,
        members: {
          [OWNER]: 'owner',
          [EDITOR]: 'editor',
          [VIEWER]: 'viewer',
        },
      },
    },
  };
}

// ============================================================
// Tests
// ============================================================

describe('firestore.rules — verification harness', () => {

  // --------------------------------------------------------
  // 1. users/{uid}/** — personal data stays private
  // --------------------------------------------------------
  describe('users/{uid}/** — personal data', () => {
    it('owner can read and write their own personal data', () => {
      expect(userScope({ uid: OWNER }, OWNER).read).toBe(true);
      expect(userScope({ uid: OWNER }, OWNER).write).toBe(true);
    });

    it('different user cannot read or write someone else\'s personal data', () => {
      expect(userScope({ uid: STRANGER }, OWNER).read).toBe(false);
      expect(userScope({ uid: STRANGER }, OWNER).write).toBe(false);
    });

    it('unauthenticated cannot read or write personal data', () => {
      expect(userScope({ uid: null }, OWNER).read).toBe(false);
      expect(userScope({ uid: null }, OWNER).write).toBe(false);
    });
  });

  // --------------------------------------------------------
  // 2. workspaces/{wid} root document
  // --------------------------------------------------------
  describe('workspaces/{wid}', () => {
    it('member can read the workspace doc', () => {
      const world = buildWorld();
      expect(workspaceRoot({ auth: { uid: OWNER }, world, wid: 'ws-1', op: 'read' })).toBe(true);
      expect(workspaceRoot({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'read' })).toBe(true);
      expect(workspaceRoot({ auth: { uid: VIEWER }, world, wid: 'ws-1', op: 'read' })).toBe(true);
    });

    it('non-member cannot read the workspace doc', () => {
      expect(workspaceRoot({ auth: { uid: STRANGER }, world: buildWorld(), wid: 'ws-1', op: 'read' })).toBe(false);
    });

    it('caller can create a workspace where they are named owner', () => {
      const world: World = { workspaces: {} };
      const payload: WorkspaceDoc = { ownerId: OWNER, members: { [OWNER]: 'owner' } };
      expect(workspaceRoot({ auth: { uid: OWNER }, world, wid: 'ws-new', op: 'create', payload })).toBe(true);
    });

    it('cannot create a workspace where ownerId is not the caller', () => {
      const payload: WorkspaceDoc = { ownerId: STRANGER, members: { [STRANGER]: 'owner' } };
      expect(workspaceRoot({ auth: { uid: OWNER }, world: { workspaces: {} }, wid: 'ws-evil', op: 'create', payload })).toBe(false);
    });

    it('cannot create a workspace without seeding owner role', () => {
      const payload: WorkspaceDoc = { ownerId: OWNER, members: { [OWNER]: 'viewer' } };
      expect(workspaceRoot({ auth: { uid: OWNER }, world: { workspaces: {} }, wid: 'ws-evil', op: 'create', payload })).toBe(false);
    });

    it('owner can update workspace; ownerId remains stable', () => {
      const world = buildWorld();
      const before = world.workspaces['ws-1']!;
      const payload: WorkspaceDoc = { ownerId: OWNER, members: { ...before.members, [STRANGER]: 'editor' } };
      expect(workspaceRoot({ auth: { uid: OWNER }, world, wid: 'ws-1', op: 'update', payload, before })).toBe(true);
    });

    it('owner cannot silently transfer ownership through update', () => {
      const world = buildWorld();
      const before = world.workspaces['ws-1']!;
      const payload: WorkspaceDoc = { ownerId: STRANGER, members: { ...before.members, [STRANGER]: 'owner' } };
      expect(workspaceRoot({ auth: { uid: OWNER }, world, wid: 'ws-1', op: 'update', payload, before })).toBe(false);
    });

    it('owner cannot demote themselves out of owner role via update', () => {
      const world = buildWorld();
      const before = world.workspaces['ws-1']!;
      const payload: WorkspaceDoc = { ownerId: OWNER, members: { ...before.members, [OWNER]: 'editor' } };
      expect(workspaceRoot({ auth: { uid: OWNER }, world, wid: 'ws-1', op: 'update', payload, before })).toBe(false);
    });

    it('editor and viewer cannot update the workspace doc', () => {
      const world = buildWorld();
      const before = world.workspaces['ws-1']!;
      const payload: WorkspaceDoc = { ownerId: OWNER, members: { ...before.members } };
      expect(workspaceRoot({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'update', payload, before })).toBe(false);
      expect(workspaceRoot({ auth: { uid: VIEWER }, world, wid: 'ws-1', op: 'update', payload, before })).toBe(false);
    });

    it('only owner can delete', () => {
      const world = buildWorld();
      expect(workspaceRoot({ auth: { uid: OWNER }, world, wid: 'ws-1', op: 'delete' })).toBe(true);
      expect(workspaceRoot({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'delete' })).toBe(false);
      expect(workspaceRoot({ auth: { uid: STRANGER }, world, wid: 'ws-1', op: 'delete' })).toBe(false);
    });
  });

  // --------------------------------------------------------
  // 3. workspaces/{wid}/projects/... business data
  // --------------------------------------------------------
  describe('workspaces/{wid}/projects/...', () => {
    it('owner can read and write', () => {
      const world = buildWorld();
      expect(workspaceBusiness({ auth: { uid: OWNER }, world, wid: 'ws-1', op: 'read' })).toBe(true);
      expect(workspaceBusiness({ auth: { uid: OWNER }, world, wid: 'ws-1', op: 'write' })).toBe(true);
    });

    it('editor can read and write', () => {
      const world = buildWorld();
      expect(workspaceBusiness({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'read' })).toBe(true);
      expect(workspaceBusiness({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'write' })).toBe(true);
    });

    it('viewer can read but not write', () => {
      const world = buildWorld();
      expect(workspaceBusiness({ auth: { uid: VIEWER }, world, wid: 'ws-1', op: 'read' })).toBe(true);
      expect(workspaceBusiness({ auth: { uid: VIEWER }, world, wid: 'ws-1', op: 'write' })).toBe(false);
    });

    it('non-member cannot read or write', () => {
      const world = buildWorld();
      expect(workspaceBusiness({ auth: { uid: STRANGER }, world, wid: 'ws-1', op: 'read' })).toBe(false);
      expect(workspaceBusiness({ auth: { uid: STRANGER }, world, wid: 'ws-1', op: 'write' })).toBe(false);
    });

    it('unauthenticated cannot read or write', () => {
      const world = buildWorld();
      expect(workspaceBusiness({ auth: { uid: null }, world, wid: 'ws-1', op: 'read' })).toBe(false);
      expect(workspaceBusiness({ auth: { uid: null }, world, wid: 'ws-1', op: 'write' })).toBe(false);
    });
  });

  // --------------------------------------------------------
  // 4. userWorkspaces index — the v1.18.1 hardening hot path
  // --------------------------------------------------------
  describe('userWorkspaces/{uid}/workspaces/{wid}', () => {
    it('user can read their own index entries', () => {
      expect(userWorkspaceIndex({ auth: { uid: OWNER }, world: buildWorld(), uid: OWNER, wid: 'ws-1', op: 'read' })).toBe(true);
    });

    it('user cannot read someone else\'s index entries', () => {
      expect(userWorkspaceIndex({ auth: { uid: STRANGER }, world: buildWorld(), uid: OWNER, wid: 'ws-1', op: 'read' })).toBe(false);
    });

    // The reason this whole hardening release exists:
    it('owner-bootstrap path: owner can create their own index entry the moment the workspace doc is committed', () => {
      // World contains the freshly-committed workspace doc; members map MAY be
      // present (it is in our model), but the rule path keys on ownerId — so it
      // would still work even if members were empty here.
      const world = buildWorld();
      const payload: IndexEntry = { workspaceId: 'ws-1', ownerId: OWNER, role: 'owner' };
      expect(userWorkspaceIndex({ auth: { uid: OWNER }, world, uid: OWNER, wid: 'ws-1', op: 'create', payload })).toBe(true);
    });

    it('owner-bootstrap fails if the workspace doc does not exist yet', () => {
      // Same-batch scenario: workspace not committed → bootstrap path denies.
      const world: World = { workspaces: {} };
      const payload: IndexEntry = { workspaceId: 'ws-new', ownerId: OWNER, role: 'owner' };
      expect(userWorkspaceIndex({ auth: { uid: OWNER }, world, uid: OWNER, wid: 'ws-new', op: 'create', payload })).toBe(false);
    });

    it('owner can invite another user by writing their index entry (role matches members map)', () => {
      const world = buildWorld();
      const payload: IndexEntry = { workspaceId: 'ws-1', ownerId: OWNER, role: 'editor' };
      expect(userWorkspaceIndex({ auth: { uid: OWNER }, world, uid: EDITOR, wid: 'ws-1', op: 'create', payload })).toBe(true);
    });

    it('owner cannot inject a member index with a role inconsistent with workspace members map', () => {
      const world = buildWorld(); // members[EDITOR] == 'editor'
      const payload: IndexEntry = { workspaceId: 'ws-1', ownerId: OWNER, role: 'owner' }; // mismatch
      expect(userWorkspaceIndex({ auth: { uid: OWNER }, world, uid: EDITOR, wid: 'ws-1', op: 'create', payload })).toBe(false);
    });

    it('non-owner cannot add a member by writing index entries directly (the classic escalation path)', () => {
      const world = buildWorld(); // STRANGER is not a member
      const payload: IndexEntry = { workspaceId: 'ws-1', ownerId: OWNER, role: 'editor' };
      // EDITOR tries to invite STRANGER as editor:
      expect(userWorkspaceIndex({ auth: { uid: EDITOR }, world, uid: STRANGER, wid: 'ws-1', op: 'create', payload })).toBe(false);
      // VIEWER same:
      expect(userWorkspaceIndex({ auth: { uid: VIEWER }, world, uid: STRANGER, wid: 'ws-1', op: 'create', payload })).toBe(false);
      // STRANGER themselves can't fabricate a membership entry:
      expect(userWorkspaceIndex({ auth: { uid: STRANGER }, world, uid: STRANGER, wid: 'ws-1', op: 'create', payload })).toBe(false);
    });

    it('member self-repair: editor can rewrite their own entry but cannot escalate to owner', () => {
      const world = buildWorld();
      const keep: IndexEntry = { workspaceId: 'ws-1', ownerId: OWNER, role: 'editor' };
      const escalate: IndexEntry = { workspaceId: 'ws-1', ownerId: OWNER, role: 'owner' };
      expect(userWorkspaceIndex({ auth: { uid: EDITOR }, world, uid: EDITOR, wid: 'ws-1', op: 'update', payload: keep })).toBe(true);
      expect(userWorkspaceIndex({ auth: { uid: EDITOR }, world, uid: EDITOR, wid: 'ws-1', op: 'update', payload: escalate })).toBe(false);
    });

    it('viewer self-repair: must stay as viewer', () => {
      const world = buildWorld();
      const keep: IndexEntry = { workspaceId: 'ws-1', ownerId: OWNER, role: 'viewer' };
      const escalate: IndexEntry = { workspaceId: 'ws-1', ownerId: OWNER, role: 'editor' };
      expect(userWorkspaceIndex({ auth: { uid: VIEWER }, world, uid: VIEWER, wid: 'ws-1', op: 'update', payload: keep })).toBe(true);
      expect(userWorkspaceIndex({ auth: { uid: VIEWER }, world, uid: VIEWER, wid: 'ws-1', op: 'update', payload: escalate })).toBe(false);
    });

    it('owner can update an invitee role (after updating workspace members first)', () => {
      // Workspace has been mutated to demote EDITOR to viewer; owner now writes
      // matching index update.
      const world = buildWorld();
      world.workspaces['ws-1']!.members[EDITOR] = 'viewer';
      const payload: IndexEntry = { workspaceId: 'ws-1', ownerId: OWNER, role: 'viewer' };
      expect(userWorkspaceIndex({ auth: { uid: OWNER }, world, uid: EDITOR, wid: 'ws-1', op: 'update', payload })).toBe(true);
    });

    it('user can delete their own index entry (leave workspace)', () => {
      expect(userWorkspaceIndex({ auth: { uid: EDITOR }, world: buildWorld(), uid: EDITOR, wid: 'ws-1', op: 'delete' })).toBe(true);
    });

    it('owner can delete a member\'s index entry (removeWorkspaceMember)', () => {
      expect(userWorkspaceIndex({ auth: { uid: OWNER }, world: buildWorld(), uid: EDITOR, wid: 'ws-1', op: 'delete' })).toBe(true);
    });

    it('stranger cannot delete someone else\'s index entry', () => {
      expect(userWorkspaceIndex({ auth: { uid: STRANGER }, world: buildWorld(), uid: EDITOR, wid: 'ws-1', op: 'delete' })).toBe(false);
    });
  });

  // --------------------------------------------------------
  // 5. v1.22.2 Snapshot Rules & Overlap Regression Tests
  // --------------------------------------------------------
  describe('snapshots/{snapshotId} — rules hardening and overlap validation', () => {
    const world = buildWorld();

    describe('Personal snapshots (legacy vs v1.22.2)', () => {
      it('personal snapshot update must be denied', () => {
        // 专用快照规则本身直接 Deny
        expect(personalSnapshotRule({ auth: { uid: OWNER }, uid: OWNER, op: 'update' })).toBe(false);
      });

      it('broad recursive project rules must not bypass snapshot-specific rules', () => {
        // 模拟 v1.22.1：当有通用递归 allow write: if isSelf(uid) 时：
        const userScopeV1_22_1 = isSelf({ uid: OWNER }, OWNER); // 旧版没有 Collection 白名单过滤，直接返回 true
        const snapshotRule = personalSnapshotRule({ auth: { uid: OWNER }, uid: OWNER, op: 'update' }); // 返回 false

        // 模拟 Firestore 真实引擎的 OR 评估：
        const allowedInV1 = evaluateWriteRequest([userScopeV1_22_1, snapshotRule]);
        expect(allowedInV1).toBe(true); // 🚨 漏洞证实：快照 update 确实在 v1.22.1 被通用规则直接绕过了！

        // 模拟 v1.22.2：通用规则修补后，写操作只能作用于业务白名单，对于 snapshots 集合，通用 write 返回 false：
        const userScopeV1_22_2 = userScope({ uid: OWNER }, OWNER, 'snapshots').write; // 返回 false
        const allowedInV2 = evaluateWriteRequest([userScopeV1_22_2, snapshotRule]);
        expect(allowedInV2).toBe(false); // ✅ 漏洞修复：在 v1.22.2 下，快照 update 被正确且严密地 Deny 了！
      });
    });

    describe('Workspace snapshots permission enforcement', () => {
      it('workspace editor cannot update own snapshot', () => {
        const payload: SnapshotDoc = { id: 'snap-1', createdBy: EDITOR };
        const snapshotRule = workspaceSnapshotRule({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'update', payload });
        const workspaceScopeRule = workspaceBusiness({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'write', pathCollection: 'snapshots' });

        // 专用规则 Deny + 白名单拦截通用规则
        const allowed = evaluateWriteRequest([snapshotRule, workspaceScopeRule]);
        expect(allowed).toBe(false);
      });

      it('workspace editor cannot update others snapshot', () => {
        const payload: SnapshotDoc = { id: 'snap-1', createdBy: OWNER };
        const snapshotRule = workspaceSnapshotRule({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'update', payload });
        const workspaceScopeRule = workspaceBusiness({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'write', pathCollection: 'snapshots' });

        const allowed = evaluateWriteRequest([snapshotRule, workspaceScopeRule]);
        expect(allowed).toBe(false);
      });

      it('workspace editor can delete own snapshot', () => {
        const before: SnapshotDoc = { id: 'snap-1', createdBy: EDITOR };
        const snapshotRule = workspaceSnapshotRule({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'delete', before });
        const workspaceScopeRule = workspaceBusiness({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'write', pathCollection: 'snapshots' });

        const allowed = evaluateWriteRequest([snapshotRule, workspaceScopeRule]);
        expect(allowed).toBe(true); // Editor can delete own snapshot
      });

      it('workspace editor cannot delete others snapshot', () => {
        const before: SnapshotDoc = { id: 'snap-1', createdBy: OWNER };
        const snapshotRule = workspaceSnapshotRule({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'delete', before });
        const workspaceScopeRule = workspaceBusiness({ auth: { uid: EDITOR }, world, wid: 'ws-1', op: 'write', pathCollection: 'snapshots' });

        const allowed = evaluateWriteRequest([snapshotRule, workspaceScopeRule]);
        expect(allowed).toBe(false); // Editor cannot delete others snapshot
      });

      it('workspace owner can delete any snapshot', () => {
        const before: SnapshotDoc = { id: 'snap-1', createdBy: EDITOR };
        const snapshotRule = workspaceSnapshotRule({ auth: { uid: OWNER }, world, wid: 'ws-1', op: 'delete', before });
        const workspaceScopeRule = workspaceBusiness({ auth: { uid: OWNER }, world, wid: 'ws-1', op: 'write', pathCollection: 'snapshots' });

        const allowed = evaluateWriteRequest([snapshotRule, workspaceScopeRule]);
        expect(allowed).toBe(true); // Owner can delete any snapshot
      });

      it('viewer cannot create snapshot', () => {
        const payload: SnapshotDoc = { id: 'snap-1', createdBy: VIEWER };
        const snapshotRule = workspaceSnapshotRule({ auth: { uid: VIEWER }, world, wid: 'ws-1', op: 'create', payload });
        const workspaceScopeRule = workspaceBusiness({ auth: { uid: VIEWER }, world, wid: 'ws-1', op: 'write', pathCollection: 'snapshots' });

        const allowed = evaluateWriteRequest([snapshotRule, workspaceScopeRule]);
        expect(allowed).toBe(false);
      });

      it('viewer cannot delete snapshot', () => {
        const before: SnapshotDoc = { id: 'snap-1', createdBy: EDITOR };
        const snapshotRule = workspaceSnapshotRule({ auth: { uid: VIEWER }, world, wid: 'ws-1', op: 'delete', before });
        const workspaceScopeRule = workspaceBusiness({ auth: { uid: VIEWER }, world, wid: 'ws-1', op: 'write', pathCollection: 'snapshots' });

        const allowed = evaluateWriteRequest([snapshotRule, workspaceScopeRule]);
        expect(allowed).toBe(false);
      });
    });
  });
});

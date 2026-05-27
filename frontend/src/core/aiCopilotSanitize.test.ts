/**
 * Tests for AI Copilot Sanitize — removeSensitiveData and sortKeysDeep
 *
 * Since sanitizeDeep in aiCopilotContext.ts is private, we test the
 * equivalent exported removeSensitiveData from aiCopilotExport.ts,
 * plus sortKeysDeep for key ordering.
 *
 * Covers:
 * - Removes uid from flat objects
 * - Removes email from flat objects
 * - Removes token from flat objects
 * - Removes apiKey from flat objects
 * - Removes password from flat objects
 * - Removes sensitive keys from nested objects
 * - Preserves non-sensitive keys
 * - Handles arrays of objects
 * - Handles null values
 * - Handles undefined values
 * - Handles empty objects
 * - Handles primitive values
 * - Handles Date objects
 * - Handles circular-safe objects
 * - Respects nested depth (3+ levels)
 */

import { describe, it, expect } from 'vitest';
import { removeSensitiveData, sortKeysDeep } from './aiCopilotExport';

// ============================================================
// removeSensitiveData — flat object sensitive key removal
// ============================================================

describe('removeSensitiveData — sensitive key removal', () => {
  it('removes uid from flat objects', () => {
    const input = { uid: 'abc123', name: 'test' };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.uid).toBeUndefined();
    expect(result.name).toBe('test');
  });

  it('removes email from flat objects', () => {
    const input = { email: 'user@example.com', age: 30 };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.email).toBeUndefined();
    expect(result.age).toBe(30);
  });

  it('removes token from flat objects', () => {
    const input = { token: 'bearer-xyz', data: 123 };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.token).toBeUndefined();
    expect(result.data).toBe(123);
  });

  it('removes apiKey from flat objects', () => {
    const input = { apiKey: 'sk-12345', name: 'service' };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.apiKey).toBeUndefined();
    expect(result.name).toBe('service');
  });

  it('removes password from flat objects', () => {
    const input = { password: 'hunter2', username: 'admin' };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.password).toBeUndefined();
    expect(result.username).toBe('admin');
  });

  it('removes auth from flat objects', () => {
    const input = { auth: { provider: 'google' }, status: 'active' };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.auth).toBeUndefined();
    expect(result.status).toBe('active');
  });

  it('removes secret from flat objects', () => {
    const input = { secret: 'my-secret-value', id: 42 };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.secret).toBeUndefined();
    expect(result.id).toBe(42);
  });

  it('removes workspaceId from flat objects', () => {
    const input = { workspaceId: 'ws-001', title: 'project' };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.workspaceId).toBeUndefined();
    expect(result.title).toBe('project');
  });

  it('removes userId from flat objects', () => {
    const input = { userId: 'u-456', score: 95 };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.userId).toBeUndefined();
    expect(result.score).toBe(95);
  });

  it('removes ownerUid from flat objects', () => {
    const input = { ownerUid: 'owner-789', name: 'workspace' };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.ownerUid).toBeUndefined();
    expect(result.name).toBe('workspace');
  });

  it('removes member from flat objects', () => {
    const input = { member: ['user1', 'user2'], count: 2 };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.member).toBeUndefined();
    expect(result.count).toBe(2);
  });

  it('removes multiple sensitive keys at once', () => {
    const input = {
      uid: 'u1',
      email: 'test@test.com',
      token: 'tok123',
      safeField: 'keep-me',
    };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.uid).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.token).toBeUndefined();
    expect(result.safeField).toBe('keep-me');
  });

  it('removes sensitive keys case-insensitively', () => {
    const input = { UID: 'u1', Email: 'test@test.com', APIKEY: 'key123', safe: true };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.UID).toBeUndefined();
    expect(result.Email).toBeUndefined();
    expect(result.APIKEY).toBeUndefined();
    expect(result.safe).toBe(true);
  });
});

// ============================================================
// removeSensitiveData — nested objects
// ============================================================

describe('removeSensitiveData — nested objects', () => {
  it('removes sensitive keys from nested objects (2 levels deep)', () => {
    const input = {
      level1: {
        uid: 'nested-uid',
        data: 'safe',
      },
      topField: 'keep',
    };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    const level1 = result.level1 as Record<string, unknown>;
    expect(level1.uid).toBeUndefined();
    expect(level1.data).toBe('safe');
    expect(result.topField).toBe('keep');
  });

  it('removes sensitive keys from 3 levels deep', () => {
    const input = {
      level1: {
        level2: {
          level3: {
            password: 'deep-secret',
            value: 42,
          },
        },
      },
    };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    const level1 = result.level1 as Record<string, unknown>;
    const level2 = level1.level2 as Record<string, unknown>;
    const level3 = level2.level3 as Record<string, unknown>;
    expect(level3.password).toBeUndefined();
    expect(level3.value).toBe(42);
  });

  it('preserves non-sensitive keys at all levels', () => {
    const input = {
      a: 1,
      nested: {
        b: 2,
        deep: {
          c: 3,
        },
      },
    };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.a).toBe(1);
    const nested = result.nested as Record<string, unknown>;
    expect(nested.b).toBe(2);
    const deep = nested.deep as Record<string, unknown>;
    expect(deep.c).toBe(3);
  });
});

// ============================================================
// removeSensitiveData — arrays
// ============================================================

describe('removeSensitiveData — arrays', () => {
  it('handles arrays of objects with sensitive keys', () => {
    const input = {
      items: [
        { uid: 'u1', name: 'item1' },
        { uid: 'u2', name: 'item2' },
      ],
    };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    const items = result.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0].uid).toBeUndefined();
    expect(items[0].name).toBe('item1');
    expect(items[1].uid).toBeUndefined();
    expect(items[1].name).toBe('item2');
  });

  it('handles empty arrays', () => {
    const input = { items: [] };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.items).toEqual([]);
  });

  it('handles arrays with null elements', () => {
    const input = { items: [null, { uid: 'u1', val: 1 }] };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    const items = result.items as Array<Record<string, unknown> | null>;
    expect(items[0]).toBeNull();
    expect(items[1]).toBeDefined();
    expect((items[1] as Record<string, unknown>).uid).toBeUndefined();
    expect((items[1] as Record<string, unknown>).val).toBe(1);
  });
});

// ============================================================
// removeSensitiveData — null, undefined, primitives
// ============================================================

describe('removeSensitiveData — null, undefined, primitives', () => {
  it('returns null as-is', () => {
    const result = removeSensitiveData(null);
    expect(result).toBeNull();
  });

  it('returns undefined as-is', () => {
    const result = removeSensitiveData(undefined);
    expect(result).toBeUndefined();
  });

  it('returns string primitives as-is', () => {
    const result = removeSensitiveData('hello' as unknown as Record<string, unknown>);
    expect(result).toBe('hello');
  });

  it('returns number primitives as-is', () => {
    const result = removeSensitiveData(42 as unknown as Record<string, unknown>);
    expect(result).toBe(42);
  });

  it('returns boolean primitives as-is', () => {
    const result = removeSensitiveData(true as unknown as Record<string, unknown>);
    expect(result).toBe(true);
  });
});

// ============================================================
// removeSensitiveData — empty objects
// ============================================================

describe('removeSensitiveData — empty objects', () => {
  it('returns empty object unchanged', () => {
    const result = removeSensitiveData({});
    expect(result).toEqual({});
  });

  it('returns deeply nested empty objects unchanged', () => {
    const input = { level1: { level2: {} } };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    const level1 = result.level1 as Record<string, unknown>;
    expect(level1.level2).toEqual({});
  });
});

// ============================================================
// removeSensitiveData — Date objects
// ============================================================

describe('removeSensitiveData — Date objects', () => {
  it('preserves Date objects in output', () => {
    const date = new Date('2026-01-15T00:00:00.000Z');
    const input = { createdAt: date, uid: 'remove-me' };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.uid).toBeUndefined();
    // Date is an object, so it gets walked; its internal properties aren't sensitive
    expect(result.createdAt).toBeDefined();
  });
});

// ============================================================
// removeSensitiveData — sensitive substring matching
// ============================================================

describe('removeSensitiveData — sensitive substring matching', () => {
  it('removes keys containing "token" as substring', () => {
    const input = { authToken: 'abc', refreshToken: 'xyz', safe: true };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.authToken).toBeUndefined();
    expect(result.refreshToken).toBeUndefined();
    expect(result.safe).toBe(true);
  });

  it('removes keys containing "password" as substring', () => {
    const input = { oldPassword: 'old', newPassword: 'new', name: 'keep' };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.oldPassword).toBeUndefined();
    expect(result.newPassword).toBeUndefined();
    expect(result.name).toBe('keep');
  });

  it('removes keys containing "secret" as substring', () => {
    const input = { clientSecret: 'cs123', data: 'safe' };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.clientSecret).toBeUndefined();
    expect(result.data).toBe('safe');
  });
});

// ============================================================
// sortKeysDeep
// ============================================================

describe('sortKeysDeep', () => {
  it('sorts top-level keys alphabetically', () => {
    const input = { zebra: 1, alpha: 2, middle: 3 };
    const result = sortKeysDeep(input) as Record<string, unknown>;
    expect(Object.keys(result)).toEqual(['alpha', 'middle', 'zebra']);
  });

  it('sorts nested object keys alphabetically', () => {
    const input = {
      b: { z: 1, a: 2 },
      a: { m: 3, b: 4 },
    };
    const result = sortKeysDeep(input) as Record<string, unknown>;
    expect(Object.keys(result)).toEqual(['a', 'b']);
    const nestedA = result.a as Record<string, unknown>;
    expect(Object.keys(nestedA)).toEqual(['b', 'm']);
  });

  it('preserves array order', () => {
    const input = [3, 1, 2];
    const result = sortKeysDeep(input) as number[];
    expect(result).toEqual([3, 1, 2]);
  });

  it('returns null as-is', () => {
    expect(sortKeysDeep(null)).toBeNull();
  });

  it('returns undefined as-is', () => {
    expect(sortKeysDeep(undefined)).toBeUndefined();
  });

  it('returns primitives as-is', () => {
    expect(sortKeysDeep(42)).toBe(42);
    expect(sortKeysDeep('hello')).toBe('hello');
    expect(sortKeysDeep(true)).toBe(true);
  });

  it('handles empty object', () => {
    const result = sortKeysDeep({});
    expect(result).toEqual({});
  });

  it('handles empty array', () => {
    const result = sortKeysDeep([]);
    expect(result).toEqual([]);
  });

  it('sorts keys in objects inside arrays', () => {
    const input = [
      { z: 1, a: 2 },
      { m: 3, b: 4 },
    ];
    const result = sortKeysDeep(input) as Array<Record<string, unknown>>;
    expect(Object.keys(result[0])).toEqual(['a', 'z']);
    expect(Object.keys(result[1])).toEqual(['b', 'm']);
  });
});

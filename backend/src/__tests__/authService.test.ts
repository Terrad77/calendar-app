import { vi, describe, it, expect, beforeEach } from 'vitest';

// Direct unit tests for AuthService methods that the HTTP-level suites do not
// reach: social login, email verification, profile/settings updates, password
// change, account deletion, the static validators, and — crucially — the
// atomic refresh-token rotation. getDb, bcrypt, jwt and the mailer are mocked
// so nothing touches a real database or network.
const crypto = vi.hoisted(() => ({
  compareResult: true,
  verifyImpl: (): { userId: string; email: string } => ({ userId: 'u1', email: 'u1@example.com' }),
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(async () => 'hashed-pw'),
    compare: vi.fn(async () => crypto.compareResult),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'signed-token'),
    verify: vi.fn(() => crypto.verifyImpl()),
  },
}));

vi.mock('../services/mailerService.js', () => ({
  sendVerificationEmail: vi.fn(async () => {}),
}));

type Result = unknown[] | Error;

const dbState = {
  select: [] as Result[],
  selectIdx: 0,
  insert: [] as Result[],
  insertIdx: 0,
  update: [] as Result[],
  updateIdx: 0,
  delete: [] as Result[],
  deleteIdx: 0,
  setCaptured: [] as Record<string, unknown>[],
  // Transaction observability for the rotation atomicity test.
  txCalled: false,
  failInsertInTx: false,
  committedTxOps: [] as string[],
};

const resolveResult = (r: Result | undefined) =>
  r instanceof Error ? Promise.reject(r) : Promise.resolve(r ?? []);

const buildChain = (op: 'select' | 'insert' | 'update' | 'delete', result: Result | undefined) => {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'orderBy', 'limit', 'values', 'returning']) {
    chain[m] = () => chain;
  }
  chain.set = (v: Record<string, unknown>) => {
    if (op === 'update') dbState.setCaptured.push(v);
    return chain;
  };
  chain.then = (f: unknown, r: unknown) => resolveResult(result).then(f as never, r as never);
  chain.catch = (r: unknown) => resolveResult(result).catch(r as never);
  chain.finally = (f: unknown) => resolveResult(result).finally(f as never);
  return chain;
};

const dbMock = {
  select: () => buildChain('select', dbState.select[dbState.selectIdx++]),
  insert: () => buildChain('insert', dbState.insert[dbState.insertIdx++]),
  update: () => buildChain('update', dbState.update[dbState.updateIdx++]),
  delete: () => buildChain('delete', dbState.delete[dbState.deleteIdx++]),
  // Stage delete+insert and only "commit" them if the callback resolves; if it
  // throws, staged ops are discarded — exactly the all-or-nothing guarantee.
  transaction: async (cb: (tx: unknown) => Promise<void>) => {
    dbState.txCalled = true;
    const staged: string[] = [];
    const tx = {
      delete: () => ({
        where: () => {
          staged.push('delete');
          return Promise.resolve([]);
        },
      }),
      insert: () => ({
        values: () => {
          staged.push('insert');
          return dbState.failInsertInTx
            ? Promise.reject(new Error('insert failed mid-transaction'))
            : Promise.resolve([]);
        },
      }),
    };
    await cb(tx);
    dbState.committedTxOps.push(...staged);
  },
};

vi.mock('../db', () => ({ getDb: () => dbMock }));

import { authService, AuthService } from '../services/authService.js';

const resetDb = () => {
  dbState.select = [];
  dbState.selectIdx = 0;
  dbState.insert = [];
  dbState.insertIdx = 0;
  dbState.update = [];
  dbState.updateIdx = 0;
  dbState.delete = [];
  dbState.deleteIdx = 0;
  dbState.setCaptured = [];
  dbState.txCalled = false;
  dbState.failInsertInTx = false;
  dbState.committedTxOps = [];
};

describe('AuthService', () => {
  beforeEach(() => {
    resetDb();
    crypto.compareResult = true;
    crypto.verifyImpl = () => ({ userId: 'u1', email: 'u1@example.com' });
    vi.clearAllMocks();
  });

  describe('findOrCreateSocialUser', () => {
    it('adds googleId to an existing user that lacks one', async () => {
      dbState.select = [[{ id: 'u1', email: 'u1@example.com', googleId: null, password: 'x' }]];
      dbState.update = [[{ id: 'u1', email: 'u1@example.com', googleId: 'g-1' }]];
      dbState.insert = [[]]; // storeRefreshToken

      const result = await authService.findOrCreateSocialUser({
        email: 'U1@Example.com',
        name: 'U One',
        googleId: 'g-1',
      });

      expect(result.user).toMatchObject({ id: 'u1', googleId: 'g-1' });
      expect(result.user).not.toHaveProperty('password');
      expect(dbState.setCaptured[0]).toMatchObject({ googleId: 'g-1' });
    });

    it('does not overwrite an existing googleId', async () => {
      dbState.select = [[{ id: 'u1', email: 'u1@example.com', googleId: 'old', password: 'x' }]];
      dbState.update = [[{ id: 'u1', email: 'u1@example.com', googleId: 'old' }]];
      dbState.insert = [[]];

      await authService.findOrCreateSocialUser({
        email: 'u1@example.com',
        name: 'U One',
        googleId: 'new',
      });

      // Only updatedAt should be set — googleId is left untouched.
      expect(dbState.setCaptured[0]).not.toHaveProperty('googleId');
    });

    it('creates a new social user when none exists', async () => {
      dbState.select = [[]]; // no existing user
      dbState.insert = [[{ id: 'new', email: 'new@example.com', googleId: 'g-2' }], []];

      const result = await authService.findOrCreateSocialUser({
        email: 'new@example.com',
        name: 'New User',
        googleId: 'g-2',
      });

      expect(result.user).toMatchObject({ id: 'new' });
      expect(result.tokens.accessToken).toBe('signed-token');
    });

    it('throws when the new social user insert returns no row', async () => {
      dbState.select = [[]];
      dbState.insert = [[]]; // create returns nothing
      await expect(
        authService.findOrCreateSocialUser({ email: 'x@e.com', name: 'X', googleId: 'g' })
      ).rejects.toThrow('Failed to create social user');
    });

    it('rethrows on a database error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      dbState.select = [new Error('db exploded')];
      await expect(
        authService.findOrCreateSocialUser({ email: 'x@e.com', name: 'X', googleId: 'g' })
      ).rejects.toThrow('db exploded');
    });
  });

  describe('verifyEmail', () => {
    it('throws on an unknown token', async () => {
      dbState.select = [[]];
      await expect(authService.verifyEmail('nope')).rejects.toThrow('Invalid verification token');
    });

    it('clears the token and throws when it has expired', async () => {
      dbState.select = [[{ id: 'u1', verificationTokenExpiry: Date.now() - 1000 }]];
      dbState.update = [[]]; // clear update
      await expect(authService.verifyEmail('old')).rejects.toThrow(
        'Verification token has expired'
      );
      // The expiry-clear update ran.
      expect(dbState.setCaptured[0]).toMatchObject({ verificationToken: null });
    });

    it('marks the user verified on a valid token', async () => {
      dbState.select = [[{ id: 'u1', verificationTokenExpiry: null }]];
      dbState.update = [[{ id: 'u1', isVerified: true, password: 'x' }]];

      const user = await authService.verifyEmail('good');
      expect(user).toMatchObject({ id: 'u1', isVerified: true });
      expect(user).not.toHaveProperty('password');
    });

    it('throws when the verify update returns no row', async () => {
      dbState.select = [[{ id: 'u1', verificationTokenExpiry: null }]];
      dbState.update = [[]];
      await expect(authService.verifyEmail('good')).rejects.toThrow('Failed to verify user');
    });
  });

  describe('updateProfile', () => {
    it('sets only the provided fields and clears jobTitle on empty string', async () => {
      dbState.update = [[{ id: 'u1', name: 'New', password: 'x' }]];
      await authService.updateProfile('u1', {
        name: 'New',
        theme: 'dark',
        language: 'uk',
        preferredCountry: 'UA',
        jobTitle: '',
      });

      const set = dbState.setCaptured[0];
      expect(set).toMatchObject({
        name: 'New',
        theme: 'dark',
        language: 'uk',
        preferredCountry: 'UA',
        jobTitle: '', // empty string is a valid "clear", not skipped
      });
    });

    it('throws when the user does not exist', async () => {
      dbState.update = [[]];
      await expect(authService.updateProfile('ghost', { name: 'X' })).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('updateSettings', () => {
    it('persists settings including falsy booleans', async () => {
      dbState.update = [[{ id: 'u1', password: 'x' }]];
      await authService.updateSettings('u1', {
        startOfWeek: 'monday',
        compactDensity: false,
        emailDigest: false,
      });

      expect(dbState.setCaptured[0]).toMatchObject({
        startOfWeek: 'monday',
        compactDensity: false,
        emailDigest: false,
      });
    });

    it('throws when the user does not exist', async () => {
      dbState.update = [[]];
      await expect(authService.updateSettings('ghost', { timeZone: 'UTC' })).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('changePassword', () => {
    it('throws when the user is missing', async () => {
      dbState.select = [[]];
      await expect(authService.changePassword('u1', 'old', 'NewPass123')).rejects.toThrow(
        'User not found'
      );
    });

    it('rejects social-login accounts without a local password', async () => {
      dbState.select = [[{ id: 'u1', password: '' }]];
      await expect(authService.changePassword('u1', 'old', 'NewPass123')).rejects.toThrow(
        'social login'
      );
    });

    it('rejects an incorrect current password', async () => {
      dbState.select = [[{ id: 'u1', password: 'hash' }]];
      crypto.compareResult = false;
      await expect(authService.changePassword('u1', 'wrong', 'NewPass123')).rejects.toThrow(
        'Current password is incorrect'
      );
    });

    it('rejects a new password that fails policy', async () => {
      dbState.select = [[{ id: 'u1', password: 'hash' }]];
      crypto.compareResult = true;
      await expect(authService.changePassword('u1', 'old', 'short')).rejects.toThrow(
        'at least 8 characters'
      );
    });

    it('hashes and stores a valid new password', async () => {
      dbState.select = [[{ id: 'u1', password: 'hash' }]];
      dbState.update = [[]];
      crypto.compareResult = true;
      await expect(authService.changePassword('u1', 'old', 'NewPass123')).resolves.toBeUndefined();
      expect(dbState.setCaptured[0]).toMatchObject({ password: 'hashed-pw' });
    });
  });

  describe('deleteAccount', () => {
    it('throws when the user is missing', async () => {
      dbState.select = [[]];
      await expect(authService.deleteAccount('u1', 'pw')).rejects.toThrow('User not found');
    });

    it('requires a password for a local account', async () => {
      dbState.select = [[{ id: 'u1', password: 'hash' }]];
      await expect(authService.deleteAccount('u1')).rejects.toThrow('Password is required');
    });

    it('rejects an incorrect password', async () => {
      dbState.select = [[{ id: 'u1', password: 'hash' }]];
      crypto.compareResult = false;
      await expect(authService.deleteAccount('u1', 'wrong')).rejects.toThrow(
        'Password is incorrect'
      );
    });

    it('deletes a local account with the correct password', async () => {
      dbState.select = [[{ id: 'u1', password: 'hash' }]];
      dbState.delete = [[], []]; // refreshTokens, then users
      crypto.compareResult = true;
      await expect(authService.deleteAccount('u1', 'right')).resolves.toBeUndefined();
      expect(dbState.deleteIdx).toBe(2);
    });

    it('deletes a social account without a password check', async () => {
      dbState.select = [[{ id: 'u1', password: '' }]];
      dbState.delete = [[], []];
      await expect(authService.deleteAccount('u1')).resolves.toBeUndefined();
      expect(dbState.deleteIdx).toBe(2);
    });
  });

  describe('refreshAccessToken (atomic rotation)', () => {
    it('throws when the refresh token is not stored', async () => {
      dbState.select = [[]];
      await expect(authService.refreshAccessToken('tok')).rejects.toThrow('Invalid refresh token');
    });

    it('rotates inside a transaction and commits both writes together', async () => {
      dbState.select = [[{ token: 'tok', userId: 'u1' }]];
      const tokens = await authService.refreshAccessToken('tok');

      expect(tokens.accessToken).toBe('signed-token');
      expect(dbState.txCalled).toBe(true);
      // Both writes committed as a unit.
      expect(dbState.committedTxOps).toEqual(['delete', 'insert']);
    });

    it('rolls back atomically when the insert fails mid-transaction', async () => {
      dbState.select = [[{ token: 'tok', userId: 'u1' }]];
      dbState.delete = [[]]; // the catch-path cleanup delete on the main connection
      dbState.failInsertInTx = true;

      await expect(authService.refreshAccessToken('tok')).rejects.toThrow(
        'Invalid or expired refresh token'
      );
      // The delete was staged before the insert failed, but nothing committed:
      // all-or-nothing held — no partial state where the old token is gone but
      // the new one was never written.
      expect(dbState.committedTxOps).toEqual([]);
    });

    it('clears the token and throws when jwt verification fails', async () => {
      dbState.select = [[{ token: 'tok', userId: 'u1' }]];
      dbState.delete = [[]];
      crypto.verifyImpl = () => {
        throw new Error('bad signature');
      };
      await expect(authService.refreshAccessToken('tok')).rejects.toThrow(
        'Invalid or expired refresh token'
      );
      expect(dbState.txCalled).toBe(false);
    });
  });

  describe('static validators', () => {
    it('isValidEmail accepts a well-formed address and rejects a bad one', () => {
      expect(AuthService.isValidEmail('user@example.com')).toBe(true);
      expect(AuthService.isValidEmail('not-an-email')).toBe(false);
    });

    it('isValidPassword enforces each rule', () => {
      expect(AuthService.isValidPassword('Ab1')).toMatchObject({
        valid: false,
        message: expect.stringContaining('8 characters'),
      });
      expect(AuthService.isValidPassword('lowercase1')).toMatchObject({
        valid: false,
        message: expect.stringContaining('uppercase'),
      });
      expect(AuthService.isValidPassword('UPPERCASE1')).toMatchObject({
        valid: false,
        message: expect.stringContaining('lowercase'),
      });
      expect(AuthService.isValidPassword('NoNumbersHere')).toMatchObject({
        valid: false,
        message: expect.stringContaining('number'),
      });
      expect(AuthService.isValidPassword('ValidPass1')).toEqual({ valid: true });
    });
  });
});

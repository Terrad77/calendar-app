import request from 'supertest';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Deterministic unit coverage for the auth endpoints that the real-DB
// integration suite (auth.test.ts) does not exercise: /me edge cases,
// /verify, /verify-email, the Google OAuth gates/callback, profile,
// settings, change-password and account deletion. authService, the Google
// config flag and passport are all mocked so this runs without a database
// (and in CI, where the integration suite skips).
const mocks = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(() => ({ userId: 'test-user', email: 'me@example.com' })),
  getUserById: vi.fn(),
  verifyEmail: vi.fn(),
  findOrCreateSocialUser: vi.fn(),
  updateProfile: vi.fn(),
  updateSettings: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
}));

const oauthState = vi.hoisted(() => ({
  configured: true,
  socialUser: undefined as unknown,
}));

vi.mock('../services/authService', () => ({
  authService: {
    verifyAccessToken: mocks.verifyAccessToken,
    getUserById: mocks.getUserById,
    verifyEmail: mocks.verifyEmail,
    findOrCreateSocialUser: mocks.findOrCreateSocialUser,
    updateProfile: mocks.updateProfile,
    updateSettings: mocks.updateSettings,
    changePassword: mocks.changePassword,
    deleteAccount: mocks.deleteAccount,
    register: vi.fn(),
    login: vi.fn(),
    refreshAccessToken: vi.fn(),
    logout: vi.fn(),
  },
  AuthService: {
    isValidEmail: () => true,
    isValidPassword: () => ({ valid: true }),
  },
}));

vi.mock('../config/passport', () => ({
  default: { initialize: () => (_req: unknown, _res: unknown, next: () => void) => next() },
  get isGoogleOAuthConfigured() {
    return oauthState.configured;
  },
}));

// passport.authenticate: for the callback route (it passes failureRedirect) we
// assign the configured social user and continue; for /google we simulate the
// provider redirect.
vi.mock('passport', () => ({
  default: {
    authenticate:
      (_strategy: string, opts: { failureRedirect?: string }) =>
      (req: { user?: unknown }, res: { redirect: (u: string) => void }, next: () => void) => {
        if (opts && opts.failureRedirect) {
          req.user = oauthState.socialUser;
          next();
        } else {
          res.redirect('https://accounts.google.com/o/oauth2/v2/auth');
        }
      },
  },
}));

import app from '../app.js';

const auth = { Authorization: 'Bearer faketoken' };

describe('Auth router (mocked service)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyAccessToken.mockReturnValue({ userId: 'test-user', email: 'me@example.com' });
    oauthState.configured = true;
    oauthState.socialUser = undefined;
  });

  afterEach(() => vi.restoreAllMocks());

  describe('GET /api/auth/me', () => {
    it('returns 404 when the user no longer exists', async () => {
      mocks.getUserById.mockResolvedValue(null);
      const res = await request(app).get('/api/auth/me').set(auth);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('returns 500 when the lookup throws', async () => {
      mocks.getUserById.mockRejectedValue(new Error('db down'));
      const res = await request(app).get('/api/auth/me').set(auth);
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to get user profile');
    });

    it('returns 200 with the user when found', async () => {
      mocks.getUserById.mockResolvedValue({ id: 'test-user', email: 'me@example.com' });
      const res = await request(app).get('/api/auth/me').set(auth);
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ id: 'test-user' });
    });
  });

  describe('GET /api/auth/verify', () => {
    it('echoes the authenticated user with valid:true', async () => {
      const res = await request(app).get('/api/auth/verify').set(auth);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ valid: true, user: { userId: 'test-user' } });
    });
  });

  describe('GET /api/auth/verify-email', () => {
    it('redirects to verification-failed when the token is missing', async () => {
      const res = await request(app).get('/api/auth/verify-email');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/verification-failed?reason=missing_token');
    });

    it('redirects to verification-success on a valid token', async () => {
      mocks.verifyEmail.mockResolvedValue({ id: 'u1' });
      const res = await request(app).get('/api/auth/verify-email?token=good');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/verification-success?user_id=u1');
    });

    it('redirects to verification-failed with the reason on an invalid token', async () => {
      mocks.verifyEmail.mockRejectedValue(new Error('expired'));
      const res = await request(app).get('/api/auth/verify-email?token=bad');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/verification-failed?reason=expired');
    });
  });

  describe('GET /api/auth/google', () => {
    it('returns 503 when Google OAuth is not configured', async () => {
      oauthState.configured = false;
      const res = await request(app).get('/api/auth/google');
      expect(res.status).toBe(503);
      expect(res.body.error).toBe('Google OAuth is not configured');
    });

    it('redirects to the provider when configured', async () => {
      const res = await request(app).get('/api/auth/google');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('accounts.google.com');
    });
  });

  describe('GET /api/auth/google/callback', () => {
    it('returns 503 when Google OAuth is not configured', async () => {
      oauthState.configured = false;
      const res = await request(app).get('/api/auth/google/callback');
      expect(res.status).toBe(503);
    });

    it('redirects to signin with an error when no profile is present', async () => {
      oauthState.socialUser = undefined;
      const res = await request(app).get('/api/auth/google/callback');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/signin?error=auth_failed');
    });

    it('redirects to auth/success with tokens on a valid profile', async () => {
      oauthState.socialUser = { email: 'social@example.com' };
      mocks.findOrCreateSocialUser.mockResolvedValue({
        tokens: { accessToken: 'acc', refreshToken: 'ref' },
      });
      const res = await request(app).get('/api/auth/google/callback');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/auth/success?accessToken=acc&refreshToken=ref');
    });

    it('redirects to signin with an error when token creation throws', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      oauthState.socialUser = { email: 'social@example.com' };
      mocks.findOrCreateSocialUser.mockRejectedValue(new Error('oauth boom'));
      const res = await request(app).get('/api/auth/google/callback');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/signin?error=auth_failed');
    });
  });

  describe('PUT/PATCH /api/auth/profile', () => {
    it('returns 400 when no updatable field is provided', async () => {
      const res = await request(app).put('/api/auth/profile').set(auth).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
    });

    it('updates the profile and returns 200', async () => {
      mocks.updateProfile.mockResolvedValue({ id: 'test-user', name: 'New Name' });
      const res = await request(app).put('/api/auth/profile').set(auth).send({ name: 'New Name' });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ name: 'New Name' });
    });

    it('returns 400 when the service throws', async () => {
      mocks.updateProfile.mockRejectedValue(new Error('cannot update'));
      const res = await request(app).put('/api/auth/profile').set(auth).send({ name: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Failed to update profile');
    });

    it('supports PATCH with the same handler', async () => {
      mocks.updateProfile.mockResolvedValue({ id: 'test-user', jobTitle: 'Dev' });
      const res = await request(app).patch('/api/auth/profile').set(auth).send({ jobTitle: 'Dev' });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ jobTitle: 'Dev' });
    });
  });

  describe('PUT /api/auth/settings', () => {
    it('returns 400 when no settings field is provided', async () => {
      const res = await request(app).put('/api/auth/settings').set(auth).send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No settings fields provided');
    });

    it('saves the settings and returns 200', async () => {
      mocks.updateSettings.mockResolvedValue({ id: 'test-user', startOfWeek: 'Monday' });
      const res = await request(app)
        .put('/api/auth/settings')
        .set(auth)
        .send({ startOfWeek: 'Monday' });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ startOfWeek: 'Monday' });
    });

    it('rejects a numeric startOfWeek', async () => {
      const res = await request(app).put('/api/auth/settings').set(auth).send({ startOfWeek: 1 });
      expect(res.status).toBe(400);
    });

    it('rejects a localized startOfWeek value', async () => {
      const res = await request(app)
        .put('/api/auth/settings')
        .set(auth)
        .send({ startOfWeek: 'Неділя' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when the service throws', async () => {
      mocks.updateSettings.mockRejectedValue(new Error('bad settings'));
      const res = await request(app).put('/api/auth/settings').set(auth).send({ timeZone: 'UTC' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Failed to save settings');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('returns 400 when a password field is missing', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set(auth)
        .send({ oldPassword: 'old' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Old password and new password are required');
    });

    it('returns 400 when the new password equals the old one', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set(auth)
        .send({ oldPassword: 'same', newPassword: 'same' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('New password must be different from current password');
    });

    it('changes the password and returns 200', async () => {
      mocks.changePassword.mockResolvedValue(undefined);
      const res = await request(app)
        .post('/api/auth/change-password')
        .set(auth)
        .send({ oldPassword: 'old', newPassword: 'new' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password changed successfully');
    });

    it('returns 400 when the service throws', async () => {
      mocks.changePassword.mockRejectedValue(new Error('wrong old password'));
      const res = await request(app)
        .post('/api/auth/change-password')
        .set(auth)
        .send({ oldPassword: 'old', newPassword: 'new' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('wrong old password');
    });
  });

  describe('DELETE /api/auth/account', () => {
    it('returns 400 when no password is given for a non-Google account', async () => {
      mocks.getUserById.mockResolvedValue({ id: 'test-user', googleId: null });
      const res = await request(app).delete('/api/auth/account').set(auth).send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Password is required to delete account');
    });

    it('deletes a Google account without a password', async () => {
      mocks.getUserById.mockResolvedValue({ id: 'test-user', googleId: 'g-1' });
      mocks.deleteAccount.mockResolvedValue(undefined);
      const res = await request(app).delete('/api/auth/account').set(auth).send({});
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Account deleted successfully');
    });

    it('deletes a password account when the password is provided', async () => {
      mocks.deleteAccount.mockResolvedValue(undefined);
      const res = await request(app).delete('/api/auth/account').set(auth).send({ password: 'pw' });
      expect(res.status).toBe(200);
      // The password short-circuits the googleId lookup.
      expect(mocks.getUserById).not.toHaveBeenCalled();
    });

    it('returns 400 when deletion throws', async () => {
      mocks.deleteAccount.mockRejectedValue(new Error('cannot delete'));
      const res = await request(app).delete('/api/auth/account').set(auth).send({ password: 'pw' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Account deletion failed');
    });
  });
});

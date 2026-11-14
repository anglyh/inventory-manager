import type { PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IRefreshTokenRepository } from '../../interfaces/repositories/refresh-token.repository.interface.js';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.js';
import type { RefreshTokenRecord } from '../../models/refresh-token.model.js';
import type { User } from '../../models/user.model.js';
import { REFRESH_TTL_MS, REUSE_GRACE_MS, SESSION_TTL_MS } from '../../config/session.js';
import { UnauthorizedError } from '../../errors/app.error.js';
import RefreshToken from '../../lib/refresh-token.js';
import RefreshTokenService from '../../services/refresh-token.service.js';

vi.mock('../../lib/jwt.js', () => ({
  default: { signAccessToken: vi.fn(() => 'signed-access-token') },
}));
vi.mock('../../db/transactions.js', () => ({
  withTransaction: vi.fn(async (callback: (client: PoolClient) => Promise<unknown>) => callback({} as PoolClient)),
}));

const NOW = new Date('2026-11-13T12:00:00Z').getTime();

const user: User = {
  id: '11111111-1111-4111-8111-111111111111',
  storeId: '22222222-2222-4222-8222-222222222222',
  name: 'Juan Pérez',
  email: 'juan@example.com',
  password: 'hashed-password',
  role: 'ADMIN',
  active: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const record = (overrides: Partial<RefreshTokenRecord> = {}): RefreshTokenRecord => ({
  id: 'token-1',
  userId: user.id,
  tokenHash: RefreshToken.hash('presented-token'),
  familyId: 'family-1',
  expiresAt: new Date(NOW + 60_000),
  sessionExpiresAt: new Date(NOW + SESSION_TTL_MS),
  revokedAt: null,
  createdAt: new Date(NOW - 60_000),
  ...overrides,
});

const repo = {
  create: vi.fn(), findByHashForUpdate: vi.fn(), hasActiveInFamily: vi.fn(),
  revoke: vi.fn(), revokeFamily: vi.fn(), revokeAllForUser: vi.fn(),
} as unknown as IRefreshTokenRepository;
const userRepo = { findById: vi.fn() } as unknown as IUserRepository;
const service = new RefreshTokenService(repo, userRepo);

describe('RefreshTokenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.mocked(repo.create).mockImplementation(async data => record({ ...data, id: 'token-2', revokedAt: null }));
    vi.mocked(userRepo.findById).mockResolvedValue(user);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('issue', () => {
    it('stores only the hash of a new random token in a new family', async () => {
      const result = await service.issue(user);

      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes, base64url
      const stored = vi.mocked(repo.create).mock.calls[0]![0];
      expect(stored.tokenHash).toBe(RefreshToken.hash(result.refreshToken));
      expect(stored.tokenHash).not.toContain(result.refreshToken);
      expect(stored.expiresAt.getTime()).toBe(NOW + REFRESH_TTL_MS);
      expect(stored.sessionExpiresAt.getTime()).toBe(NOW + SESSION_TTL_MS);
    });

    it('every login starts its own family', async () => {
      await service.issue(user);
      await service.issue(user);
      const [first, second] = vi.mocked(repo.create).mock.calls.map(call => call[0].familyId);
      expect(first).not.toBe(second);
    });
  });

  describe('refresh', () => {
    it('rotates: spends the presented token and issues a new one in the same family', async () => {
      vi.mocked(repo.findByHashForUpdate).mockResolvedValue(record());

      const result = await service.refresh('presented-token');

      expect(repo.findByHashForUpdate).toHaveBeenCalledWith(RefreshToken.hash('presented-token'), expect.anything());
      expect(repo.revoke).toHaveBeenCalledWith('token-1', new Date(NOW), expect.anything());
      const created = vi.mocked(repo.create).mock.calls[0]![0];
      expect(created.familyId).toBe('family-1');
      expect(created.tokenHash).toBe(RefreshToken.hash(result.refreshToken));
      expect(result.refreshToken).not.toBe('presented-token');
      expect(result).toMatchObject({ accessToken: 'signed-access-token', user });
      expect(repo.revokeFamily).not.toHaveBeenCalled();
    });

    it('never extends the session past its absolute limit', async () => {
      const sessionEnd = new Date(NOW + 60 * 60 * 1000); // 1 hour left
      vi.mocked(repo.findByHashForUpdate).mockResolvedValue(record({ sessionExpiresAt: sessionEnd }));

      await service.refresh('presented-token');

      const created = vi.mocked(repo.create).mock.calls[0]![0];
      expect(created.expiresAt).toEqual(sessionEnd);
      expect(created.sessionExpiresAt).toEqual(sessionEnd);
    });

    it('rejects an unknown token', async () => {
      vi.mocked(repo.findByHashForUpdate).mockResolvedValue(null);

      await expect(service.refresh('forged')).rejects.toBeInstanceOf(UnauthorizedError);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects an expired token without issuing a new one', async () => {
      vi.mocked(repo.findByHashForUpdate).mockResolvedValue(record({ expiresAt: new Date(NOW - 1) }));

      await expect(service.refresh('presented-token')).rejects.toBeInstanceOf(UnauthorizedError);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects a session past its absolute limit', async () => {
      vi.mocked(repo.findByHashForUpdate).mockResolvedValue(record({ sessionExpiresAt: new Date(NOW) }));

      await expect(service.refresh('presented-token')).rejects.toBeInstanceOf(UnauthorizedError);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('reuse of a token rotated long ago revokes the whole family', async () => {
      vi.mocked(repo.findByHashForUpdate).mockResolvedValue(record({ revokedAt: new Date(NOW - REUSE_GRACE_MS - 1) }));
      vi.mocked(repo.hasActiveInFamily).mockResolvedValue(true);

      await expect(service.refresh('presented-token')).rejects.toBeInstanceOf(UnauthorizedError);
      expect(repo.revokeFamily).toHaveBeenCalledWith('family-1', expect.anything());
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('a parallel refresh (another tab) within the grace period gets its own token', async () => {
      vi.mocked(repo.findByHashForUpdate).mockResolvedValue(record({ revokedAt: new Date(NOW - 2_000) }));
      vi.mocked(repo.hasActiveInFamily).mockResolvedValue(true);

      const result = await service.refresh('presented-token');

      expect(result.accessToken).toBe('signed-access-token');
      expect(repo.revokeFamily).not.toHaveBeenCalled();
      expect(repo.revoke).not.toHaveBeenCalled(); // already spent by the other tab
      expect(vi.mocked(repo.create).mock.calls[0]![0].familyId).toBe('family-1');
    });

    it('the grace period never revives a session closed by logout', async () => {
      vi.mocked(repo.findByHashForUpdate).mockResolvedValue(record({ revokedAt: new Date(NOW - 2_000) }));
      vi.mocked(repo.hasActiveInFamily).mockResolvedValue(false);

      await expect(service.refresh('presented-token')).rejects.toBeInstanceOf(UnauthorizedError);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('a deactivated user cannot renew and their session is revoked', async () => {
      vi.mocked(repo.findByHashForUpdate).mockResolvedValue(record());
      vi.mocked(userRepo.findById).mockResolvedValue({ ...user, active: false });

      await expect(service.refresh('presented-token')).rejects.toBeInstanceOf(UnauthorizedError);
      expect(repo.revokeFamily).toHaveBeenCalledWith('family-1');
    });

    it('a deleted user cannot renew', async () => {
      vi.mocked(repo.findByHashForUpdate).mockResolvedValue(record());
      vi.mocked(userRepo.findById).mockResolvedValue(null);

      await expect(service.refresh('presented-token')).rejects.toBeInstanceOf(UnauthorizedError);
      expect(repo.revokeFamily).toHaveBeenCalledWith('family-1');
    });
  });

  describe('logout', () => {
    it('revokes the whole family of the presented token', async () => {
      vi.mocked(repo.findByHashForUpdate).mockResolvedValue(record());

      await service.logout('presented-token');

      expect(repo.revokeFamily).toHaveBeenCalledWith('family-1', expect.anything());
    });

    it('is a no-op for an unknown token', async () => {
      vi.mocked(repo.findByHashForUpdate).mockResolvedValue(null);

      await expect(service.logout('forged')).resolves.toBeUndefined();
      expect(repo.revokeFamily).not.toHaveBeenCalled();
    });
  });
});

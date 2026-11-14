import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { IRefreshTokenService } from '../interfaces/services/refresh-token.service.interface.js';
import type { User } from '../models/user.model.js';
import type { RefreshTokenRecord } from '../models/refresh-token.model.js';
import type { IRefreshTokenRepository } from '../interfaces/repositories/refresh-token.repository.interface.js';
import RefreshToken from '../lib/refresh-token.js';
import JWT from '../lib/jwt.js';
import { withTransaction } from '../db/transactions.js';
import { UnauthorizedError } from '../errors/app.error.js';
import type { IUserRepository } from '../interfaces/repositories/user.repository.interface.js';
import { REFRESH_TTL_MS, REUSE_GRACE_MS, SESSION_TTL_MS } from '../config/session.js';

type RotationResult =
  | { ok: false }
  | { ok: true; userId: string; familyId: string; refreshToken: string };

const INVALID_SESSION = 'Sesión inválida';

export default class RefreshTokenService implements IRefreshTokenService {

  constructor(
    private refreshTokenRepo: IRefreshTokenRepository,
    private userRepo: IUserRepository
  ) { }

  async issue(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const now = Date.now();
    const { token, hash } = RefreshToken.generate();

    await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: hash,
      familyId: randomUUID(),
      expiresAt: new Date(now + REFRESH_TTL_MS),
      sessionExpiresAt: new Date(now + SESSION_TTL_MS),
    });

    return { accessToken: this.signFor(user), refreshToken: token };
  }

  /**
   * Rotates the refresh token: the presented one is spent and a new one of the same
   * family is returned. Presenting a spent token after the grace period means it was
   * copied, so the whole family (session) is revoked.
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const hash = RefreshToken.hash(refreshToken);

    const result = await withTransaction<RotationResult>(async client => {
      const record = await this.refreshTokenRepo.findByHashForUpdate(hash, client);
      if (!record) return { ok: false };

      const now = Date.now();
      if (record.sessionExpiresAt.getTime() <= now || record.expiresAt.getTime() <= now) return { ok: false };

      if (record.revokedAt && !(await this.isConcurrentRotation(record, now, client))) {
        await this.refreshTokenRepo.revokeFamily(record.familyId, client);
        return { ok: false };
      }

      if (!record.revokedAt) await this.refreshTokenRepo.revoke(record.id, new Date(now), client);

      const { token, hash: newHash } = RefreshToken.generate();
      await this.refreshTokenRepo.create({
        userId: record.userId,
        tokenHash: newHash,
        familyId: record.familyId,
        // A rotation never extends the session beyond its absolute limit.
        expiresAt: new Date(Math.min(now + REFRESH_TTL_MS, record.sessionExpiresAt.getTime())),
        sessionExpiresAt: record.sessionExpiresAt,
      }, client);

      return { ok: true, userId: record.userId, familyId: record.familyId, refreshToken: token };
    });

    if (!result.ok) throw new UnauthorizedError(INVALID_SESSION);

    const user = await this.userRepo.findById(result.userId);
    // A deactivated (or deleted) user cannot keep renewing: end the session for good.
    if (!user || !user.active) {
      await this.refreshTokenRepo.revokeFamily(result.familyId);
      throw new UnauthorizedError(INVALID_SESSION);
    }

    return { accessToken: this.signFor(user), refreshToken: result.refreshToken, user };
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = RefreshToken.hash(refreshToken);

    await withTransaction<void>(async client => {
      const record = await this.refreshTokenRepo.findByHashForUpdate(hash, client);
      if (!record) return;
      await this.refreshTokenRepo.revokeFamily(record.familyId, client);
    });
  }

  revokeAllForUser(userId: string): Promise<void> {
    return this.refreshTokenRepo.revokeAllForUser(userId);
  }

  /** Spent a moment ago by a parallel refresh (another tab) while the session is still alive. */
  private async isConcurrentRotation(record: RefreshTokenRecord, now: number, client: PoolClient): Promise<boolean> {
    if (!record.revokedAt || now - record.revokedAt.getTime() > REUSE_GRACE_MS) return false;
    return this.refreshTokenRepo.hasActiveInFamily(record.familyId, client);
  }

  private signFor(user: User): string {
    return JWT.signAccessToken({
      userId: user.id,
      storeId: user.storeId,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }
}

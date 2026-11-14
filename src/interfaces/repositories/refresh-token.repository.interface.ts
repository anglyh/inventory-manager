import type { PoolClient } from 'pg';
import type { RefreshTokenRecord } from '../../models/refresh-token.model.js';

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  sessionExpiresAt: Date;
}

export interface IRefreshTokenRepository {
  create(data: CreateRefreshTokenInput, client?: PoolClient): Promise<RefreshTokenRecord>;
  findByHashForUpdate(hash: string, client: PoolClient): Promise<RefreshTokenRecord | null>;
  /** True while the family still has a token that was neither rotated nor revoked. */
  hasActiveInFamily(familyId: string, client: PoolClient): Promise<boolean>;
  /** Marks one token as used by a rotation, at the given time (app clock, compared later by the service). */
  revoke(id: string, revokedAt: Date, client?: PoolClient): Promise<void>;
  revokeFamily(familyId: string, client?: PoolClient): Promise<void>;
  revokeAllForUser(userId: string, client?: PoolClient): Promise<void>;
}

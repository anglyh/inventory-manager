import type { PoolClient } from 'pg';
import { query } from '../db/index.js';
import type { CreateRefreshTokenInput, IRefreshTokenRepository } from '../interfaces/repositories/refresh-token.repository.interface.js';
import { TABLES } from '../db/tables.js';
import { snakeToCamel } from '../utils/mapper.js';
import type { RefreshTokenRecord } from '../models/refresh-token.model.js';

export default class RefreshTokenRepository implements IRefreshTokenRepository {

  private run(text: string, params: unknown[], client?: PoolClient) {
    return client ? client.query(text, params) : query(text, params);
  }

  async create(data: CreateRefreshTokenInput, client?: PoolClient): Promise<RefreshTokenRecord> {
    const { userId, tokenHash, familyId, expiresAt, sessionExpiresAt } = data;
    const text = `INSERT INTO ${TABLES.REFRESH_TOKEN} (user_id, token_hash, family_id, expires_at, session_expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const { rows } = await this.run(text, [userId, tokenHash, familyId, expiresAt, sessionExpiresAt], client);
    return snakeToCamel(rows[0]);
  }

  async findByHashForUpdate(hash: string, client: PoolClient): Promise<RefreshTokenRecord | null> {
    const text = `SELECT * FROM ${TABLES.REFRESH_TOKEN} WHERE token_hash = $1 FOR UPDATE`;
    const { rows } = await client.query(text, [hash]);
    return rows[0] ? snakeToCamel(rows[0]) : null;
  }

  async hasActiveInFamily(familyId: string, client: PoolClient): Promise<boolean> {
    const text = `SELECT EXISTS (SELECT 1 FROM ${TABLES.REFRESH_TOKEN} WHERE family_id = $1 AND revoked_at IS NULL) AS active`;
    const { rows } = await client.query(text, [familyId]);
    return rows[0]?.active === true;
  }

  async revoke(id: string, revokedAt: Date, client?: PoolClient): Promise<void> {
    const text = `UPDATE ${TABLES.REFRESH_TOKEN} SET revoked_at = $2 WHERE id = $1`;
    await this.run(text, [id, revokedAt], client);
  }

  async revokeFamily(familyId: string, client?: PoolClient): Promise<void> {
    const text = `UPDATE ${TABLES.REFRESH_TOKEN} SET revoked_at = NOW() WHERE family_id = $1 AND revoked_at IS NULL`;
    await this.run(text, [familyId], client);
  }

  async revokeAllForUser(userId: string, client?: PoolClient): Promise<void> {
    const text = `UPDATE ${TABLES.REFRESH_TOKEN} SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`;
    await this.run(text, [userId], client);
  }
}

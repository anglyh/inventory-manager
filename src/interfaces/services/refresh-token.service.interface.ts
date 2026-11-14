import type { User } from '../../models/user.model.js';

export interface IRefreshTokenService {
  issue(user: User): Promise<{ accessToken: string; refreshToken: string }>;
  refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; user: User }>;
  logout(refreshToken: string): Promise<void>;
  /** Ends every session of the user, e.g. when an admin deactivates them. */
  revokeAllForUser(userId: string): Promise<void>;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  sessionExpiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}
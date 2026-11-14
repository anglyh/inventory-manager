import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.js';
import type { IRefreshTokenService } from '../../interfaces/services/refresh-token.service.interface.js';
import type { User } from '../../models/user.model.js';
import type { TokenPayload } from '../../lib/jwt.js';
import { sessionUserSchema } from '../../schemas/user.schema.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../errors/app.error.js';
import UserService from '../../services/user.service.js';

// Keep tests fast and independent of bcrypt cost.
vi.mock('bcrypt-ts', () => ({
  hash: vi.fn(async () => 'hashed-password'),
  compare: vi.fn(async () => true),
}));

const storedUser: User = {
  id: '11111111-1111-4111-8111-111111111111',
  storeId: '22222222-2222-4222-8222-222222222222',
  name: 'Juan Pérez',
  email: 'juan@example.com',
  password: 'hashed-password',
  role: 'ADMIN',
  active: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const expectedUser = {
  id: storedUser.id,
  name: storedUser.name,
  email: storedUser.email,
  role: storedUser.role,
};

const repository = {
  listStoreUsers: vi.fn(), createStoreUser: vi.fn(), setStoreUserActive: vi.fn(),
  create: vi.fn(), findByEmail: vi.fn(), findById: vi.fn(), hasAnyUser: vi.fn(),
} as unknown as IUserRepository;
const sessions = {
  issue: vi.fn(), refresh: vi.fn(), logout: vi.fn(), revokeAllForUser: vi.fn(),
} as unknown as IRefreshTokenService;
const service = new UserService(repository, sessions);

describe('UserService session user shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sessions.issue).mockResolvedValue({ accessToken: 'signed-token', refreshToken: 'cookie-token' });
  });

  it('login returns the session user with role and no private fields', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(storedUser);

    const result = await service.login({ email: storedUser.email, password: 'Secret1234567' });

    expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'cookie-token', user: expectedUser });
    expect(sessionUserSchema.strict().safeParse(result.user).success).toBe(true);
    expect(sessions.issue).toHaveBeenCalledWith(storedUser);
  });

  it('login of a deactivated user opens no session', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue({ ...storedUser, active: false });

    await expect(service.login({ email: storedUser.email, password: 'Secret1234567' }))
      .rejects.toBeInstanceOf(UnauthorizedError);
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('register returns the session user with role and no private fields', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(null);
    vi.mocked(repository.create).mockResolvedValue(storedUser);

    const result = await service.register({
      name: storedUser.name, email: storedUser.email, password: 'Secret1234567',
    });

    expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'cookie-token', user: expectedUser });
    expect(sessionUserSchema.strict().safeParse(result.user).success).toBe(true);
  });

  it('register is closed once a user exists', async () => {
    vi.mocked(repository.hasAnyUser).mockResolvedValueOnce(true);

    await expect(service.register({
      name: 'Intruso', email: 'otro@example.com', password: 'Secret1234567',
    })).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.create).not.toHaveBeenCalled();
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('refreshSession returns the rotated tokens and the session user shape', async () => {
    vi.mocked(sessions.refresh).mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-cookie', user: storedUser });

    const result = await service.refreshSession('old-cookie');

    expect(sessions.refresh).toHaveBeenCalledWith('old-cookie');
    expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-cookie', user: expectedUser });
    expect(sessionUserSchema.strict().safeParse(result.user).success).toBe(true);
  });

  it('getSession maps the JWT payload to the same session user', () => {
    const payload = {
      userId: storedUser.id,
      storeId: storedUser.storeId,
      name: storedUser.name,
      email: storedUser.email,
      role: storedUser.role,
      iat: 1_700_000_000,
      exp: 1_700_600_000,
    } as TokenPayload;

    const result = service.getSession(payload, 'bearer-token');

    expect(result).toEqual({ accessToken: 'bearer-token', user: expectedUser });
    expect(sessionUserSchema.strict().safeParse(result.user).success).toBe(true);
  });
});

describe('UserService.setStoreUserActive', () => {
  const storeUser = { id: storedUser.id, name: storedUser.name, email: storedUser.email, role: 'GUEST' as const, active: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deactivating a user ends all their sessions', async () => {
    vi.mocked(repository.setStoreUserActive).mockResolvedValue(storeUser);

    await expect(service.setStoreUserActive(storedUser.storeId, storedUser.id, false)).resolves.toEqual(storeUser);
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(storedUser.id);
  });

  it('reactivating a user does not touch sessions', async () => {
    vi.mocked(repository.setStoreUserActive).mockResolvedValue({ ...storeUser, active: true });

    await service.setStoreUserActive(storedUser.storeId, storedUser.id, true);
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('an unknown user is not found and no session is revoked', async () => {
    vi.mocked(repository.setStoreUserActive).mockResolvedValue(null);

    await expect(service.setStoreUserActive(storedUser.storeId, storedUser.id, false))
      .rejects.toBeInstanceOf(NotFoundError);
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
  });
});

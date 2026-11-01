import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.js';
import type { User } from '../../models/user.model.js';
import type { TokenPayload } from '../../lib/jwt.js';
import { sessionUserSchema } from '../../schemas/user.schema.js';
import UserService from '../../services/user.service.js';

// Keep tests fast and independent of JWT_SECRET / bcrypt cost.
vi.mock('../../lib/jwt.js', () => ({
  default: { signAccessToken: vi.fn(() => 'signed-token') },
}));
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
  create: vi.fn(), findByEmail: vi.fn(), findById: vi.fn(),
} as unknown as IUserRepository;
const service = new UserService(repository);

describe('UserService session user shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login returns the session user with role and no private fields', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(storedUser);

    const result = await service.login({ email: storedUser.email, password: 'Secret1234567' });

    expect(result).toEqual({ token: 'signed-token', user: expectedUser });
    expect(sessionUserSchema.strict().safeParse(result.user).success).toBe(true);
  });

  it('register returns the session user with role and no private fields', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(null);
    vi.mocked(repository.create).mockResolvedValue(storedUser);

    const result = await service.register({
      name: storedUser.name, email: storedUser.email, password: 'Secret1234567',
    });

    expect(result).toEqual({ token: 'signed-token', user: expectedUser });
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

    expect(result).toEqual({ token: 'bearer-token', user: expectedUser });
    expect(sessionUserSchema.strict().safeParse(result.user).success).toBe(true);
  });
});

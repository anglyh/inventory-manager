import { hash, compare } from 'bcrypt-ts';
import type {
  CreateUserInput,
  LoginInput,
  AuthResponse,
  AuthSession,
  SessionUser
} from '../schemas/user.schema.js';
import type { User } from '../models/user.model.js';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../errors/app.error.js';
import type { IUserRepository } from '../interfaces/repositories/user.repository.interface.js';
import type { TokenPayload } from '../lib/jwt.js';
import type { IUserService } from '../interfaces/services/user.service.interface.js';
import type { IRefreshTokenService } from '../interfaces/services/refresh-token.service.interface.js';

export interface UserServiceOptions {
  /** When true anyone can sign up and gets a new store of their own; otherwise only the first account can. */
  allowRegistration?: boolean;
}

export default class UserService implements IUserService {
  private static readonly COST = 12;

  constructor(
    private userRepo: IUserRepository,
    private sessionService: IRefreshTokenService,
    private options: UserServiceOptions = {}
  ) {}

  listStoreUsers(storeId: string) {
    return this.userRepo.listStoreUsers(storeId);
  }

  async createStoreUser(storeId: string, data: CreateUserInput) {
    if (await this.userRepo.findByEmail(data.email)) throw new ConflictError('El email ya está registrado');
    const password = await hash(data.password, UserService.COST);
    return this.userRepo.createStoreUser(storeId, data.name, data.email, password);
  }

  async setStoreUserActive(storeId: string, id: string, active: boolean) {
    const user = await this.userRepo.setStoreUserActive(storeId, id, active);
    // Same answer for another store's user or an admin: nothing is revealed about them.
    if (!user) throw new NotFoundError('Empleado no encontrado');
    // A deactivated user loses every session now; reactivating them later does not revive old ones.
    if (!active) await this.sessionService.revokeAllForUser(user.id);
    return user;
  }

  async register(input: CreateUserInput): Promise<AuthSession> {
    // Only the first account signs up on its own: staff are added by the admin.
    // ALLOW_REGISTRATION opens it temporarily so another admin can create a separate store.
    if (!this.options.allowRegistration && await this.userRepo.hasAnyUser()) {
      throw new ForbiddenError('El registro está cerrado');
    }

    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) throw new ConflictError("El email ya está registrado");

    const passwordHashed = await hash(input.password, UserService.COST);

    const storeName = "Mi tienda";
    const user = await this.userRepo.create(storeName, input.name, input.email, passwordHashed);

    return this.startSession(user);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) throw new UnauthorizedError("Correo electrónico o contraseña incorrectos");

    const validPassword = await compare(input.password, user.password);
    if (!validPassword) throw new UnauthorizedError("Correo electrónico o contraseña incorrectos");
    // Checked after the password so the account status is only revealed to its owner.
    if (!user.active) throw new UnauthorizedError("Tu usuario está desactivado. Consulta con el administrador.");

    return this.startSession(user);
  }

  async refreshSession(refreshToken: string): Promise<AuthSession> {
    const session = await this.sessionService.refresh(refreshToken);

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: this.toSessionUser(session.user),
    };
  }

  logout(refreshToken: string): Promise<void> {
    return this.sessionService.logout(refreshToken);
  }

  getSession(payload: TokenPayload, accessToken: string): AuthResponse {
    // The JWT payload names the user id `userId`; expose it as `id` like login/register.
    return {
      accessToken,
      user: this.toSessionUser({ ...payload, id: payload.userId }),
    };
  }

  private async startSession(user: User): Promise<AuthSession> {
    const { accessToken, refreshToken } = await this.sessionService.issue(user);

    return {
      accessToken,
      refreshToken,
      user: this.toSessionUser(user),
    };
  }

  private toSessionUser(user: SessionUser): SessionUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}

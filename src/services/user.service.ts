import { hash, compare } from 'bcrypt-ts';
import type {
  CreateUserInput,
  LoginInput,
  AuthResponse,
  SessionUser
} from '../schemas/user.schema.js';
import { ConflictError, UnauthorizedError } from '../errors/app.error.js';
import type { IUserRepository } from '../interfaces/repositories/user.repository.interface.js';
import JWT, { type TokenPayload } from '../lib/jwt.js';
import type { IUserService } from '../interfaces/services/user.service.interface.js';

export default class UserService implements IUserService {
  private static readonly COST = 12;

  constructor(private userRepo: IUserRepository) {}

  listStoreUsers(storeId: string) {
    return this.userRepo.listStoreUsers(storeId);
  }

  async createStoreUser(storeId: string, data: CreateUserInput) {
    if (await this.userRepo.findByEmail(data.email)) throw new ConflictError('El email ya está registrado');
    const password = await hash(data.password, UserService.COST);
    return this.userRepo.createStoreUser(storeId, data.name, data.email, password);
  }

  async register(input: CreateUserInput): Promise<AuthResponse> {
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) throw new ConflictError("El email ya está registrado");

    const passwordHashed = await hash(input.password, UserService.COST);
    
    const storeName = "Mi tienda";
    const user = await this.userRepo.create(storeName, input.name, input.email, passwordHashed);

    const token = JWT.signAccessToken({
      userId: user.id,
      storeId: user.storeId,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    return {
      token,
      user: this.toSessionUser(user),
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) throw new UnauthorizedError("Correo electrónico o contraseña incorrectos");

    const validPassword = await compare(input.password, user.password);
    if (!validPassword) throw new UnauthorizedError("Correo electrónico o contraseña incorrectos");

    const token = JWT.signAccessToken({
      userId: user.id,
      storeId: user.storeId,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    return {
      token,
      user: this.toSessionUser(user),
    };
  }

  getSession(payload: TokenPayload, token: string): AuthResponse {
    // The JWT payload names the user id `userId`; expose it as `id` like login/register.
    return {
      token,
      user: this.toSessionUser({ ...payload, id: payload.userId }),
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

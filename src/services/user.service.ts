import { hash, compare } from 'bcrypt-ts';
import type { 
  CreateUserInput, 
  LoginInput, 
  AuthResponse, 
  UserResponse 
} from '../schemas/user.schema.js';
import type { User } from '../models/user.model.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../errors/app.error.js';
import type { IUserRepository } from '../interfaces/repositories/user.repository.interface.js';
import JWT from '../lib/jwt.js';
import type { IUserService } from '../interfaces/services/user.service.interface.js';

export default class UserService implements IUserService {
  private static readonly COST = 12;

  constructor(private userRepo: IUserRepository) {}

  async register(input: CreateUserInput): Promise<AuthResponse> {
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) throw new ConflictError("El email ya está registrado");

    const passwordHashed = await hash(input.password, UserService.COST);
    const user = await this.userRepo.create(input.name, input.email, passwordHashed);

    const token = JWT.signAccessToken({
      userId: user.id,
      name: user.name,
      email: user.email,
    });

    return {
      token,
      user: this.toUserResponse(user),
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) throw new UnauthorizedError("Correo electrónico o contraseña incorrectos");

    const validPassword = await compare(input.password, user.password);
    if (!validPassword) throw new UnauthorizedError("Correo electrónico o contraseña incorrectos");

    const token = JWT.signAccessToken({
      userId: user.id,
      name: user.name,
      email: user.email,
    });

    return {
      token,
      user: this.toUserResponse(user),
    };
  }

  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}

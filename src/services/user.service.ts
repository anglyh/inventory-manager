import { hash, compare } from 'bcrypt-ts';
import type { 
  CreateUserInput, 
  LoginInput, 
  AuthResponse, 
  UserResponse 
} from '../schemas/user.schema.js';
import type { User } from '../models/user.model.js';
import { ConflictError, NotFoundError, Unauthorized } from '../errors/app.error.js';
import type { IUserRepository } from '../interfaces/repositories/user.repository.interface.js';
import JWT from '../lib/jwt.js';
import type { IUserService } from '../interfaces/services/user.service.interface.js';

export default class UserService implements IUserService {
  private static readonly COST = 12;

  constructor(private userRepo: IUserRepository) {}

  async register(input: CreateUserInput): Promise<AuthResponse> {
    const exists = await this.userRepo.findByEmail(input.email);
    if (exists) throw new ConflictError("El email ya está registrado");

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
    if (!user) throw new NotFoundError("No hay una cuenta registrada con este correo");

    const validPassword = await compare(input.password, user.password);
    if (!validPassword) throw new Unauthorized("Credenciales incorrectas");

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

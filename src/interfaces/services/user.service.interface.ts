import type { CreateUserInput, LoginInput, AuthResponse } from '../../schemas/user.schema.js';

export interface IUserService {
  register(input: CreateUserInput): Promise<AuthResponse>;
  login(input: LoginInput): Promise<AuthResponse>;
}


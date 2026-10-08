import type { CreateUserInput, LoginInput, AuthResponse } from '../../schemas/user.schema.js';
import type { StoreUser } from '../../models/user.model.js';

export interface IUserService {
  listStoreUsers(storeId: string): Promise<StoreUser[]>;
  createStoreUser(storeId: string, input: CreateUserInput): Promise<StoreUser>;
  register(input: CreateUserInput): Promise<AuthResponse>;
  login(input: LoginInput): Promise<AuthResponse>;
}

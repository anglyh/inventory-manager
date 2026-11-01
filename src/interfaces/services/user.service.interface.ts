import type { CreateUserInput, LoginInput, AuthResponse } from '../../schemas/user.schema.js';
import type { StoreUser } from '../../models/user.model.js';
import type { TokenPayload } from '../../lib/jwt.js';

export interface IUserService {
  listStoreUsers(storeId: string): Promise<StoreUser[]>;
  createStoreUser(storeId: string, input: CreateUserInput): Promise<StoreUser>;
  setStoreUserActive(storeId: string, id: string, active: boolean): Promise<StoreUser>;
  register(input: CreateUserInput): Promise<AuthResponse>;
  login(input: LoginInput): Promise<AuthResponse>;
  getSession(payload: TokenPayload, token: string): AuthResponse;
}

import type { CreateUserInput, LoginInput, AuthResponse, AuthSession } from '../../schemas/user.schema.js';
import type { StoreUser } from '../../models/user.model.js';
import type { TokenPayload } from '../../lib/jwt.js';

export interface IUserService {
  listStoreUsers(storeId: string): Promise<StoreUser[]>;
  createStoreUser(storeId: string, input: CreateUserInput): Promise<StoreUser>;
  setStoreUserActive(storeId: string, id: string, active: boolean): Promise<StoreUser>;
  register(input: CreateUserInput): Promise<AuthSession>;
  login(input: LoginInput): Promise<AuthSession>;
  refreshSession(refreshToken: string): Promise<AuthSession>;
  logout(refreshToken: string): Promise<void>;
  getSession(payload: TokenPayload, accessToken: string): AuthResponse;
}

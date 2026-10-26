import type { User, StoreUser } from '../../models/user.model.js';

export interface IUserRepository {
  listStoreUsers(storeId: string): Promise<StoreUser[]>;
  createStoreUser(storeId: string, name: string, email: string, password: string): Promise<StoreUser>;
  setStoreUserActive(storeId: string, id: string, active: boolean): Promise<StoreUser | null>;
  create(storeName: string, name: string, email: string, password: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}

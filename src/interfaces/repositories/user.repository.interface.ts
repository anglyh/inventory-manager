import type { User } from '../../models/user.model.js';

export interface IUserRepository {
  create(name: string, email: string, password: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}


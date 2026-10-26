export type UserRole = "ADMIN" | "GUEST";

export interface User {
  id: string;
  storeId: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
}

export type StoreUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'active'>;

export type UserRole = "ADMIN" | "GUEST";

export interface User {
  id: string;
  storeId: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
}

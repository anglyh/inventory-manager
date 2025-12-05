import type { User } from './user.model.js';

export interface Category {
  id: string;
  userId: User["id"];
  name: string;
  icon?: string;
  createdAt: Date
}
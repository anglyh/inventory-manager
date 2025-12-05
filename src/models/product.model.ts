import type { Category } from './category.model.js';
import type { User } from './user.model.js';

export interface Product {
  id: string;
  userId: User["id"];
  name: string;
  stock: number;
  salePrice: number;
  unitCost: number;
  categoryId: Category["id"];
  createdAt: Date;
}
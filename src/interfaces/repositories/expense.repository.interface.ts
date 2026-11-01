import type { PoolClient } from 'pg';
import type {
  CreateExpenseCategoryDTO,
  CreateExpenseDTO,
  Expense,
  ExpenseCategory,
  ExpenseListQueryDTO,
  UpdateExpenseCategoryDTO,
} from '../../schemas/expense.schema.js';

/** Data needed to delete an expense, read with the expense row locked. */
export interface ExpenseForDelete {
  id: string;
  source: Expense['source'];
  cashMovementId: string | null;
  cashRegisterId: string | null;
}

export interface IExpenseRepository {
  listCategories(storeId: string): Promise<ExpenseCategory[]>;
  findCategoryById(storeId: string, id: string): Promise<ExpenseCategory | null>;
  createCategory(storeId: string, data: CreateExpenseCategoryDTO): Promise<string>;
  updateCategory(storeId: string, id: string, data: UpdateExpenseCategoryDTO): Promise<void>;
  deleteCategory(storeId: string, id: string): Promise<boolean>;

  list(storeId: string, filters: ExpenseListQueryDTO): Promise<{ data: Expense[]; total: number; totalAmount: string }>;
  findById(storeId: string, id: string): Promise<Expense | null>;
  create(
    storeId: string,
    userId: string,
    data: CreateExpenseDTO & { cashMovementId: string | null },
    client: PoolClient,
  ): Promise<string>;
  lockForDelete(storeId: string, id: string, client: PoolClient): Promise<ExpenseForDelete | null>;
  /** Deletes the expense and, when it came from the register, its cash movement. */
  delete(expense: ExpenseForDelete, client: PoolClient): Promise<void>;
}

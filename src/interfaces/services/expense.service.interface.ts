import type {
  CreateExpenseCategoryDTO,
  CreateExpenseDTO,
  Expense,
  ExpenseCategory,
  ExpenseListQueryDTO,
  ExpensePage,
  UpdateExpenseCategoryDTO,
} from '../../schemas/expense.schema.js';

export interface IExpenseService {
  listCategories(storeId: string): Promise<ExpenseCategory[]>;
  createCategory(storeId: string, data: CreateExpenseCategoryDTO): Promise<ExpenseCategory>;
  updateCategory(storeId: string, id: string, data: UpdateExpenseCategoryDTO): Promise<ExpenseCategory>;
  deleteCategory(storeId: string, id: string): Promise<void>;

  list(storeId: string, filters: ExpenseListQueryDTO): Promise<ExpensePage>;
  create(storeId: string, userId: string, data: CreateExpenseDTO): Promise<Expense>;
  delete(storeId: string, id: string): Promise<void>;
}

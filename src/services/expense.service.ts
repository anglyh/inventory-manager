import { withTransaction } from '../db/transactions.js';
import { ConflictError, NotFoundError } from '../errors/app.error.js';
import type { ICashRegisterRepository } from '../interfaces/repositories/cash-register.repository.interface.js';
import type { IExpenseRepository } from '../interfaces/repositories/expense.repository.interface.js';
import type { IExpenseService } from '../interfaces/services/expense.service.interface.js';
import type {
  CreateExpenseCategoryDTO,
  CreateExpenseDTO,
  Expense,
  ExpenseCategory,
  ExpenseListQueryDTO,
  ExpensePage,
  UpdateExpenseCategoryDTO,
} from '../schemas/expense.schema.js';

const NO_OPEN_REGISTER = 'Debe abrir una caja para pagar un gasto con dinero de la caja';
const CLOSED_REGISTER = 'El gasto salió de una caja ya cerrada: no se puede eliminar.';
/** Largo máximo del motivo de un movimiento de caja (CHECK de la tabla). */
const MAX_REASON_LENGTH = 500;

export default class ExpenseService implements IExpenseService {
  constructor(
    private expenseRepo: IExpenseRepository,
    private cashRegisterRepo: ICashRegisterRepository,
  ) {}

  listCategories(storeId: string): Promise<ExpenseCategory[]> {
    return this.expenseRepo.listCategories(storeId);
  }

  async createCategory(storeId: string, data: CreateExpenseCategoryDTO): Promise<ExpenseCategory> {
    const id = await this.expenseRepo.createCategory(storeId, data);
    return this.getCategory(storeId, id);
  }

  async updateCategory(storeId: string, id: string, data: UpdateExpenseCategoryDTO): Promise<ExpenseCategory> {
    await this.getCategory(storeId, id);
    await this.expenseRepo.updateCategory(storeId, id, data);
    return this.getCategory(storeId, id);
  }

  /** Una categoría con gastos se desactiva, no se borra; el FK RESTRICT es la última defensa. */
  async deleteCategory(storeId: string, id: string): Promise<void> {
    const category = await this.getCategory(storeId, id);
    const hasExpenses = () => new ConflictError(
      `La categoría ${category.name} tiene gastos registrados: desactívala en su lugar.`,
    );
    if (category.expenseCount > 0) throw hasExpenses();
    try {
      if (!await this.expenseRepo.deleteCategory(storeId, id)) throw new NotFoundError('La categoría no existe');
    } catch (err) {
      if (isForeignKeyViolation(err)) throw hasExpenses();
      throw err;
    }
  }

  async list(storeId: string, filters: ExpenseListQueryDTO): Promise<ExpensePage> {
    const { data, total, totalAmount } = await this.expenseRepo.list(storeId, filters);
    return {
      data,
      meta: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) },
      totalAmount,
    };
  }

  /**
   * CASH_REGISTER: en una sola transacción bloquea la caja abierta, registra la salida (CASH_OUT)
   * y el gasto enlazado a ella, para que el efectivo esperado coincida.
   */
  async create(storeId: string, userId: string, data: CreateExpenseDTO): Promise<Expense> {
    const category = await this.getCategory(storeId, data.categoryId);
    if (!category.isActive) {
      throw new ConflictError(`La categoría ${category.name} está desactivada.`);
    }

    const id = await withTransaction(async client => {
      let cashMovementId: string | null = null;
      if (data.source === 'CASH_REGISTER') {
        const registerId = await this.cashRegisterRepo.lockOpen(storeId, undefined, client, NO_OPEN_REGISTER);
        if (!await this.cashRegisterRepo.canWithdraw(registerId, data.amount, client)) {
          throw new ConflictError('Efectivo insuficiente en la caja para pagar el gasto');
        }
        const detail = data.description ? ` — ${data.description}` : '';
        cashMovementId = await this.cashRegisterRepo.addMovement(registerId, userId, {
          type: 'CASH_OUT',
          amount: data.amount,
          reason: `Gasto: ${category.name}${detail}`.slice(0, MAX_REASON_LENGTH),
        }, client);
      }
      return this.expenseRepo.create(storeId, userId, { ...data, cashMovementId }, client);
    });

    const expense = await this.expenseRepo.findById(storeId, id);
    if (!expense) throw new NotFoundError('El gasto no existe');
    return expense;
  }

  /** OUTSIDE se borra siempre; CASH_REGISTER solo con su caja abierta, junto con su salida de caja. */
  async delete(storeId: string, id: string): Promise<void> {
    await withTransaction(async client => {
      const expense = await this.expenseRepo.lockForDelete(storeId, id, client);
      if (!expense) throw new NotFoundError('El gasto no existe');

      if (expense.source === 'CASH_REGISTER') {
        try {
          await this.cashRegisterRepo.lockOpen(storeId, expense.cashRegisterId!, client);
        } catch (err) {
          if (err instanceof ConflictError) throw new ConflictError(CLOSED_REGISTER);
          throw err;
        }
      }

      await this.expenseRepo.delete(expense, client);
    });
  }

  private async getCategory(storeId: string, id: string): Promise<ExpenseCategory> {
    const category = await this.expenseRepo.findCategoryById(storeId, id);
    if (!category) throw new NotFoundError('La categoría de gasto no existe');
    return category;
  }
}

/** PostgreSQL foreign_key_violation: a row was referenced between the check and the delete. */
function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === '23503';
}

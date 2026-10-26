import type { PoolClient } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../errors/app.error.js';
import type { ICashRegisterRepository } from '../../interfaces/repositories/cash-register.repository.interface.js';
import type { IExpenseRepository } from '../../interfaces/repositories/expense.repository.interface.js';
import ExpenseService from '../../services/expense.service.js';
import { withTransaction } from '../../db/transactions.js';

vi.mock('../../db/transactions.js', () => ({
  withTransaction: vi.fn(async (callback: (client: PoolClient) => Promise<unknown>) => callback({} as PoolClient)),
}));

const expenseRepo = {
  findCategoryById: vi.fn(), create: vi.fn(), findById: vi.fn(), lockForDelete: vi.fn(), delete: vi.fn(),
} as unknown as IExpenseRepository;
const cashRegisterRepo = {
  lockOpen: vi.fn(), canWithdraw: vi.fn(), addMovement: vi.fn(),
} as unknown as ICashRegisterRepository;
const service = new ExpenseService(expenseRepo, cashRegisterRepo);

describe('Expenses paid from the cash register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(withTransaction).mockImplementation(async callback => callback({} as PoolClient));
  });

  it('rejects a CASH_REGISTER expense without an open register and writes nothing', async () => {
    vi.mocked(expenseRepo.findCategoryById).mockResolvedValue({
      id: 'c1', name: 'Lavandería', group: 'LODGING', isActive: true, expenseCount: 0, createdAt: '2026-10-01T00:00:00.000Z',
    });
    vi.mocked(cashRegisterRepo.lockOpen).mockRejectedValue(new ConflictError('Debe abrir una caja'));

    await expect(service.create('s1', 'u1', {
      categoryId: 'c1', amount: 40, source: 'CASH_REGISTER',
    })).rejects.toBeInstanceOf(ConflictError);
    expect(cashRegisterRepo.addMovement).not.toHaveBeenCalled();
    expect(expenseRepo.create).not.toHaveBeenCalled();
  });

  it('refuses to delete an expense whose register is already closed', async () => {
    vi.mocked(expenseRepo.lockForDelete).mockResolvedValue({
      id: 'e1', source: 'CASH_REGISTER', cashMovementId: 'm1', cashRegisterId: 'r1',
    });
    vi.mocked(cashRegisterRepo.lockOpen).mockRejectedValue(new ConflictError('La caja está cerrada'));

    await expect(service.delete('s1', 'e1')).rejects.toMatchObject({
      message: 'El gasto salió de una caja ya cerrada: no se puede eliminar.',
    });
    expect(expenseRepo.delete).not.toHaveBeenCalled();
  });
});

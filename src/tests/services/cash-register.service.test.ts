import type { PoolClient } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICashRegisterRepository } from '../../interfaces/repositories/cash-register.repository.interface.js';
import CashRegisterService from '../../services/cash-register.service.js';
import { withTransaction } from '../../db/transactions.js';

vi.mock('../../db/transactions.js', () => ({
  withTransaction: vi.fn(async (callback: (client: PoolClient) => Promise<unknown>) => callback({} as PoolClient)),
}));

const repository = {
  lockOpen: vi.fn(), canWithdraw: vi.fn(), addMovement: vi.fn(),
  hasClosingDifference: vi.fn(), close: vi.fn(),
} as unknown as ICashRegisterRepository;
const service = new CashRegisterService(repository);

describe('Cash register role-sensitive error messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(withTransaction).mockImplementation(async callback => callback({} as PoolClient));
  });

  it('uses a generic insufficient-withdrawal message for GUEST', async () => {
    vi.mocked(repository.canWithdraw).mockResolvedValue(false);
    await expect(service.addMovement('s1', 'u1', 'r1', {
      type: 'CASH_OUT', amount: 10, reason: 'retiro',
    }, 'GUEST')).rejects.toMatchObject({ message: 'No se puede realizar el retiro solicitado' });
  });

  it('preserves the detailed insufficient-withdrawal message for ADMIN', async () => {
    vi.mocked(repository.canWithdraw).mockResolvedValue(false);
    await expect(service.addMovement('s1', 'u1', 'r1', {
      type: 'CASH_OUT', amount: 10, reason: 'retiro',
    }, 'ADMIN')).rejects.toMatchObject({ message: 'Efectivo insuficiente en la caja para realizar el retiro' });
  });

  it('uses a generic closing-difference message for GUEST', async () => {
    vi.mocked(repository.hasClosingDifference).mockResolvedValue(true);
    await expect(service.close('s1', 'u1', 'r1', { closingAmount: 90 }, 'GUEST'))
      .rejects.toMatchObject({
        fields: [{ field: 'notes', message: 'Se requiere una nota para cerrar con diferencia.' }],
      });
  });
});

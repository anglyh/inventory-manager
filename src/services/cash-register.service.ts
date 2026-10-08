import { withTransaction } from '../db/transactions.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors/app.error.js';
import type { ICashRegisterRepository } from '../interfaces/repositories/cash-register.repository.interface.js';
import type { ICashRegisterService } from '../interfaces/services/cash-register.service.interface.js';
import type { UserRole } from '../models/user.model.js';
import type {
  CashMovementDTO,
  CashMovementHistoryDTO,
  CurrentCashMovementHistoryDTO,
  CashRegisterHistoryDTO,
  CloseCashRegisterDTO,
  OpenCashRegisterDTO,
} from '../schemas/cash-register.schema.js';

export default class CashRegisterService implements ICashRegisterService {
  constructor(private repo: ICashRegisterRepository) {}

  private viewForRole(role: UserRole = 'ADMIN') {
    return role === 'GUEST' ? 'blind' as const : 'full' as const;
  }

  async open(
    storeId: string,
    userId: string,
    data: OpenCashRegisterDTO,
  ) {
    return withTransaction(async client => ({
      id: await this.repo.create(storeId, userId, data, client),
      status: 'OPEN' as const,
    }));
  }

  current(storeId: string, role: UserRole = 'ADMIN') {
    return this.repo.findCurrent(storeId, this.viewForRole(role));
  }

  async getById(storeId: string, id: string, role: UserRole = 'ADMIN') {
    const register = await this.repo.findById(storeId, id, this.viewForRole(role));
    if (!register) {
      throw new NotFoundError('La caja no existe');
    }

    return register;
  }

  async list(storeId: string, query: CashRegisterHistoryDTO, role: UserRole = 'ADMIN') {
    const { data, total } = await this.repo.list(storeId, query, this.viewForRole(role));
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async listMovements(
    storeId: string,
    id: string,
    query: CashMovementHistoryDTO,
    role: UserRole = 'ADMIN',
  ) {
    await this.getById(storeId, id, role);
    const { data, total } = await this.repo.listMovements(storeId, id, query);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async listCurrentMovements(
    storeId: string,
    query: CurrentCashMovementHistoryDTO,
    role: UserRole = 'ADMIN',
  ) {
    const register = await this.current(storeId, role);
    if (!register) {
      return {
        data: [],
        meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 },
      };
    }

    const { data, total } = await this.repo.listMovements(storeId, register.id, query);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async addMovement(
    storeId: string,
    userId: string,
    id: string,
    data: CashMovementDTO,
    role: UserRole = 'ADMIN',
  ): Promise<void> {
    await withTransaction(async client => {
      await this.repo.lockOpen(storeId, id, client);
      if (data.type === 'CASH_OUT') {
        const canWithdraw = await this.repo.canWithdraw(id, data.amount, client);

        if (!canWithdraw) {
          throw new ConflictError(role === 'GUEST'
            ? 'No se puede realizar el retiro solicitado'
            : 'Efectivo insuficiente en la caja para realizar el retiro');
        }
      }

      await this.repo.addMovement(id, userId, data, client);
    });
  }

  async close(
    storeId: string,
    userId: string,
    id: string,
    data: CloseCashRegisterDTO,
    role: UserRole = 'ADMIN',
  ): Promise<void> {
    await withTransaction(async client => {
      await this.repo.lockOpen(storeId, id, client);
      const hasDifference = await this.repo.hasClosingDifference(id, data.closingAmount, client);

      if (hasDifference && !data.notes) {
        throw new ValidationError([
          {
            field: 'notes',
            message: role === 'GUEST'
              ? 'Se requiere una nota para cerrar con diferencia.'
              : 'Debe explicar la diferencia entre el efectivo contado y el esperado',
          },
        ]);
      }

      await this.repo.close(id, userId, data, client);
    });
  }
}

import type { PoolClient } from 'pg';
import type { CashRegister, CashRegisterMovement, CashRegisterView } from '../../models/cash-register.model.js';
import type {
  CashMovementDTO,
  CashMovementHistoryDTO,
  CashRegisterHistoryDTO,
  CloseCashRegisterDTO,
  OpenCashRegisterDTO,
} from '../../schemas/cash-register.schema.js';

export interface ICashRegisterRepository {
  create(
    storeId: string,
    userId: string,
    data: OpenCashRegisterDTO,
    client: PoolClient,
  ): Promise<string>;

  /** missingMessage: conflict message when the store has no open register (defaults to the sale message). */
  lockOpen(storeId: string, id: string | undefined, client: PoolClient, missingMessage?: string): Promise<string>;

  findCurrent(storeId: string, view?: CashRegisterView): Promise<CashRegister | null>;

  findById(storeId: string, id: string, view?: CashRegisterView): Promise<CashRegister | null>;

  list(
    storeId: string,
    query: CashRegisterHistoryDTO,
    view?: CashRegisterView,
  ): Promise<{ data: CashRegister[]; total: number }>;

  listMovements(
    storeId: string,
    id: string,
    query: CashMovementHistoryDTO,
  ): Promise<{ data: CashRegisterMovement[]; total: number }>;

  /** Returns the id of the inserted movement. */
  addMovement(
    id: string,
    userId: string,
    data: CashMovementDTO,
    client: PoolClient,
  ): Promise<string>;

  canWithdraw(id: string, amount: number, client: PoolClient): Promise<boolean>;

  hasClosingDifference(id: string, amount: number, client: PoolClient): Promise<boolean>;

  close(
    id: string,
    userId: string,
    data: CloseCashRegisterDTO,
    client: PoolClient,
  ): Promise<void>;
}

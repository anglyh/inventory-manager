export type CashRegisterStatus = 'OPEN' | 'CLOSED';
export type CashMovementType = 'CASH_IN' | 'CASH_OUT';
export type CashRegisterView = 'full' | 'blind';

// Los importes solo llegan a ADMIN. GUEST (cierre ciego) recibe únicamente salesCount.
export interface CashRegisterSummary {
  cashSales?: string;
  yapeSales?: string;
  totalSales?: string;
  salesCount: number;
  cashStays?: string;
  yapeStays?: string;
  cashIn?: string;
  cashOut?: string;
  expectedCash?: string;
  difference?: string | null;
}

export interface CashRegister {
  id: string;
  status: CashRegisterStatus;
  openedAt: string;
  openingAmount: string;
  openedBy: string | null;
  openedByName: string | null;
  notes: string | null;
  closedAt: string | null;
  closingAmount: string | null;
  closedBy: string | null;
  closedByName: string | null;
  closingNotes: string | null;
  // Null en cierres antiguos: no se reconstruye un arqueo que nunca se guardó.
  summary: CashRegisterSummary | null;
}

export interface CashRegisterMovement {
  id: string;
  cashRegisterId: string;
  type: CashMovementType;
  amount: string;
  reason: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

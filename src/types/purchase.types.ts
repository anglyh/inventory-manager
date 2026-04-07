export interface ListPurchaseFilters {
    userId: string;
    page: number;
    limit: number;
    startDate?: string;
    endDate?: string;
}
export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  salePrice: number;
  unitCost: number;
}

export interface SaleItemInsert {
  productId: string;
  productName: string;
  quantity: number;
  salePrice: number;
  unitCost: number;
}
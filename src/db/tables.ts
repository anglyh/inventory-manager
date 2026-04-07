export const TABLES = {
  USER: "app_user",
  PRODUCT: "product",
  SALE: "sale",
  SALE_ITEM: "sale_item",
  PURCHASE: "purchase",
  PURCHASE_ITEM: "purchase_item",
  ADJUSTMENT: "adjustment",
  ADJUSTMENT_ITEM: "adjustment_item",
  INVENTORY_MOVEMENT: "inventory_movement",
  INVENTORY_MOVEMENT_ITEM: "inventory_movement_item",
  CATEGORY: "category"
} as const;

export const VIEWS = {
  PRODUCT_WITH_STOCK: "product_with_stock"
} as const;
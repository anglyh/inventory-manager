export const TABLES = {
  USER: "app_user",
  PRODUCT: "product",
  INVENTORY_MOVEMENT: "inventory_movement",
  INVENTORY_MOVEMENT_ITEM: "inventory_movement_item",
  CATEGORY: "category"
} as const;

export const VIEWS = {
  PRODUCT_WITH_STOCK: "vw_product_stock"
} as const;
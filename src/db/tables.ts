export const TABLES = {
  STORE: "store",
  USER: "app_user",
  PRODUCT: "product",
  INVENTORY_MOVEMENT: "inventory_movement",
  INVENTORY_MOVEMENT_ITEM: "inventory_movement_item",
  CATEGORY: "category",
  ROOM_TYPE: "room_type",
  ROOM: "room",
  GUEST: "guest",
  STAY: "stay",
  STAY_GUEST: "stay_guest",
  STAY_MINOR: "stay_minor",
  STAY_CHARGE: "stay_charge",
  STAY_PAYMENT: "stay_payment",
} as const;

export const VIEWS = {
  PRODUCT_WITH_STOCK: "vw_product_stock",
  SALES_PROFIT: "vw_sales_profit",
  STAY_BALANCE: "vw_stay_balance",
} as const;

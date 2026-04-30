-- Schema inicial. Diseñado para ser idempotente: se puede re-ejecutar cuantas
-- veces haga falta (en Supabase, en dev, etc.) sin romper la BD ni borrar datos.

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS app_user (
    id uuid primary key default gen_random_uuid(),
    name varchar(50) not null,
    email varchar(100) not null unique,
    password varchar(255) not null,
    created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS category (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references app_user(id) ON DELETE CASCADE,
    name varchar(100) not null,
    created_at timestamptz default now() not null,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS product (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references app_user(id) ON DELETE CASCADE,
    name varchar(50) not null,
    barcode varchar(50),
    sale_price numeric (10, 2) not null check ( sale_price >= 0 ),
    unit_cost_avg numeric(10, 2) check ( unit_cost_avg IS NULL OR unit_cost_avg >= 0 ),
    min_stock integer not null default 10 check ( min_stock >= 0 ),
    category_id uuid references category(id) ON DELETE SET NULL,
    is_active boolean not null default true,
    created_at timestamptz default now() not null
);

CREATE UNIQUE INDEX IF NOT EXISTS product_user_name_unique
    ON product (user_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS product_user_barcode_unique
    ON product (user_id, barcode)
    WHERE barcode IS NOT NULL;

-- CREATE TYPE no soporta IF NOT EXISTS; lo envolvemos para capturar el error
-- si el tipo ya existe en la BD.
DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS inventory_movement (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    movement_type movement_type NOT NULL,
    entity_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_movement_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_id uuid NOT NULL REFERENCES inventory_movement(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES product(id),
    quantity INTEGER NOT NULL CHECK ( quantity > 0 ),
    unit_price numeric(10, 2) NOT NULL CHECK ( unit_price >= 0 ),
    -- Snapshot del costo unitario al momento del movimiento.
    -- IN  -> unit_cost = unit_price (lo que se pagó).
    -- OUT -> unit_cost = product.unit_cost_avg vigente (promedio ponderado).
    unit_cost numeric(10, 2) NOT NULL CHECK ( unit_cost >= 0 )
);

-- Índices para product
CREATE INDEX IF NOT EXISTS idx_product_user_id ON product(user_id);
CREATE INDEX IF NOT EXISTS idx_product_category_id ON product(category_id);

-- Índices para inventory_movement
CREATE INDEX IF NOT EXISTS idx_inventory_movement_user_id ON inventory_movement(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movement_created_at ON inventory_movement(created_at DESC);

-- Índices para inventory_movement_item
CREATE INDEX IF NOT EXISTS idx_movement_item_movement_id ON inventory_movement_item(movement_id);
CREATE INDEX IF NOT EXISTS idx_movement_item_product_id ON inventory_movement_item(product_id);


-- Función: stock actual de un producto (IN suma, OUT resta).
CREATE OR REPLACE FUNCTION get_product_stock(p_product_id uuid)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
    SELECT COALESCE(
        SUM(
            CASE
                WHEN m.movement_type = 'IN' THEN mi.quantity
                WHEN m.movement_type = 'OUT' THEN -mi.quantity
                ELSE 0
            END
        ), 0
    )::INTEGER
    FROM inventory_movement_item mi
    JOIN inventory_movement m ON mi.movement_id = m.id
    WHERE mi.product_id = p_product_id;
$$;


-- Vista: productos con su stock calculado. Útil para listados y búsquedas.
CREATE OR REPLACE VIEW vw_product_stock AS
SELECT
    p.id,
    p.user_id,
    p.name,
    p.barcode,
    p.sale_price,
    p.unit_cost_avg,
    p.min_stock,
    p.category_id,
    p.is_active,
    p.created_at,
    COALESCE(
        SUM(
            CASE
                WHEN m.movement_type = 'IN' THEN mi.quantity
                WHEN m.movement_type = 'OUT' THEN -mi.quantity
                ELSE 0
            END
        ), 0
    )::INTEGER AS stock
FROM product p
LEFT JOIN inventory_movement_item mi ON p.id = mi.product_id
LEFT JOIN inventory_movement m ON mi.movement_id = m.id
GROUP BY p.id;


-- Vista: ganancia por línea de venta. Solo considera movimientos OUT.
-- Permite reportes por periodo, producto y categoría con SQL simple.
CREATE OR REPLACE VIEW vw_sales_profit AS
SELECT
    m.id                                            AS movement_id,
    m.user_id,
    m.created_at,
    m.entity_name,
    mi.id                                           AS movement_item_id,
    mi.product_id,
    p.name                                          AS product_name,
    p.category_id,
    mi.quantity,
    mi.unit_price,
    mi.unit_cost,
    (mi.unit_price * mi.quantity)                   AS revenue,
    (mi.unit_cost  * mi.quantity)                   AS cogs,
    ((mi.unit_price - mi.unit_cost) * mi.quantity)  AS profit
FROM inventory_movement m
JOIN inventory_movement_item mi ON mi.movement_id = m.id
JOIN product p ON p.id = mi.product_id
WHERE m.movement_type = 'OUT';


-- Defensa en profundidad: impide stock negativo a nivel BD, incluso si el
-- código de aplicación tuviera un bug o alguien modifica la BD por fuera del
-- flujo normal. La validación principal vive en el service (InventoryMovement
-- Service.processItems) con SELECT ... FOR UPDATE para serializar.
CREATE OR REPLACE FUNCTION check_product_stock_non_negative()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INTEGER;
    product_name TEXT;
BEGIN
    current_stock := get_product_stock(NEW.product_id);

    IF current_stock < 0 THEN
        SELECT p.name INTO product_name FROM product p WHERE p.id = NEW.product_id;
        RAISE EXCEPTION 'Stock insuficiente para "%": stock resultante = %', product_name, current_stock
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_product_stock_non_negative ON inventory_movement_item;

CREATE CONSTRAINT TRIGGER trg_check_product_stock_non_negative
AFTER INSERT ON inventory_movement_item
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW
EXECUTE FUNCTION check_product_stock_non_negative();

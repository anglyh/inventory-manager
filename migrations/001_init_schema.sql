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
    icon varchar(100),
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
    category_id uuid references category(id),
    is_active boolean not null default true,
    created_at timestamptz default now() not null
);
CREATE UNIQUE INDEX product_user_name_unique
ON product (user_id, lower(name));
CREATE UNIQUE INDEX product_user_barcode_unique
ON product (user_id, barcode)
WHERE barcode IS NOT NULL;

CREATE TYPE movement_type AS ENUM (
    'IN',
    'OUT',
    'ADJUSTMENT'
);
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
    unit_price numeric(10, 2) NOT NULL CHECK ( unit_price >= 0 )
);

-- 1. Para la tabla de Productos
CREATE INDEX idx_product_user_id ON product(user_id); -- Para listar rápido el catálogo del usuario
CREATE INDEX idx_product_category_id ON product(category_id); -- Para los filtros por categoría

-- 2. Para tu nueva cabecera de Movimientos
CREATE INDEX idx_inventory_movement_user_id ON inventory_movement(user_id); -- (Ojo, corregí el nombre de tu índice para que tenga sentido)
CREATE INDEX idx_inventory_movement_created_at ON inventory_movement(created_at DESC); -- CRÍTICO: Para la paginación y ordenamiento por fecha

-- 3. Para los Detalles (Estos son los que hacen que tu Vista sea súper rápida)
CREATE INDEX idx_movement_item_movement_id ON inventory_movement_item(movement_id); -- Para el JOIN con la cabecera
CREATE INDEX idx_movement_item_product_id ON inventory_movement_item(product_id); -- Para el JOIN con el producto


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


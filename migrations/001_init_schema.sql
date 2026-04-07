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

CREATE TYPE payment_method AS ENUM (
    'EFECTIVO',
    'YAPE',
    'PLIN',
    'TRANSFERENCIA'
);
CREATE TABLE IF NOT EXISTS sale (
    id uuid primary key default gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    payment_method payment_method NOT NULL DEFAULT 'EFECTIVO',
    created_at timestamptz default now() not null
);

CREATE TABLE IF NOT EXISTS sale_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL REFERENCES sale(id) ON DELETE CASCADE,
    product_id uuid REFERENCES product(id),
    quantity integer NOT NULL check ( quantity > 0 ),
    sale_price numeric(10, 2) NOT NULL CHECK ( sale_price >= 0 ),
    unit_cost numeric(10, 2) NOT NULL CHECK (unit_cost >= 0 )
);
CREATE TABLE IF NOT EXISTS purchase (
    id uuid primary key default gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    supplier_name varchar(100),
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS purchase_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES product(id),
    purchase_id uuid NOT NULL REFERENCES purchase(id) ON DELETE CASCADE,
    quantity integer NOT NULL CHECK ( quantity > 0 ),
    unit_cost numeric(10, 2) NOT NULL CHECK ( unit_cost >= 0 )
);
CREATE TYPE inventory_adjustment_reason AS ENUM('CADUCIDAD', 'ERROR_CONTEO', 'OTRO');
CREATE TABLE IF NOT EXISTS adjustment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    notes text,
    reason_type inventory_adjustment_reason NOT NULL DEFAULT 'ERROR_CONTEO',
    created_at timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS adjustment_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES product(id) ON DELETE SET NULL,
    adjustment_id uuid NOT NULL REFERENCES adjustment(id) ON DELETE CASCADE,
    product_name varchar(50) NOT NULL,
    quantity integer NOT NULL CHECK ( quantity <> 0 ),
    unique (adjustment_id, product_id)
);

CREATE INDEX idx_product_user_id ON product(user_id);
CREATE INDEX idx_sale_user_id ON sale(user_id);
CREATE INDEX idx_sale_created_at ON sale(created_at);
CREATE INDEX idx_sale_item_sale_id ON sale_item(sale_id);
CREATE INDEX idx_sale_item_product_id ON sale_item(product_id);
CREATE INDEX idx_product_category_id ON product(category_id);
CREATE INDEX idx_purchase_user_id ON purchase(user_id);
CREATE INDEX idx_purchase_item_product_id ON purchase_item(product_id);
CREATE INDEX idx_purchase_item_purchase_id ON purchase_item(purchase_id);
CREATE INDEX idx_adjustment_user_id ON adjustment(user_id);
CREATE INDEX idx_adjustment_item_product_id ON adjustment_item(product_id);
CREATE INDEX idx_adjustment_item_adjustment_id ON adjustment_item(adjustment_id);

CREATE OR REPLACE FUNCTION get_product_stock(p_product_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
    SELECT
        COALESCE((
            SELECT SUM(pi.quantity)
            FROM purchase_item pi
            WHERE pi.product_id = p_product_id
        ), 0)
        - COALESCE((
            SELECT SUM(si.quantity)
            FROM sale_item si
            WHERE si.product_id = p_product_id
        ), 0)
        + COALESCE((
            SELECT SUM(ai.quantity)
            FROM adjustment_item ai
            WHERE ai.product_id = p_product_id
        ), 0);
$$;

CREATE OR REPLACE VIEW product_with_stock AS
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
    get_product_stock(p.id) AS stock
FROM product AS p;
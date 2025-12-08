-- Habilitar extensión para gen_random_uuid (si ya existe, no pasa nada)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS app_user (
    id uuid primary key default gen_random_uuid(),
    name varchar(50) not null,
    email varchar(100) not null unique,
    password varchar(255) not null,
    created_at timestamp not null default now()
);

CREATE TABLE IF NOT EXISTS category (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references app_user(id) ON DELETE CASCADE,
    name varchar(100) not null,
    icon varchar(100),
    created_at timestamp default now() not null,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS product (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references app_user(id) ON DELETE CASCADE,
    name varchar(50) not null,
    stock integer not null check ( stock >= 0 ),
    sale_price numeric(10, 2) not null check ( sale_price >= 0 ),
    unit_cost numeric(10, 2) not null check ( unit_cost >= 0 ),
    category_id uuid references category(id),
    created_at timestamp default now() not null,
    unique (user_id, name)
);

CREATE TABLE IF NOT EXISTS sale (
    id uuid primary key default gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    created_at timestamp default now() not null
);

CREATE TABLE IF NOT EXISTS sale_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL REFERENCES sale(id) ON DELETE CASCADE,
    product_id uuid REFERENCES product(id) ON DELETE SET NULL,
    product_name varchar(50) NOT NULL,
    quantity integer NOT NULL check ( quantity > 0 ),
    sale_price numeric(10, 2) NOT NULL CHECK ( sale_price >= 0 ),
    unit_cost numeric(10, 2) NOT NULL CHECK (unit_cost >= 0 )
);

CREATE TABLE IF NOT EXISTS purchase (
    id uuid primary key default gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    supplier_name varchar(100),
    notes text,
    created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES product(id) ON DELETE SET NULL ,
    purchase_id uuid NOT NULL REFERENCES purchase(id) ON DELETE CASCADE,
    product_name varchar(50) NOT NULL,
    quantity integer NOT NULL CHECK ( quantity > 0 ),
    unit_cost numeric(10, 2) NOT NULL CHECK ( unit_cost >= 0 )
);

CREATE INDEX IF NOT EXISTS idx_product_user_id ON product(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_user_id ON sale(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_created_at ON sale(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_item_sale_id ON sale_item(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_product_id ON sale_item(product_id);
CREATE INDEX IF NOT EXISTS idx_product_category_id ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_purchase_user_id ON purchase(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_item_product_id ON purchase_item(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_item_purchase_id ON purchase_item(purchase_id);

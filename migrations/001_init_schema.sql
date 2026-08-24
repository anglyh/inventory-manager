-- =========================================================================================
-- SCHEMA INICIAL - HOSTAL INVENTORY
-- Diseñado para ser idempotente: se puede re-ejecutar sin romper la BD.
-- Arquitectura: Multi-Tenant (Cada store/tienda es dueña de sus datos, usuarios y productos)
-- =========================================================================================

-- ---------------------------------------------------------
-- 1. EXTENSIONES Y TIPOS DE DATOS (ENUMS)
-- ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('ADMIN', 'GUEST'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE movement_reason AS ENUM ('PURCHASE', 'SALE', 'CUSTOMER_RETURN', 'SUPPLIER_RETURN', 'LOSS_EXPIRED', 'LOSS_DAMAGED', 'LOSS_THEFT', 'COUNT_SURPLUS', 'COUNT_SHORTAGE', 'INITIAL_LOAD', 'MANUAL_CORRECTION'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('CASH', 'YAPE', 'MIXED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE movement_status AS ENUM ('COMPLETED', 'VOIDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------
-- 2. TABLAS PRINCIPALES (Core Domain)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS store (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_user (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES store(id) ON DELETE CASCADE,
    name varchar(50) NOT NULL,
    email varchar(100) NOT NULL UNIQUE,
    password varchar(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'ADMIN',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- 3. TABLAS DE DOMINIO (Inventario y Caja)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS category (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    name varchar(100) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(store_id, name)
);

CREATE TABLE IF NOT EXISTS supplier (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    name varchar(50) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    name varchar(50) NOT NULL,
    barcode varchar(50),
    sale_price numeric(10, 2) NOT NULL CHECK (sale_price >= 0),
    unit_cost_avg numeric(10, 2) CHECK (unit_cost_avg IS NULL OR unit_cost_avg >= 0),
    min_stock integer NOT NULL DEFAULT 10 CHECK (min_stock >= 0),
    category_id uuid REFERENCES category(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_register (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    opened_at timestamptz NOT NULL DEFAULT now(),
    opening_amount numeric(10, 2) NOT NULL CHECK (opening_amount >= 0),
    closed_at timestamptz,
    closing_amount numeric(10, 2) CHECK (closing_amount IS NULL OR closing_amount >= 0),
    notes TEXT,
    
    CONSTRAINT chk_close_fields_together
        CHECK ((closed_at IS NULL) = (closing_amount IS NULL))
);

-- ---------------------------------------------------------
-- 4. TABLAS TRANSACCIONALES (Movimientos)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_movement (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    cash_register_id uuid REFERENCES cash_register(id) ON DELETE SET NULL,
    movement_type movement_type NOT NULL,
    reason movement_reason NOT NULL,
    payment_method payment_method,
    supplier_id uuid REFERENCES supplier(id) ON DELETE SET NULL,
    status movement_status NOT NULL DEFAULT 'COMPLETED',
    voided_at timestamptz,
    void_reason TEXT,
    notes TEXT,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_supplier_requires_purchase_reason
        CHECK (supplier_id IS NULL OR reason IN ('PURCHASE', 'SUPPLIER_RETURN')),

    CONSTRAINT chk_sale_requires_payment
        CHECK (reason <> 'SALE' OR payment_method IS NOT NULL),

    CONSTRAINT chk_reason_matches_direction
        CHECK (
            (reason = 'PURCHASE'         AND movement_type = 'IN')  OR
            (reason = 'SALE'             AND movement_type = 'OUT') OR
            (reason = 'CUSTOMER_RETURN'  AND movement_type = 'IN')  OR
            (reason = 'SUPPLIER_RETURN'  AND movement_type = 'OUT') OR
            (reason = 'LOSS_EXPIRED'     AND movement_type = 'OUT') OR
            (reason = 'LOSS_DAMAGED'     AND movement_type = 'OUT') OR
            (reason = 'LOSS_THEFT'       AND movement_type = 'OUT') OR
            (reason = 'COUNT_SURPLUS'    AND movement_type = 'IN')  OR
            (reason = 'COUNT_SHORTAGE'   AND movement_type = 'OUT') OR
            (reason = 'INITIAL_LOAD'     AND movement_type = 'IN')  OR
            (reason = 'MANUAL_CORRECTION')
        ),

    CONSTRAINT chk_cash_register_requires_sale
        CHECK (cash_register_id IS NULL OR reason = 'SALE')
);

CREATE TABLE IF NOT EXISTS inventory_movement_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_id uuid NOT NULL REFERENCES inventory_movement(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES product(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
    unit_cost numeric(10, 2) NOT NULL CHECK (unit_cost >= 0)
);

-- ---------------------------------------------------------
-- 5. ÍNDICES (Optimización de búsquedas y unicidad)
-- ---------------------------------------------------------
-- Índices Únicos (Unicidad + Velocidad)
CREATE UNIQUE INDEX IF NOT EXISTS product_store_name_unique ON product (store_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS product_store_barcode_unique ON product (store_id, barcode) WHERE barcode IS NOT NULL;

-- Índices Regulares (Solo Velocidad)
CREATE INDEX IF NOT EXISTS idx_product_store_id ON product(store_id);
CREATE INDEX IF NOT EXISTS idx_product_category_id ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movement_store_id ON inventory_movement(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movement_created_at ON inventory_movement(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movement_item_movement_id ON inventory_movement_item(movement_id);
CREATE INDEX IF NOT EXISTS idx_movement_item_product_id ON inventory_movement_item(product_id);

-- ---------------------------------------------------------
-- 6. FUNCIONES Y TRIGGERS (Reglas de negocio estrictas)
-- ---------------------------------------------------------
-- Función auxiliar: Calcula el stock en tiempo real
CREATE OR REPLACE FUNCTION get_product_stock(p_product_id uuid)
RETURNS INTEGER LANGUAGE SQL STABLE AS $$
    SELECT COALESCE(SUM(CASE WHEN m.movement_type = 'IN' THEN mi.quantity WHEN m.movement_type = 'OUT' THEN -mi.quantity ELSE 0 END), 0)::INTEGER
    FROM inventory_movement_item mi
    JOIN inventory_movement m ON mi.movement_id = m.id
    WHERE mi.product_id = p_product_id AND m.status = 'COMPLETED';
$$;

-- Trigger: Evita anular un movimiento si eso deja stock negativo
CREATE OR REPLACE FUNCTION check_stock_non_negative_on_void()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
    resulting_stock INTEGER;
BEGIN
    FOR r IN SELECT DISTINCT product_id FROM inventory_movement_item WHERE movement_id = NEW.id
    LOOP
        resulting_stock := get_product_stock(r.product_id);
        IF resulting_stock < 0 THEN
            RAISE EXCEPTION 'No se puede anular: el producto % quedaría con stock negativo (%)', r.product_id, resulting_stock USING ERRCODE = 'check_violation';
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_stock_on_void ON inventory_movement;
CREATE TRIGGER trg_check_stock_on_void
AFTER UPDATE OF status ON inventory_movement
FOR EACH ROW WHEN (NEW.status = 'VOIDED' AND OLD.status = 'COMPLETED')
EXECUTE FUNCTION check_stock_non_negative_on_void();

-- Trigger: Defensa final para evitar ventas que excedan el stock
CREATE OR REPLACE FUNCTION check_product_stock_non_negative()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INTEGER;
    product_name TEXT;
BEGIN
    current_stock := get_product_stock(NEW.product_id);
    IF current_stock < 0 THEN
        SELECT p.name INTO product_name FROM product p WHERE p.id = NEW.product_id;
        RAISE EXCEPTION 'Stock insuficiente para "%": stock resultante = %', product_name, current_stock USING ERRCODE = 'check_violation';
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

-- ---------------------------------------------------------
-- 7. VISTAS (Reportes pre-calculados)
-- ---------------------------------------------------------
-- Vista: Inventario actual por producto
CREATE OR REPLACE VIEW vw_product_stock AS
SELECT p.*,
    COALESCE(SUM(CASE WHEN m.movement_type = 'IN' THEN mi.quantity WHEN m.movement_type = 'OUT' THEN -mi.quantity ELSE 0 END), 0)::INTEGER AS stock
FROM product p
LEFT JOIN inventory_movement_item mi ON p.id = mi.product_id
LEFT JOIN inventory_movement m ON mi.movement_id = m.id AND m.status = 'COMPLETED'
GROUP BY p.id;

-- Vista: Resumen de ventas y ganancias
CREATE OR REPLACE VIEW vw_sales_profit AS
SELECT
    m.id AS movement_id, m.store_id, m.created_at,
    mi.id AS movement_item_id, mi.product_id, p.name AS product_name, p.category_id,
    mi.quantity, mi.unit_price, mi.unit_cost,
    (mi.unit_price * mi.quantity) AS revenue,
    (mi.unit_cost * mi.quantity) AS cogs,
    ((mi.unit_price - mi.unit_cost) * mi.quantity) AS profit
FROM inventory_movement m
JOIN inventory_movement_item mi ON mi.movement_id = m.id
JOIN product p ON p.id = mi.product_id
WHERE m.reason = 'SALE' AND m.status = 'COMPLETED';

-- Vista: Arqueo de caja diaria
CREATE OR REPLACE VIEW vw_cash_register_summary AS
SELECT 
    cr.*,
    cr.opening_amount + COALESCE(SUM(CASE WHEN m.payment_method = 'CASH' THEN mi.unit_price * mi.quantity ELSE 0 END), 0) AS expected_cash,
    cr.closing_amount - (cr.opening_amount + COALESCE(SUM(CASE WHEN m.payment_method = 'CASH' THEN mi.unit_price * mi.quantity ELSE 0 END), 0)) AS difference
FROM cash_register as cr
LEFT JOIN inventory_movement m ON m.cash_register_id = cr.id AND m.reason = 'SALE' AND m.status = 'COMPLETED'
LEFT JOIN inventory_movement_item mi ON mi.movement_id = m.id
GROUP BY cr.id;
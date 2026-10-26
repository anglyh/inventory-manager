-- =========================================================================================
-- SCHEMA INICIAL - HOSTAL INVENTORY
-- Esquema base de desarrollo. CREATE TABLE IF NOT EXISTS no actualiza tablas existentes.
-- Arquitectura: Multi-Tenant (Cada store/tienda es dueña de sus datos, usuarios y productos)
-- =========================================================================================

-- ---------------------------------------------------------
-- 1. EXTENSIONES Y TIPOS DE DATOS (ENUMS)
-- ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('ADMIN', 'GUEST'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE movement_type AS ENUM ('IN', 'OUT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE movement_reason AS ENUM ('PURCHASE', 'SALE', 'LOSS_EXPIRED', 'LOSS_DAMAGED', 'COUNT_SURPLUS', 'COUNT_SHORTAGE', 'INITIAL_LOAD'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('CASH', 'YAPE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE movement_status AS ENUM ('COMPLETED', 'VOIDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE document_type AS ENUM ('DNI', 'CE', 'PASSPORT', 'PTP', 'OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE guest_sex AS ENUM ('M', 'F'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE rate_kind AS ENUM ('HOURLY', 'NIGHT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE guardian_relation AS ENUM ('PARENT', 'TUTOR', 'RESPONSIBLE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE stay_charge_kind AS ENUM ('RATE', 'EXTRA_HOURS', 'OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE expense_group AS ENUM ('LODGING', 'GENERAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE expense_source AS ENUM ('CASH_REGISTER', 'OUTSIDE'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------
-- 2. TABLAS PRINCIPALES (Core Domain)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS store (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(50) NOT NULL,
    -- Hora de salida de las estadías por noche (hora de Lima) y minutos de gracia antes de cobrar horas extra.
    checkout_time time NOT NULL DEFAULT '12:00',
    extra_tolerance_minutes integer NOT NULL DEFAULT 15 CHECK (extra_tolerance_minutes BETWEEN 0 AND 240),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_user (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    name varchar(50) NOT NULL,
    email varchar(100) NOT NULL UNIQUE,
    password varchar(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'ADMIN',
    -- Desactivado: conserva su historial pero no puede iniciar sesión ni usar su token.
    active boolean NOT NULL DEFAULT true,
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
    opened_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
    closed_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
    closing_notes text,
    closing_summary jsonb,
    notes TEXT,
    
    CONSTRAINT chk_close_fields_together
        CHECK ((closed_at IS NULL) = (closing_amount IS NULL))
);

-- Gastos: catálogo editable. LODGING resta del resultado del hospedaje; GENERAL, de la ganancia neta.
CREATE TABLE IF NOT EXISTS expense_category (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    name varchar(50) NOT NULL,
    expense_group expense_group NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Hostal: catálogo de tipos de habitación con sus tarifas sugeridas.
CREATE TABLE IF NOT EXISTS room_type (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    name varchar(50) NOT NULL,
    capacity integer NOT NULL CHECK (capacity > 0),
    description text,
    hour_price numeric(10, 2) NOT NULL CHECK (hour_price >= 0),
    night_price numeric(10, 2) NOT NULL CHECK (night_price >= 0),
    extra_hour_price numeric(10, 2) NOT NULL CHECK (extra_hour_price >= 0),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- "Ocupada" no se guarda: se calcula a partir de la estadía activa.
CREATE TABLE IF NOT EXISTS room (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    number varchar(10) NOT NULL,
    floor integer,
    room_type_id uuid NOT NULL REFERENCES room_type(id) ON DELETE RESTRICT,
    needs_cleaning boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(store_id, number)
);

-- Registro de Huéspedes (DS 001-2015-MINCETUR): un huésped por documento y tienda.
CREATE TABLE IF NOT EXISTS guest (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    document_number varchar(20) NOT NULL,
    full_name varchar(120) NOT NULL,
    birth_date date NOT NULL,
    sex guest_sex NOT NULL,
    nationality varchar(60) NOT NULL,
    residence varchar(120) NOT NULL,
    phone varchar(20),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(store_id, document_type, document_number)
);

-- ---------------------------------------------------------
-- 4. TABLAS TRANSACCIONALES (Movimientos)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_register_movement (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id uuid NOT NULL REFERENCES cash_register(id) ON DELETE RESTRICT,
    type text NOT NULL CHECK (type IN ('CASH_IN', 'CASH_OUT')),
    amount numeric(10, 2) NOT NULL CHECK (amount > 0),
    reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 500),
    created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS inventory_movement (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    cash_register_id uuid REFERENCES cash_register(id) ON DELETE RESTRICT,
    movement_type movement_type NOT NULL,
    reason movement_reason NOT NULL,
    payment_method payment_method,
    supplier_id uuid REFERENCES supplier(id) ON DELETE RESTRICT,
    created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
    voided_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
    status movement_status NOT NULL DEFAULT 'COMPLETED',
    voided_at timestamptz,
    void_reason TEXT,
    notes TEXT,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT chk_supplier_requires_purchase_reason
        CHECK (supplier_id IS NULL OR reason IN ('PURCHASE')),

    CONSTRAINT chk_sale_requires_payment
        CHECK (reason <> 'SALE' OR payment_method IS NOT NULL),

    CONSTRAINT chk_reason_matches_direction
        CHECK (
            (reason = 'PURCHASE'         AND movement_type = 'IN')  OR
            (reason = 'SALE'             AND movement_type = 'OUT') OR
            (reason = 'LOSS_EXPIRED'     AND movement_type = 'OUT') OR
            (reason = 'LOSS_DAMAGED'     AND movement_type = 'OUT') OR
            (reason = 'COUNT_SURPLUS'    AND movement_type = 'IN')  OR
            (reason = 'COUNT_SHORTAGE'   AND movement_type = 'OUT') OR
            (reason = 'INITIAL_LOAD'     AND movement_type = 'IN')
        ),

    -- Toda venta debe estar vinculada a una caja.
    CONSTRAINT chk_sale_requires_cash_register
        CHECK (reason <> 'SALE' OR cash_register_id IS NOT NULL),

    -- Solo las ventas pueden estar vinculadas a una caja.
    CONSTRAINT chk_cash_register_requires_sale
        CHECK (cash_register_id IS NULL OR reason = 'SALE')
);

CREATE TABLE IF NOT EXISTS inventory_movement_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_id uuid NOT NULL REFERENCES inventory_movement(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES product(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
    unit_cost numeric(10, 2) NOT NULL CHECK (unit_cost >= 0),
    unit_cost_before numeric(10, 2) CHECK (unit_cost_before IS NULL OR unit_cost_before >= 0)
);

-- Estadía: activa mientras actual_check_out es NULL.
CREATE TABLE IF NOT EXISTS stay (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    room_id uuid NOT NULL REFERENCES room(id) ON DELETE RESTRICT,
    rate_kind rate_kind NOT NULL,
    -- Horas contratadas (solo tarifa por horas): salida esperada = ingreso + horas.
    hours integer CHECK (hours > 0),
    check_in_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    expected_check_out timestamptz NOT NULL,
    actual_check_out timestamptz,
    travel_reason text,
    -- Copia de la tarifa al ingresar: cambiar el tipo después no altera el adicional.
    extra_hour_price numeric(10, 2) NOT NULL CHECK (extra_hour_price >= 0),
    migrations_reported_at timestamptz,
    created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
    closed_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
    notes text,

    CONSTRAINT chk_stay_hours_match_rate_kind
        CHECK ((rate_kind = 'HOURLY') = (hours IS NOT NULL)),
    CONSTRAINT chk_stay_expected_after_check_in
        CHECK (expected_check_out > check_in_at),
    CONSTRAINT chk_stay_actual_after_check_in
        CHECK (actual_check_out IS NULL OR actual_check_out >= check_in_at)
);

-- Registro legal: copia los datos del huésped al ingresar. `guest` se actualiza en cada visita
-- (sirve para autocompletar); las estadías pasadas conservan los datos tal como se registraron.
CREATE TABLE IF NOT EXISTS stay_guest (
    stay_id uuid NOT NULL REFERENCES stay(id) ON DELETE CASCADE,
    guest_id uuid NOT NULL REFERENCES guest(id) ON DELETE RESTRICT,
    is_holder boolean NOT NULL DEFAULT false,
    document_type document_type NOT NULL,
    document_number varchar(20) NOT NULL,
    full_name varchar(120) NOT NULL,
    birth_date date NOT NULL,
    sex guest_sex NOT NULL,
    nationality varchar(60) NOT NULL,
    residence varchar(120) NOT NULL,
    phone varchar(20),
    PRIMARY KEY (stay_id, guest_id)
);

-- Menores de edad: se registran con su relación con el adulto responsable.
CREATE TABLE IF NOT EXISTS stay_minor (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stay_id uuid NOT NULL REFERENCES stay(id) ON DELETE CASCADE,
    full_name varchar(120) NOT NULL,
    document_type document_type,
    document_number varchar(20),
    birth_date date NOT NULL,
    guardian_relation guardian_relation NOT NULL,
    accreditation text
);

-- Se guardan lo sugerido y lo cobrado: el precio final lo decide quien atiende.
CREATE TABLE IF NOT EXISTS stay_charge (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stay_id uuid NOT NULL REFERENCES stay(id) ON DELETE CASCADE,
    kind stay_charge_kind NOT NULL,
    description varchar(200) NOT NULL,
    suggested_amount numeric(10, 2) CHECK (suggested_amount IS NULL OR suggested_amount >= 0),
    amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
    created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Los cobros de habitaciones entran a la caja abierta, igual que las ventas.
CREATE TABLE IF NOT EXISTS stay_payment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stay_id uuid NOT NULL REFERENCES stay(id) ON DELETE CASCADE,
    cash_register_id uuid NOT NULL REFERENCES cash_register(id) ON DELETE RESTRICT,
    payment_method payment_method NOT NULL,
    amount numeric(10, 2) NOT NULL CHECK (amount > 0),
    created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Gasto del negocio. Si se pagó con la caja abierta, se enlaza a la salida (CASH_OUT) que lo descuenta.
CREATE TABLE IF NOT EXISTS expense (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES expense_category(id) ON DELETE RESTRICT,
    amount numeric(10, 2) NOT NULL CHECK (amount > 0),
    -- Día de Lima al que corresponde el gasto.
    spent_on date NOT NULL,
    description text CHECK (description IS NULL OR length(description) <= 500),
    source expense_source NOT NULL,
    cash_movement_id uuid UNIQUE REFERENCES cash_register_movement(id) ON DELETE RESTRICT,
    created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT chk_expense_source_matches_movement
        CHECK ((source = 'CASH_REGISTER') = (cash_movement_id IS NOT NULL))
);

-- ---------------------------------------------------------
-- 5. ÍNDICES (Optimización de búsquedas y unicidad)
-- ---------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS cash_register_one_open_per_store
    ON cash_register(store_id) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS cash_register_history_idx
    ON cash_register(store_id, opened_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS inventory_movement_cash_register_idx
    ON inventory_movement(cash_register_id) WHERE cash_register_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS cash_register_movement_history_idx
    ON cash_register_movement(cash_register_id, created_at DESC, id DESC);

-- Índices Únicos (Unicidad + Velocidad)
CREATE UNIQUE INDEX IF NOT EXISTS product_store_name_unique ON product (store_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS supplier_store_name_unique ON supplier (store_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS product_store_barcode_unique ON product (store_id, barcode) WHERE barcode IS NOT NULL;

-- Índices Regulares (Solo Velocidad)
CREATE INDEX IF NOT EXISTS idx_product_store_id ON product(store_id);
CREATE INDEX IF NOT EXISTS idx_product_category_id ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movement_store_id ON inventory_movement(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movement_created_at ON inventory_movement(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movement_item_movement_id ON inventory_movement_item(movement_id);
CREATE INDEX IF NOT EXISTS idx_movement_item_product_id ON inventory_movement_item(product_id);

-- Hostal
CREATE UNIQUE INDEX IF NOT EXISTS room_type_store_name_unique ON room_type (store_id, lower(name));
-- Una sola estadía activa por habitación.
CREATE UNIQUE INDEX IF NOT EXISTS stay_one_active_per_room ON stay(room_id) WHERE actual_check_out IS NULL;
-- Un solo titular por estadía.
CREATE UNIQUE INDEX IF NOT EXISTS stay_guest_one_holder ON stay_guest(stay_id) WHERE is_holder;
CREATE INDEX IF NOT EXISTS idx_room_room_type_id ON room(room_type_id);
CREATE INDEX IF NOT EXISTS idx_stay_store_check_in ON stay(store_id, check_in_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_stay_guest_guest_id ON stay_guest(guest_id);
CREATE INDEX IF NOT EXISTS idx_stay_minor_stay_id ON stay_minor(stay_id);
CREATE INDEX IF NOT EXISTS idx_stay_charge_stay_id ON stay_charge(stay_id);
CREATE INDEX IF NOT EXISTS idx_stay_payment_stay_id ON stay_payment(stay_id);
CREATE INDEX IF NOT EXISTS idx_stay_payment_cash_register_id ON stay_payment(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_stay_payment_created_at ON stay_payment(created_at DESC);

-- Gastos
CREATE UNIQUE INDEX IF NOT EXISTS expense_category_store_name_unique ON expense_category (store_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_expense_store_spent_on ON expense(store_id, spent_on DESC);
CREATE INDEX IF NOT EXISTS idx_expense_category_id ON expense(category_id);

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

-- Agregaciones independientes: cada venta y cada aporte/retiro se suma una sola vez.
CREATE OR REPLACE VIEW vw_cash_register_totals AS
SELECT
    cr.id AS cash_register_id,
    s.cash_sales,
    s.yape_sales,
    s.total_sales,
    s.sales_count,
    cm.cash_in,
    cm.cash_out,
    cr.opening_amount + s.cash_sales + sp.cash_stays + cm.cash_in - cm.cash_out AS expected_cash,
    sp.cash_stays,
    sp.yape_stays
FROM cash_register cr
CROSS JOIN LATERAL (
    SELECT
        COALESCE(
            SUM(mi.unit_price * mi.quantity) FILTER (WHERE m.payment_method = 'CASH'),
            0.00
        ) AS cash_sales,
        COALESCE(
            SUM(mi.unit_price * mi.quantity) FILTER (WHERE m.payment_method = 'YAPE'),
            0.00
        ) AS yape_sales,
        COALESCE(SUM(mi.unit_price * mi.quantity), 0.00) AS total_sales,
        COUNT(DISTINCT m.id)::integer AS sales_count
    FROM inventory_movement m
    LEFT JOIN inventory_movement_item mi ON mi.movement_id = m.id
    WHERE m.cash_register_id = cr.id
        AND m.store_id = cr.store_id
        AND m.reason = 'SALE'
        AND m.status = 'COMPLETED'
) s
CROSS JOIN LATERAL (
    SELECT
        COALESCE(SUM(amount) FILTER (WHERE type = 'CASH_IN'), 0.00) AS cash_in,
        COALESCE(SUM(amount) FILTER (WHERE type = 'CASH_OUT'), 0.00) AS cash_out
    FROM cash_register_movement
    WHERE cash_register_id = cr.id
) cm
-- Cobros de estadías: el efectivo entra al cuadre de la caja igual que una venta.
CROSS JOIN LATERAL (
    SELECT
        COALESCE(SUM(amount) FILTER (WHERE payment_method = 'CASH'), 0.00) AS cash_stays,
        COALESCE(SUM(amount) FILTER (WHERE payment_method = 'YAPE'), 0.00) AS yape_stays
    FROM stay_payment
    WHERE cash_register_id = cr.id
) sp;

-- Vista: cuenta de cada estadía (cargos, pagos y saldo pendiente).
CREATE OR REPLACE VIEW vw_stay_balance AS
SELECT
    st.id AS stay_id,
    st.store_id,
    c.charges_total,
    p.payments_total,
    c.charges_total - p.payments_total AS balance
FROM stay st
CROSS JOIN LATERAL (
    SELECT COALESCE(SUM(amount), 0.00) AS charges_total
    FROM stay_charge
    WHERE stay_id = st.id
) c
CROSS JOIN LATERAL (
    SELECT COALESCE(SUM(amount), 0.00) AS payments_total
    FROM stay_payment
    WHERE stay_id = st.id
) p;

-- Vista: efectivo esperado de la caja abierta y arqueo guardado al cerrar.
CREATE OR REPLACE VIEW vw_cash_register_summary AS
SELECT
    cr.id,
    cr.store_id,
    cr.opened_at,
    cr.opening_amount,
    cr.closed_at,
    cr.closing_amount,
    cr.notes,
    CASE
        WHEN cr.closed_at IS NULL THEN t.expected_cash
        ELSE (cr.closing_summary->>'expectedCash')::numeric
    END AS expected_cash,
    CASE
        WHEN cr.closed_at IS NULL THEN NULL::numeric
        ELSE (cr.closing_summary->>'difference')::numeric
    END AS difference
FROM cash_register cr
JOIN vw_cash_register_totals t ON t.cash_register_id = cr.id;

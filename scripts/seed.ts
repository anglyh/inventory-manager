/**
 * Seed de desarrollo: simula ~14 meses de operación de una tienda de hostal.
 *
 * Todo pasa por los servicios reales (ventas, compras, mermas, conteos, cajas), así que los
 * costos promedio, las fotos de costo, los cierres y los triggers de stock se calculan igual
 * que en producción. Los servicios guardan la hora actual, por eso cada operación se ejecuta
 * en orden cronológico y después se mueve su fecha al momento simulado.
 *
 * El hostal (tipos de habitación, habitaciones y estadías) usa su propia semilla, así que los datos
 * de la tienda no cambian al agregarlo. Los gastos también tienen la suya.
 *
 * Uso: bun run db:reset && bun run db:migrate && bun run db:seed
 */
import { query } from '../src/db/index.js';
import { env } from '../src/config.js';
import {
  cashRegisterService,
  categoryService,
  expenseService,
  inventoryMovementService,
  productService,
  roomService,
  stayService,
  supplierService,
  userService,
} from '../src/container.js';
import { suggestExpectedCheckOut, suggestExtra, type RateKind } from '../src/utils/stay-pricing.js';

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

/** Días simulados hacia atrás desde hoy (~14 meses). */
const DAYS = 425;
/** Ventas base por día, antes de estacionalidad y crecimiento. */
const BASE_SALES_PER_DAY = 34;
const OPENING_AMOUNT = 100;
const LIMA_OFFSET_HOURS = 5;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const PASSWORD = 'Hostal2026Demo';

// ---------------------------------------------------------------------------
// Azar reproducible: la misma semilla genera siempre los mismos datos.
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(20261013);
const chance = (p: number) => random() < p;
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)]!;
function weighted<T>(list: T[], weight: (item: T) => number): T {
  const total = list.reduce((sum, item) => sum + weight(item), 0);
  let roll = random() * total;
  for (const item of list) {
    roll -= weight(item);
    if (roll <= 0) return item;
  }
  return list[list.length - 1]!;
}
const toMoney = (cents: number) => Number((Math.round(cents) / 100).toFixed(2));

// Semilla aparte para el hostal: agregar estadías no altera la secuencia de la tienda.
const stayRandom = mulberry32(20261014);
const stayChance = (p: number) => stayRandom() < p;
const stayBetween = (min: number, max: number) => min + Math.floor(stayRandom() * (max - min + 1));
const stayPick = <T>(list: T[]) => list[Math.floor(stayRandom() * list.length)]!;

// Gastos: semilla propia, para no alterar los datos de la tienda ni del hostal.
const expenseRandom = mulberry32(20261015);
const expenseChance = (p: number) => expenseRandom() < p;
const expenseBetween = (min: number, max: number) => min + Math.floor(expenseRandom() * (max - min + 1));

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

interface CatalogItem {
  name: string;
  category: string;
  cost: number; // soles
  price: number; // soles
  minStock: number;
  popularity: number;
  perishable?: boolean;
}

const SUPPLIER_BY_CATEGORY: Record<string, string> = {
  Bebidas: 'Distribuidora Lima Norte',
  Cervezas: 'Backus Distribuidor',
  Snacks: 'Mayorista El Sol',
  Golosinas: 'Mayorista El Sol',
  Lácteos: 'Lácteos del Valle',
  Panadería: 'Panadería San Jorge',
  Abarrotes: 'Mayorista El Sol',
  'Cuidado personal': 'Droguería Central',
  Limpieza: 'Droguería Central',
};

const CATALOG: CatalogItem[] = [
  { name: 'Agua San Luis 625ml', category: 'Bebidas', cost: 0.9, price: 2, minStock: 24, popularity: 14 },
  { name: 'Agua San Luis 2.5L', category: 'Bebidas', cost: 2.6, price: 4.5, minStock: 8, popularity: 5 },
  { name: 'Inca Kola 500ml', category: 'Bebidas', cost: 1.9, price: 3.5, minStock: 18, popularity: 11 },
  { name: 'Coca Cola 500ml', category: 'Bebidas', cost: 1.9, price: 3.5, minStock: 18, popularity: 10 },
  { name: 'Inca Kola 1.5L', category: 'Bebidas', cost: 4.6, price: 7.5, minStock: 8, popularity: 4 },
  { name: 'Sporade 500ml', category: 'Bebidas', cost: 1.8, price: 3, minStock: 12, popularity: 5 },
  { name: 'Volt 300ml', category: 'Bebidas', cost: 1.3, price: 2.5, minStock: 12, popularity: 6 },
  { name: 'Red Bull 250ml', category: 'Bebidas', cost: 4.8, price: 8, minStock: 6, popularity: 3 },
  { name: 'Té Lipton frío 500ml', category: 'Bebidas', cost: 2, price: 3.5, minStock: 8, popularity: 3 },
  { name: 'Frugos del Valle 300ml', category: 'Bebidas', cost: 1.4, price: 2.5, minStock: 10, popularity: 4 },
  { name: 'Pilsen Callao 630ml', category: 'Cervezas', cost: 5.2, price: 8, minStock: 24, popularity: 9 },
  { name: 'Cusqueña Dorada 330ml', category: 'Cervezas', cost: 4, price: 7, minStock: 18, popularity: 7 },
  { name: 'Cristal 650ml', category: 'Cervezas', cost: 4.9, price: 7.5, minStock: 18, popularity: 6 },
  { name: 'Corona 355ml', category: 'Cervezas', cost: 5.5, price: 9, minStock: 12, popularity: 4 },
  { name: 'Papas Lays clásicas 42g', category: 'Snacks', cost: 1.6, price: 2.8, minStock: 15, popularity: 7 },
  { name: 'Doritos 45g', category: 'Snacks', cost: 1.7, price: 3, minStock: 15, popularity: 6 },
  { name: 'Cheese Tris 44g', category: 'Snacks', cost: 1.3, price: 2.5, minStock: 12, popularity: 5 },
  { name: 'Piqueo Snax 55g', category: 'Snacks', cost: 1.8, price: 3, minStock: 10, popularity: 4 },
  { name: 'Maní salado 100g', category: 'Snacks', cost: 2, price: 3.5, minStock: 8, popularity: 3 },
  { name: 'Galletas Oreo', category: 'Golosinas', cost: 0.8, price: 1.5, minStock: 20, popularity: 8 },
  { name: 'Galletas Soda Field', category: 'Golosinas', cost: 0.6, price: 1, minStock: 20, popularity: 6 },
  { name: 'Chocolate Sublime', category: 'Golosinas', cost: 1.1, price: 2, minStock: 20, popularity: 7 },
  { name: 'Chocolate Princesa', category: 'Golosinas', cost: 1, price: 1.8, minStock: 15, popularity: 4 },
  { name: 'Caramelos de limón (bolsa)', category: 'Golosinas', cost: 2.5, price: 4.5, minStock: 6, popularity: 2 },
  { name: 'Chicle Trident', category: 'Golosinas', cost: 1.2, price: 2, minStock: 12, popularity: 4 },
  { name: 'Yogurt Gloria 1L', category: 'Lácteos', cost: 4.8, price: 7.5, minStock: 6, popularity: 4, perishable: true },
  { name: 'Leche Gloria tarro', category: 'Lácteos', cost: 3.4, price: 4.8, minStock: 12, popularity: 3 },
  { name: 'Yogurt Laive 180g', category: 'Lácteos', cost: 1.5, price: 2.5, minStock: 10, popularity: 4, perishable: true },
  { name: 'Queso fresco 250g', category: 'Lácteos', cost: 6, price: 9.5, minStock: 4, popularity: 2, perishable: true },
  { name: 'Pan de molde Bimbo', category: 'Panadería', cost: 6.5, price: 9.5, minStock: 4, popularity: 3, perishable: true },
  { name: 'Keke de vainilla', category: 'Panadería', cost: 1.5, price: 2.5, minStock: 8, popularity: 3, perishable: true },
  { name: 'Empanada de carne', category: 'Panadería', cost: 2.5, price: 4.5, minStock: 6, popularity: 4, perishable: true },
  { name: 'Fideos Don Vittorio 500g', category: 'Abarrotes', cost: 2.8, price: 4.2, minStock: 6, popularity: 2 },
  { name: 'Atún Florida', category: 'Abarrotes', cost: 4.5, price: 6.5, minStock: 8, popularity: 3 },
  { name: 'Avena Quaker 300g', category: 'Abarrotes', cost: 3.2, price: 5, minStock: 5, popularity: 2 },
  { name: 'Café Altomayo sobre', category: 'Abarrotes', cost: 0.5, price: 1, minStock: 30, popularity: 5 },
  { name: 'Sopa instantánea Ajinomen', category: 'Abarrotes', cost: 1.4, price: 2.5, minStock: 15, popularity: 6 },
  { name: 'Pasta dental Colgate 75ml', category: 'Cuidado personal', cost: 3.8, price: 6, minStock: 6, popularity: 3 },
  { name: 'Cepillo de dientes', category: 'Cuidado personal', cost: 2.2, price: 4, minStock: 8, popularity: 3 },
  { name: 'Shampoo sachet', category: 'Cuidado personal', cost: 0.5, price: 1, minStock: 20, popularity: 3 },
  { name: 'Jabón Protex', category: 'Cuidado personal', cost: 2.6, price: 4, minStock: 8, popularity: 2 },
  { name: 'Desodorante Rexona', category: 'Cuidado personal', cost: 8.5, price: 13, minStock: 4, popularity: 1 },
  { name: 'Protector solar sachet', category: 'Cuidado personal', cost: 2, price: 3.5, minStock: 10, popularity: 2 },
  { name: 'Toallas húmedas', category: 'Cuidado personal', cost: 3.5, price: 6, minStock: 5, popularity: 1 },
  { name: 'Papel higiénico Elite x2', category: 'Limpieza', cost: 2.4, price: 4, minStock: 10, popularity: 3 },
  { name: 'Pañuelos desechables', category: 'Limpieza', cost: 1, price: 2, minStock: 12, popularity: 2 },
  { name: 'Repelente Off sachet', category: 'Limpieza', cost: 1.8, price: 3, minStock: 8, popularity: 2 },
];

// ---------------------------------------------------------------------------
// Hostal
// ---------------------------------------------------------------------------

const ROOM_TYPES = [
  { name: 'Estándar', capacity: 2, description: 'Cama de 2 plazas, baño compartido', hourPrice: 10, nightPrice: 50, extraHourPrice: 10 },
  { name: 'Doble con baño', capacity: 2, description: 'Cama de 2 plazas con baño privado', hourPrice: 13, nightPrice: 65, extraHourPrice: 12 },
];

/** Horas contratadas en la tarifa por horas: casi siempre 2 a 4, a veces 1 o 6. */
const HOURLY_OPTIONS = [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 6];

const ROOMS: [number: string, floor: number, type: string][] = [
  ['201', 2, 'Estándar'], ['202', 2, 'Estándar'], ['203', 2, 'Estándar'], ['204', 2, 'Doble con baño'], ['205', 2, 'Doble con baño'],
  ['301', 3, 'Doble con baño'], ['302', 3, 'Doble con baño'], ['303', 3, 'Estándar'], ['304', 3, 'Estándar'],
];

const CHECKOUT_TIME = '12:00';

/** Días (hacia atrás desde hoy) con gastos registrados: los últimos meses. */
const EXPENSE_DAYS = 120;
const EXTRA_TOLERANCE_MINUTES = 15;
const TRAVEL_REASONS = ['Turismo', 'Trabajo', 'Visita familiar', 'Tránsito', 'Salud'];
const FIRST_NAMES: [string, 'M' | 'F'][] = [
  ['Juan', 'M'], ['María', 'F'], ['Luis', 'M'], ['Rosa', 'F'], ['Carlos', 'M'], ['Ana', 'F'], ['Jorge', 'M'], ['Carmen', 'F'],
  ['José', 'M'], ['Lucía', 'F'], ['Pedro', 'M'], ['Elena', 'F'], ['Miguel', 'M'], ['Sofía', 'F'], ['Diego', 'M'], ['Patricia', 'F'],
  ['Raúl', 'M'], ['Gabriela', 'F'], ['Víctor', 'M'], ['Milagros', 'F'],
];
const SURNAMES = ['Quispe', 'Mamani', 'Flores', 'Huamán', 'Rojas', 'García', 'Torres', 'Chávez', 'Vargas', 'Castillo', 'Ramírez', 'Mendoza', 'Díaz', 'Paredes'];
const CITIES = ['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Piura', 'Chiclayo', 'Huancayo', 'Puno', 'Ica', 'Tacna'];
const FOREIGNERS: { fullName: string; sex: 'M' | 'F'; nationality: string; residence: string; documentType: 'PASSPORT' | 'CE' | 'PTP' }[] = [
  { fullName: 'Martín Gómez', sex: 'M', nationality: 'Argentina', residence: 'Buenos Aires', documentType: 'PASSPORT' },
  { fullName: 'Valentina Muñoz', sex: 'F', nationality: 'Chilena', residence: 'Santiago', documentType: 'PASSPORT' },
  { fullName: 'Andrés Restrepo', sex: 'M', nationality: 'Colombiana', residence: 'Lima', documentType: 'CE' },
  { fullName: 'Claire Dubois', sex: 'F', nationality: 'Francesa', residence: 'Lyon', documentType: 'PASSPORT' },
  { fullName: 'John Miller', sex: 'M', nationality: 'Estadounidense', residence: 'Denver', documentType: 'PASSPORT' },
  { fullName: 'Daniela Pérez', sex: 'F', nationality: 'Venezolana', residence: 'Lima', documentType: 'PTP' },
  { fullName: 'Lukas Schneider', sex: 'M', nationality: 'Alemana', residence: 'Múnich', documentType: 'PASSPORT' },
];

interface SeedGuest {
  documentType: 'DNI' | 'CE' | 'PASSPORT' | 'PTP';
  documentNumber: string;
  fullName: string;
  birthDate: string;
  sex: 'M' | 'F';
  nationality: string;
  residence: string;
  phone: string | null;
}

/** Clientes que vuelven: un grupo fijo de peruanos y algunos extranjeros. */
function buildGuestPool(): SeedGuest[] {
  const birthDate = () => `${stayBetween(1958, 2004)}-${String(stayBetween(1, 12)).padStart(2, '0')}-${String(stayBetween(1, 28)).padStart(2, '0')}`;
  const locals = Array.from({ length: 60 }, (_, index): SeedGuest => {
    const [first, sex] = stayPick(FIRST_NAMES);
    return {
      documentType: 'DNI',
      documentNumber: String(40_000_000 + index * 104_729 + stayBetween(0, 999)).slice(0, 8),
      fullName: `${first} ${stayPick(SURNAMES)} ${stayPick(SURNAMES)}`,
      birthDate: birthDate(),
      sex,
      nationality: 'Peruana',
      residence: stayPick(CITIES),
      phone: stayChance(0.7) ? `9${stayBetween(10_000_000, 99_999_999)}` : null,
    };
  });
  const foreigners = FOREIGNERS.map((person, index): SeedGuest => ({
    ...person,
    documentNumber: person.documentType === 'PASSPORT' ? `P${String(5_310_000 + index * 7_919)}` : String(1_000_000 + index * 3_571).padStart(9, '0'),
    birthDate: birthDate(),
    phone: null,
  }));
  return [...locals, ...foreigners];
}

// ---------------------------------------------------------------------------
// Fechas (Lima, UTC−5 sin horario de verano)
// ---------------------------------------------------------------------------

function limaToday(): { y: number; m: number; d: number } {
  const now = new Date(Date.now() - LIMA_OFFSET_HOURS * HOUR_MS);
  return { y: now.getUTCFullYear(), m: now.getUTCMonth(), d: now.getUTCDate() };
}

/** Medianoche Lima del día `offset` (0 = primer día simulado) como milisegundos UTC. */
function dayStart(offset: number): number {
  const { y, m, d } = limaToday();
  return Date.UTC(y, m, d) + LIMA_OFFSET_HOURS * HOUR_MS - (DAYS - offset) * DAY_MS;
}

const at = (day: number, hour: number, minute = 0) => new Date(day + hour * HOUR_MS + minute * 60_000);

/** Demanda relativa: fines de semana, verano (ene–mar), fiestas de julio y diciembre, y crecimiento. */
function demandFactor(day: number, progress: number): number {
  const date = new Date(day - LIMA_OFFSET_HOURS * HOUR_MS);
  const dow = date.getUTCDay();
  const month = date.getUTCMonth();
  const dayOfMonth = date.getUTCDate();
  let factor = dow === 5 || dow === 6 ? 1.45 : dow === 0 ? 1.2 : 1;
  if (month <= 2) factor *= 1.3;
  if (month === 11) factor *= 1.25;
  if (month === 6 && dayOfMonth >= 26) factor *= 1.5;
  return factor * (0.85 + progress * 0.35);
}

/** Peso por hora: poca venta temprano, pico al mediodía y por la noche. */
const HOUR_WEIGHTS: [number, number][] = [
  [7, 2], [8, 4], [9, 4], [10, 3], [11, 4], [12, 6], [13, 6], [14, 4], [15, 3],
  [16, 3], [17, 4], [18, 6], [19, 8], [20, 8], [21, 7], [22, 4],
];

// ---------------------------------------------------------------------------
// Mover fechas: cada operación se crea "ahora" y luego se lleva a su momento simulado.
// ---------------------------------------------------------------------------

async function marker(): Promise<Date> {
  const { rows } = await query('SELECT clock_timestamp() AS t');
  return rows[0].t;
}

/** Primer pago de una estadía (adelanto), creado después de `since`. */
async function backdateStayRows(stayId: string, since: Date, time: Date) {
  await query('UPDATE stay_charge SET created_at = $3 WHERE stay_id = $1 AND created_at >= $2', [stayId, since, time]);
  await query('UPDATE stay_payment SET created_at = $3 WHERE stay_id = $1 AND created_at >= $2', [stayId, since, time]);
}

async function backdateMovements(ids: string[], times: Date[]) {
  if (!ids.length) return;
  await query(
    `UPDATE inventory_movement m SET created_at = v.t
     FROM unnest($1::uuid[], $2::timestamptz[]) AS v(id, t)
     WHERE m.id = v.id`,
    [ids, times],
  );
}

/** Lo creado después de `since` (operaciones que no devuelven id) pasa a `time`. */
async function backdateSince(since: Date, time: Date) {
  await query('UPDATE inventory_movement SET created_at = $2 WHERE created_at >= $1', [since, time]);
  await query('UPDATE cash_register_movement SET created_at = $2 WHERE created_at >= $1', [since, time]);
  await query('UPDATE inventory_movement SET voided_at = $2 WHERE voided_at >= $1', [since, time]);
}

// ---------------------------------------------------------------------------
// Simulación
// ---------------------------------------------------------------------------

interface Product extends CatalogItem {
  id: string;
  categoryId: string;
  priceCents: number;
  stock: number;
}

interface Staff {
  id: string;
  name: string;
}

/** Estadía creada cuyo check-out todavía no se ejecutó. */
interface PendingStay {
  stayId: string;
  roomId: string;
  checkInAt: Date;
  expectedAt: Date;
  actualAt: Date;
  extraHourPrice: number;
  /** Huéspedes alojados: no pueden entrar a otra habitación hasta su salida. */
  guests: SeedGuest[];
}

async function main() {
  if (env.NODE_ENV === 'production') throw new Error('El seed no se ejecuta en producción.');
  const { rows: existing } = await query('SELECT COUNT(*)::int AS n FROM app_user');
  if (existing[0].n > 0) {
    throw new Error('La base ya tiene datos. Ejecuta "bun run db:reset" y "bun run db:migrate" antes del seed.');
  }

  const startedAt = Date.now();
  const day0 = dayStart(0);

  // --- Dueño, tienda y empleados -------------------------------------------
  await userService.register({ name: 'Rosa Quispe', email: 'admin@hostal.pe', password: PASSWORD });
  const { rows: adminRows } = await query('SELECT id, store_id FROM app_user WHERE email = $1', ['admin@hostal.pe']);
  const storeId: string = adminRows[0].store_id;
  const admin: Staff = { id: adminRows[0].id, name: 'Rosa' };

  const createStaff = async (name: string, email: string) => {
    const user = await userService.createStoreUser(storeId, { name, email, password: PASSWORD });
    return { id: user.id, name } satisfies Staff;
  };
  const carlos = await createStaff('Carlos Mendoza', 'carlos@hostal.pe');
  const lucia = await createStaff('Lucía Ramos', 'lucia@hostal.pe');
  // Carlos deja el trabajo a mitad del período y entra Miguel.
  const turnoverDay = Math.floor(DAYS * 0.62);
  let miguel: Staff | null = null;

  // --- Catálogo ---------------------------------------------------------------
  const categoryIds = new Map<string, string>();
  for (const name of new Set(CATALOG.map(item => item.category))) {
    const category = await categoryService.create(storeId, { name });
    categoryIds.set(name, category.id);
  }

  const supplierIds = new Map<string, string>();
  for (const name of new Set(Object.values(SUPPLIER_BY_CATEGORY))) {
    const supplier = await supplierService.create(storeId, { name });
    supplierIds.set(name, supplier.id);
  }

  const products: Product[] = [];
  for (const [index, item] of CATALOG.entries()) {
    const categoryId = categoryIds.get(item.category)!;
    const created = await productService.create(storeId, {
      name: item.name,
      minStock: item.minStock,
      barcode: `77501${String(10_000 + index * 37).padStart(8, '0')}`,
      salePrice: item.price,
      categoryId,
    });
    products.push({ ...item, id: created.id, categoryId, priceCents: Math.round(item.price * 100), stock: 0 });
  }

  // --- Hostal: tipos, habitaciones y ajustes ---------------------------------
  const roomTypes = new Map<string, (typeof ROOM_TYPES)[number] & { id: string }>();
  for (const type of ROOM_TYPES) {
    const created = await roomService.createType(storeId, type);
    roomTypes.set(type.name, { ...type, id: created.id });
  }
  const rooms: { id: string; type: (typeof ROOM_TYPES)[number] & { id: string } }[] = [];
  for (const [number, floor, typeName] of ROOMS) {
    const type = roomTypes.get(typeName)!;
    const room = await roomService.create(storeId, { number, floor, roomTypeId: type.id });
    rooms.push({ id: room.id, type });
  }
  const guestPool = buildGuestPool();

  // --- Gastos: la tienda nace con las categorías por defecto -------------------
  const expenseCategoryIds = new Map(
    (await expenseService.listCategories(storeId)).map(category => [category.name, category.id]),
  );
  /** Momento simulado en que cada habitación vuelve a estar libre (incluye la limpieza). */
  const roomFreeAt = new Map(rooms.map(room => [room.id, 0]));
  let pendingStays: PendingStay[] = [];
  let minorRegistered = false;
  /** Habitaciones que quedan en limpieza hoy: no reciben más check-in. */
  const dirtyRooms = new Set<string>();

  /** Ejecuta los check-out simulados hasta `until` (ms), en orden. Cobran en la caja abierta del día. */
  const processCheckouts = async (until: number, staff: Staff, isToday: boolean) => {
    const due = pendingStays.filter(stay => stay.actualAt.getTime() <= until).sort((a, b) => a.actualAt.getTime() - b.actualAt.getTime());
    for (const stay of due) {
      const extra = suggestExtra({
        expectedOut: stay.expectedAt,
        now: stay.actualAt,
        extraHourPrice: stay.extraHourPrice,
        toleranceMinutes: EXTRA_TOLERANCE_MINUTES,
      });
      const extraAmount = extra.amount > 10 && stayChance(0.15) ? extra.amount - 5 : extra.amount;
      // El check-in cobra la tarifa completa: al salir solo queda el adicional.
      const since = await marker();
      await stayService.checkOut(storeId, staff.id, stay.stayId, {
        extraAmount,
        ...(extraAmount > 0 && { payment: { paymentMethod: stayChance(0.55) ? 'CASH' as const : 'YAPE' as const, amount: extraAmount } }),
      });
      await backdateStayRows(stay.stayId, since, stay.actualAt);
      await query(
        'UPDATE stay SET expected_check_out = $2, actual_check_out = $3 WHERE id = $1',
        [stay.stayId, stay.expectedAt, stay.actualAt],
      );
      await query("UPDATE stay_charge SET suggested_amount = $2 WHERE stay_id = $1 AND kind = 'EXTRA_HOURS'", [stay.stayId, extra.amount]);
      // La última salida de hoy queda pendiente de limpieza.
      if (!isToday || stay.actualAt.getTime() < Date.now() - 3 * HOUR_MS) {
        await roomService.markCleaned(storeId, stay.roomId);
      } else {
        dirtyRooms.add(stay.roomId);
      }
      stats.stays++;
    }
    pendingStays = pendingStays.filter(stay => !due.includes(stay));
  };

  /** Algunas estadías por día: por horas de día y noches desde la tarde. */
  const simulateStays = async (day: number, isToday: boolean, morning: Staff, evening: Staff) => {
    const count = [0, 1, 1, 1, 2, 2, 3][stayBetween(0, 6)]!;
    const plans = Array.from({ length: count }, () => {
      const rateKind: RateKind = stayChance(0.55) ? 'HOURLY' : 'NIGHT';
      const hours = rateKind === 'HOURLY' ? stayPick(HOURLY_OPTIONS) : null;
      // Por horas: empiezan a tiempo para que, aun saliendo tarde, terminen antes del cierre de caja;
      // noches de 18:00 a 22:59.
      const hour = hours ? stayBetween(8, Math.min(16, 19 - hours)) : stayBetween(18, 22);
      return { rateKind, hours, hour, time: at(day, hour, stayBetween(0, 59)) };
    }).sort((a, b) => a.time.getTime() - b.time.getTime());

    for (const { rateKind, hours, hour, time } of plans) {
      if (time.getTime() >= Date.now()) continue;
      const staff = hour < 15 ? morning : evening;
      await processCheckouts(time.getTime(), staff, isToday);

      const free = rooms.filter(room => roomFreeAt.get(room.id)! <= time.getTime()
        && !dirtyRooms.has(room.id)
        && !pendingStays.some(stay => stay.roomId === room.id));
      if (!free.length) continue;
      const room = stayPick(free);
      const type = room.type;

      const hosted = new Set(pendingStays.flatMap(stay => stay.guests));
      const regulars = guestPool.slice(0, 60).filter(guest => !hosted.has(guest));
      const occasional = guestPool.slice(60).filter(guest => !hosted.has(guest));
      const holder = stayChance(0.18) && occasional.length ? stayPick(occasional) : stayPick(regulars);
      const companions = [...regulars, ...occasional].filter(guest => guest !== holder);
      const companion = stayChance(0.4) && companions.length ? stayPick(companions) : null;
      const withMinor = rateKind === 'NIGHT' && (stayChance(0.03) || (!minorRegistered && day >= dayStart(DAYS - 20)));
      const expectedAt = suggestExpectedCheckOut({ checkIn: time, rateKind, hours, checkoutTime: CHECKOUT_TIME });
      const late = stayChance(0.25);
      const deltaMinutes = late ? stayBetween(20, 140) : hours ? stayBetween(-Math.min(60, hours * 30), 10) : stayBetween(-180, 10);
      const actualAt = new Date(expectedAt.getTime() + deltaMinutes * 60_000);

      const suggested = hours ? hours * type.hourPrice : type.nightPrice;
      // A veces se cobra distinto a la referencia: descuento a un cliente frecuente o un monto redondo.
      const discount = stayChance(0.12);
      const rounded = !discount && stayChance(0.1);
      const amount = discount
        ? suggested - 5
        : rounded ? Math.max(5, Math.floor(suggested / 5) * 5) : suggested;

      const since = await marker();
      const stay = await stayService.checkIn(storeId, staff.id, {
        roomId: room.id,
        rateKind,
        ...(hours && { hours }),
        amount,
        // Salida real provisoria: se reemplaza por la simulada al hacer el check-out.
        expectedCheckOut: new Date(Date.now() + DAY_MS).toISOString(),
        travelReason: stayPick(TRAVEL_REASONS),
        guests: [{ ...holder, isHolder: true }, ...(companion ? [{ ...companion, isHolder: false }] : [])],
        ...(withMinor && {
          minors: [{
            fullName: `${stayPick(FIRST_NAMES)[0]} ${holder.fullName.split(' ')[1]}`,
            documentType: 'DNI' as const,
            documentNumber: String(stayBetween(70_000_000, 79_999_999)),
            birthDate: `${stayBetween(2013, 2020)}-0${stayBetween(1, 9)}-1${stayBetween(0, 9)}`,
            guardianRelation: 'PARENT' as const,
          }],
        }),
        paymentMethod: stayChance(0.55) ? 'CASH' : 'YAPE',
      });
      if (withMinor) minorRegistered = true;
      await backdateStayRows(stay.id, since, time);
      await query('UPDATE stay SET check_in_at = $2 WHERE id = $1', [stay.id, time]);
      // Si el huésped extranjero ya se fue hace tiempo, se reportó a Migraciones.
      if (stay.hasForeignGuests && actualAt.getTime() < Date.now() - 2 * DAY_MS) {
        await query('UPDATE stay SET migrations_reported_at = $2 WHERE id = $1', [stay.id, new Date(time.getTime() + 6 * HOUR_MS)]);
      }

      pendingStays.push({
        stayId: stay.id,
        roomId: room.id,
        checkInAt: time,
        expectedAt,
        actualAt,
        extraHourPrice: type.extraHourPrice,
        guests: companion ? [holder, companion] : [holder],
      });
      roomFreeAt.set(room.id, actualAt.getTime() + 30 * 60_000);
    }

    // Salidas que caen antes del cierre de caja (las de hoy, solo si ya ocurrieron).
    await processCheckouts(Math.min(at(day, 22, 55).getTime(), Date.now()), evening, isToday);
  };

  /**
   * Registra un gasto y lo lleva a su momento simulado. Los de la caja salen de la caja abierta del
   * día; si no alcanza el efectivo, se pagan por fuera (OUTSIDE).
   */
  const registerExpense = async (
    day: number,
    hour: number,
    staff: Staff,
    category: string,
    amount: number,
    source: 'CASH_REGISTER' | 'OUTSIDE',
    description?: string,
  ) => {
    const time = at(day, hour, expenseBetween(0, 50));
    const spentOn = new Date(day - LIMA_OFFSET_HOURS * HOUR_MS).toISOString().slice(0, 10);
    let paidFrom = source;
    if (paidFrom === 'CASH_REGISTER') {
      const current = await cashRegisterService.current(storeId, 'ADMIN');
      if (!current || Number(current.summary?.expectedCash ?? 0) < amount) paidFrom = 'OUTSIDE';
    }
    const since = await marker();
    const expense = await expenseService.create(storeId, staff.id, {
      categoryId: expenseCategoryIds.get(category)!,
      amount,
      spentOn,
      source: paidFrom,
      ...(description && { description }),
    });
    await query('UPDATE expense SET created_at = $2 WHERE id = $1', [expense.id, time]);
    await backdateSince(since, time);
    stats.expenses++;
  };

  /** Gastos de un día: insumos del hospedaje desde la caja y servicios del mes por fuera. */
  const simulateExpenses = async (day: number, offset: number, happened: (hour: number) => boolean) => {
    if (offset <= DAYS - EXPENSE_DAYS || !happened(11)) return;
    const date = new Date(day - LIMA_OFFSET_HOURS * HOUR_MS);
    const dow = date.getUTCDay();
    const dayOfMonth = date.getUTCDate();

    if (dow === 1) {
      await registerExpense(day, 10, admin, 'Útiles de aseo', expenseBetween(25, 45), 'CASH_REGISTER',
        'Papel higiénico, jabones y shampoo');
    }
    if (dow === 3 && Math.floor(offset / 7) % 2 === 0) {
      await registerExpense(day, 10, admin, 'Artículos de limpieza', expenseBetween(30, 60), 'CASH_REGISTER',
        'Lejía, detergente y desinfectante');
    }
    if (dow === 5) {
      await registerExpense(day, 10, admin, 'Lavandería', expenseBetween(40, 70),
        expenseChance(0.5) ? 'CASH_REGISTER' : 'OUTSIDE', 'Sábanas y toallas');
    }
    if (expenseChance(0.04)) {
      await registerExpense(day, 10, admin, 'Otros', expenseBetween(10, 30), 'CASH_REGISTER',
        expenseChance(0.5) ? 'Foco y cinta aislante' : 'Movilidad');
    }

    // Servicios del mes: se pagan por Yape o banco.
    if (dayOfMonth === 5) {
      await registerExpense(day, 9, admin, 'Luz', expenseBetween(180, 260), 'OUTSIDE', 'Recibo de luz');
    }
    if (dayOfMonth === 8) {
      await registerExpense(day, 9, admin, 'Agua', expenseBetween(60, 90), 'OUTSIDE', 'Recibo de agua');
    }
    if (dayOfMonth === 10) {
      await registerExpense(day, 9, admin, 'Internet', 99, 'OUTSIDE', 'Plan de fibra');
      await registerExpense(day, 9, admin, 'Cable y streaming', 75, 'OUTSIDE', 'Cable para las habitaciones');
    }
    if (dayOfMonth === 15 || dayOfMonth === 28) {
      await registerExpense(day, 9, admin, 'Sueldos', 500, 'OUTSIDE', 'Quincena de recepción');
    }
  };

  // --- Carga inicial ----------------------------------------------------------
  {
    const since = await marker();
    await inventoryMovementService.registerInitialLoad(storeId, {
      notes: 'Inventario de apertura',
      items: products.map(product => {
        product.stock = product.minStock * 4;
        return { productId: product.id, unitPrice: product.cost, quantity: product.stock };
      }),
    }, admin.id);
    await backdateSince(since, at(day0, 8));
  }

  // --- Días -------------------------------------------------------------------
  const stats = { sales: 0, voids: 0, purchases: 0, losses: 0, counts: 0, registers: 0, skipped: 0, stays: 0, expenses: 0 };
  const todayStart = dayStart(DAYS);
  const nowLimaHour = (Date.now() - todayStart) / HOUR_MS;

  for (let offset = 1; offset <= DAYS; offset++) {
    const day = dayStart(offset);
    const isToday = offset === DAYS;
    const progress = offset / DAYS;
    const date = new Date(day - LIMA_OFFSET_HOURS * HOUR_MS);
    const dow = date.getUTCDay();
    /** Hoy solo ocurre lo que ya pasó: nada queda con fecha futura. */
    const happened = (hour: number) => !isToday || hour < nowLimaHour;

    if (offset === turnoverDay) {
      await userService.setStoreUserActive(storeId, carlos.id, false);
      miguel = await createStaff('Miguel Torres', 'miguel@hostal.pe');
      await query('UPDATE app_user SET created_at = $2 WHERE id = $1', [miguel.id, at(day, 9)]);
    }
    const morning = offset < turnoverDay ? (offset % 2 ? carlos : lucia) : (offset % 2 ? miguel! : lucia);
    const evening = offset < turnoverDay ? (offset % 2 ? lucia : carlos) : (offset % 2 ? lucia : miguel!);

    // Ajustes de precio dos veces en el período (la inflación también sube los costos).
    if (offset === Math.floor(DAYS * 0.35) || offset === Math.floor(DAYS * 0.8)) {
      for (const product of products.filter(p => chance(0.6))) {
        product.priceCents = Math.round((product.priceCents * 1.08) / 10) * 10;
        await productService.update(storeId, product.id, {
          name: product.name,
          minStock: product.minStock,
          salePrice: product.priceCents / 100,
          categoryId: product.categoryId,
        });
      }
    }

    // Apertura
    const opened = await cashRegisterService.open(storeId, morning.id, { openingAmount: OPENING_AMOUNT });
    const openedAt = happened(7) ? at(day, 7) : new Date(Date.now() - 60_000);
    await query('UPDATE cash_register SET opened_at = $2 WHERE id = $1', [opened.id, openedAt]);
    stats.registers++;

    // Sencillo para dar vuelto, algunas mañanas.
    if (chance(0.1) && happened(7.2)) {
      const since = await marker();
      await cashRegisterService.addMovement(storeId, morning.id, opened.id,
        { type: 'CASH_IN', amount: 50, reason: 'Sencillo para vuelto' }, 'ADMIN');
      await backdateSince(since, at(day, 7, 10));
    }

    // Gastos del día (con la caja ya abierta).
    await simulateExpenses(day, offset, happened);

    // Reposición lunes y jueves a las 9:00.
    if ((dow === 1 || dow === 4) && happened(10)) {
      const costFactor = 1 + progress * 0.1;
      const toRestock = products.filter(p => p.stock <= p.minStock * 1.6);
      const bySupplier = new Map<string, Product[]>();
      for (const product of toRestock) {
        const supplier = SUPPLIER_BY_CATEGORY[product.category]!;
        bySupplier.set(supplier, [...(bySupplier.get(supplier) ?? []), product]);
      }
      let minute = 0;
      for (const [supplier, list] of bySupplier) {
        const result = await inventoryMovementService.registerPurchase(storeId, {
          supplierId: supplierIds.get(supplier)!,
          items: list.map(product => {
            const quantity = product.minStock * 4 - product.stock;
            product.stock += quantity;
            return {
              productId: product.id,
              quantity,
              unitCost: toMoney(product.cost * 100 * costFactor * (0.96 + random() * 0.08)),
            };
          }),
        }, admin.id);
        await backdateMovements([result.id], [at(day, 9, minute += 7)]);
        stats.purchases++;
      }
    }

    // Ventas del día, en orden horario.
    const salesToday = Math.round(BASE_SALES_PER_DAY * demandFactor(day, progress) * (0.8 + random() * 0.4));
    const times = Array.from({ length: salesToday }, () => {
      const [hour] = weighted(HOUR_WEIGHTS, ([, weight]) => weight);
      return hour + random();
    })
      .filter(hour => !isToday || hour < nowLimaHour)
      .sort((a, b) => a - b);

    const saleIds: string[] = [];
    const saleTimes: Date[] = [];
    let withdrew = false;

    for (const hour of times) {
      // Retiro del dueño a media tarde si se juntó mucho efectivo.
      if (!withdrew && hour >= 15.5) {
        withdrew = true;
        const current = await cashRegisterService.current(storeId, 'ADMIN');
        const expected = Number(current?.summary?.expectedCash ?? 0);
        if (expected > 450) {
          const since = await marker();
          await cashRegisterService.addMovement(storeId, admin.id, opened.id, {
            type: 'CASH_OUT',
            amount: Math.floor((expected - 150) / 50) * 50,
            reason: pick(['Retiro del dueño', 'Depósito al banco', 'Pago a proveedor']),
          }, 'ADMIN');
          await backdateSince(since, at(day, 15, 30));
        }
      }

      const lines = weighted([1, 2, 3, 4], n => [55, 28, 12, 5][n - 1]!);
      const chosen = new Map<string, { product: Product; quantity: number }>();
      for (let i = 0; i < lines; i++) {
        const available = products.filter(p => p.stock > 0 && !chosen.has(p.id));
        if (!available.length) break;
        const product = weighted(available, p => p.popularity);
        const quantity = Math.min(product.stock, weighted([1, 2, 3, 6], n => (n === 1 ? 70 : n === 2 ? 20 : n === 3 ? 8 : 2)));
        chosen.set(product.id, { product, quantity });
      }
      if (!chosen.size) {
        stats.skipped++;
        continue;
      }

      const seller = hour < 15 ? morning : evening;
      try {
        const sale = await inventoryMovementService.registerSale(storeId, {
          paymentMethod: chance(0.42) ? 'YAPE' : 'CASH',
          items: [...chosen.values()].map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
            salePrice: product.priceCents / 100,
          })),
        }, seller!.id);
        for (const { product, quantity } of chosen.values()) product.stock -= quantity;
        saleIds.push(sale.id);
        saleTimes.push(at(day, hour));
        stats.sales++;

        // Alguna venta mal cargada se anula al rato.
        if (chance(0.005)) {
          const since = await marker();
          await inventoryMovementService.voidMovement(storeId, admin.id, sale.id, {
            reason: pick(['Cobro duplicado', 'Producto equivocado', 'Cliente devolvió el producto']),
          });
          for (const { product, quantity } of chosen.values()) product.stock += quantity;
          await backdateSince(since, at(day, hour + 0.1));
          stats.voids++;
        }
      } catch {
        stats.skipped++;
      }
    }
    await backdateMovements(saleIds, saleTimes);

    // Estadías del día: cobran en la caja abierta, antes del cierre.
    await simulateStays(day, isToday, morning!, evening!);

    // Mermas: perecibles que vencen y alguna botella rota.
    const perishables = products.filter(p => p.perishable && p.stock > 0);
    if (perishables.length && chance(0.18) && happened(21.5)) {
      const product = pick(perishables);
      const quantity = Math.min(product.stock, between(1, 3));
      const loss = await inventoryMovementService.registerLoss(storeId, {
        reason: 'LOSS_EXPIRED',
        notes: 'Vencido en exhibición',
        items: [{ productId: product.id, quantity }],
      }, evening!.id);
      product.stock -= quantity;
      await backdateMovements([loss.id], [at(day, 21, 30)]);
      stats.losses++;
    }
    const fragile = products.filter(p => (p.category === 'Bebidas' || p.category === 'Cervezas') && p.stock > 0);
    if (fragile.length && chance(0.04) && happened(11.25)) {
      const product = pick(fragile);
      const loss = await inventoryMovementService.registerLoss(storeId, {
        reason: 'LOSS_DAMAGED',
        notes: 'Se cayó y se rompió',
        items: [{ productId: product.id, quantity: 1 }],
      }, morning!.id);
      product.stock -= 1;
      await backdateMovements([loss.id], [at(day, 11, 15)]);
      stats.losses++;
    }

    // Conteo físico el primer día de cada mes, con pequeñas diferencias.
    if (date.getUTCDate() === 1 && !isToday) {
      const sample = products.filter(() => chance(0.25));
      const items = sample
        .map(product => ({ product, counted: Math.max(0, product.stock + weighted([-2, -1, 0, 1], d => [1, 3, 8, 1][d + 2]!)) }))
        .filter(({ product, counted }) => counted !== product.stock);
      if (items.length) {
        const since = await marker();
        await inventoryMovementService.registerStockCount(storeId, admin.id, {
          notes: 'Conteo mensual',
          items: items.map(({ product, counted }) => ({ productId: product.id, countedQuantity: counted })),
        });
        for (const { product, counted } of items) product.stock = counted;
        await backdateSince(since, at(day, 22, 40));
        stats.counts++;
      }
    }

    // Cierre: la mayoría cuadra; a veces falta o sobra algo. La caja de hoy queda abierta.
    if (!isToday) {
      const current = await cashRegisterService.current(storeId, 'ADMIN');
      const expectedCents = Math.round(Number(current?.summary?.expectedCash ?? 0) * 100);
      const roll = random();
      const differenceCents = roll < 0.78 ? 0 : roll < 0.92 ? -between(5, 150) * 10 : between(5, 100) * 10;
      await cashRegisterService.close(storeId, evening!.id, opened.id, {
        closingAmount: toMoney(Math.max(0, expectedCents + differenceCents)),
        ...(differenceCents < 0 && { notes: pick(['Faltante sin explicar', 'Posible vuelto mal dado', 'Faltan monedas']) }),
        ...(differenceCents > 0 && { notes: pick(['Sobrante, posible venta sin registrar', 'Cliente dejó el vuelto']) }),
      }, 'ADMIN');
      await query('UPDATE cash_register SET closed_at = $2 WHERE id = $1', [opened.id, at(day, 23, between(0, 20))]);
    }

    if (offset % 30 === 0 || isToday) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
      console.log(`  ${date.toISOString().slice(0, 10)} · ${stats.sales} ventas · ${elapsed}s`);
    }
  }

  // Estadías que siguen activas: su salida prevista es la simulada (puede estar vencida).
  for (const stay of pendingStays) {
    await query('UPDATE stay SET expected_check_out = $2 WHERE id = $1', [stay.stayId, stay.expectedAt]);
  }
  // Si ninguna salida reciente quedó en limpieza, la habitación de la última salida lo está.
  await query(
    `UPDATE room SET needs_cleaning = true
     WHERE id = (
       SELECT st.room_id FROM stay st
       WHERE st.store_id = $1 AND st.actual_check_out IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM stay a WHERE a.room_id = st.room_id AND a.actual_check_out IS NULL)
       ORDER BY st.actual_check_out DESC
       LIMIT 1
     )
     AND NOT EXISTS (SELECT 1 FROM room WHERE store_id = $1 AND needs_cleaning)`,
    [storeId],
  );

  // Fechas de alta coherentes con el inicio de la historia.
  await query('UPDATE store SET created_at = $1 WHERE id = $2', [at(day0, 7), storeId]);
  await query(`UPDATE app_user SET created_at = $1 WHERE store_id = $2 AND email <> 'miguel@hostal.pe'`, [at(day0, 7), storeId]);
  await query('UPDATE category SET created_at = $1 WHERE store_id = $2', [at(day0, 7), storeId]);
  await query('UPDATE supplier SET created_at = $1 WHERE store_id = $2', [at(day0, 7), storeId]);
  await query('UPDATE product SET created_at = $1 WHERE store_id = $2', [at(day0, 7), storeId]);
  await query('UPDATE room_type SET created_at = $1 WHERE store_id = $2', [at(day0, 7), storeId]);
  await query('UPDATE room SET created_at = $1 WHERE store_id = $2', [at(day0, 7), storeId]);
  await query('UPDATE expense_category SET created_at = $1 WHERE store_id = $2', [at(day0, 7), storeId]);
  await query(`UPDATE guest g SET created_at = first.t FROM (
    SELECT sg.guest_id, MIN(st.check_in_at) AS t FROM stay_guest sg JOIN stay st ON st.id = sg.stay_id GROUP BY sg.guest_id
  ) first WHERE first.guest_id = g.id`);

  console.log('\n✅ Seed completo');
  console.log(`   ${stats.registers} cajas · ${stats.sales} ventas (${stats.voids} anuladas) · ${stats.purchases} compras`);
  console.log(`   ${stats.losses} mermas · ${stats.counts} conteos · ${stats.skipped} ventas omitidas por falta de stock`);
  console.log(`   ${stats.stays} estadías cerradas · ${pendingStays.length} activas · ${stats.expenses} gastos`);
  console.log(`\n   Admin:     admin@hostal.pe / ${PASSWORD}`);
  console.log(`   Empleados: lucia@hostal.pe, miguel@hostal.pe (carlos@hostal.pe está desactivado) / ${PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Seed fallido');
    console.error(error);
    process.exit(1);
  });

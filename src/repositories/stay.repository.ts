import type { PoolClient } from 'pg';
import { query } from '../db/index.js';
import { VIEWS } from '../db/tables.js';
import type { IStayRepository, StayPaymentForVoid } from '../interfaces/repositories/stay.repository.interface.js';
import type {
  Guest,
  LockedStay,
  RoomForCheckIn,
  StayChargeInsert,
  StayInsert,
  StayListItem,
  StayRecord,
} from '../models/stay.model.js';
import type {
  GuestLookupDTO,
  StayGuestDTO,
  StayListQueryDTO,
  StayMinorDTO,
  StayPaymentDTO,
} from '../schemas/stay.schema.js';
import { snakeToCamel } from '../utils/mapper.js';
import { hasForeignGuest, isoTimestamp, pendingMigrations } from './sql.js';

/** Datos legales del huésped; en `stay_guest` (copia al ingresar) el id es `guest_id`. */
const guestJson = (alias: string, idColumn = 'id') => `
  'id', ${alias}.${idColumn},
  'documentType', ${alias}.document_type,
  'documentNumber', ${alias}.document_number,
  'fullName', ${alias}.full_name,
  'birthDate', to_char(${alias}.birth_date, 'YYYY-MM-DD'),
  'sex', ${alias}.sex,
  'nationality', ${alias}.nationality,
  'residence', ${alias}.residence,
  'phone', ${alias}.phone`;

/** Campos comunes del listado (Registro de Huéspedes) y del detalle. */
const baseColumns = `
  st.id,
  CASE WHEN st.actual_check_out IS NULL THEN 'ACTIVE' ELSE 'CLOSED' END AS status,
  st.room_id,
  r.number AS room_number,
  rt.name AS room_type_name,
  st.rate_kind,
  st.hours,
  ${isoTimestamp('st.check_in_at')} AS check_in_at,
  ${isoTimestamp('st.expected_check_out')} AS expected_check_out,
  ${isoTimestamp('st.actual_check_out')} AS actual_check_out,
  st.travel_reason,
  st.notes,
  ${isoTimestamp('st.migrations_reported_at')} AS migrations_reported_at,
  ${hasForeignGuest('st')} AS has_foreign_guests,
  b.charges_total::text AS charges_total,
  b.payments_total::text AS payments_total,
  b.balance::text AS balance,
  COALESCE((
    -- Se lee la copia del ingreso, no el huésped actual: el registro no cambia con visitas posteriores.
    SELECT json_agg(json_build_object(${guestJson('sg', 'guest_id')}, 'isHolder', sg.is_holder)
      ORDER BY sg.is_holder DESC, sg.full_name)
    FROM stay_guest AS sg
    WHERE sg.stay_id = st.id
  ), '[]'::json) AS guests,
  COALESCE((
    SELECT json_agg(json_build_object(
      'id', m.id,
      'fullName', m.full_name,
      'documentType', m.document_type,
      'documentNumber', m.document_number,
      'birthDate', to_char(m.birth_date, 'YYYY-MM-DD'),
      'guardianRelation', m.guardian_relation,
      'accreditation', m.accreditation
    ) ORDER BY m.full_name)
    FROM stay_minor AS m
    WHERE m.stay_id = st.id
  ), '[]'::json) AS minors`;

const detailColumns = `
  st.extra_hour_price,
  st.created_by,
  creator.name AS created_by_name,
  st.closed_by,
  closer.name AS closed_by_name,
  COALESCE((
    SELECT json_agg(json_build_object(
      'id', c.id,
      'kind', c.kind,
      'description', c.description,
      'suggestedAmount', c.suggested_amount::text,
      'amount', c.amount::text,
      'createdBy', c.created_by,
      'createdByName', u.name,
      'createdAt', ${isoTimestamp('c.created_at')}
    ) ORDER BY c.created_at, c.id)
    FROM stay_charge AS c
    LEFT JOIN app_user AS u ON u.id = c.created_by
    WHERE c.stay_id = st.id
  ), '[]'::json) AS charges,
  COALESCE((
    SELECT json_agg(json_build_object(
      'id', p.id,
      'cashRegisterId', p.cash_register_id,
      'paymentMethod', p.payment_method,
      'amount', p.amount::text,
      'createdBy', p.created_by,
      'createdByName', u.name,
      'createdAt', ${isoTimestamp('p.created_at')},
      'status', p.status,
      'voidedBy', p.voided_by,
      'voidedByName', voider.name,
      'voidedAt', ${isoTimestamp('p.voided_at')},
      'voidReason', p.void_reason
    ) ORDER BY p.created_at, p.id)
    FROM stay_payment AS p
    LEFT JOIN app_user AS u ON u.id = p.created_by
    LEFT JOIN app_user AS voider ON voider.id = p.voided_by
    WHERE p.stay_id = st.id
  ), '[]'::json) AS payments`;

const fromStay = `
FROM stay AS st
JOIN room AS r ON r.id = st.room_id
JOIN room_type AS rt ON rt.id = r.room_type_id
JOIN ${VIEWS.STAY_BALANCE} AS b ON b.stay_id = st.id`;

export default class StayRepository implements IStayRepository {
  async findGuest(storeId: string, filters: GuestLookupDTO): Promise<Guest | null> {
    const result = await query(
      `SELECT json_build_object(${guestJson('g')}) AS guest
       FROM guest AS g
       WHERE g.store_id = $1 AND g.document_type = $2 AND g.document_number = $3`,
      [storeId, filters.documentType, filters.documentNumber],
    );
    return result.rows[0]?.guest ?? null;
  }

  async lockRoomForCheckIn(storeId: string, roomId: string, client: PoolClient): Promise<RoomForCheckIn | null> {
    // Bloquear la habitación serializa los check-in concurrentes sobre ella.
    const result = await client.query(
      `SELECT
         r.id,
         r.number,
         r.is_active,
         r.needs_cleaning,
         EXISTS (SELECT 1 FROM stay WHERE room_id = r.id AND actual_check_out IS NULL) AS occupied,
         rt.capacity,
         rt.hour_price,
         rt.night_price,
         rt.extra_hour_price
       FROM room AS r
       JOIN room_type AS rt ON rt.id = r.room_type_id
       WHERE r.store_id = $1 AND r.id = $2
       FOR UPDATE OF r`,
      [storeId, roomId],
    );
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async upsertGuest(storeId: string, guest: StayGuestDTO, client: PoolClient): Promise<string> {
    // El documento identifica al huésped: sus datos se actualizan con cada visita.
    const result = await client.query<{ id: string }>(
      `INSERT INTO guest (store_id, document_type, document_number, full_name, birth_date, sex, nationality, residence, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (store_id, document_type, document_number) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         birth_date = EXCLUDED.birth_date,
         sex = EXCLUDED.sex,
         nationality = EXCLUDED.nationality,
         residence = EXCLUDED.residence,
         phone = COALESCE(EXCLUDED.phone, guest.phone)
       RETURNING id`,
      [
        storeId, guest.documentType, guest.documentNumber, guest.fullName, guest.birthDate,
        guest.sex, guest.nationality, guest.residence, guest.phone ?? null,
      ],
    );
    return result.rows[0]!.id;
  }

  async findActiveStayOfGuest(guestId: string, client: PoolClient): Promise<{ fullName: string; roomNumber: string } | null> {
    const result = await client.query(
      `SELECT g.full_name, r.number AS room_number
       FROM stay_guest AS sg
       JOIN stay AS s ON s.id = sg.stay_id AND s.actual_check_out IS NULL
       JOIN room AS r ON r.id = s.room_id
       JOIN guest AS g ON g.id = sg.guest_id
       WHERE sg.guest_id = $1
       LIMIT 1`,
      [guestId],
    );
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async create(data: StayInsert, client: PoolClient): Promise<string> {
    const result = await client.query<{ id: string }>(
      `INSERT INTO stay (store_id, room_id, rate_kind, hours, expected_check_out, travel_reason, notes, extra_hour_price, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        data.storeId, data.roomId, data.rateKind, data.hours, data.expectedCheckOut, data.travelReason,
        data.notes, data.extraHourPrice, data.createdBy,
      ],
    );
    return result.rows[0]!.id;
  }

  async addGuests(stayId: string, guests: { guestId: string; isHolder: boolean }[], client: PoolClient): Promise<void> {
    await client.query(
      // Copia los datos recién guardados del huésped (misma transacción que upsertGuest).
      `INSERT INTO stay_guest (
         stay_id, guest_id, is_holder, document_type, document_number, full_name, birth_date, sex,
         nationality, residence, phone
       )
       SELECT $1, g.id, v.is_holder, g.document_type, g.document_number, g.full_name, g.birth_date, g.sex,
         g.nationality, g.residence, g.phone
       FROM unnest($2::uuid[], $3::boolean[]) AS v(guest_id, is_holder)
       JOIN guest AS g ON g.id = v.guest_id`,
      [stayId, guests.map(g => g.guestId), guests.map(g => g.isHolder)],
    );
  }

  async addMinors(stayId: string, minors: StayMinorDTO[], client: PoolClient): Promise<void> {
    for (const minor of minors) {
      await client.query(
        `INSERT INTO stay_minor (stay_id, full_name, document_type, document_number, birth_date, guardian_relation, accreditation)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          stayId, minor.fullName, minor.documentType ?? null, minor.documentNumber ?? null,
          minor.birthDate, minor.guardianRelation, minor.accreditation ?? null,
        ],
      );
    }
  }

  async addCharge(stayId: string, userId: string, charge: StayChargeInsert, client: PoolClient): Promise<void> {
    await client.query(
      `INSERT INTO stay_charge (stay_id, kind, description, suggested_amount, amount, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [stayId, charge.kind, charge.description, charge.suggestedAmount, charge.amount, userId],
    );
  }

  async addPayment(
    stayId: string,
    cashRegisterId: string,
    userId: string,
    payment: StayPaymentDTO,
    client: PoolClient,
  ): Promise<void> {
    await client.query(
      `INSERT INTO stay_payment (stay_id, cash_register_id, payment_method, amount, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [stayId, cashRegisterId, payment.paymentMethod, payment.amount, userId],
    );
  }

  async getPaymentForVoid(
    storeId: string,
    stayId: string,
    paymentId: string,
    client: PoolClient,
    lock = false,
  ): Promise<StayPaymentForVoid | null> {
    const result = await client.query(
      `SELECT p.id, p.cash_register_id, p.payment_method, p.amount::text AS amount, p.status,
         st.actual_check_out IS NOT NULL AS stay_closed
       FROM stay_payment AS p
       JOIN stay AS st ON st.id = p.stay_id
       WHERE st.store_id = $1 AND p.stay_id = $2 AND p.id = $3
       ${lock ? 'FOR UPDATE OF p' : ''}`,
      [storeId, stayId, paymentId],
    );
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async canReverseCashPayment(paymentId: string, client: PoolClient): Promise<boolean> {
    const result = await client.query(
      `SELECT totals.expected_cash >= p.amount AS allowed
       FROM stay_payment AS p
       JOIN vw_cash_register_totals AS totals ON totals.cash_register_id = p.cash_register_id
       WHERE p.id = $1`,
      [paymentId],
    );
    return result.rows[0]?.allowed === true;
  }

  async voidPayment(paymentId: string, userId: string, reason: string, client: PoolClient): Promise<void> {
    await client.query(
      `UPDATE stay_payment
       SET status = 'VOIDED', voided_at = clock_timestamp(), void_reason = $3, voided_by = $2
       WHERE id = $1 AND status = 'COMPLETED'`,
      [paymentId, userId, reason],
    );
  }

  async lock(storeId: string, id: string, client: PoolClient): Promise<LockedStay | null> {
    const result = await client.query(
      `SELECT id, room_id, actual_check_out IS NOT NULL AS closed, expected_check_out, extra_hour_price
       FROM stay
       WHERE store_id = $1 AND id = $2
       FOR UPDATE`,
      [storeId, id],
    );
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async getBalance(id: string, client: PoolClient): Promise<number> {
    const result = await client.query<{ balance: string }>(
      `SELECT balance FROM ${VIEWS.STAY_BALANCE} WHERE stay_id = $1`,
      [id],
    );
    return Number(result.rows[0]?.balance ?? 0);
  }

  async close(id: string, userId: string, client: PoolClient): Promise<void> {
    // La habitación queda pendiente de limpieza al salir el huésped.
    await client.query(
      `WITH closed AS (
         UPDATE stay
         SET actual_check_out = clock_timestamp(), closed_by = $2
         WHERE id = $1 AND actual_check_out IS NULL
         RETURNING room_id
       )
       UPDATE room SET needs_cleaning = true
       WHERE id IN (SELECT room_id FROM closed)`,
      [id, userId],
    );
  }

  async setMigrationsReported(storeId: string, id: string, reported: boolean): Promise<boolean> {
    const result = await query(
      `UPDATE stay
       SET migrations_reported_at = CASE WHEN $3::boolean THEN COALESCE(migrations_reported_at, now()) ELSE NULL END
       WHERE store_id = $1 AND id = $2`,
      [storeId, id, reported],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findById(storeId: string, id: string): Promise<StayRecord | null> {
    const result = await query(
      `SELECT ${baseColumns}, ${detailColumns}
       ${fromStay}
       LEFT JOIN app_user AS creator ON creator.id = st.created_by
       LEFT JOIN app_user AS closer ON closer.id = st.closed_by
       WHERE st.store_id = $1 AND st.id = $2`,
      [storeId, id],
    );
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async list(storeId: string, filters: StayListQueryDTO): Promise<{ data: StayListItem[]; total: number }> {
    const params: unknown[] = [storeId];
    const conditions = ['st.store_id = $1'];
    if (filters.from) {
      params.push(filters.from);
      conditions.push(`st.check_in_at >= $${params.length}`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(`st.check_in_at < $${params.length}`);
    }
    if (filters.roomId) {
      params.push(filters.roomId);
      conditions.push(`st.room_id = ${params.length}`);
    }
    if (filters.migrations === 'pending') {
      conditions.push(pendingMigrations('st'));
    }
    const whereClause = conditions.join('\n        AND ');
    const countParams = [...params];
    params.push(filters.limit, (filters.page - 1) * filters.limit);

    const result = await query(
      `SELECT ${baseColumns}, COUNT(*) OVER() AS total_count
       ${fromStay}
       WHERE ${whereClause}
       ORDER BY st.check_in_at DESC, st.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    let total: number;
    if (result.rows.length) {
      total = Number(result.rows[0].total_count);
    } else {
      const countResult = await query(`SELECT COUNT(*) AS total FROM stay AS st WHERE ${whereClause}`, countParams);
      total = Number(countResult.rows[0]?.total ?? 0);
    }

    const data = result.rows.map(({ total_count: _totalCount, ...row }) => row);
    return { data: snakeToCamel(data), total };
  }
}

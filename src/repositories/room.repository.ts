import { query } from '../db/index.js';
import { VIEWS } from '../db/tables.js';
import type { IRoomRepository } from '../interfaces/repositories/room.repository.interface.js';
import type { Room, RoomType } from '../models/room.model.js';
import type {
  CreateRoomDTO,
  CreateRoomTypeDTO,
  UpdateRoomDTO,
  UpdateRoomTypeDTO,
} from '../schemas/room.schema.js';
import { snakeToCamel } from '../utils/mapper.js';
import { buildSet, isoTimestamp } from './sql.js';

const ROOM_TYPE_COLUMNS = {
  name: 'name',
  capacity: 'capacity',
  description: 'description',
  hourPrice: 'hour_price',
  nightPrice: 'night_price',
  extraHourPrice: 'extra_hour_price',
  isActive: 'is_active',
};

const ROOM_COLUMNS = {
  number: 'number',
  floor: 'floor',
  roomTypeId: 'room_type_id',
  isActive: 'is_active',
  needsCleaning: 'needs_cleaning',
};

const selectRoomType = `
SELECT
  id, name, capacity, description, hour_price, night_price, extra_hour_price, is_active,
  (SELECT count(*)::int FROM room WHERE room.room_type_id = room_type.id) AS room_count,
  ${isoTimestamp('created_at')} AS created_at
FROM room_type
`;

// Ocupada se calcula: una estadía sin actual_check_out manda sobre needs_cleaning.
const selectRoom = `
SELECT
  r.id,
  r.number,
  r.floor,
  r.room_type_id,
  rt.name AS room_type_name,
  rt.capacity,
  r.needs_cleaning,
  r.is_active,
  CASE
    WHEN st.id IS NOT NULL THEN 'OCCUPIED'
    WHEN r.needs_cleaning THEN 'CLEANING'
    ELSE 'FREE'
  END AS status,
  CASE WHEN st.id IS NULL THEN NULL ELSE jsonb_build_object(
    'stayId', st.id,
    'holderName', holder.full_name,
    'rateKind', st.rate_kind,
    'hours', st.hours,
    'checkInAt', ${isoTimestamp('st.check_in_at')},
    'expectedCheckOut', ${isoTimestamp('st.expected_check_out')},
    'balance', b.balance::text
  ) END AS active_stay
FROM room AS r
JOIN room_type AS rt ON rt.id = r.room_type_id
LEFT JOIN stay AS st ON st.room_id = r.id AND st.actual_check_out IS NULL
LEFT JOIN ${VIEWS.STAY_BALANCE} AS b ON b.stay_id = st.id
LEFT JOIN LATERAL (
  SELECT sg.full_name
  FROM stay_guest AS sg
  WHERE sg.stay_id = st.id AND sg.is_holder
) AS holder ON true
`;

export default class RoomRepository implements IRoomRepository {
  async listTypes(storeId: string): Promise<RoomType[]> {
    const result = await query(`${selectRoomType} WHERE store_id = $1 ORDER BY is_active DESC, lower(name)`, [storeId]);
    return snakeToCamel(result.rows);
  }

  async findTypeById(storeId: string, id: string): Promise<RoomType | null> {
    const result = await query(`${selectRoomType} WHERE store_id = $1 AND id = $2`, [storeId, id]);
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async createType(storeId: string, data: CreateRoomTypeDTO): Promise<string> {
    const result = await query(
      `INSERT INTO room_type (store_id, name, capacity, description, hour_price, night_price, extra_hour_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [storeId, data.name, data.capacity, data.description ?? null, data.hourPrice, data.nightPrice, data.extraHourPrice],
    );
    return result.rows[0].id;
  }

  async updateType(storeId: string, id: string, data: UpdateRoomTypeDTO): Promise<void> {
    const { set, params } = buildSet(data, ROOM_TYPE_COLUMNS, 2);
    if (!set) return;
    await query(`UPDATE room_type SET ${set} WHERE store_id = $1 AND id = $2`, [storeId, id, ...params]);
  }

  async deleteType(storeId: string, id: string): Promise<boolean> {
    const result = await query('DELETE FROM room_type WHERE store_id = $1 AND id = $2', [storeId, id]);
    return (result.rowCount ?? 0) > 0;
  }

  async list(storeId: string): Promise<Room[]> {
    const result = await query(`${selectRoom} WHERE r.store_id = $1 ORDER BY r.floor NULLS LAST, r.number`, [storeId]);
    return snakeToCamel(result.rows);
  }

  async findById(storeId: string, id: string): Promise<Room | null> {
    const result = await query(`${selectRoom} WHERE r.store_id = $1 AND r.id = $2`, [storeId, id]);
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async create(storeId: string, data: CreateRoomDTO): Promise<string> {
    const result = await query(
      `INSERT INTO room (store_id, number, floor, room_type_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [storeId, data.number, data.floor ?? null, data.roomTypeId],
    );
    return result.rows[0].id;
  }

  async update(storeId: string, id: string, data: UpdateRoomDTO): Promise<void> {
    const { set, params } = buildSet(data, ROOM_COLUMNS, 2);
    if (!set) return;
    await query(`UPDATE room SET ${set} WHERE store_id = $1 AND id = $2`, [storeId, id, ...params]);
  }

  async countStays(storeId: string, id: string): Promise<number> {
    const result = await query('SELECT count(*)::int AS total FROM stay WHERE store_id = $1 AND room_id = $2', [storeId, id]);
    return result.rows[0].total;
  }

  async delete(storeId: string, id: string): Promise<boolean> {
    const result = await query('DELETE FROM room WHERE store_id = $1 AND id = $2', [storeId, id]);
    return (result.rowCount ?? 0) > 0;
  }
}

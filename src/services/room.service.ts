import { ConflictError, NotFoundError } from '../errors/app.error.js';
import type { IRoomRepository } from '../interfaces/repositories/room.repository.interface.js';
import type { IRoomService } from '../interfaces/services/room.service.interface.js';
import type { Room, RoomType } from '../models/room.model.js';
import type {
  CreateRoomDTO,
  CreateRoomTypeDTO,
  UpdateRoomDTO,
  UpdateRoomTypeDTO,
} from '../schemas/room.schema.js';

export default class RoomService implements IRoomService {
  constructor(private roomRepo: IRoomRepository) {}

  listTypes(storeId: string): Promise<RoomType[]> {
    return this.roomRepo.listTypes(storeId);
  }

  async createType(storeId: string, data: CreateRoomTypeDTO): Promise<RoomType> {
    const id = await this.roomRepo.createType(storeId, data);
    return this.getType(storeId, id);
  }

  async updateType(storeId: string, id: string, data: UpdateRoomTypeDTO): Promise<RoomType> {
    await this.getType(storeId, id);
    await this.roomRepo.updateType(storeId, id, data);
    return this.getType(storeId, id);
  }

  /** Only types without rooms can be deleted; rooms keep the FK RESTRICT as a last guard. */
  async deleteType(storeId: string, id: string): Promise<void> {
    const type = await this.getType(storeId, id);
    if (type.roomCount > 0) {
      const rooms = type.roomCount === 1 ? '1 habitación asignada' : `${type.roomCount} habitaciones asignadas`;
      throw new ConflictError(`El tipo ${type.name} tiene ${rooms}: cámbialas de tipo o elimínalas primero.`);
    }
    try {
      if (!await this.roomRepo.deleteType(storeId, id)) throw new NotFoundError('El tipo de habitación no existe');
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new ConflictError(`El tipo ${type.name} tiene habitaciones asignadas: cámbialas de tipo o elimínalas primero.`);
      }
      throw err;
    }
  }

  list(storeId: string): Promise<Room[]> {
    return this.roomRepo.list(storeId);
  }

  async create(storeId: string, data: CreateRoomDTO): Promise<Room> {
    await this.getType(storeId, data.roomTypeId);
    const id = await this.roomRepo.create(storeId, data);
    return this.get(storeId, id);
  }

  async update(storeId: string, id: string, data: UpdateRoomDTO): Promise<Room> {
    const room = await this.get(storeId, id);
    if (data.roomTypeId) await this.getType(storeId, data.roomTypeId);
    if (data.isActive === false && room.status === 'OCCUPIED') {
      throw new ConflictError(`La habitación ${room.number} está ocupada; haga el check-out antes de desactivarla`);
    }

    await this.roomRepo.update(storeId, id, data);
    return this.get(storeId, id);
  }

  /** Staff marks a room as ready after cleaning it. */
  async markCleaned(storeId: string, id: string): Promise<Room> {
    await this.get(storeId, id);
    await this.roomRepo.update(storeId, id, { needsCleaning: false });
    return this.get(storeId, id);
  }

  /** Stays are the legal guest register: a room with stays is deactivated, never deleted. */
  async delete(storeId: string, id: string): Promise<void> {
    const room = await this.get(storeId, id);
    const hasStays = () => new ConflictError(
      `La habitación ${room.number} tiene estadías registradas: desactívala en su lugar.`,
    );
    if (await this.roomRepo.countStays(storeId, id) > 0) throw hasStays();
    try {
      if (!await this.roomRepo.delete(storeId, id)) throw new NotFoundError('La habitación no existe');
    } catch (err) {
      if (isForeignKeyViolation(err)) throw hasStays();
      throw err;
    }
  }

  private async get(storeId: string, id: string): Promise<Room> {
    const room = await this.roomRepo.findById(storeId, id);
    if (!room) throw new NotFoundError('La habitación no existe');
    return room;
  }

  private async getType(storeId: string, id: string): Promise<RoomType> {
    const type = await this.roomRepo.findTypeById(storeId, id);
    if (!type) throw new NotFoundError('El tipo de habitación no existe');
    return type;
  }
}

/** PostgreSQL foreign_key_violation: a row was referenced between the check and the delete. */
function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === '23503';
}

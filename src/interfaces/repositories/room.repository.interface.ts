import type { Room, RoomType } from '../../models/room.model.js';
import type {
  CreateRoomDTO,
  CreateRoomTypeDTO,
  UpdateRoomDTO,
  UpdateRoomTypeDTO,
} from '../../schemas/room.schema.js';

export interface IRoomRepository {
  listTypes(storeId: string): Promise<RoomType[]>;
  findTypeById(storeId: string, id: string): Promise<RoomType | null>;
  createType(storeId: string, data: CreateRoomTypeDTO): Promise<string>;
  updateType(storeId: string, id: string, data: UpdateRoomTypeDTO): Promise<void>;
  deleteType(storeId: string, id: string): Promise<boolean>;

  list(storeId: string): Promise<Room[]>;
  findById(storeId: string, id: string): Promise<Room | null>;
  create(storeId: string, data: CreateRoomDTO): Promise<string>;
  update(storeId: string, id: string, data: UpdateRoomDTO): Promise<void>;
  /** Stays (active or closed) registered in the room. */
  countStays(storeId: string, id: string): Promise<number>;
  delete(storeId: string, id: string): Promise<boolean>;
}

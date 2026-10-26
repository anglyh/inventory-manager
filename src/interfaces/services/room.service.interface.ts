import type { Room, RoomType } from '../../models/room.model.js';
import type {
  CreateRoomDTO,
  CreateRoomTypeDTO,
  UpdateRoomDTO,
  UpdateRoomTypeDTO,
} from '../../schemas/room.schema.js';

export interface IRoomService {
  listTypes(storeId: string): Promise<RoomType[]>;
  createType(storeId: string, data: CreateRoomTypeDTO): Promise<RoomType>;
  updateType(storeId: string, id: string, data: UpdateRoomTypeDTO): Promise<RoomType>;
  deleteType(storeId: string, id: string): Promise<void>;

  list(storeId: string): Promise<Room[]>;
  create(storeId: string, data: CreateRoomDTO): Promise<Room>;
  update(storeId: string, id: string, data: UpdateRoomDTO): Promise<Room>;
  markCleaned(storeId: string, id: string): Promise<Room>;
  delete(storeId: string, id: string): Promise<void>;
}

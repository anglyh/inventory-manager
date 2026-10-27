import type { PoolClient } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestError, ConflictError } from '../../errors/app.error.js';
import type { ICashRegisterRepository } from '../../interfaces/repositories/cash-register.repository.interface.js';
import type { IStayRepository } from '../../interfaces/repositories/stay.repository.interface.js';
import type { IStoreRepository } from '../../interfaces/repositories/store.repository.interface.js';
import StayService from '../../services/stay.service.js';

vi.mock('../../db/transactions.js', () => ({
  withTransaction: vi.fn(async (callback: (client: PoolClient) => Promise<unknown>) => callback({} as PoolClient)),
}));

const stayRepo = {
  lock: vi.fn(), getBalance: vi.fn(), addCharge: vi.fn(), addPayment: vi.fn(), close: vi.fn(), findById: vi.fn(),
  lockRoomForCheckIn: vi.fn(), upsertGuest: vi.fn(), create: vi.fn(), addGuests: vi.fn(), addMinors: vi.fn(),
  findActiveStayOfGuest: vi.fn(),
} as unknown as IStayRepository;
const cashRegisterRepo = { lockOpen: vi.fn() } as unknown as ICashRegisterRepository;
const storeRepo = {
  getSettings: vi.fn().mockResolvedValue({ checkoutTime: '12:00', extraToleranceMinutes: 15 }),
} as unknown as IStoreRepository;
const service = new StayService(stayRepo, cashRegisterRepo, storeRepo);

const activeStay = {
  id: 'st1',
  roomId: 'r1',
  closed: false,
  expectedCheckOut: new Date(Date.now() + 3_600_000),
  extraHourPrice: '10.00',
};

describe('Stay service money rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stayRepo.lock).mockResolvedValue(activeStay);
  });

  it('rejects the check-out while the balance is pending and does not close the stay', async () => {
    vi.mocked(stayRepo.getBalance).mockResolvedValue(20);

    await expect(service.checkOut('s1', 'u1', 'st1', {})).rejects.toBeInstanceOf(ConflictError);
    expect(stayRepo.close).not.toHaveBeenCalled();
  });

  it('rejects a payment when no cash register is open and records nothing', async () => {
    vi.mocked(cashRegisterRepo.lockOpen).mockRejectedValue(new ConflictError('Debe abrir una caja antes de cobrar una estadía'));

    await expect(service.addPayment('s1', 'u1', 'st1', { paymentMethod: 'CASH', amount: 20 }))
      .rejects.toMatchObject({ message: 'Debe abrir una caja antes de cobrar una estadía' });
    expect(stayRepo.addPayment).not.toHaveBeenCalled();
  });

  it('check-in rejects a minor aged 18+ before touching the database', async () => {
    const checkIn = service.checkIn('s1', 'u1', {
      roomId: '00000000-0000-0000-0000-000000000001',
      rateKind: 'NIGHT',
      amount: 50,
      paymentMethod: 'CASH',
      guests: [{
        documentType: 'DNI', documentNumber: '45781236', fullName: 'Juan Pérez', birthDate: '1990-05-14',
        sex: 'M', nationality: 'Peruana', residence: 'Arequipa', isHolder: true,
      }],
      minors: [{ fullName: 'Luis Pérez', birthDate: '2000-01-01', guardianRelation: 'PARENT' }],
    });

    await expect(checkIn).rejects.toBeInstanceOf(BadRequestError);
    await expect(checkIn).rejects.toMatchObject({ message: 'Luis Pérez tiene 18 años o más: regístrelo como huésped' });
    expect(stayRepo.lockRoomForCheckIn).not.toHaveBeenCalled();
    expect(stayRepo.create).not.toHaveBeenCalled();
  });

  it('check-in charges the full rate to the open register', async () => {
    vi.mocked(cashRegisterRepo.lockOpen).mockResolvedValue('cr1');
    vi.mocked(stayRepo.lockRoomForCheckIn).mockResolvedValue({
      id: 'r1', number: '101', isActive: true, needsCleaning: false, occupied: false, capacity: 2,
      hourPrice: '10.00', nightPrice: '50.00', extraHourPrice: '10.00',
    });
    vi.mocked(stayRepo.upsertGuest).mockResolvedValue('g1');
    vi.mocked(stayRepo.create).mockResolvedValue('st1');
    vi.mocked(stayRepo.findById).mockResolvedValue({ id: 'st1', status: 'CLOSED' } as never);

    await service.checkIn('s1', 'u1', {
      roomId: '00000000-0000-0000-0000-000000000001',
      rateKind: 'NIGHT',
      amount: 45,
      paymentMethod: 'YAPE',
      guests: [{
        documentType: 'DNI', documentNumber: '45781236', fullName: 'Juan Pérez', birthDate: '1990-05-14',
        sex: 'M', nationality: 'Peruana', residence: 'Arequipa', isHolder: true,
      }],
    });

    expect(stayRepo.addPayment).toHaveBeenCalledWith('st1', 'cr1', 'u1', { paymentMethod: 'YAPE', amount: 45 }, {});
  });

  it('check-in rejects a guest who is already staying in another room', async () => {
    vi.mocked(cashRegisterRepo.lockOpen).mockResolvedValue('cr1');
    vi.mocked(stayRepo.lockRoomForCheckIn).mockResolvedValue({
      id: 'r2', number: '202', isActive: true, needsCleaning: false, occupied: false, capacity: 2,
      hourPrice: '10.00', nightPrice: '50.00', extraHourPrice: '10.00',
    });
    vi.mocked(stayRepo.upsertGuest).mockResolvedValue('g1');
    vi.mocked(stayRepo.findActiveStayOfGuest).mockResolvedValue({ fullName: 'Juan Pérez', roomNumber: '201' });

    const checkIn = service.checkIn('s1', 'u1', {
      roomId: '00000000-0000-0000-0000-000000000002',
      rateKind: 'NIGHT',
      amount: 50,
      paymentMethod: 'CASH',
      guests: [{
        documentType: 'DNI', documentNumber: '45781236', fullName: 'Juan Pérez', birthDate: '1990-05-14',
        sex: 'M', nationality: 'Peruana', residence: 'Arequipa', isHolder: true,
      }],
    });

    await expect(checkIn).rejects.toMatchObject({ message: 'Juan Pérez ya está hospedado en la habitación 201' });
    expect(stayRepo.create).not.toHaveBeenCalled();
  });
});

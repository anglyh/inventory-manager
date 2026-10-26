import type { PoolClient } from 'pg';
import { withTransaction } from '../db/transactions.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/app.error.js';
import type { ICashRegisterRepository } from '../interfaces/repositories/cash-register.repository.interface.js';
import type { IStayRepository } from '../interfaces/repositories/stay.repository.interface.js';
import type { IStoreRepository } from '../interfaces/repositories/store.repository.interface.js';
import type { IStayService, StayPage } from '../interfaces/services/stay.service.interface.js';
import type { Guest, LockedStay, StayDetail, StayRecord } from '../models/stay.model.js';
import type {
  CheckInDTO,
  CheckOutDTO,
  GuestLookupDTO,
  StayChargeDTO,
  StayListQueryDTO,
  StayPaymentDTO,
} from '../schemas/stay.schema.js';
import { suggestExpectedCheckOut, suggestExtra } from '../utils/stay-pricing.js';

const NO_OPEN_REGISTER = 'Debe abrir una caja antes de cobrar una estadía';
const ADULT_AGE = 18;

/** Lima no tiene horario de verano: su desfase UTC−5 es fijo. */
const LIMA_OFFSET_MS = 5 * 3_600_000;

/** Fecha de hoy en Lima (AAAA-MM-DD). */
const limaToday = (now: Date) => new Date(now.getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 10);

/** Edad cumplida a la fecha `today` (ambas en AAAA-MM-DD; se comparan como texto). */
const ageAt = (birthDate: string, today: string) => {
  const [year = 0, month = 1, day = 1] = birthDate.split('-').map(Number);
  const [todayYear = 0, todayMonth = 1, todayDay = 1] = today.split('-').map(Number);
  const hadBirthday = todayMonth > month || (todayMonth === month && todayDay >= day);
  return todayYear - year - (hadBirthday ? 0 : 1);
};

const toMoney = (value: number) => value.toFixed(2);
/** Compara importes en céntimos para no depender de la precisión de los flotantes. */
const cents = (value: number) => Math.round(value * 100);

export default class StayService implements IStayService {
  constructor(
    private stayRepo: IStayRepository,
    private cashRegisterRepo: ICashRegisterRepository,
    private storeRepo: IStoreRepository,
  ) {}

  findGuest(storeId: string, filters: GuestLookupDTO): Promise<Guest | null> {
    return this.stayRepo.findGuest(storeId, filters);
  }

  async checkIn(storeId: string, userId: string, data: CheckInDTO): Promise<StayDetail> {
    this.validateGuests(data);

    const stayId = await withTransaction(async client => {
      // La tarifa se cobra completa al ingresar. Igual que en las ventas: la caja se bloquea antes que cualquier otra fila.
      const cashRegisterId = await this.cashRegisterRepo.lockOpen(storeId, undefined, client, NO_OPEN_REGISTER);

      const room = await this.stayRepo.lockRoomForCheckIn(storeId, data.roomId, client);
      if (!room) throw new NotFoundError('La habitación no existe');
      if (!room.isActive) throw new ConflictError(`La habitación ${room.number} está desactivada`);
      if (room.occupied) throw new ConflictError(`La habitación ${room.number} está ocupada`);
      if (room.needsCleaning) throw new ConflictError(`La habitación ${room.number} está pendiente de limpieza`);
      // Los menores no cuentan para la capacidad: se registran aparte con su responsable.
      if (data.guests.length > room.capacity) {
        throw new ConflictError(`La habitación ${room.number} admite hasta ${room.capacity} huéspedes`);
      }

      // El esquema exige las horas en la tarifa por horas y las prohíbe en la de noche.
      const hours = data.rateKind === 'HOURLY' ? data.hours ?? null : null;
      const now = new Date();
      const settings = await this.storeRepo.getSettings(storeId, client);
      const expectedCheckOut = data.expectedCheckOut
        ? new Date(data.expectedCheckOut)
        : suggestExpectedCheckOut({
          checkIn: now,
          rateKind: data.rateKind,
          hours,
          checkoutTime: settings?.checkoutTime ?? '12:00',
        });
      if (expectedCheckOut.getTime() <= now.getTime()) {
        throw new BadRequestError('La salida prevista debe ser posterior al ingreso', 'expectedCheckOut');
      }

      const guests = [];
      for (const guest of data.guests) {
        guests.push({ guestId: await this.stayRepo.upsertGuest(storeId, guest, client), isHolder: guest.isHolder });
      }

      const id = await this.stayRepo.create({
        storeId,
        roomId: room.id,
        rateKind: data.rateKind,
        hours,
        expectedCheckOut,
        travelReason: data.travelReason || null,
        notes: data.notes || null,
        extraHourPrice: room.extraHourPrice,
        createdBy: userId,
      }, client);
      await this.stayRepo.addGuests(id, guests, client);
      if (data.minors?.length) await this.stayRepo.addMinors(id, data.minors, client);

      await this.stayRepo.addCharge(id, userId, {
        kind: 'RATE',
        description: hours ? `${hours} ${hours === 1 ? 'hora' : 'horas'}` : '1 noche',
        // Referencia del tipo de habitación; lo cobrado puede diferir (descuentos, redondeos).
        suggestedAmount: hours ? toMoney(cents(Number(room.hourPrice)) * hours / 100) : room.nightPrice,
        amount: data.amount,
      }, client);
      // Una tarifa de cortesía (0) no genera cobro.
      if (cents(data.amount) > 0) {
        await this.stayRepo.addPayment(id, cashRegisterId, userId, {
          paymentMethod: data.paymentMethod,
          amount: data.amount,
        }, client);
      }

      return id;
    });

    return this.getById(storeId, stayId);
  }

  async getById(storeId: string, id: string): Promise<StayDetail> {
    const stay = await this.stayRepo.findById(storeId, id);
    if (!stay) throw new NotFoundError('La estadía no existe');

    const settings = stay.status === 'ACTIVE' ? await this.storeRepo.getSettings(storeId) : null;
    return { ...stay, suggestedExtra: this.suggestedExtraFor(stay, settings?.extraToleranceMinutes ?? 0) };
  }

  async list(storeId: string, filters: StayListQueryDTO): Promise<StayPage> {
    if (filters.from && filters.to && filters.from.getTime() >= filters.to.getTime()) {
      throw new BadRequestError('El rango "from" debe ser anterior a "to"');
    }
    const { data, total } = await this.stayRepo.list(storeId, filters);
    return {
      data,
      meta: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) },
    };
  }

  async addCharge(storeId: string, userId: string, id: string, data: StayChargeDTO): Promise<StayDetail> {
    await withTransaction(async client => {
      await this.lockActive(storeId, id, client);
      await this.stayRepo.addCharge(id, userId, {
        kind: data.kind,
        description: data.description,
        suggestedAmount: data.suggestedAmount ?? null,
        amount: data.amount,
      }, client);
    });
    return this.getById(storeId, id);
  }

  async addPayment(storeId: string, userId: string, id: string, data: StayPaymentDTO): Promise<StayDetail> {
    await withTransaction(async client => {
      const cashRegisterId = await this.cashRegisterRepo.lockOpen(storeId, undefined, client, NO_OPEN_REGISTER);
      await this.lockActive(storeId, id, client);
      await this.pay(id, cashRegisterId, userId, data, client);
    });
    return this.getById(storeId, id);
  }

  /**
   * Agrega el adicional por horas (sugerido por el servidor, monto final elegido), cobra si se pide
   * y cierra solo con saldo 0. Todo en una transacción: si algo falla, la estadía sigue activa.
   */
  async checkOut(storeId: string, userId: string, id: string, data: CheckOutDTO): Promise<StayDetail> {
    await withTransaction(async client => {
      const cashRegisterId = data.payment
        ? await this.cashRegisterRepo.lockOpen(storeId, undefined, client, NO_OPEN_REGISTER)
        : null;
      const stay = await this.lockActive(storeId, id, client);

      const settings = await this.storeRepo.getSettings(storeId, client);
      const suggested = suggestExtra({
        expectedOut: new Date(stay.expectedCheckOut),
        now: new Date(),
        extraHourPrice: Number(stay.extraHourPrice),
        toleranceMinutes: settings?.extraToleranceMinutes ?? 0,
      });
      const extraAmount = data.extraAmount ?? suggested.amount;
      // Se registra también un adicional condonado (0) para que quede lo sugerido.
      if (suggested.amount > 0 || extraAmount > 0) {
        await this.stayRepo.addCharge(id, userId, {
          kind: 'EXTRA_HOURS',
          description: suggested.hours > 0 ? `Horas adicionales (${suggested.hours} h)` : 'Horas adicionales',
          suggestedAmount: suggested.amount,
          amount: extraAmount,
        }, client);
      }

      if (data.payment && cashRegisterId) await this.pay(id, cashRegisterId, userId, data.payment, client);

      const balance = await this.stayRepo.getBalance(id, client);
      if (cents(balance) > 0) {
        throw new ConflictError(`No se puede hacer el check-out con saldo pendiente (S/ ${toMoney(balance)})`);
      }

      await this.stayRepo.close(id, userId, client);
    });
    return this.getById(storeId, id);
  }

  async setMigrationsReported(storeId: string, id: string, reported: boolean): Promise<StayDetail> {
    const updated = await this.stayRepo.setMigrationsReported(storeId, id, reported);
    if (!updated) throw new NotFoundError('La estadía no existe');
    return this.getById(storeId, id);
  }

  private validateGuests(data: CheckInDTO) {
    const holders = data.guests.filter(guest => guest.isHolder).length;
    if (holders !== 1) throw new BadRequestError('Debe indicar exactamente un titular', 'guests');

    const documents = new Set(data.guests.map(guest => `${guest.documentType}:${guest.documentNumber.toUpperCase()}`));
    if (documents.size !== data.guests.length) {
      throw new BadRequestError('Hay huéspedes con el mismo documento', 'guests');
    }

    const today = limaToday(new Date());
    // Las fechas AAAA-MM-DD se ordenan igual como texto que como fecha.
    const unborn = [...data.guests, ...(data.minors ?? [])].find(person => person.birthDate > today);
    if (unborn) {
      throw new BadRequestError(`La fecha de nacimiento de ${unborn.fullName} es futura`, 'birthDate');
    }

    const minor = data.guests.find(guest => ageAt(guest.birthDate, today) < ADULT_AGE);
    if (minor) {
      throw new BadRequestError(`${minor.fullName} es menor de edad; regístrelo como menor`, 'guests');
    }

    // Los menores no cuentan para la capacidad: un adulto registrado como menor la eludiría.
    const adult = data.minors?.find(m => ageAt(m.birthDate, today) >= ADULT_AGE);
    if (adult) {
      throw new BadRequestError(`${adult.fullName} tiene 18 años o más: regístrelo como huésped`, 'minors');
    }
  }

  private async lockActive(storeId: string, id: string, client: PoolClient): Promise<LockedStay> {
    const stay = await this.stayRepo.lock(storeId, id, client);
    if (!stay) throw new NotFoundError('La estadía no existe');
    if (stay.closed) throw new ConflictError('La estadía ya está cerrada');
    return stay;
  }

  private async pay(id: string, cashRegisterId: string, userId: string, payment: StayPaymentDTO, client: PoolClient) {
    const balance = await this.stayRepo.getBalance(id, client);
    if (cents(payment.amount) > cents(balance)) {
      throw new ConflictError(`El pago supera el saldo pendiente (S/ ${toMoney(Math.max(balance, 0))})`);
    }
    await this.stayRepo.addPayment(id, cashRegisterId, userId, payment, client);
  }

  private suggestedExtraFor(stay: StayRecord, toleranceMinutes: number): StayDetail['suggestedExtra'] {
    if (stay.status !== 'ACTIVE') return null;
    const extra = suggestExtra({
      expectedOut: new Date(stay.expectedCheckOut),
      now: new Date(),
      extraHourPrice: Number(stay.extraHourPrice),
      toleranceMinutes,
    });
    return { ...extra, amount: toMoney(extra.amount) };
  }
}

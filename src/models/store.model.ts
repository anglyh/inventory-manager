export interface Store {
  id: string;
  name: string;
  createdAt: Date;
}

/** Hostal settings stored on the store row. */
export interface StoreSettings {
  /** "HH:MM", Lima time. */
  checkoutTime: string;
  extraToleranceMinutes: number;
}

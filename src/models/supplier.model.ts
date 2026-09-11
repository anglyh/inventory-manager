import type { Store } from './store.model.js';

export interface Supplier {
  id: string;
  storeId: Store['id'];
  name: string;
  createdAt: Date;
}
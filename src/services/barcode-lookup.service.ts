import type { IProductRepository } from '../interfaces/repositories/product.repository.interface.js';
import type { IBarcodeLookupService } from '../interfaces/services/barcode-lookup.service.interface.js';
import type { BarcodeLookup, BarcodeSuggestion, BarcodeSuggestionSource } from '../schemas/product.schema.js';
import { BadRequestError } from '../errors/app.error.js';
import { isValidGtin } from '../utils/gtin.js';

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type BarcodeLookupOptions = {
  fetch?: FetchLike;
  now?: () => number;
  userAgent?: string;
};

type Source = { id: BarcodeSuggestionSource; host: string };

/** Open databases queried in order; they share the Open Food Facts v3 API. */
const SOURCES: readonly Source[] = [
  { id: 'OPEN_FOOD_FACTS', host: 'world.openfoodfacts.org' },
  { id: 'OPEN_PRODUCTS_FACTS', host: 'world.openproductsfacts.org' },
  { id: 'OPEN_BEAUTY_FACTS', host: 'world.openbeautyfacts.org' },
];

const FIELDS = 'product_name_es,product_name,generic_name_es,brands,quantity,image_front_url';
const REQUEST_TIMEOUT_MS = 4_000;
const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 6 * 60 * 60 * 1000;
// Open Food Facts allows 15 product reads per minute per IP. Each lookup calls each source at most once.
const MAX_EXTERNAL_LOOKUPS_PER_MINUTE = 15;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_CACHE_ENTRIES = 2_000;
// Same limit as the product name (product.schema.ts), so the suggestion can be saved as is.
const MAX_NAME_LENGTH = 50;

type OffProduct = {
  product_name_es?: unknown;
  product_name?: unknown;
  generic_name_es?: unknown;
  brands?: unknown;
  quantity?: unknown;
  image_front_url?: unknown;
};

type SourceResult = { kind: 'hit'; suggestion: BarcodeSuggestion } | { kind: 'miss' } | { kind: 'error' };
type CacheEntry = { suggestion: BarcodeSuggestion | null; expiresAt: number };

const clean = (value: unknown): string => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Builds "<name> <brand> <quantity>" from an Open Food Facts style product, or null without a usable name. */
export function toSuggestion(product: OffProduct, source: BarcodeSuggestionSource): BarcodeSuggestion | null {
  const brand = clean(clean(product.brands).split(',')[0]) || null;
  const quantity = clean(product.quantity) || null;
  const baseName = clean(product.product_name_es) || clean(product.generic_name_es) || clean(product.product_name);
  if (!baseName && !brand) return null;

  const parts = [baseName];
  if (brand && !normalize(baseName).includes(normalize(brand))) parts.push(brand);
  if (quantity && !normalize(baseName).includes(normalize(quantity))) parts.push(quantity);
  const name = parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH).trim();

  const image = clean(product.image_front_url);
  return {
    name,
    brand,
    quantity,
    imageUrl: image.startsWith('https://') ? image : null,
    source,
  };
}

export default class BarcodeLookupService implements IBarcodeLookupService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly recentExternalLookups: number[] = [];
  private readonly fetchFn: FetchLike;
  private readonly now: () => number;
  private readonly userAgent: string;

  constructor(private productRepo: IProductRepository, options: BarcodeLookupOptions = {}) {
    this.fetchFn = options.fetch ?? ((url, init) => fetch(url, init));
    this.now = options.now ?? Date.now;
    this.userAgent = options.userAgent ?? process.env.OFF_USER_AGENT ?? 'HostalManager/1.0';
  }

  async lookup(storeId: string, rawCode: string): Promise<BarcodeLookup> {
    const code = rawCode.trim();
    if (!isValidGtin(code)) {
      throw new BadRequestError('El código de barras no es válido. Revisa que tenga 8, 12, 13 o 14 dígitos.', 'code');
    }

    const existingProduct = await this.productRepo.findByBarcode(storeId, code);
    if (existingProduct) return { code, existingProduct, suggestion: null };

    const cached = this.readCache(code);
    if (cached !== undefined) return { code, existingProduct: null, suggestion: cached };

    // Over the limit the owner simply fills the form by hand; it is not an error.
    if (!this.takeExternalSlot()) return { code, existingProduct: null, suggestion: null };

    let failed = false;
    for (const source of SOURCES) {
      const result = await this.querySource(source, code);
      if (result.kind === 'hit') {
        this.writeCache(code, result.suggestion, HIT_TTL_MS);
        return { code, existingProduct: null, suggestion: result.suggestion };
      }
      if (result.kind === 'error') failed = true;
    }

    // A miss caused by an unreachable source is not cached, so the next scan tries again.
    if (!failed) this.writeCache(code, null, MISS_TTL_MS);
    return { code, existingProduct: null, suggestion: null };
  }

  private async querySource(source: Source, code: string): Promise<SourceResult> {
    const url = `https://${source.host}/api/v3/product/${code}?fields=${FIELDS}`;
    try {
      const response = await this.fetchFn(url, {
        headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status === 404) return { kind: 'miss' };
      if (!response.ok) return { kind: 'error' };

      const body = await response.json() as { product?: OffProduct | null };
      const suggestion = body.product ? toSuggestion(body.product, source.id) : null;
      return suggestion ? { kind: 'hit', suggestion } : { kind: 'miss' };
    } catch {
      // Timeout, network failure or invalid JSON.
      return { kind: 'error' };
    }
  }

  private readCache(code: string): BarcodeSuggestion | null | undefined {
    const entry = this.cache.get(code);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.cache.delete(code);
      return undefined;
    }
    return entry.suggestion;
  }

  private writeCache(code: string, suggestion: BarcodeSuggestion | null, ttl: number) {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const now = this.now();
      for (const [key, entry] of this.cache) if (entry.expiresAt <= now) this.cache.delete(key);
      // Still full: drop the oldest entry (Map keeps insertion order).
      if (this.cache.size >= MAX_CACHE_ENTRIES) this.cache.delete(this.cache.keys().next().value!);
    }
    this.cache.set(code, { suggestion, expiresAt: this.now() + ttl });
  }

  /** Rolling one-minute window of external lookups. */
  private takeExternalSlot(): boolean {
    const now = this.now();
    while (this.recentExternalLookups.length && this.recentExternalLookups[0]! <= now - RATE_WINDOW_MS) {
      this.recentExternalLookups.shift();
    }
    if (this.recentExternalLookups.length >= MAX_EXTERNAL_LOOKUPS_PER_MINUTE) return false;
    this.recentExternalLookups.push(now);
    return true;
  }
}

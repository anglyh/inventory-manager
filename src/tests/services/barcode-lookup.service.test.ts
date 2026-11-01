import { beforeEach, describe, expect, it, vi } from 'vitest';
import BarcodeLookupService, { type FetchLike } from '../../services/barcode-lookup.service.js';
import { isValidGtin } from '../../utils/gtin.js';
import { BadRequestError } from '../../errors/app.error.js';
import { mockProductRepo } from './mockProductRepo.js';

const INCA_KOLA = '7750182005814';

const jsonResponse = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const notFound = () => jsonResponse(404, { status: 'failure', result: { id: 'product_not_found' } });

describe('isValidGtin', () => {
  it('accepts valid EAN-13, EAN-8 and UPC-A codes', () => {
    expect(isValidGtin(INCA_KOLA)).toBe(true);
    expect(isValidGtin('96385074')).toBe(true);
    expect(isValidGtin('036000291452')).toBe(true);
  });

  it('rejects a wrong check digit, letters and unsupported lengths', () => {
    expect(isValidGtin('7750182005815')).toBe(false);
    expect(isValidGtin('77501820058a4')).toBe(false);
    expect(isValidGtin('12345')).toBe(false);
  });
});

describe('BarcodeLookupService.lookup', () => {
  let fetchMock: ReturnType<typeof vi.fn<FetchLike>>;
  let service: BarcodeLookupService;

  beforeEach(() => {
    vi.mocked(mockProductRepo.findByBarcode).mockReset().mockResolvedValue(null);
    fetchMock = vi.fn<FetchLike>();
    service = new BarcodeLookupService(mockProductRepo, { fetch: fetchMock });
  });

  it('returns the store product with that barcode without calling external sources', async () => {
    vi.mocked(mockProductRepo.findByBarcode).mockResolvedValue({ id: 'product-1', name: 'Inca Kola 1.5 L' });

    const result = await service.lookup('store-1', INCA_KOLA);

    expect(result).toEqual({ code: INCA_KOLA, existingProduct: { id: 'product-1', name: 'Inca Kola 1.5 L' }, suggestion: null });
    expect(mockProductRepo.findByBarcode).toHaveBeenCalledWith('store-1', INCA_KOLA);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps an Open Food Facts product to a suggestion', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {
      code: INCA_KOLA,
      status: 'success',
      product: {
        product_name_es: ' Gaseosa ',
        product_name: 'Inca Kola',
        brands: 'Inca Kola, Coca-Cola',
        quantity: '1.5 lt.',
        image_front_url: 'https://images.openfoodfacts.org/images/products/775/018/200/5814/front_es.3.400.jpg',
      },
    }));

    const result = await service.lookup('store-1', INCA_KOLA);

    expect(result).toEqual({
      code: INCA_KOLA,
      existingProduct: null,
      suggestion: {
        name: 'Gaseosa Inca Kola 1.5 lt.',
        brand: 'Inca Kola',
        quantity: '1.5 lt.',
        imageUrl: 'https://images.openfoodfacts.org/images/products/775/018/200/5814/front_es.3.400.jpg',
        source: 'OPEN_FOOD_FACTS',
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toContain(`world.openfoodfacts.org/api/v3/product/${INCA_KOLA}`);
  });

  it('caches a miss so the next lookup does not call external sources again', async () => {
    fetchMock.mockImplementation(async () => notFound());

    const first = await service.lookup('store-1', INCA_KOLA);
    const second = await service.lookup('store-1', INCA_KOLA);

    expect(first.suggestion).toBeNull();
    expect(second.suggestion).toBeNull();
    // One request per source (food, products, beauty) on the first lookup only.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('rejects an invalid code with a 400 error', async () => {
    await expect(service.lookup('store-1', '7750182005815')).rejects.toThrow(BadRequestError);
  });
});

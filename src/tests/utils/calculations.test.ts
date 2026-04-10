import { describe, expect, it } from 'vitest';
import { calculateUnitCostAverage } from '../../utils/calculations.js';

const fakeInput = {
  currentStock: 0,
  currentCostAvg: 0,
  newQuantity: 10,
  newUnitCost: 5.0,
};

const fakeInputWithStockAvg = {
  currentStock: 20,
  currentCostAvg: 10,
  newQuantity: 10,
  newUnitCost: 5.0,
};

describe('calculateUnitCostAverage', () => {
  it('si no hay stock previo, devuelve el costo de la misma compra', () => {
    const result = calculateUnitCostAverage(fakeInput);
    expect(result).toBe(fakeInput.newUnitCost);
  });
  it('calcula el promedio ponderado correctamente', () => {
    const result = calculateUnitCostAverage(fakeInputWithStockAvg);
    expect(result).toBeCloseTo(8.33, 2);
  });
});

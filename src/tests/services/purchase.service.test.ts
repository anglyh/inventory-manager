import { describe, expect, it, vi } from "vitest";
import { calculateUnitCostAverage } from '../../utils/calculations.js';

const fakeInput = {
  currentStock: 0,
  currentCostAvg: 0,
  newQuantity: 10,
  newUnitCost: 5.00,
}

const fakeInputWithStockAvg = {
  currentStock: 20,
  currentCostAvg: 10,
  newQuantity: 10,
  newUnitCost: 5.00,
}

describe('PurchaseService.calculateUnitCostAverage', () => {
  it('if not previous stock, return the cost of the same purchase', () => {
    const result = calculateUnitCostAverage(fakeInput)
    expect(result).toBe(fakeInput.newUnitCost)
  })
  it('calculate the weighted average correctly', () => {
    const result = calculateUnitCostAverage(fakeInputWithStockAvg)
    expect(result).toBeCloseTo(8.33, 2)
  })
})
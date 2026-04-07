type CostAverageInput = {
  currentStock: number;
  currentCostAvg: number;
  newQuantity: number;
  newUnitCost: number;
}

export function calculateUnitCostAverage(input: CostAverageInput): number {
  const { currentStock, currentCostAvg, newQuantity, newUnitCost } = input;
  if (currentStock === 0 && currentCostAvg === 0) {
    return newUnitCost;
  }
  return (currentStock * currentCostAvg + newQuantity * newUnitCost) / (currentStock + newQuantity);
}
export type FuelInput = { straightKm: number; roadFactor: number; roundTrip: boolean; kmPerLitre: number; pricePerLitre: number; people: number };
export type FuelResult = { roadKm: number; totalKm: number; litres: number; cost: number; perPerson: number };

/**
 * Rough fuel cost. We only know the straight-line distance, so we scale it by a road factor
 * (roads wind; 1.2 to 1.4 is typical in plains, more in mountains). It's an estimate, not a quote.
 */
export function fuelCost(i: FuelInput): FuelResult {
  const roadKm = i.straightKm * i.roadFactor;
  const totalKm = roadKm * (i.roundTrip ? 2 : 1);
  const litres = i.kmPerLitre > 0 ? totalKm / i.kmPerLitre : 0;
  const cost = litres * i.pricePerLitre;
  return { roadKm, totalKm, litres, cost, perPerson: i.people > 0 ? cost / i.people : cost };
}

import type { HardwareItem } from 'src/models/HardwareItem/schema';

/** Embodied emissions (kg CO₂-eq): number of items × impact of one item. */
export function rowSubtotal(row: HardwareItem): number {
    return row.quantity * row.impactManufacturingDistributionEol;
}

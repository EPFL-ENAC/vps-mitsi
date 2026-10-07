import type { EnergyMeasurements } from 'src/models/Datacenter/schema';

/** Operational kg CO₂-eq for validated measurements. */
export function calculatePeriodEmissions(energy: EnergyMeasurements): number {
    return energy.energyConsumption * (energy.carbonIntensity / 1000) * (energy.pue ?? 1);
}

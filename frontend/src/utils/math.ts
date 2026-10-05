import type { FunctionalUnit, HardwareItem, MonitoringPeriod, TimeUnit } from 'src/models/mitsi';

/**
 * Pure assessment calculations. Callers validate/normalize inputs and decide
 * which contributions to include; these functions do not inspect schemas or drafts.
 */

/** Counts per year from the reference workbook (weeks deliberately use 52). */
const COUNTS_PER_YEAR: Record<TimeUnit, number> = {
    second: 31_536_000,
    minute: 525_600,
    hour: 8_760,
    day: 365,
    week: 52,
    month: 12,
    year: 1,
};

export function sum(values: readonly number[]): number {
    return values.reduce((total, value) => total + value, 0);
}

/** Embodied emissions (kg CO₂-eq): number of items × impact of one item. */
export function rowSubtotal(
    row: Pick<HardwareItem, 'quantity' | 'impactManufacturingDistributionEol'>,
): number {
    return row.quantity * row.impactManufacturingDistributionEol;
}

export type EnergyMeasurements = {
    energyConsumption: number;
    carbonIntensity: number;
    pue: number | null;
};

/** Operational kg CO₂-eq for the monitoring period and, when supplied, the lifespan. */
export function calculateOperationalEmissions({
    energy,
    monitoringPeriod,
    lifespanYears,
}: {
    energy: EnergyMeasurements;
    monitoringPeriod: Pick<MonitoringPeriod, 'unit' | 'value'>;
    lifespanYears: number | null;
}): { co2Period: number; co2Lifespan: number | null } {
    // Preserve the assessment convention: omitted or zero PUE means no multiplier.
    const pue = energy.pue === null || energy.pue === 0 ? 1 : energy.pue;
    const co2Period = energy.energyConsumption * (energy.carbonIntensity / 1000) * pue;
    const monitoringYears = monitoringPeriod.value / COUNTS_PER_YEAR[monitoringPeriod.unit];
    return {
        co2Period,
        co2Lifespan: lifespanYears === null ? null : co2Period * (lifespanYears / monitoringYears),
    };
}

/** CPU fleet for CPU functional units; GPU fleet otherwise, as in the workbook. */
export function countResources(
    hardware: readonly Pick<HardwareItem, 'quantity' | 'cpuQuantity' | 'gpuQuantity'>[],
    resourceType: string,
): number {
    const cpu = resourceType.trim().toLowerCase() === 'cpu';
    return sum(hardware.map((row) => row.quantity * (cpu ? row.cpuQuantity : row.gpuQuantity)));
}

/** Requires a positive lifespan, resource fleet, usage duration, and resource count. */
export function calculateFunctionalUnitEmissions({
    totalEmissions,
    lifespanYears,
    resourcesInService,
    functionalUnit,
}: {
    totalEmissions: number;
    lifespanYears: number;
    resourcesInService: number;
    functionalUnit: Pick<FunctionalUnit, 'timeUnit' | 'usageDuration' | 'resourceCount'>;
}): number {
    const uses =
        (lifespanYears * COUNTS_PER_YEAR[functionalUnit.timeUnit] * resourcesInService) /
        (functionalUnit.usageDuration * functionalUnit.resourceCount);
    return totalEmissions / uses;
}

import type { Datacenter, EnergyMeasurements } from 'src/models/Datacenter/schema';

export type PueInclusion =
    | { status: 'unavailable' }
    | { status: 'omitted' }
    | { status: 'included'; value: number };

export type DatacenterOperationalResult = {
    datacenter: Datacenter;
    pueInclusion: PueInclusion;
    co2Period: number;
    co2Lifespan: number;
};

export function pueInclusion(value: EnergyMeasurements['pue']): PueInclusion {
    return value === null ? { status: 'omitted' } : { status: 'included', value };
}

/** Operational kg CO₂-eq for validated measurements. */
export function calculatePeriodEmissions(energy: EnergyMeasurements): number {
    return energy.energyConsumption * (energy.carbonIntensity / 1000) * (energy.pue ?? 1);
}

/** Calculate one validated datacenter; monitoring duration and lifespan are in years. */
export function calculateDatacenterOperational(
    datacenter: Datacenter,
    monitoringYears: number,
    lifespanYears: number,
): DatacenterOperationalResult {
    const co2Period = calculatePeriodEmissions(datacenter.energy);
    return {
        datacenter,
        pueInclusion: pueInclusion(datacenter.energy.pue),
        co2Period,
        co2Lifespan: co2Period * (lifespanYears / monitoringYears),
    };
}

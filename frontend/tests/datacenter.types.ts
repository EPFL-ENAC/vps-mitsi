import type { Datacenter, DatacenterDraft } from '../src/models/Datacenter/schema';
import {
    calculateDatacenterOperational,
    type DatacenterOperationalResult,
} from '../src/models/Datacenter/computations';

// A fully validated datacenter can be used wherever editable input is accepted.
export function useValidatedDatacenter(datacenter: Datacenter): DatacenterDraft {
    const consumption: number = datacenter.energy.energyConsumption;
    const intensity: number = datacenter.energy.carbonIntensity;
    const pue: number | null = datacenter.energy.pue;
    return {
        ...datacenter,
        energy: {
            ...datacenter.energy,
            energyConsumption: consumption,
            carbonIntensity: intensity,
            pue,
        },
    };
}

export function calculateValidatedDatacenter(datacenter: Datacenter): DatacenterOperationalResult {
    return calculateDatacenterOperational(datacenter, 1, 2);
}

export function resultContainsValidatedDatacenter(result: DatacenterOperationalResult): Datacenter {
    return result.datacenter;
}

export function draftsRequireValidation(datacenter: DatacenterDraft) {
    // @ts-expect-error Draft measurements may still be missing.
    const validated: Datacenter = datacenter;
    // @ts-expect-error Computation requires validated measurements.
    calculateDatacenterOperational(datacenter, 1, 2);
    return validated;
}

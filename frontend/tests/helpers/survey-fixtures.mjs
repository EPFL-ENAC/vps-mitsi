import { ScopeDraftSchema } from '../../src/models/Scope/schema.ts';
import { DatacenterDraftSchema } from '../../src/models/Datacenter/schema.ts';
import { HardwareItemDraftSchema } from '../../src/models/HardwareItem/schema.ts';

function validScope() {
    return ScopeDraftSchema.parse({
        organizationName: 'EPFL',
        assessors: 'Assessor',
        serviceName: 'Service',
        function: 'Research',
        lifespanYears: 1,
        functionalUnit: { usageDuration: 1, resourceCount: 1, resourceType: 'CPU' },
    });
}

/**
 * A datacenter energy block that satisfies `DatacenterEnergySchema`.
 * `location`, `comment`, `locationComment`, `carbonIntensityComment` and
 * `energyComment` are mandatory non-empty strings; only `pue`/`pueComment` are optional.
 */
export function validEnergy(overrides = {}) {
    return {
        location: 'Lausanne, Switzerland',
        comment: 'Measured via PDU',
        locationComment: 'Primary site',
        carbonIntensity: 500,
        carbonIntensityComment: 'Swiss grid mix average',
        energyConsumption: 100,
        energyComment: 'Metered over the monitoring period',
        ...overrides,
    };
}
export function setupScope(store) {
    store.scope = validScope();
    store.monitoringPeriod.value = 1;
    store.datacenters.push(
        DatacenterDraftSchema.parse({
            id: 'dc1',
            generalInfo: { name: 'Datacenter', abbreviation: 'DC' },
        }),
    );
}
export function validHardware() {
    return HardwareItemDraftSchema.parse({
        id: 'h1',
        datacenterId: 'dc1',
        name: 'Server',
        quantity: 1,
        impactManufacturing: 0,
        impactManufacturingDistributionEol: 0,
        cpuQuantity: 0,
        memoryQuantity: 0,
        memorySizeGb: 0,
        storageQuantity: 0,
        storageSize: 0,
        gpuQuantity: 0,
    });
}
export function defaultExportMetadata(overrides = {}) {
    return { exportedBy: 'Test Assessor', comment: '', ...overrides };
}
/** Exported metadata is stamped per call and is never persisted, so compare payloads without it. */
export function withoutMetadata(exported) {
    const state = { ...exported };
    delete state.metadata;
    return state;
}

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
        functionalUnit: { usageDuration: 1, resourceCount: 1 },
    });
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

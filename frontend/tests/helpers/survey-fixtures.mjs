import {
    ScopeDraftSchema,
    DatacenterDraftSchema,
    HardwareItemDraftSchema,
} from '../../src/models/schema.ts';

function validScope() {
    return ScopeDraftSchema.parse({
        organizationName: 'EPFL',
        assessors: 'Assessor',
        serviceName: 'Service',
        function: 'Research',
    });
}
export function setupScope(store) {
    store.scope = validScope();
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
    });
}

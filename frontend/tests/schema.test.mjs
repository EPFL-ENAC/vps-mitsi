import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    BoundaryItemDraftSchema,
    DatacenterDraftSchema,
    DatacenterEnergyDraftSchema,
    DatacenterEnergySchema,
    FunctionalUnitDraftSchema,
    HardwareItemDraftSchema,
    HardwareItemSchema,
    MITSI_SCHEMA_VERSION,
    MitsiStateDraftSchema,
    MitsiStateSchema,
    MonitoringPeriodDraftSchema,
    ScopeDraftSchema,
    ScopeSchema,
    UnderlyingServiceDraftSchema,
} from '../src/models/schema.ts';

const jsonRoundTrip = (value) => JSON.parse(JSON.stringify(value));

test('blank assessment and entity defaults retain their persisted shape', () => {
    assert.deepEqual(MitsiStateDraftSchema.parse({}), {
        schemaVersion: MITSI_SCHEMA_VERSION,
        scope: {
            organizationName: '',
            assessors: '',
            serviceName: '',
            function: '',
            functionalUnit: {
                timeUnit: 'hour',
                usageDuration: 1,
                resourceCount: 1,
                resourceType: '',
            },
            datacenters: [],
            includedItems: [],
            excludedItems: [],
            lifespanYears: 1,
        },
        hardware: [],
        monitoringPeriod: { unit: 'day', value: 1, comment: '' },
        energy: [],
        includeSecondHandEmbodied: false,
        includeUnderlyingServices: false,
        underlyingServices: [],
    });
    assert.deepEqual(jsonRoundTrip(HardwareItemDraftSchema.parse({})), {
        id: '',
        category: 'server',
        name: '',
        quantity: 0,
        datacenterId: '',
        isSecondHand: false,
        impactManufacturingDistributionEol: 0,
        cpuQuantity: 0,
        memoryQuantity: 0,
        memorySizeGb: 0,
        storageQuantity: 0,
        storageSize: 0,
        gpuQuantity: 0,
    });
    assert.deepEqual(jsonRoundTrip(DatacenterEnergyDraftSchema.parse({})), {
        datacenterId: '',
        comment: '',
        location: '',
        carbonIntensity: 0,
        energyConsumption: 0,
    });
    assert.deepEqual(UnderlyingServiceDraftSchema.parse({}), {
        id: '',
        name: '',
        usageDescription: '',
        co2EstimateKg: 0,
    });
});

test('every draft can parse its own defaults after JSON serialization', () => {
    for (const schema of [
        FunctionalUnitDraftSchema,
        DatacenterDraftSchema,
        BoundaryItemDraftSchema,
        ScopeDraftSchema,
        HardwareItemDraftSchema,
        MonitoringPeriodDraftSchema,
        DatacenterEnergyDraftSchema,
        UnderlyingServiceDraftSchema,
        MitsiStateDraftSchema,
    ]) {
        const blank = schema.parse({});
        assert.deepEqual(jsonRoundTrip(schema.parse(jsonRoundTrip(blank))), jsonRoundTrip(blank));
    }
});

test('partial drafts retain blank required strings and exact numeric placeholders', () => {
    const partial = MitsiStateDraftSchema.parse({
        scope: {
            organizationName: 'EPFL',
            datacenters: [{ id: 'dc1' }],
            includedItems: [{ type: 'IT' }],
        },
        hardware: [{ id: 'h1', name: 'Server', datacenterId: 'dc1' }],
        energy: [{ datacenterId: 'dc1' }],
    });
    assert.deepEqual(
        jsonRoundTrip(MitsiStateDraftSchema.parse(jsonRoundTrip(partial))),
        jsonRoundTrip(partial),
    );
    assert.equal(MitsiStateSchema.safeParse(partial).success, false);
    assert.equal(HardwareItemSchema.safeParse(partial.hardware[0]).success, false);
    assert.equal(DatacenterEnergySchema.safeParse(partial.energy[0]).success, false);
});

test('default factories do not share nested objects or arrays', () => {
    const first = MitsiStateDraftSchema.parse({});
    const second = MitsiStateDraftSchema.parse({});
    first.scope.functionalUnit.usageDuration = 4;
    first.scope.datacenters.push(DatacenterDraftSchema.parse({}));
    first.hardware.push(HardwareItemDraftSchema.parse({}));
    first.monitoringPeriod.value = 3;
    assert.equal(second.scope.functionalUnit.usageDuration, 1);
    assert.deepEqual(second.scope.datacenters, []);
    assert.deepEqual(second.hardware, []);
    assert.equal(second.monitoringPeriod.value, 1);
});

test('draft exceptions do not admit negative, fractional or mistyped quantities', () => {
    for (const quantity of [-1, 0.5, '2', Infinity, NaN]) {
        assert.equal(HardwareItemDraftSchema.safeParse({ quantity }).success, false);
        assert.equal(HardwareItemSchema.shape.quantity.safeParse(quantity).success, false);
    }
    assert.equal(HardwareItemDraftSchema.safeParse({ quantity: 0 }).success, true);
    assert.equal(HardwareItemSchema.shape.quantity.safeParse(0).success, false);
    for (const field of [
        'cpuQuantity',
        'memoryQuantity',
        'memorySizeGb',
        'storageQuantity',
        'storageSize',
        'gpuQuantity',
    ]) {
        assert.equal(HardwareItemDraftSchema.safeParse({ [field]: 0.5 }).success, false);
        assert.equal(HardwareItemDraftSchema.safeParse({ [field]: -1 }).success, false);
    }
});

test('invalid supplied values cannot fall back to defaults', () => {
    for (const raw of [
        { scope: { lifespanYears: 0 } },
        { scope: { functionalUnit: { resourceCount: 0 } } },
        { scope: { functionalUnit: { timeUnit: 'century' } } },
        { monitoringPeriod: { value: 0.5 } },
        { monitoringPeriod: { unit: 'century' } },
        { hardware: [{ category: 'unknown' }] },
        { hardware: [{ impactManufacturing: -1 }] },
        { energy: [{ carbonIntensity: -1 }] },
        { energy: [{ energyConsumption: -1 }] },
        { energy: [{ pue: -1 }] },
        { schemaVersion: MITSI_SCHEMA_VERSION + 1 },
    ])
        assert.equal(MitsiStateDraftSchema.safeParse(raw).success, false, JSON.stringify(raw));
});

test('cleared numeric drafts normalize; optional PUE stays optional during validation', () => {
    for (const empty of ['', null, undefined]) {
        assert.equal(HardwareItemDraftSchema.parse({ quantity: empty }).quantity, 0);
        assert.equal(ScopeDraftSchema.parse({ lifespanYears: empty }).lifespanYears, 1);
        assert.equal(DatacenterEnergyDraftSchema.parse({ pue: empty }).pue, undefined);
        assert.equal(DatacenterEnergySchema.shape.pue.safeParse(empty).success, true);
        assert.equal(
            HardwareItemDraftSchema.parse({ impactManufacturing: empty }).impactManufacturing,
            undefined,
        );
        assert.equal(HardwareItemSchema.shape.impactManufacturing.safeParse(empty).success, false);
    }
});

test('scope requires assessors, a datacenter and valid nested fields', () => {
    const valid = ScopeDraftSchema.parse({
        organizationName: 'EPFL',
        assessors: 'Assessor',
        serviceName: 'Service',
        function: 'Research',
        datacenters: [{ id: 'dc1', name: 'Datacenter', abbreviation: 'DC' }],
    });
    assert.equal(ScopeSchema.safeParse(valid).success, true);
    for (const patch of [
        { assessors: '' },
        { lifespanYears: 0 },
        { datacenters: [] },
        { datacenters: [{ ...valid.datacenters[0], abbreviation: '' }] },
        { functionalUnit: { ...valid.functionalUnit, resourceCount: 0 } },
        { includedItems: [BoundaryItemDraftSchema.parse({})] },
        { excludedItems: [BoundaryItemDraftSchema.parse({})] },
    ])
        assert.equal(ScopeSchema.safeParse({ ...valid, ...patch }).success, false);
});

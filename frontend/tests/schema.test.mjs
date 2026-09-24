import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    BoundaryItemDraftSchema,
    DatacenterDraftSchema,
    DatacenterGeneralInfoDraftSchema,
    DatacenterGeneralInfoSchema,
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
    nullableNumber,
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
            includedItems: [],
            excludedItems: [],
            lifespanYears: 1,
        },
        hardware: [],
        monitoringPeriod: { unit: 'day', value: 1, comment: '' },
        datacenters: [],
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
        comment: '',
        location: '',
        locationComment: '',
        carbonIntensity: null,
        carbonIntensityComment: '',
        pue: null,
        pueComment: '',
        energyConsumption: null,
        energyComment: '',
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
        DatacenterGeneralInfoDraftSchema,
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
            includedItems: [{ type: 'IT' }],
        },
        hardware: [{ id: 'h1', name: 'Server', datacenterId: 'dc1' }],
        datacenters: [{ id: 'dc1' }],
    });
    assert.deepEqual(
        jsonRoundTrip(MitsiStateDraftSchema.parse(jsonRoundTrip(partial))),
        jsonRoundTrip(partial),
    );
    assert.equal(MitsiStateSchema.safeParse(partial).success, false);
    assert.equal(HardwareItemSchema.safeParse(partial.hardware[0]).success, false);
    assert.equal(DatacenterEnergySchema.safeParse(partial.datacenters[0].energy).success, false);
});

test('default factories do not share nested objects or arrays', () => {
    const first = MitsiStateDraftSchema.parse({});
    const second = MitsiStateDraftSchema.parse({});
    first.scope.functionalUnit.usageDuration = 4;
    first.datacenters.push(DatacenterDraftSchema.parse({ id: 'dc1' }));
    first.hardware.push(HardwareItemDraftSchema.parse({}));
    first.monitoringPeriod.value = 3;
    assert.equal(second.scope.functionalUnit.usageDuration, 1);
    assert.deepEqual(second.datacenters, []);
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
        { datacenters: [{ id: 'dc1', energy: { carbonIntensity: -1 } }] },
        { datacenters: [{ id: 'dc1', energy: { energyConsumption: -1 } }] },
        { datacenters: [{ id: 'dc1', energy: { pue: -1 } }] },
        { schemaVersion: MITSI_SCHEMA_VERSION + 1 },
    ])
        assert.equal(MitsiStateDraftSchema.safeParse(raw).success, false, JSON.stringify(raw));
});

test('cleared numeric drafts normalize; optional PUE stays optional during validation', () => {
    for (const empty of ['', null, undefined]) {
        assert.equal(HardwareItemDraftSchema.parse({ quantity: empty }).quantity, 0);
        assert.equal(ScopeDraftSchema.parse({ lifespanYears: empty }).lifespanYears, 1);
        assert.equal(DatacenterEnergyDraftSchema.parse({ pue: empty }).pue, null);
        assert.equal(DatacenterEnergySchema.shape.pue.safeParse(empty).success, true);
        assert.equal(
            HardwareItemDraftSchema.parse({ impactManufacturing: empty }).impactManufacturing,
            undefined,
        );
        assert.equal(HardwareItemSchema.shape.impactManufacturing.safeParse(empty).success, false);
    }
});

test('scope validates its own fields independently of datacenters', () => {
    const valid = ScopeDraftSchema.parse({
        organizationName: 'EPFL',
        assessors: 'Assessor',
        serviceName: 'Service',
        function: 'Research',
    });
    assert.equal(ScopeSchema.safeParse(valid).success, true);
    for (const patch of [
        { assessors: '' },
        { lifespanYears: 0 },
        { functionalUnit: { ...valid.functionalUnit, resourceCount: 0 } },
        { includedItems: [BoundaryItemDraftSchema.parse({})] },
        { excludedItems: [BoundaryItemDraftSchema.parse({})] },
    ])
        assert.equal(ScopeSchema.safeParse({ ...valid, ...patch }).success, false);
});

test('datacenters require IDs and own independent, round-trippable nested drafts', () => {
    for (const id of [undefined, '', null]) {
        assert.equal(DatacenterDraftSchema.safeParse({ id }).success, false);
    }
    const first = DatacenterDraftSchema.parse({ id: 'a' });
    const second = DatacenterDraftSchema.parse({ id: 'b' });
    first.generalInfo.name = 'A';
    first.energy.energyConsumption = 0;
    assert.equal(second.generalInfo.name, '');
    assert.equal(second.energy.energyConsumption, null);
    assert.deepEqual(DatacenterDraftSchema.parse(jsonRoundTrip(first)), first);
    assert.equal(DatacenterGeneralInfoSchema.safeParse(first.generalInfo).success, false);
    first.generalInfo.abbreviation = 'A';
    assert.equal(DatacenterGeneralInfoSchema.safeParse(first.generalInfo).success, true);
    assert.equal(DatacenterEnergySchema.safeParse(first.energy).success, false);
});

test('nullable numbers preserve bounds and distinguish missing values from zero', () => {
    for (const empty of ['', undefined, null]) {
        assert.equal(nullableNumber().parse(empty), null);
        const energy = DatacenterEnergyDraftSchema.parse({
            carbonIntensity: empty,
            energyConsumption: empty,
            pue: empty,
        });
        assert.equal(energy.carbonIntensity, null);
        assert.equal(energy.energyConsumption, null);
        assert.equal(energy.pue, null);
        assert.equal(DatacenterEnergySchema.safeParse(energy).success, false);
    }
    assert.equal(nullableNumber().parse(0), 0);
    assert.equal(nullableNumber().parse(-2), -2);
    for (const field of ['carbonIntensity', 'energyConsumption', 'pue']) {
        for (const value of [-1, '2', NaN, Infinity, -Infinity]) {
            assert.equal(DatacenterEnergyDraftSchema.safeParse({ [field]: value }).success, false);
        }
    }
    const energy = DatacenterEnergyDraftSchema.parse({
        carbonIntensity: 100,
        energyConsumption: 0,
    });
    assert.equal(DatacenterEnergySchema.safeParse(energy).success, true);
    assert.equal(DatacenterEnergyDraftSchema.safeParse({ carbonIntensity: 0 }).success, false);
});

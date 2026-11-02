import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    BoundaryItemDraftSchema,
    ScopeDraftSchema,
    ScopeSchema,
} from '../src/models/Scope/schema.ts';
import {
    DatacenterDraftSchema,
    DatacenterGeneralInfoDraftSchema,
    DatacenterGeneralInfoSchema,
    DatacenterEnergyDraftSchema,
    DatacenterEnergySchema,
} from '../src/models/Datacenter/schema.ts';
import {
    FunctionalUnitDraftSchema,
    FunctionalUnitSchema,
    ResourceTypeSchema,
} from '../src/models/FunctionalUnit/schema.ts';
import { HardwareItemDraftSchema, HardwareItemSchema } from '../src/models/HardwareItem/schema.ts';
import {
    MITSI_SCHEMA_VERSION,
    MitsiStateDraftSchema,
    MitsiStateSchema,
} from '../src/models/MitsiState/schema.ts';
import { MonitoringPeriodDraftSchema } from '../src/models/MonitoringPeriod/schema.ts';
import { UnderlyingServiceDraftSchema } from '../src/models/UnderlyingService/schema.ts';
import { PersistedAssessmentSchema } from '../src/models/MitsiState/utils.ts';
import { nullableNumber } from '../src/models/shared/schema.ts';
import { validEnergy } from './helpers/survey-fixtures.mjs';

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
                usageDuration: null,
                resourceCount: null,
                resourceType: '',
                resourceTypeOther: '',
                manualFleetCount: null,
            },
            includedItems: [],
            excludedItems: [],
            lifespanYears: null,
        },
        hardware: [],
        monitoringPeriod: { unit: 'day', value: null, comment: '' },
        datacenters: [],
        includeSecondHandEmbodied: false,
        includeUnderlyingServices: false,
        underlyingServices: [],
    });
    assert.deepEqual(jsonRoundTrip(HardwareItemDraftSchema.parse({})), {
        id: '',
        category: 'server',
        name: '',
        quantity: null,
        datacenterId: '',
        isSecondHand: false,
        impactManufacturing: null,
        impactManufacturingDistributionEol: null,
        cpuQuantity: null,
        memoryQuantity: null,
        memorySizeGb: null,
        storageQuantity: null,
        storageSize: null,
        gpuQuantity: null,
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
        co2EstimateKg: null,
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
        UnderlyingServiceDraftSchema,
        MitsiStateDraftSchema,
    ]) {
        const blank = schema.parse({});
        assert.deepEqual(jsonRoundTrip(schema.parse(jsonRoundTrip(blank))), jsonRoundTrip(blank));
    }

    // Datacenter energy is the exception: its draft defaults are blank strings, but the
    // canonical schema requires non-empty comments, so a blank draft no longer round-trips.
    const blankEnergy = DatacenterEnergyDraftSchema.parse({});
    assert.equal(blankEnergy.location, '');
    assert.equal(DatacenterEnergyDraftSchema.safeParse(jsonRoundTrip(blankEnergy)).success, false);
    const filledEnergy = DatacenterEnergyDraftSchema.parse(validEnergy());
    assert.deepEqual(
        jsonRoundTrip(DatacenterEnergyDraftSchema.parse(jsonRoundTrip(filledEnergy))),
        jsonRoundTrip(filledEnergy),
    );
});

test('partial drafts retain blank required strings and empty numeric fields', () => {
    const partial = MitsiStateDraftSchema.parse({
        scope: {
            organizationName: 'EPFL',
            includedItems: [{ type: 'IT' }],
        },
        hardware: [{ id: 'h1', name: 'Server', datacenterId: 'dc1' }],
        datacenters: [{ id: 'dc1' }],
    });
    assert.equal(partial.datacenters[0].energy.location, '');
    assert.equal(partial.datacenters[0].energy.carbonIntensity, null);
    // Blank energy strings are outside the canonical schema, so a whole-state draft whose
    // datacenter energy is still empty cannot be re-parsed as a persisted assessment.
    assert.equal(MitsiStateDraftSchema.safeParse(jsonRoundTrip(partial)).success, false);
    assert.equal(PersistedAssessmentSchema.safeParse(partial).success, false);
    assert.equal(MitsiStateSchema.safeParse(partial).success, false);
    assert.equal(HardwareItemSchema.safeParse(partial.hardware[0]).success, false);
    assert.equal(DatacenterEnergySchema.safeParse(partial.datacenters[0].energy).success, false);

    // Once the energy block is filled in, the same state round-trips unchanged.
    const filled = MitsiStateDraftSchema.parse({
        ...partial,
        datacenters: [{ ...partial.datacenters[0], energy: validEnergy() }],
    });
    assert.deepEqual(
        jsonRoundTrip(MitsiStateDraftSchema.parse(jsonRoundTrip(filled))),
        jsonRoundTrip(filled),
    );
});

test('default factories do not share nested objects or arrays', () => {
    const first = MitsiStateDraftSchema.parse({});
    const second = MitsiStateDraftSchema.parse({});
    first.scope.functionalUnit.usageDuration = 4;
    first.datacenters.push(DatacenterDraftSchema.parse({ id: 'dc1' }));
    first.hardware.push(HardwareItemDraftSchema.parse({}));
    first.monitoringPeriod.value = 3;
    assert.equal(second.scope.functionalUnit.usageDuration, null);
    assert.deepEqual(second.datacenters, []);
    assert.deepEqual(second.hardware, []);
    assert.equal(second.monitoringPeriod.value, null);
});

test('numeric drafts do not admit negative, fractional or mistyped quantities', () => {
    for (const quantity of [-1, 0.5, '2', Infinity, NaN]) {
        assert.equal(HardwareItemDraftSchema.safeParse({ quantity }).success, false);
        assert.equal(HardwareItemSchema.shape.quantity.safeParse(quantity).success, false);
    }
    assert.equal(HardwareItemDraftSchema.safeParse({ quantity: 0 }).success, false);
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
        assert.equal(HardwareItemDraftSchema.parse({ quantity: empty }).quantity, null);
        assert.equal(ScopeDraftSchema.parse({ lifespanYears: empty }).lifespanYears, null);
        assert.equal(DatacenterEnergyDraftSchema.parse({ pue: empty }).pue, null);
        assert.equal(DatacenterEnergySchema.shape.pue.safeParse(empty).success, true);
        assert.equal(
            HardwareItemDraftSchema.parse({ impactManufacturing: empty }).impactManufacturing,
            null,
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
        lifespanYears: 1,
        functionalUnit: { usageDuration: 1, resourceCount: 1, resourceType: 'CPU' },
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
    assert.equal(DatacenterGeneralInfoSchema.safeParse(first.generalInfo).success, false);
    first.generalInfo.abbreviation = 'A';
    assert.equal(DatacenterGeneralInfoSchema.safeParse(first.generalInfo).success, true);
    assert.equal(DatacenterEnergySchema.safeParse(first.energy).success, false);

    // A datacenter whose energy block is still blank cannot round-trip: the canonical
    // schema requires non-empty energy comments, so re-parsing the draft throws.
    assert.equal(DatacenterDraftSchema.safeParse(jsonRoundTrip(first)).success, false);

    // Filling in the energy block restores round-trip stability.
    first.energy = DatacenterEnergyDraftSchema.parse(validEnergy());
    assert.deepEqual(DatacenterDraftSchema.parse(jsonRoundTrip(first)), first);
    assert.equal(DatacenterEnergySchema.safeParse(first.energy).success, true);
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
    const energy = DatacenterEnergyDraftSchema.parse(
        validEnergy({ carbonIntensity: 100, energyConsumption: 0 }),
    );
    assert.equal(DatacenterEnergySchema.safeParse(energy).success, true);
    assert.equal(DatacenterEnergyDraftSchema.safeParse({ carbonIntensity: 0 }).success, true);

    // The mandatory energy strings are non-empty; the numeric fields alone are not enough.
    assert.equal(
        DatacenterEnergySchema.safeParse({ carbonIntensity: 100, energyConsumption: 0 }).success,
        false,
    );
    for (const field of [
        'comment',
        'location',
        'locationComment',
        'carbonIntensityComment',
        'energyComment',
    ]) {
        for (const blank of ['', '   ']) {
            assert.equal(
                DatacenterEnergySchema.safeParse({ ...validEnergy(), [field]: blank }).success,
                false,
                `${field} must reject ${JSON.stringify(blank)}`,
            );
        }
        assert.equal(
            DatacenterEnergySchema.safeParse({ ...validEnergy(), [field]: undefined }).success,
            false,
            `${field} is mandatory`,
        );
    }
});

test('resource selection uses exact enum values while drafts retain an unanswered selection', () => {
    assert.deepEqual(ResourceTypeSchema.options, ['CPU', 'GPU', 'Disk', 'RAM', 'Other']);
    const input = { timeUnit: 'hour', usageDuration: 1, resourceCount: 1 };
    assert.equal(FunctionalUnitDraftSchema.parse(input).resourceType, '');
    assert.equal(FunctionalUnitSchema.safeParse(input).success, false);
    for (const resourceType of ['CPU', 'GPU', 'Disk', 'RAM', 'Other']) {
        const custom = resourceType === 'Other';
        for (const schema of [FunctionalUnitSchema, FunctionalUnitDraftSchema]) {
            const parsed = schema.safeParse({
                ...input,
                resourceType,
                ...(custom ? { resourceTypeOther: 'sessions', manualFleetCount: 5 } : {}),
            });
            assert.equal(parsed.success, true, `${resourceType} should parse`);
            assert.equal(parsed.data.resourceType, resourceType);
        }
    }
    for (const resourceType of [
        '',
        undefined,
        null,
        ' ',
        'cpu',
        'gpu',
        ' CPU ',
        'other',
        'disk',
        'ram',
        'DISK',
    ]) {
        const parsed = FunctionalUnitSchema.safeParse({ ...input, resourceType });
        assert.equal(parsed.success, false);
        assert.deepEqual(parsed.error.issues[0].path, ['resourceType']);
        assert.equal(parsed.error.issues[0].code, 'invalid_value');
        assert.deepEqual(parsed.error.issues[0].values, ResourceTypeSchema.options);
        if (resourceType !== '' && resourceType !== undefined) {
            assert.equal(
                FunctionalUnitDraftSchema.safeParse({ ...input, resourceType }).success,
                false,
            );
        }
    }
});

test('custom resource fields stay optional and independent of the selected type', () => {
    const input = { timeUnit: 'hour', usageDuration: 1, resourceCount: 1, resourceType: 'Other' };
    for (const schema of [FunctionalUnitSchema, FunctionalUnitDraftSchema]) {
        // Selecting 'Other' imposes no cross-field requirement: the store owns that check.
        assert.equal(schema.safeParse(input).success, true);

        // A custom name is optional free text and is preserved verbatim.
        for (const resourceTypeOther of ['', '   ', 'seats']) {
            const parsed = schema.safeParse({ ...input, resourceTypeOther });
            assert.equal(parsed.success, true, JSON.stringify(resourceTypeOther));
            assert.equal(parsed.data.resourceTypeOther, resourceTypeOther);
        }

        // The total, when supplied, must be a positive integer.
        for (const manualFleetCount of [0, 1.5, -1, '4']) {
            const invalid = schema.safeParse({ ...input, manualFleetCount });
            assert.equal(invalid.success, false, JSON.stringify(manualFleetCount));
            assert.deepEqual(
                invalid.error.issues.map((issue) => issue.path),
                [['manualFleetCount']],
            );
        }

        // Clearing the total is an unanswered value, not a measurement.
        assert.equal(schema.safeParse({ ...input, manualFleetCount: '' }).success, true);
        assert.equal(schema.safeParse({ ...input, manualFleetCount: null }).success, true);

        const valid = schema.safeParse({
            ...input,
            resourceTypeOther: 'seats',
            manualFleetCount: 4,
        });
        assert.equal(valid.success, true);
        assert.equal(valid.data.resourceTypeOther, 'seats');
        assert.equal(valid.data.manualFleetCount, 4);
    }

    // The same optional fields are accepted alongside every supported resource type.
    for (const resourceType of ['CPU', 'GPU', 'Disk', 'RAM', 'Other']) {
        assert.equal(
            FunctionalUnitSchema.safeParse({ ...input, resourceType }).success,
            true,
            resourceType,
        );
    }
});

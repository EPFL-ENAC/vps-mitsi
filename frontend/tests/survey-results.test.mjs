import assert from 'node:assert/strict';
import { beforeEach, afterEach, mock, test } from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { LocalStorage } from 'quasar';
import { z } from 'zod';
import { useSurveyResultsStore } from '../src/stores/surveyResults.ts';
import { useSurveyDataStore, MITSI_STORAGE_KEY } from '../src/stores/surveyData.ts';
import { ComputationResult } from '../src/utils/computation.ts';

import {
    DatacenterEnergyDraftSchema,
    DatacenterDraftSchema,
    DatacenterSchema,
} from '../src/models/Datacenter/schema.ts';
import { MitsiStateDraftSchema } from '../src/models/MitsiState/schema.ts';
import { HardwareItemDraftSchema } from '../src/models/HardwareItem/schema.ts';
import { UnderlyingServiceDraftSchema } from '../src/models/UnderlyingService/schema.ts';

import { setupScope, validHardware } from './helpers/survey-fixtures.mjs';

let stored;
beforeEach(() => {
    stored = new Map();
    setActivePinia(createPinia());
    mock.method(LocalStorage, 'set', (key, value) => stored.set(key, JSON.stringify(value)));
    mock.method(LocalStorage, 'getItem', (key) =>
        stored.has(key) ? JSON.parse(stored.get(key)) : null,
    );
    mock.method(LocalStorage, 'remove', (key) => stored.delete(key));
});
afterEach(() => mock.restoreAll());

test('Pinia exposes result instances and methods through edits and replacement', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.scope.functionalUnit.resourceType = 'CPU';
    data.hardware = [
        { ...validHardware(), cpuQuantity: 1, impactManufacturingDistributionEol: 10 },
        { ...validHardware(), id: 'editing', cpuQuantity: 1, quantity: null },
    ];
    const names = [
        'hardwareItemCount',
        'totalEmbodiedEmissionsKg',
        'datacenterOperationalResults',
        'totalOperationalEmissionsKg',
        'totalUnderlyingEmissionsKg',
        'totalLifespanEmissionsKg',
        'selectedResourceFleetCount',
        'emissionsPerFunctionalUnitKg',
        'lifespanEmissionsPerResourceKg',
    ];
    for (const name of names) {
        const computation = results[name];
        assert.ok(computation instanceof ComputationResult, name);
        let called = false;
        const mapped = computation.map(() => {
            called = true;
            return 'mapped';
        });
        assert.ok(mapped instanceof ComputationResult, name);
        assert.equal(mapped.success, computation.success, name);
        assert.equal(called, computation.success !== 'failure', name);
        assert.deepEqual(mapped.inputErrors, computation.inputErrors);
        assert.deepEqual(mapped.ignoredInputs, computation.ignoredInputs);
    }
    assert.ok(
        results.embodiedEmissionsByCategory[0].totalEmbodiedEmissionsKg instanceof
            ComputationResult,
    );
    assert.equal(results.totalEmbodiedEmissionsKg.ignoredInputs[0], data.hardware[1]);
    data.hardware[1].quantity = 2;
    assert.equal(results.totalEmbodiedEmissionsKg.success, 'success');
    assert.equal(results.totalEmbodiedEmissionsKg.map((value) => value * 2).result, 20);
    data.hardware = [
        { ...validHardware(), cpuQuantity: 2, impactManufacturingDistributionEol: 15 },
    ];
    assert.equal(results.totalEmbodiedEmissionsKg.map((value) => value * 2).result, 30);
    for (const name of [
        'hardwareUnitEmbodiedEmissionsKg',
        'hardwareRowEmbodiedEmissionsKg',
        'hardwareMemoryPerUnitGb',
        'hardwareStorageCapacityPerUnit',
    ]) {
        assert.ok(results[name](data.hardware[0]) instanceof ComputationResult, name);
    }
});

test('energy calculations validate drafts in the store without mutating inputs', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.monitoringPeriod.unit = 'year';
    const dc = data.datacenters[0];
    const energy = DatacenterEnergyDraftSchema.parse({
        energyConsumption: 100,
        carbonIntensity: 500,
    });

    for (const draft of [
        DatacenterEnergyDraftSchema.parse({}),
        ...[
            { energyConsumption: null },
            { energyConsumption: '' },
            { energyConsumption: -1 },
            { carbonIntensity: null },
            { carbonIntensity: '500' },
            { pue: -1 },
            { pue: NaN },
        ].map((patch) => ({ ...energy, ...patch })),
    ]) {
        dc.energy = Object.freeze(draft);
        assert.equal(results.datacenterOperationalResults.success, 'failure');
        assert.equal(results.datacenterOperationalResults.result, null);
        assert.equal(results.datacenterOperationalResults.ignoredInputs[0], dc);
        assert.equal(results.datacenterOperationalResults.inputErrors.length, 1);
        assert.ok(results.datacenterOperationalResults.inputErrors[0] instanceof z.ZodError);
        assert.ok(
            results.datacenterOperationalResults.inputErrors[0].issues.every(
                (issue) => issue.path[0] === 'energy',
            ),
        );
        assert.equal(results.totalOperationalEmissionsKg.result, null);
        assert.equal(dc.energy, draft);
    }

    for (const pue of ['', undefined, null]) {
        const draft = Object.freeze({ ...energy, pue });
        dc.energy = draft;
        assert.deepEqual(
            { ...results.datacenterOperationalResults },
            {
                success: 'success',
                result: [
                    {
                        datacenter: DatacenterSchema.parse(dc),
                        pueInclusion: { status: 'omitted' },
                        co2Period: 50,
                        co2Lifespan: 50,
                    },
                ],
                inputErrors: [],
                ignoredInputs: [],
            },
        );
        assert.equal(dc.energy, draft);
        assert.equal(dc.energy.pue, pue);
        const validatedDatacenter = results.datacenterOperationalResults.result[0].datacenter;
        assert.notEqual(validatedDatacenter, dc);
        assert.notEqual(validatedDatacenter.energy, draft);
        assert.equal(validatedDatacenter.energy.pue, null);
    }
});

test('operational context failures report shared paths before processing datacenters', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);

    for (const [period, lifespan, paths] of [
        [0, 1, [['monitoringPeriod', 'value']]],
        [1, 0, [['scope', 'lifespanYears']]],
        [
            null,
            null,
            [
                ['monitoringPeriod', 'value'],
                ['scope', 'lifespanYears'],
            ],
        ],
        [undefined, 1, [['monitoringPeriod', 'value']]],
        [1, NaN, [['scope', 'lifespanYears']]],
    ]) {
        data.monitoringPeriod.value = period;
        data.scope.lifespanYears = lifespan;
        const computation = results.datacenterOperationalResults;
        assert.equal(computation.success, 'failure');
        assert.equal(computation.result, null);
        assert.deepEqual(computation.ignoredInputs, []);
        assert.equal(computation.inputErrors.length, 1);
        assert.ok(computation.inputErrors[0] instanceof z.ZodError);
        assert.deepEqual(
            computation.inputErrors[0].issues.map((issue) => issue.path),
            paths,
        );
        assert.equal(results.totalOperationalEmissionsKg.result, null);
        assert.equal(results.operationalCalculationCoverage.validDatacenterCount, 0);
    }

    data.datacenters = [];
    assert.equal(results.datacenterOperationalResults.success, 'failure');
    data.monitoringPeriod.value = 1;
    data.scope.lifespanYears = 1;
    data.monitoringPeriod.unit = 'invalid';
    assert.deepEqual(
        results.datacenterOperationalResults.inputErrors[0].issues.map((issue) => issue.path),
        [['monitoringPeriod', 'unit']],
    );
    data.monitoringPeriod.unit = 'year';
    assert.deepEqual(
        { ...results.datacenterOperationalResults },
        {
            success: 'success',
            result: [],
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    assert.deepEqual(
        { ...results.totalOperationalEmissionsKg },
        {
            success: 'success',
            result: 0,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    assert.equal(results.totalLifespanEmissionsKg.result, null);
});

test('operational collection preserves valid rows, ignored datacenter identity, and energy paths', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    data.monitoringPeriod.value = 1;
    data.monitoringPeriod.unit = 'year';
    data.scope.lifespanYears = 2;
    data.datacenters = [
        DatacenterDraftSchema.parse({
            id: 'missing',
            generalInfo: { name: 'Missing energy', abbreviation: 'M' },
        }),
        DatacenterDraftSchema.parse({
            id: 'zero',
            generalInfo: { name: 'Zero', abbreviation: 'Z' },
            energy: { carbonIntensity: 500, energyConsumption: 0 },
        }),
        DatacenterDraftSchema.parse({
            id: 'bad-pue',
            generalInfo: { name: 'Bad PUE', abbreviation: 'P' },
            energy: { carbonIntensity: 500, energyConsumption: 100 },
        }),
        DatacenterDraftSchema.parse({
            id: 'ready',
            generalInfo: { name: 'Ready', abbreviation: 'R' },
            energy: { carbonIntensity: 500, energyConsumption: 100, pue: 1.5 },
        }),
    ];
    const [missing, zero, badPue, ready] = data.datacenters;
    badPue.energy.pue = -1;
    const before = JSON.stringify(data.$state);
    const partial = results.datacenterOperationalResults;
    assert.equal(partial.success, 'partial');
    assert.deepEqual(partial.result, [
        {
            datacenter: DatacenterSchema.parse(zero),
            pueInclusion: { status: 'omitted' },
            co2Period: 0,
            co2Lifespan: 0,
        },
        {
            datacenter: DatacenterSchema.parse(ready),
            pueInclusion: { status: 'included', value: 1.5 },
            co2Period: 75,
            co2Lifespan: 150,
        },
    ]);
    assert.notEqual(partial.result[0].datacenter, zero);
    assert.notEqual(partial.result[1].datacenter, ready);
    assert.equal(partial.ignoredInputs[0], missing);
    assert.equal(partial.ignoredInputs[1], badPue);
    assert.equal(partial.inputErrors.length, 2);
    assert.ok(partial.inputErrors.every((error) => error instanceof z.ZodError));
    assert.deepEqual(
        partial.inputErrors.map((error) => error.issues.map((issue) => issue.path)),
        [
            [
                ['energy', 'carbonIntensity'],
                ['energy', 'energyConsumption'],
            ],
            [['energy', 'pue']],
        ],
    );
    assert.equal(results.totalOperationalEmissionsKg.result, 150);
    assert.equal(results.totalOperationalEmissionsKg.success, 'partial');
    assert.equal(results.totalOperationalEmissionsKg.inputErrors, partial.inputErrors);
    assert.equal(results.totalOperationalEmissionsKg.ignoredInputs, partial.ignoredInputs);
    assert.deepEqual(results.operationalCalculationCoverage, {
        validDatacenterCount: 2,
        totalDatacenterCount: 4,
        isComplete: false,
    });
    assert.equal(JSON.stringify(data.$state), before);

    missing.energy.carbonIntensity = 1000;
    missing.energy.energyConsumption = 10;
    badPue.energy.pue = null;
    assert.equal(results.datacenterOperationalResults.success, 'success');
    assert.deepEqual(results.datacenterOperationalResults.inputErrors, []);
    assert.deepEqual(results.datacenterOperationalResults.ignoredInputs, []);
    assert.deepEqual(
        results.datacenterOperationalResults.result.map((row) => row.datacenter.id),
        ['missing', 'zero', 'bad-pue', 'ready'],
    );
    assert.equal(results.totalOperationalEmissionsKg.result, 270);
    assert.equal(results.operationalCalculationCoverage.validDatacenterCount, 4);
    assert.equal(results.operationalCalculationCoverage.isComplete, false);

    data.datacenters = ['replacement-a', 'replacement-b'].map((id) =>
        DatacenterDraftSchema.parse({ id }),
    );
    assert.equal(results.datacenterOperationalResults.success, 'failure');
    assert.equal(results.datacenterOperationalResults.result, null);
    assert.equal(results.datacenterOperationalResults.inputErrors.length, 2);
    assert.equal(results.datacenterOperationalResults.ignoredInputs.length, 2);
    assert.equal(results.datacenterOperationalResults.ignoredInputs[0], data.datacenters[0]);
    assert.equal(results.datacenterOperationalResults.ignoredInputs[1], data.datacenters[1]);
    assert.equal(results.totalOperationalEmissionsKg.result, null);
});

test('scope completion ignores energy; energy progress follows entry, not datacenter creation', () => {
    const store = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(store);
    store.monitoringPeriod.value = null;
    assert.equal(store.isScopeValid, true);
    assert.equal(store.energyConsumptionStatus, 'not_started');
    assert.equal(results.totalOperationalEmissionsKg.result, null);
    assert.equal(results.totalLifespanEmissionsKg.result, null);
    assert.equal(store.resultsStatus, 'partial');
    store.datacenters[0].energy.energyConsumption = 0;
    assert.equal(store.energyConsumptionStatus, 'partial');
    assert.equal(results.totalOperationalEmissionsKg.result, null);
    store.datacenters[0].energy.carbonIntensity = -1;
    assert.equal(store.isScopeValid, true);
    assert.equal(store.saveToStorage(), false);
    store.clearDatacenterEnergy('dc1');
    assert.equal(store.energyConsumptionStatus, 'not_started');
    store.datacenters[0].energy.pue = '';
    assert.equal(store.energyConsumptionStatus, 'not_started');
    store.monitoringPeriod.value = 2;
    assert.equal(store.energyConsumptionStatus, 'partial');
    store.monitoringPeriod.value = null;
    store.monitoringPeriod.comment = 'Measured';
    assert.equal(store.energyConsumptionStatus, 'partial');
    store.monitoringPeriod.comment = '';
    assert.equal(store.energyConsumptionStatus, 'not_started');
    store.datacenters[0].generalInfo.name = '';
    assert.equal(store.isScopeValid, false);
    store.datacenters = [];
    assert.equal(store.isScopeValid, false);
});

test('partial totals include only computable energy and react to direct nested edits', () => {
    const store = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(store);
    store.scope.functionalUnit.resourceType = 'CPU';
    store.monitoringPeriod.unit = 'year';
    store.hardware.push({
        ...validHardware(),
        cpuQuantity: 1,
        impactManufacturingDistributionEol: 50,
    });
    const a = store.datacenters[0];
    a.energy.carbonIntensity = 1000;
    a.energy.energyConsumption = 100;
    store.datacenters.push(
        DatacenterDraftSchema.parse({
            id: 'b',
            generalInfo: { name: 'B', abbreviation: 'B' },
        }),
    );
    assert.equal(results.datacenterOperationalResults.success, 'partial');
    assert.deepEqual(results.datacenterOperationalResults.result, [
        { datacenter: a, pueInclusion: { status: 'omitted' }, co2Period: 100, co2Lifespan: 100 },
    ]);
    assert.equal(results.datacenterOperationalResults.ignoredInputs[0], store.datacenters[1]);
    assert.deepEqual(results.operationalCalculationCoverage, {
        validDatacenterCount: 1,
        totalDatacenterCount: 2,
        isComplete: false,
    });
    assert.equal(results.totalOperationalEmissionsKg.result, 100);
    assert.equal(results.totalLifespanEmissionsKg.result, 150);
    assert.equal(results.lifespanEmissionsPerResourceKg.result, 150);
    assert.equal(results.emissionsPerFunctionalUnitKg.result, 150 / 8760);
    assert.equal(store.resultsStatus, 'partial');
    const b = store.datacenters[1];
    b.energy.carbonIntensity = 1000;
    b.energy.energyConsumption = 200;
    assert.equal(results.totalOperationalEmissionsKg.result, 300);
    assert.equal(results.totalLifespanEmissionsKg.result, 350);
    assert.equal(store.energyConsumptionStatus, 'complete');
    assert.equal(store.resultsStatus, 'complete');
    a.energy.pue = 2;
    assert.equal(results.totalOperationalEmissionsKg.result, 400);
    a.energy.pue = 0;
    assert.equal(results.totalOperationalEmissionsKg.result, 200);
    a.energy.pue = '';
    assert.equal(results.totalOperationalEmissionsKg.result, 300);
    store.clearDatacenterEnergy('dc1');
    assert.equal(results.totalOperationalEmissionsKg.result, 200);
    assert.equal(store.resultsStatus, 'partial');
    store.clearDatacenterEnergy('b');
    assert.equal(results.totalOperationalEmissionsKg.result, null);
    assert.equal(results.totalLifespanEmissionsKg.result, 50);
    assert.equal(store.resultsStatus, 'partial');
});

test('invalid shared inputs withhold energy estimates and real zero results remain computable', () => {
    const store = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(store);
    store.scope.functionalUnit.resourceType = 'CPU';
    store.hardware.push({ ...validHardware(), cpuQuantity: 1 });
    store.datacenters[0].energy.carbonIntensity = 100;
    store.datacenters[0].energy.energyConsumption = 0;
    assert.equal(results.totalOperationalEmissionsKg.result, 0);
    assert.equal(results.totalLifespanEmissionsKg.result, 0);
    assert.equal(results.emissionsPerFunctionalUnitKg.result, 0);
    assert.equal(results.lifespanEmissionsPerResourceKg.result, 0);
    assert.equal(store.resultsStatus, 'complete');
    store.monitoringPeriod.value = 0;
    assert.equal(results.totalOperationalEmissionsKg.result, null);
    assert.equal(results.datacenterOperationalResults.success, 'failure');
    assert.equal(results.datacenterOperationalResults.result, null);
    assert.equal(store.resultsStatus, 'partial');
    store.monitoringPeriod.value = 1;
    store.scope.lifespanYears = 0;
    assert.equal(results.datacenterOperationalResults.success, 'failure');
    assert.equal(results.datacenterOperationalResults.result, null);
    assert.equal(results.totalOperationalEmissionsKg.result, null);
    assert.equal(results.emissionsPerFunctionalUnitKg.result, null);
    store.scope.lifespanYears = 1;
    store.hardware[0].cpuQuantity = 0;
    assert.equal(results.emissionsPerFunctionalUnitKg.result, null);
    assert.equal(results.lifespanEmissionsPerResourceKg.result, null);
});

test('unfinished hardware edits retain partial emissions but withhold incomplete resource ratios', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.scope.functionalUnit.resourceType = 'CPU';
    data.hardware = ['valid', 'editing'].map((id) => ({
        ...validHardware(),
        id,
        cpuQuantity: 1,
        impactManufacturingDistributionEol: 50,
    }));

    data.hardware[1].quantity = undefined;
    assert.equal(results.totalEmbodiedEmissionsKg.success, 'partial');
    assert.equal(results.totalEmbodiedEmissionsKg.result, 50);
    assert.equal(results.totalLifespanEmissionsKg.success, 'partial');
    assert.equal(results.totalLifespanEmissionsKg.result, 50);
    assert.equal(results.emissionsPerFunctionalUnitKg.result, null);
    assert.equal(results.lifespanEmissionsPerResourceKg.result, null);

    data.hardware[1].quantity = 1;
    data.hardware[1].cpuQuantity = undefined;
    assert.equal(results.totalLifespanEmissionsKg.result, 100);
    assert.equal(results.selectedResourceFleetCount.success, 'partial');
    assert.equal(results.selectedResourceFleetCount.result, 1);
    assert.equal(results.emissionsPerFunctionalUnitKg.result, null);
    assert.equal(results.lifespanEmissionsPerResourceKg.result, null);

    data.hardware[1].cpuQuantity = 1;
    assert.equal(results.selectedResourceFleetCount.result, 2);
    assert.equal(results.lifespanEmissionsPerResourceKg.result, 50);
    assert.equal(results.emissionsPerFunctionalUnitKg.result, 100 / (8760 * 2));
});

test('cleared nested energy survives persistence and reset restores fresh assessment defaults', () => {
    const store = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(store);
    store.datacenters[0].energy.energyConsumption = 12;
    store.clearDatacenterEnergy('dc1');
    const json = store.exportJson();
    const state = JSON.parse(json);
    assert.equal('energy' in state, false);
    assert.equal('datacenters' in state.scope, false);
    assert.equal('datacenterId' in state.datacenters[0].energy, false);
    assert.equal(store.importJson(json), true);
    assert.equal(store.datacenters[0].energy.energyConsumption, null);
    assert.equal(store.datacenters.length, 1);
    const defaults = MitsiStateDraftSchema.parse({});
    for (let attempt = 0; attempt < 2; attempt++) {
        store.scope.organizationName = 'Edited';
        store.scope.functionalUnit.resourceCount = 3;
        store.addBoundaryItem('included');
        store.addBoundaryItem('excluded');
        store.addHardwareItem();
        store.addDatacenter();
        store.monitoringPeriod.value = 7;
        store.includeSecondHandEmbodied = true;
        store.includeUnderlyingServices = true;
        store.underlyingServices.push(UnderlyingServiceDraftSchema.parse({ co2EstimateKg: 12 }));
        assert.equal(store.energyConsumptionStatus, 'partial');
        assert.equal(store.saveToStorage(), true);
        store.exportJson();
        assert.ok(store.savedAt);
        assert.ok(store.exportedAt);
        assert.equal(stored.has(MITSI_STORAGE_KEY), true);

        const previousScope = store.scope;
        const previousPeriod = store.monitoringPeriod;
        store.reset();
        for (const [key, value] of Object.entries(defaults)) {
            if (key !== 'schemaVersion') assert.deepEqual(store[key], value, key);
        }
        assert.notEqual(store.scope, previousScope);
        assert.notEqual(store.scope.functionalUnit, previousScope.functionalUnit);
        assert.notEqual(store.scope.includedItems, previousScope.includedItems);
        assert.notEqual(store.monitoringPeriod, previousPeriod);
        assert.equal(store.savedAt, null);
        assert.equal(store.exportedAt, null);
        assert.equal(stored.has(MITSI_STORAGE_KEY), false);
        assert.equal(results.totalOperationalEmissionsKg.result, null);
        assert.equal(results.totalLifespanEmissionsKg.result, null);
        assert.equal(store.energyConsumptionStatus, 'not_started');
    }
});

test('inventory totals and groups react to settings, edits, and replacement', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    data.scope.functionalUnit.resourceType = 'CPU';
    data.hardware = [
        { ...validHardware(), quantity: 2, cpuQuantity: 4, impactManufacturingDistributionEol: 10 },
        {
            ...validHardware(),
            id: 'reused',
            category: 'storage_bay',
            quantity: 3,
            cpuQuantity: 2,
            impactManufacturingDistributionEol: 20,
            isSecondHand: true,
        },
    ];
    assert.equal(results.hardwareRowCount, 2);
    assert.deepEqual(
        { ...results.hardwareItemCount },
        {
            success: 'success',
            result: 5,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    assert.equal(results.totalEmbodiedEmissionsKg.result, 20);
    assert.equal(results.selectedResourceFleetCount.result, 8);
    assert.equal(results.excludedSecondHandRowCount, 1);
    const reusedGroup = results.embodiedEmissionsByCategory.find(
        (group) => group.category === 'storage_bay',
    );
    assert.equal(reusedGroup.totalEmbodiedEmissionsKg.result, 0);
    assert.equal(reusedGroup.rows[0].excluded, true);
    assert.equal(results.hardwareRowEmbodiedEmissionsKg(data.hardware[1]).result, 60);

    data.includeSecondHandEmbodied = true;
    assert.equal(results.totalEmbodiedEmissionsKg.result, 80);
    assert.equal(results.selectedResourceFleetCount.result, 14);
    assert.equal(results.excludedSecondHandRowCount, 0);
    data.hardware[1].quantity = 4;
    assert.equal(results.totalEmbodiedEmissionsKg.result, 100);
    assert.equal(results.hardwareItemCount.success, 'success');
    assert.equal(results.hardwareItemCount.result, 6);
    assert.equal(
        results.embodiedEmissionsByCategory.find((group) => group.category === 'storage_bay')
            .totalEmbodiedEmissionsKg.result,
        80,
    );

    data.underlyingServices = [UnderlyingServiceDraftSchema.parse({ co2EstimateKg: 30 })];
    assert.equal(results.totalUnderlyingEmissionsKg.result, 0);
    data.includeUnderlyingServices = true;
    assert.equal(results.totalUnderlyingEmissionsKg.result, 30);
    assert.equal(results.totalLifespanEmissionsKg.result, 130);
    data.underlyingServices[0].co2EstimateKg = 40;
    assert.equal(results.totalLifespanEmissionsKg.result, 140);

    data.hardware = [];
    assert.equal(results.hardwareRowCount, 0);
    assert.deepEqual(
        { ...results.hardwareItemCount },
        {
            success: 'success',
            result: 0,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    assert.equal(results.totalEmbodiedEmissionsKg.result, 0);
    assert.deepEqual(results.embodiedEmissionsByCategory, []);
    assert.equal(results.totalLifespanEmissionsKg.result, 40);
    data.includeUnderlyingServices = false;
    assert.equal(results.totalLifespanEmissionsKg.result, null);
});

test('element counts distinguish complete, partial, failed, and empty inventories', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();

    for (const [quantities, success, result, ignoredCount] of [
        [[], 'success', 0, 0],
        [[2, 3], 'success', 5, 0],
        [[2, null, 3], 'partial', 5, 1],
        [[null, 0], 'failure', null, 2],
    ]) {
        data.hardware = quantities.map((quantity, index) => ({
            ...validHardware(),
            id: `row-${index}`,
            quantity,
        }));

        const count = results.hardwareItemCount;
        assert.equal(count.success, success);
        assert.equal(count.result, result);
        assert.equal(count.ignoredInputs.length, ignoredCount);
        assert.equal(count.inputErrors.length, ignoredCount);

        const ignoredRows = data.hardware.filter(
            (row) => row.quantity === null || row.quantity === 0,
        );
        ignoredRows.forEach((row, index) => {
            assert.equal(count.ignoredInputs[index], row);
            assert.ok(count.inputErrors[index] instanceof z.ZodError);
            assert.deepEqual(
                count.inputErrors[index].issues.map((issue) => issue.path),
                [['quantity']],
            );
        });
    }
});

test('quantities validate only their required field and retain Zod diagnostics', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    data.hardware = [
        {
            ...validHardware(),
            quantity: 2,
            name: '',
            datacenterId: '',
            impactManufacturingDistributionEol: null,
            cpuQuantity: null,
        },
    ];
    const row = data.hardware[0];
    assert.deepEqual(
        { ...results.hardwareItemCount },
        {
            success: 'success',
            result: 2,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    assert.equal(results.embodiedEmissionsByCategory[0].rows[0].quantity, 2);

    for (const invalid of [null, undefined, '', NaN, Infinity, -Infinity, 0, -1, 0.5, '12']) {
        row.quantity = invalid;
        const count = results.hardwareItemCount;
        assert.equal(count.success, 'failure');
        assert.equal(count.result, null);
        assert.equal(count.ignoredInputs.length, 1);
        assert.equal(count.ignoredInputs[0], row);
        assert.equal(count.inputErrors.length, 1);
        assert.ok(count.inputErrors[0] instanceof z.ZodError);
        assert.ok(
            count.inputErrors[0].issues.every((issue) => issue.path.join('.') === 'quantity'),
        );
        assert.equal(results.embodiedEmissionsByCategory[0].rows[0].quantity, null);
        assert.ok(Object.is(row.quantity, invalid));
    }
});

test('element count status and ignored rows react to edits, removal, and replacement', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    data.hardware = [
        { ...validHardware(), quantity: 2 },
        { ...validHardware(), id: 'editing', quantity: null },
    ];
    assert.equal(results.hardwareItemCount.success, 'partial');
    assert.equal(results.hardwareItemCount.result, 2);
    assert.equal(results.hardwareItemCount.ignoredInputs[0], data.hardware[1]);

    data.hardware[1].quantity = 3;
    assert.deepEqual(
        { ...results.hardwareItemCount },
        {
            success: 'success',
            result: 5,
            inputErrors: [],
            ignoredInputs: [],
        },
    );

    data.hardware[0].quantity = 0;
    assert.equal(results.hardwareItemCount.success, 'partial');
    assert.equal(results.hardwareItemCount.result, 3);
    assert.equal(results.hardwareItemCount.ignoredInputs[0], data.hardware[0]);

    data.hardware[1].quantity = null;
    assert.equal(results.hardwareItemCount.success, 'failure');
    assert.equal(results.hardwareItemCount.result, null);
    assert.equal(results.hardwareItemCount.ignoredInputs.length, 2);

    data.hardware.splice(0, 1);
    assert.equal(results.hardwareItemCount.ignoredInputs.length, 1);
    assert.equal(results.hardwareItemCount.ignoredInputs[0], data.hardware[0]);

    data.hardware = [{ ...validHardware(), id: 'replacement', quantity: 6 }];
    assert.deepEqual(
        { ...results.hardwareItemCount },
        {
            success: 'success',
            result: 6,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    data.hardware = [];
    assert.deepEqual(
        { ...results.hardwareItemCount },
        {
            success: 'success',
            result: 0,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
});

test('existing results follow imported, loaded, and reset data without stale references', () => {
    const results = useSurveyResultsStore();
    const data = useSurveyDataStore();
    assert.equal(results.totalLifespanEmissionsKg.result, null);
    const assessment = MitsiStateDraftSchema.parse({});
    setupScope(assessment);
    assessment.scope.functionalUnit.resourceType = 'CPU';
    assessment.monitoringPeriod.unit = 'year';
    assessment.hardware = [
        { ...validHardware(), cpuQuantity: 2, impactManufacturingDistributionEol: 50 },
    ];
    assessment.datacenters[0].energy = DatacenterEnergyDraftSchema.parse({
        carbonIntensity: 1000,
        energyConsumption: 100,
    });
    assert.equal(data.importJson(JSON.stringify(assessment)), true);
    assert.equal(data.resultsStatus, 'complete');
    assert.equal(results.totalLifespanEmissionsKg.result, 150);
    assert.equal(results.lifespanEmissionsPerResourceKg.result, 75);
    const oldDatacenter = data.datacenters[0];
    const oldHardware = data.hardware[0];

    assessment.scope.lifespanYears = 2;
    assessment.hardware[0].quantity = 2;
    stored.set(MITSI_STORAGE_KEY, JSON.stringify({ assessment, savedAt: 123 }));
    data.loadFromStorage();
    assert.equal(results.totalEmbodiedEmissionsKg.result, 100);
    assert.equal(results.totalOperationalEmissionsKg.result, 200);
    assert.equal(results.totalLifespanEmissionsKg.result, 300);
    assert.equal(results.selectedResourceFleetCount.result, 4);
    const validatedDatacenter = results.datacenterOperationalResults.result[0].datacenter;
    assert.notEqual(validatedDatacenter, data.datacenters[0]);
    assert.deepEqual(validatedDatacenter, DatacenterSchema.parse(data.datacenters[0]));
    oldDatacenter.energy.energyConsumption = 999;
    oldHardware.quantity = 999;
    assert.equal(results.totalLifespanEmissionsKg.result, 300);

    data.reset();
    assert.equal(results.totalLifespanEmissionsKg.result, null);
    assert.equal(results.totalOperationalEmissionsKg.result, null);
    assert.equal(results.datacenterOperationalResults.success, 'failure');
    assert.equal(results.datacenterOperationalResults.result, null);
    assert.deepEqual(results.operationalCalculationCoverage, {
        validDatacenterCount: 0,
        totalDatacenterCount: 0,
        isComplete: false,
    });
    assert.equal(data.resultsStatus, 'not_started');
});

test('reading calculations never persists or normalizes the editable inputs in place', () => {
    const data = useSurveyDataStore();
    setupScope(data);
    data.monitoringPeriod.unit = 'year';
    data.datacenters[0].energy = DatacenterEnergyDraftSchema.parse({
        carbonIntensity: 1000,
        energyConsumption: 100,
    });
    data.datacenters[0].energy.pue = '';
    const before = JSON.stringify(data.$state);
    const results = useSurveyResultsStore();
    assert.equal(results.totalOperationalEmissionsKg.result, 100);
    assert.equal(results.totalLifespanEmissionsKg.result, 100);
    assert.equal(results.operationalCalculationCoverage.isComplete, true);
    assert.equal(results.emissionsPerFunctionalUnitKg.result, null);
    assert.deepEqual(results.embodiedEmissionsByCategory, []);
    assert.equal(JSON.stringify(data.$state), before);
    assert.equal(LocalStorage.set.mock.callCount(), 0);
    assert.equal(LocalStorage.getItem.mock.callCount(), 0);
    assert.equal(LocalStorage.remove.mock.callCount(), 0);
});

test('operational totals combine local energy with monitoring units and lifespan', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.scope.lifespanYears = 2;
    data.datacenters[0].energy = DatacenterEnergyDraftSchema.parse({
        energyConsumption: 3000,
        carbonIntensity: 400,
        pue: 1.5,
    });
    data.monitoringPeriod.value = 30;
    assert.equal(results.datacenterOperationalResults.result[0].co2Period, 1800);
    assert.ok(Math.abs(results.totalOperationalEmissionsKg.result - 43800) < 1e-8);
    for (const [unit, value] of [
        ['day', 365],
        ['week', 52],
        ['month', 12],
        ['year', 1],
    ]) {
        data.monitoringPeriod.unit = unit;
        data.monitoringPeriod.value = value;
        assert.equal(results.datacenterOperationalResults.result[0].co2Period, 1800);
        assert.equal(results.totalOperationalEmissionsKg.result, 3600);
    }
});

test('category totals distinguish partial, failed, and excluded groups using original hardware inputs', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    data.hardware = [
        { ...validHardware(), quantity: 2, impactManufacturingDistributionEol: 10 },
        { ...validHardware(), id: 'editing', impactManufacturingDistributionEol: null },
        { ...validHardware(), id: 'storage', category: 'storage_bay', quantity: null },
        {
            ...validHardware(),
            id: 'excluded',
            category: 'network_device',
            isSecondHand: true,
            quantity: null,
        },
    ];
    const groups = Object.fromEntries(
        results.embodiedEmissionsByCategory.map((group) => [group.category, group]),
    );
    assert.equal(groups.server.totalEmbodiedEmissionsKg.success, 'partial');
    assert.equal(groups.server.totalEmbodiedEmissionsKg.result, 20);
    assert.equal(groups.server.totalEmbodiedEmissionsKg.ignoredInputs[0], data.hardware[1]);
    assert.deepEqual(
        groups.server.totalEmbodiedEmissionsKg.inputErrors[0].issues.map((issue) => issue.path),
        [['impactManufacturingDistributionEol']],
    );
    assert.equal(groups.storage_bay.totalEmbodiedEmissionsKg.success, 'failure');
    assert.equal(groups.storage_bay.totalEmbodiedEmissionsKg.result, null);
    assert.equal(groups.storage_bay.totalEmbodiedEmissionsKg.ignoredInputs[0], data.hardware[2]);
    assert.deepEqual(
        { ...groups.network_device.totalEmbodiedEmissionsKg },
        {
            success: 'success',
            result: 0,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    assert.equal(groups.server.rows.length, 2);
    assert.equal(groups.server.rows[1].rowEmbodiedEmissionsKg, null);
    assert.equal(results.totalEmbodiedEmissionsKg.result, 20);

    data.hardware[1].impactManufacturingDistributionEol = 20;
    data.hardware[2].quantity = 1;
    const repaired = results.embodiedEmissionsByCategory.find(
        (group) => group.category === 'server',
    );
    assert.deepEqual(
        { ...repaired.totalEmbodiedEmissionsKg },
        {
            success: 'success',
            result: 40,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    assert.equal(results.totalEmbodiedEmissionsKg.success, 'success');
    data.includeSecondHandEmbodied = true;
    const included = results.embodiedEmissionsByCategory.find(
        (group) => group.category === 'network_device',
    );
    assert.equal(included.totalEmbodiedEmissionsKg.success, 'failure');
    assert.equal(included.totalEmbodiedEmissionsKg.ignoredInputs[0], data.hardware[3]);
    assert.equal(results.totalEmbodiedEmissionsKg.success, 'partial');
    data.hardware = [];
    assert.deepEqual(results.embodiedEmissionsByCategory, []);
});

test('resource sums report selected CPU or GPU measurements and preserve exclusions', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    for (const [resourceType, field, otherField, expected] of [
        [' CPU ', 'cpuQuantity', 'gpuQuantity', 6],
        ['GPU', 'gpuQuantity', 'cpuQuantity', 8],
        ['other', 'gpuQuantity', 'cpuQuantity', 8],
    ]) {
        data.scope.functionalUnit.resourceType = resourceType;
        data.includeSecondHandEmbodied = false;
        data.hardware = [
            { ...validHardware(), quantity: 2, cpuQuantity: 3, gpuQuantity: 4 },
            { ...validHardware(), id: 'editing', [field]: null },
            { ...validHardware(), id: 'excluded', isSecondHand: true, quantity: null },
        ];
        const [valid, editing, excluded] = data.hardware;
        const partial = results.selectedResourceFleetCount;
        assert.equal(partial.success, 'partial');
        assert.equal(partial.result, expected);
        assert.equal(partial.ignoredInputs.length, 1);
        assert.equal(partial.ignoredInputs[0], editing);
        assert.equal(partial.inputErrors.length, 1);
        assert.ok(partial.inputErrors[0] instanceof z.ZodError);
        assert.deepEqual(
            partial.inputErrors[0].issues.map((issue) => issue.path),
            [[field]],
        );
        assert.equal(results.lifespanEmissionsPerResourceKg.result, null);
        assert.equal(results.emissionsPerFunctionalUnitKg.result, null);

        valid.quantity = null;
        assert.equal(results.selectedResourceFleetCount.success, 'failure');
        assert.equal(results.selectedResourceFleetCount.result, null);
        assert.deepEqual(results.selectedResourceFleetCount.ignoredInputs, [valid, editing]);
        assert.deepEqual(
            results.selectedResourceFleetCount.inputErrors.map((error) =>
                error.issues.map((issue) => issue.path),
            ),
            [[['quantity']], [[field]]],
        );

        valid.quantity = 1;
        valid[field] = 0;
        valid[otherField] = -1;
        assert.equal(results.selectedResourceFleetCount.success, 'partial');
        assert.equal(results.selectedResourceFleetCount.result, 0);
        editing[field] = 2;
        assert.deepEqual(
            { ...results.selectedResourceFleetCount },
            {
                success: 'success',
                result: 2,
                inputErrors: [],
                ignoredInputs: [],
            },
        );

        data.includeSecondHandEmbodied = true;
        assert.equal(results.selectedResourceFleetCount.success, 'partial');
        assert.equal(results.selectedResourceFleetCount.result, 2);
        assert.equal(results.selectedResourceFleetCount.ignoredInputs[0], excluded);
        data.hardware = [];
        assert.deepEqual(
            { ...results.selectedResourceFleetCount },
            {
                success: 'success',
                result: 0,
                inputErrors: [],
                ignoredInputs: [],
            },
        );
    }
});

test('resource selection and functional-unit scaling are composed from current assessment inputs', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.scope.lifespanYears = 2;
    data.scope.functionalUnit = {
        resourceType: ' CPU ',
        timeUnit: 'hour',
        usageDuration: 2,
        resourceCount: 2,
    };
    data.hardware = [
        {
            ...validHardware(),
            quantity: 44,
            cpuQuantity: 4,
            gpuQuantity: 8,
            impactManufacturingDistributionEol: 17520,
        },
    ];
    assert.equal(results.totalEmbodiedEmissionsKg.result, 770880);
    assert.equal(results.selectedResourceFleetCount.result, 176);
    assert.equal(results.emissionsPerFunctionalUnitKg.result, 1);
    data.scope.functionalUnit.timeUnit = 'minute';
    data.scope.functionalUnit.usageDuration = 120;
    assert.equal(results.emissionsPerFunctionalUnitKg.result, 1);
    data.scope.lifespanYears = 4;
    assert.equal(results.emissionsPerFunctionalUnitKg.result, 0.5);
    data.scope.lifespanYears = 2;
    for (const resourceType of ['GPU', 'other']) {
        data.scope.functionalUnit.resourceType = resourceType;
        assert.equal(results.selectedResourceFleetCount.result, 352);
        assert.equal(results.emissionsPerFunctionalUnitKg.result, 0.5);
    }
    data.hardware[0].impactManufacturingDistributionEol = 0;
    assert.equal(results.emissionsPerFunctionalUnitKg.result, 0);
    data.hardware = [];
    assert.equal(results.selectedResourceFleetCount.result, 0);
    assert.equal(results.emissionsPerFunctionalUnitKg.result, null);
});

test('combined emissions distinguish absent measurements, measured zeros and partial sources', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    assert.deepEqual(
        { ...results.totalLifespanEmissionsKg },
        {
            success: 'failure',
            result: null,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    setupScope(data);
    data.monitoringPeriod.unit = 'year';
    data.datacenters = [];
    data.hardware = [validHardware()];
    data.includeUnderlyingServices = true;
    assert.deepEqual(
        { ...results.totalLifespanEmissionsKg },
        {
            success: 'success',
            result: 0,
            inputErrors: [],
            ignoredInputs: [],
        },
    );

    data.datacenters = [DatacenterDraftSchema.parse({ id: 'editing-dc' })];
    data.underlyingServices = [UnderlyingServiceDraftSchema.parse({ id: 'editing-service' })];
    const [dc] = data.datacenters;
    const [service] = data.underlyingServices;
    assert.equal(results.totalLifespanEmissionsKg.success, 'partial');
    assert.equal(results.totalLifespanEmissionsKg.result, 0);
    assert.deepEqual(results.totalLifespanEmissionsKg.ignoredInputs, [dc, service]);
    assert.equal(results.totalLifespanEmissionsKg.ignoredInputs[0], dc);
    assert.equal(results.totalLifespanEmissionsKg.ignoredInputs[1], service);
    assert.deepEqual(results.totalLifespanEmissionsKg.inputErrors, [
        ...results.totalOperationalEmissionsKg.inputErrors,
        ...results.totalUnderlyingEmissionsKg.inputErrors,
    ]);

    data.hardware[0].impactManufacturingDistributionEol = null;
    assert.equal(results.totalLifespanEmissionsKg.success, 'failure');
    assert.equal(results.totalLifespanEmissionsKg.result, null);
    assert.deepEqual(results.totalLifespanEmissionsKg.ignoredInputs, [
        data.hardware[0],
        dc,
        service,
    ]);
    assert.equal(results.totalLifespanEmissionsKg.inputErrors.length, 3);

    service.co2EstimateKg = 12;
    assert.equal(results.totalLifespanEmissionsKg.success, 'partial');
    assert.equal(results.totalLifespanEmissionsKg.result, 12);
    assert.deepEqual(results.totalLifespanEmissionsKg.ignoredInputs, [data.hardware[0], dc]);
    data.hardware[0].impactManufacturingDistributionEol = 8;
    dc.energy = DatacenterEnergyDraftSchema.parse({ energyConsumption: 10, carbonIntensity: 1000 });
    assert.equal(results.totalLifespanEmissionsKg.success, 'partial');
    assert.equal(results.totalLifespanEmissionsKg.result, 20);
    assert.deepEqual(
        results.totalLifespanEmissionsKg.inputErrors[0].issues.map((issue) => issue.path),
        [
            ['generalInfo', 'abbreviation'],
            ['generalInfo', 'name'],
        ],
    );
    dc.generalInfo.abbreviation = 'DC';
    dc.generalInfo.name = 'Datacenter';
    assert.deepEqual(
        { ...results.totalLifespanEmissionsKg },
        {
            success: 'success',
            result: 30,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    data.includeUnderlyingServices = false;
    service.co2EstimateKg = null;
    assert.equal(results.totalLifespanEmissionsKg.success, 'success');
    assert.equal(results.totalLifespanEmissionsKg.result, 18);
});

test('combined diagnostics preserve shared operational errors without inventing ignored rows', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.hardware = [{ ...validHardware(), impactManufacturingDistributionEol: 20 }];
    data.monitoringPeriod.value = null;
    data.includeUnderlyingServices = true;
    data.underlyingServices = [UnderlyingServiceDraftSchema.parse({})];
    const total = results.totalLifespanEmissionsKg;
    assert.equal(total.success, 'partial');
    assert.equal(total.result, 20);
    assert.deepEqual(
        total.inputErrors.map((error) => error.issues.map((issue) => issue.path)),
        [[['monitoringPeriod', 'value']], [['co2EstimateKg']]],
    );
    assert.deepEqual(total.ignoredInputs, [data.underlyingServices[0]]);
    data.datacenters = [];
    data.underlyingServices = [];
    assert.deepEqual(
        { ...results.totalLifespanEmissionsKg },
        {
            success: 'success',
            result: 20,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
});

test('ratios carry partial numerator diagnostics but require a complete positive resource count', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.datacenters = [];
    data.scope.functionalUnit.resourceType = 'CPU';
    data.scope.functionalUnit.timeUnit = 'year';
    data.hardware = [
        { ...validHardware(), cpuQuantity: 2, impactManufacturingDistributionEol: 10 },
        {
            ...validHardware(),
            id: 'editing',
            cpuQuantity: 3,
            impactManufacturingDistributionEol: null,
        },
    ];
    const editing = data.hardware[1];
    for (const ratio of [
        results.lifespanEmissionsPerResourceKg,
        results.emissionsPerFunctionalUnitKg,
    ]) {
        assert.equal(ratio.success, 'partial');
        assert.equal(ratio.result, 2);
        assert.deepEqual(ratio.inputErrors, results.totalLifespanEmissionsKg.inputErrors);
        assert.deepEqual(ratio.ignoredInputs, [editing]);
        assert.equal(ratio.ignoredInputs[0], editing);
    }
    editing.cpuQuantity = null;
    assert.equal(results.selectedResourceFleetCount.result, 2);
    for (const ratio of [
        results.lifespanEmissionsPerResourceKg,
        results.emissionsPerFunctionalUnitKg,
    ]) {
        assert.equal(ratio.success, 'failure');
        assert.equal(ratio.result, null);
        assert.deepEqual(
            ratio.inputErrors.map((error) => error.issues[0].path),
            [['impactManufacturingDistributionEol'], ['cpuQuantity']],
        );
        assert.deepEqual(ratio.ignoredInputs, [editing, editing]);
    }
    data.hardware = [{ ...validHardware(), cpuQuantity: 0 }];
    assert.equal(results.totalLifespanEmissionsKg.result, 0);
    for (const ratio of [
        results.lifespanEmissionsPerResourceKg,
        results.emissionsPerFunctionalUnitKg,
    ]) {
        assert.equal(ratio.success, 'failure');
        assert.equal(ratio.result, null);
        assert.deepEqual(ratio.ignoredInputs, []);
        assert.ok(ratio.inputErrors[0] instanceof z.ZodError);
        assert.deepEqual(ratio.inputErrors[0].issues[0].path, ['resourcesInService']);
    }
    data.hardware[0].cpuQuantity = 1;
    for (const ratio of [
        results.lifespanEmissionsPerResourceKg,
        results.emissionsPerFunctionalUnitKg,
    ]) {
        assert.deepEqual(
            { ...ratio },
            {
                success: 'success',
                result: 0,
                inputErrors: [],
                ignoredInputs: [],
            },
        );
    }
    data.hardware[0].impactManufacturingDistributionEol = null;
    assert.equal(results.lifespanEmissionsPerResourceKg.success, 'failure');
    assert.equal(results.emissionsPerFunctionalUnitKg.success, 'failure');
});

test('functional-unit validation retains scope paths and ignores unfinished descriptive fields', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.datacenters = [];
    data.scope.functionalUnit.resourceType = 'CPU';
    data.hardware = [
        { ...validHardware(), cpuQuantity: 2, impactManufacturingDistributionEol: 40 },
    ];
    data.scope.organizationName = '';
    data.scope.assessors = '';
    assert.equal(results.emissionsPerFunctionalUnitKg.success, 'success');
    assert.equal(results.emissionsPerFunctionalUnitKg.result, 40 / (8760 * 2));

    for (const [field, invalid] of [
        ['usageDuration', 0],
        ['resourceCount', null],
        ['timeUnit', 'invalid'],
    ]) {
        const original = data.scope.functionalUnit[field];
        data.scope.functionalUnit[field] = invalid;
        assert.equal(results.emissionsPerFunctionalUnitKg.success, 'failure');
        assert.equal(results.emissionsPerFunctionalUnitKg.result, null);
        assert.ok(
            results.emissionsPerFunctionalUnitKg.inputErrors.some((error) =>
                error.issues.some(
                    (issue) =>
                        JSON.stringify(issue.path) ===
                        JSON.stringify(['scope', 'functionalUnit', field]),
                ),
            ),
        );
        assert.equal(data.scope.functionalUnit[field], invalid);
        data.scope.functionalUnit[field] = original;
    }
    data.scope.functionalUnit.usageDuration = null;
    data.scope.lifespanYears = null;
    assert.deepEqual(
        results.emissionsPerFunctionalUnitKg.inputErrors[0].issues.map((issue) => issue.path),
        [
            ['scope', 'functionalUnit', 'usageDuration'],
            ['scope', 'lifespanYears'],
        ],
    );
    assert.equal(results.lifespanEmissionsPerResourceKg.success, 'success');
    assert.equal(results.lifespanEmissionsPerResourceKg.result, 20);
    data.scope.functionalUnit.usageDuration = 2;
    data.scope.lifespanYears = 2;
    assert.equal(results.emissionsPerFunctionalUnitKg.success, 'success');
    assert.equal(results.emissionsPerFunctionalUnitKg.result, 40 / (8760 * 2));
});

test('missing and invalid hardware inputs withhold aggregates without hiding valid zeros', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.scope.functionalUnit.resourceType = 'CPU';
    data.hardware = [
        { ...validHardware(), cpuQuantity: 1, impactManufacturingDistributionEol: 50 },
        { ...validHardware(), id: 'editing', cpuQuantity: 1 },
    ];
    const editing = data.hardware[1];
    assert.equal(results.totalEmbodiedEmissionsKg.result, 50);
    for (const missing of [null, undefined, '', NaN, Infinity, -1, '12']) {
        editing.impactManufacturingDistributionEol = missing;
        assert.equal(results.hardwareRowEmbodiedEmissionsKg(editing).result, null);
        assert.equal(results.totalEmbodiedEmissionsKg.success, 'partial');
        assert.equal(results.totalEmbodiedEmissionsKg.result, 50);
        assert.equal(
            results.embodiedEmissionsByCategory[0].totalEmbodiedEmissionsKg.success,
            'partial',
        );
        assert.equal(results.embodiedEmissionsByCategory[0].totalEmbodiedEmissionsKg.result, 50);
        assert.equal(results.totalLifespanEmissionsKg.success, 'partial');
        assert.equal(results.totalLifespanEmissionsKg.result, 50);
        assert.equal(results.lifespanEmissionsPerResourceKg.success, 'partial');
        assert.equal(results.lifespanEmissionsPerResourceKg.result, 25);
        assert.equal(results.emissionsPerFunctionalUnitKg.success, 'partial');
        assert.equal(results.emissionsPerFunctionalUnitKg.result, 50 / (8760 * 2));
    }
    editing.impactManufacturingDistributionEol = 0;
    assert.equal(results.hardwareRowEmbodiedEmissionsKg(editing).result, 0);
    assert.equal(results.totalEmbodiedEmissionsKg.result, 50);
    for (const missing of [null, undefined, '', NaN, 0, -1, 0.5]) {
        editing.quantity = missing;
        assert.equal(results.hardwareItemCount.success, 'partial');
        assert.equal(results.hardwareItemCount.result, 1);
        assert.equal(results.selectedResourceFleetCount.success, 'partial');
        assert.equal(results.selectedResourceFleetCount.result, 1);
        assert.equal(results.totalEmbodiedEmissionsKg.success, 'partial');
        assert.equal(results.totalEmbodiedEmissionsKg.result, 50);
    }
    editing.quantity = 1;
    for (const missing of [null, undefined, '', NaN, -1, 0.5]) {
        editing.cpuQuantity = missing;
        assert.equal(results.selectedResourceFleetCount.success, 'partial');
        assert.equal(results.selectedResourceFleetCount.result, 1);
        assert.equal(results.lifespanEmissionsPerResourceKg.result, null);
        assert.equal(results.emissionsPerFunctionalUnitKg.result, null);
    }
    editing.cpuQuantity = 0;
    assert.equal(results.selectedResourceFleetCount.result, 1);
    editing.isSecondHand = true;
    editing.quantity = null;
    editing.impactManufacturingDistributionEol = null;
    assert.equal(results.totalEmbodiedEmissionsKg.result, 50);
    assert.equal(results.selectedResourceFleetCount.result, 1);
    data.includeSecondHandEmbodied = true;
    assert.equal(results.totalEmbodiedEmissionsKg.success, 'partial');
    assert.equal(results.totalEmbodiedEmissionsKg.result, 50);
});

test('embodied totals retain partial sums and diagnostics through edits and exclusion changes', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    assert.deepEqual(
        { ...results.totalEmbodiedEmissionsKg },
        {
            success: 'success',
            result: 0,
            inputErrors: [],
            ignoredInputs: [],
        },
    );

    data.hardware = [
        { ...validHardware(), quantity: 2, impactManufacturingDistributionEol: 10 },
        {
            ...validHardware(),
            id: 'editing',
            quantity: null,
            impactManufacturingDistributionEol: null,
        },
        { ...validHardware(), id: 'excluded', isSecondHand: true, quantity: null },
    ];
    const [valid, editing, excluded] = data.hardware;
    const partial = results.totalEmbodiedEmissionsKg;
    assert.equal(partial.success, 'partial');
    assert.equal(partial.result, 20);
    assert.deepEqual(partial.ignoredInputs, [editing]);
    assert.equal(partial.ignoredInputs[0], editing);
    assert.equal(partial.inputErrors.length, 1);
    assert.ok(partial.inputErrors[0] instanceof z.ZodError);
    assert.deepEqual(
        partial.inputErrors[0].issues.map((issue) => issue.path),
        [['quantity'], ['impactManufacturingDistributionEol']],
    );
    assert.equal(results.totalLifespanEmissionsKg.success, 'partial');
    assert.equal(results.totalLifespanEmissionsKg.result, 20);

    editing.quantity = 3;
    assert.equal(results.totalEmbodiedEmissionsKg.success, 'partial');
    assert.deepEqual(
        results.totalEmbodiedEmissionsKg.inputErrors[0].issues.map((issue) => issue.path),
        [['impactManufacturingDistributionEol']],
    );
    editing.impactManufacturingDistributionEol = 10;
    assert.deepEqual(
        { ...results.totalEmbodiedEmissionsKg },
        {
            success: 'success',
            result: 50,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    assert.equal(results.totalLifespanEmissionsKg.result, 50);

    valid.quantity = null;
    assert.equal(results.totalEmbodiedEmissionsKg.success, 'partial');
    assert.equal(results.totalEmbodiedEmissionsKg.result, 30);
    assert.equal(results.totalEmbodiedEmissionsKg.ignoredInputs[0], valid);
    editing.impactManufacturingDistributionEol = null;
    assert.equal(results.totalEmbodiedEmissionsKg.success, 'failure');
    assert.equal(results.totalEmbodiedEmissionsKg.result, null);
    assert.deepEqual(results.totalEmbodiedEmissionsKg.ignoredInputs, [valid, editing]);
    assert.deepEqual(
        results.totalEmbodiedEmissionsKg.inputErrors.map((error) =>
            error.issues.map((issue) => issue.path),
        ),
        [[['quantity']], [['impactManufacturingDistributionEol']]],
    );

    data.hardware.splice(1, 1);
    assert.equal(results.totalEmbodiedEmissionsKg.success, 'failure');
    assert.equal(results.totalEmbodiedEmissionsKg.ignoredInputs.length, 1);
    assert.equal(results.totalEmbodiedEmissionsKg.ignoredInputs[0], valid);
    data.includeSecondHandEmbodied = true;
    assert.equal(results.totalEmbodiedEmissionsKg.success, 'failure');
    assert.deepEqual(results.totalEmbodiedEmissionsKg.ignoredInputs, [valid, excluded]);

    valid.quantity = 1;
    valid.impactManufacturingDistributionEol = 0;
    assert.equal(results.totalEmbodiedEmissionsKg.success, 'partial');
    assert.equal(results.totalEmbodiedEmissionsKg.result, 0);
    assert.equal(results.totalEmbodiedEmissionsKg.ignoredInputs[0], excluded);
    excluded.quantity = 1;
    assert.deepEqual(
        { ...results.totalEmbodiedEmissionsKg },
        {
            success: 'success',
            result: 0,
            inputErrors: [],
            ignoredInputs: [],
        },
    );

    valid.isSecondHand = true;
    valid.quantity = null;
    data.includeSecondHandEmbodied = false;
    assert.deepEqual(
        { ...results.totalEmbodiedEmissionsKg },
        {
            success: 'success',
            result: 0,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    data.hardware = [
        { ...validHardware(), id: 'replacement', impactManufacturingDistributionEol: 100 },
    ];
    assert.deepEqual(
        { ...results.totalEmbodiedEmissionsKg },
        {
            success: 'success',
            result: 100,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    data.hardware = [];
    assert.deepEqual(
        { ...results.totalEmbodiedEmissionsKg },
        {
            success: 'success',
            result: 0,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
});

test('memory and storage selectors validate measurements and never default missing values to zero', () => {
    const results = useSurveyResultsStore();
    const row = {
        ...validHardware(),
        memoryQuantity: 2,
        memorySizeGb: 16,
        storageQuantity: 3,
        storageSize: 100,
    };
    assert.equal(results.hardwareMemoryPerUnitGb(row).result, 32);
    assert.equal(results.hardwareStorageCapacityPerUnit(row).result, 300);
    for (const missing of [null, undefined, '', NaN, -1, 0.5]) {
        assert.equal(
            results.hardwareMemoryPerUnitGb({ ...row, memorySizeGb: missing }).result,
            null,
        );
        assert.equal(
            results.hardwareStorageCapacityPerUnit({ ...row, storageQuantity: missing }).result,
            null,
        );
    }
    assert.equal(results.hardwareMemoryPerUnitGb({ ...row, memoryQuantity: 0 }).result, 0);
    assert.equal(results.hardwareStorageCapacityPerUnit({ ...row, storageSize: 0 }).result, 0);
});

test('hardware computations return results and field-specific Zod errors without mutating drafts', () => {
    const results = useSurveyResultsStore();
    const cases = [
        ['hardwareUnitEmbodiedEmissionsKg', { impactManufacturingDistributionEol: 12.5 }, 12.5],
        [
            'hardwareRowEmbodiedEmissionsKg',
            { quantity: 3, impactManufacturingDistributionEol: 12.5 },
            37.5,
        ],
        ['hardwareMemoryPerUnitGb', { memoryQuantity: 2, memorySizeGb: 16 }, 32],
        ['hardwareStorageCapacityPerUnit', { storageQuantity: 3, storageSize: 100 }, 300],
    ];

    for (const [name, measurements, expected] of cases) {
        const row = Object.freeze({ ...HardwareItemDraftSchema.parse({}), ...measurements });
        assert.deepEqual(
            { ...results[name](row) },
            {
                success: 'success',
                result: expected,
                inputErrors: [],
                ignoredInputs: [],
            },
        );

        for (const field of Object.keys(measurements)) {
            const invalidValues = [null, undefined, '', NaN, Infinity, -Infinity, -1, '12'];
            if (field !== 'impactManufacturingDistributionEol') invalidValues.push(0.5);
            if (field === 'quantity') invalidValues.push(0);

            for (const invalid of invalidValues) {
                const draft = Object.freeze({ ...row, [field]: invalid });
                const before = { ...draft };
                const calculation = results[name](draft);
                assert.equal(calculation.success, 'failure');
                assert.equal(calculation.result, null);
                assert.deepEqual(calculation.ignoredInputs, []);
                assert.equal(calculation.inputErrors.length, 1);
                assert.ok(calculation.inputErrors[0] instanceof z.ZodError);
                assert.deepEqual(
                    calculation.inputErrors[0].issues.map((issue) => issue.path),
                    [[field]],
                );
                assert.deepEqual(draft, before);
            }

            if (field !== 'quantity') {
                assert.deepEqual(
                    { ...results[name](Object.freeze({ ...row, [field]: 0 })) },
                    {
                        success: 'success',
                        result: 0,
                        inputErrors: [],
                        ignoredInputs: [],
                    },
                );
            }
        }

        const missing = Object.freeze({
            ...row,
            ...Object.fromEntries(Object.keys(measurements).map((field) => [field, null])),
        });
        const failure = results[name](missing);
        assert.equal(failure.success, 'failure');
        assert.equal(failure.result, null);
        assert.deepEqual(failure.ignoredInputs, []);
        assert.equal(failure.inputErrors.length, 1);
        assert.deepEqual(
            failure.inputErrors[0].issues.map((issue) => issue.path),
            Object.keys(measurements).map((field) => [field]),
        );
    }

    // Impact needs no quantity; memory and storage need no impact or hardware quantity.
    const unrelatedInvalid = Object.freeze({
        ...HardwareItemDraftSchema.parse({}),
        quantity: null,
        impactManufacturingDistributionEol: 12,
        memoryQuantity: 2,
        memorySizeGb: 16,
        storageQuantity: 3,
        storageSize: 100,
    });
    assert.equal(results.hardwareUnitEmbodiedEmissionsKg(unrelatedInvalid).result, 12);
    assert.equal(results.hardwareMemoryPerUnitGb(unrelatedInvalid).result, 32);
    assert.equal(results.hardwareStorageCapacityPerUnit(unrelatedInvalid).result, 300);
});

test('failed subtotals do not create an embodied contribution from excluded unfinished rows', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    data.hardware = [HardwareItemDraftSchema.parse({ id: 'unfinished', isSecondHand: true })];
    assert.equal(results.hardwareRowEmbodiedEmissionsKg(data.hardware[0]).success, 'failure');
    assert.equal(results.totalEmbodiedEmissionsKg.result, 0);
    assert.equal(results.totalLifespanEmissionsKg.result, null);
});

test('enabled underlying estimates must be valid for totals and assessment completion', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.hardware = [validHardware()];
    data.datacenters[0].energy = DatacenterEnergyDraftSchema.parse({
        carbonIntensity: 0,
        energyConsumption: 100,
    });
    data.includeUnderlyingServices = true;
    data.underlyingServices = [
        UnderlyingServiceDraftSchema.parse({ co2EstimateKg: 10 }),
        UnderlyingServiceDraftSchema.parse({}),
    ];
    for (const missing of [null, undefined, '', NaN, Infinity, '10']) {
        data.underlyingServices[1].co2EstimateKg = missing;
        assert.equal(results.totalUnderlyingEmissionsKg.success, 'partial');
        assert.equal(results.totalUnderlyingEmissionsKg.result, 10);
        assert.equal(results.totalLifespanEmissionsKg.success, 'partial');
        assert.equal(results.totalLifespanEmissionsKg.result, 10);
        assert.equal(data.resultsStatus, 'partial');
    }
    data.underlyingServices[1].co2EstimateKg = 0;
    assert.equal(results.totalUnderlyingEmissionsKg.result, 10);
    assert.equal(results.totalLifespanEmissionsKg.result, 10);
    assert.equal(data.resultsStatus, 'complete');
    data.underlyingServices[1].co2EstimateKg = null;
    data.includeUnderlyingServices = false;
    assert.equal(results.totalUnderlyingEmissionsKg.result, 0);
    assert.equal(results.totalLifespanEmissionsKg.result, 0);
    assert.equal(data.resultsStatus, 'complete');
    data.includeUnderlyingServices = true;
    data.underlyingServices = [];
    assert.equal(results.totalUnderlyingEmissionsKg.result, 0);
});

test('underlying sums retain service diagnostics and skip validation when disabled', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    data.includeUnderlyingServices = true;
    data.underlyingServices = [
        UnderlyingServiceDraftSchema.parse({ id: 'valid', co2EstimateKg: 10 }),
        UnderlyingServiceDraftSchema.parse({ id: 'editing' }),
        UnderlyingServiceDraftSchema.parse({ id: 'negative', co2EstimateKg: -3 }),
        UnderlyingServiceDraftSchema.parse({ id: 'zero', co2EstimateKg: 0 }),
    ];
    const editing = data.underlyingServices[1];
    data.underlyingServices[0].name = undefined;
    const before = JSON.stringify(data.$state);
    const partial = results.totalUnderlyingEmissionsKg;
    assert.equal(partial.success, 'partial');
    assert.equal(partial.result, 7);
    assert.equal(partial.ignoredInputs.length, 1);
    assert.equal(partial.ignoredInputs[0], editing);
    assert.equal(partial.inputErrors.length, 1);
    assert.ok(partial.inputErrors[0] instanceof z.ZodError);
    assert.deepEqual(
        partial.inputErrors[0].issues.map((issue) => issue.path),
        [['co2EstimateKg']],
    );
    assert.equal(JSON.stringify(data.$state), before);

    editing.co2EstimateKg = 14;
    assert.deepEqual(
        { ...results.totalUnderlyingEmissionsKg },
        {
            success: 'success',
            result: 21,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    data.underlyingServices.forEach((service) => {
        service.co2EstimateKg = null;
    });
    const failure = results.totalUnderlyingEmissionsKg;
    assert.equal(failure.success, 'failure');
    assert.equal(failure.result, null);
    assert.equal(failure.inputErrors.length, 4);
    data.underlyingServices.forEach((service, index) => {
        assert.equal(failure.ignoredInputs[index], service);
        assert.deepEqual(
            failure.inputErrors[index].issues.map((issue) => issue.path),
            [['co2EstimateKg']],
        );
    });
    data.includeUnderlyingServices = false;
    assert.deepEqual(
        { ...results.totalUnderlyingEmissionsKg },
        {
            success: 'success',
            result: 0,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    data.includeUnderlyingServices = true;
    assert.equal(results.totalUnderlyingEmissionsKg.success, 'failure');
    data.underlyingServices = [];
    assert.deepEqual(
        { ...results.totalUnderlyingEmissionsKg },
        {
            success: 'success',
            result: 0,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
});

test('store-owned PUE presentation preserves supplied zero and rejects invalid energy drafts', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.monitoringPeriod.unit = 'year';
    const dc = data.datacenters[0];
    dc.energy = DatacenterEnergyDraftSchema.parse({
        carbonIntensity: 400,
        energyConsumption: 3000,
    });
    for (const [pue, expected] of [
        [null, 1200],
        [0, 0],
        [1, 1200],
        [1.5, 1800],
    ]) {
        dc.energy.pue = pue;
        assert.equal(results.datacenterOperationalResults.result[0].co2Period, expected);
        assert.equal(results.totalOperationalEmissionsKg.result, expected);
        assert.deepEqual(
            results.datacenterOperationalResults.result[0].pueInclusion,
            pue === null ? { status: 'omitted' } : { status: 'included', value: pue },
        );
    }
    for (const invalid of [-1, NaN, Infinity, '1']) {
        dc.energy.pue = invalid;
        assert.equal(results.datacenterOperationalResults.success, 'failure');
        assert.equal(results.datacenterOperationalResults.result, null);
        assert.equal(results.datacenterOperationalResults.ignoredInputs[0], dc);
        assert.deepEqual(
            results.datacenterOperationalResults.inputErrors[0].issues.map((issue) => issue.path),
            [['energy', 'pue']],
        );
    }
    dc.energy.pue = null;
    dc.energy.carbonIntensity = 0;
    assert.equal(results.totalOperationalEmissionsKg.result, 0);
    assert.equal(data.energyConsumptionStatus, 'complete');
    data.scope.functionalUnit.usageDuration = 0;
    assert.equal(data.isScopeValid, false);
    assert.equal(results.emissionsPerFunctionalUnitKg.result, null);
});

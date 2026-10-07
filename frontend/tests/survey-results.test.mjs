import assert from 'node:assert/strict';
import { beforeEach, afterEach, mock, test } from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { LocalStorage } from 'quasar';
import { z } from 'zod';
import { useSurveyResultsStore } from '../src/stores/surveyResults.ts';
import { useSurveyDataStore, MITSI_STORAGE_KEY } from '../src/stores/surveyData.ts';

import {
    DatacenterEnergyDraftSchema,
    DatacenterDraftSchema,
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
        assert.deepEqual(results.operationalPerDc, [
            {
                datacenter: dc,
                pueInclusion: { status: [-1, NaN].includes(draft.pue) ? 'unavailable' : 'omitted' },
                co2Period: null,
                co2Lifespan: null,
            },
        ]);
        assert.equal(results.totalOperational, null);
        assert.equal(dc.energy, draft);
    }

    for (const pue of ['', undefined, null]) {
        const draft = Object.freeze({ ...energy, pue });
        dc.energy = draft;
        assert.deepEqual(results.operationalPerDc, [
            { datacenter: dc, pueInclusion: { status: 'omitted' }, co2Period: 50, co2Lifespan: 50 },
        ]);
        assert.equal(dc.energy, draft);
        assert.equal(dc.energy.pue, pue);
    }
});

test('scope completion ignores energy; energy progress follows entry, not datacenter creation', () => {
    const store = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(store);
    store.monitoringPeriod.value = null;
    assert.equal(store.isScopeValid, true);
    assert.equal(store.energyConsumptionStatus, 'not_started');
    assert.equal(results.totalOperational, null);
    assert.equal(results.totalLifespan, null);
    assert.equal(store.resultsStatus, 'partial');
    store.datacenters[0].energy.energyConsumption = 0;
    assert.equal(store.energyConsumptionStatus, 'partial');
    assert.equal(results.totalOperational, null);
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
    assert.deepEqual(results.operationalPerDc, [
        { datacenter: a, pueInclusion: { status: 'omitted' }, co2Period: 100, co2Lifespan: 100 },
        {
            datacenter: store.datacenters[1],
            pueInclusion: { status: 'omitted' },
            co2Period: null,
            co2Lifespan: null,
        },
    ]);
    assert.deepEqual(results.energyCoverage, {
        completeDatacenters: 1,
        totalDatacenters: 2,
        isComplete: false,
    });
    assert.equal(results.totalOperational, 100);
    assert.equal(results.totalLifespan, 150);
    assert.equal(results.totalPerResource, 150);
    assert.equal(results.perFunctionalUnit, 150 / 8760);
    assert.equal(store.resultsStatus, 'partial');
    const b = store.datacenters[1];
    b.energy.carbonIntensity = 1000;
    b.energy.energyConsumption = 200;
    assert.equal(results.totalOperational, 300);
    assert.equal(results.totalLifespan, 350);
    assert.equal(store.energyConsumptionStatus, 'complete');
    assert.equal(store.resultsStatus, 'complete');
    a.energy.pue = 2;
    assert.equal(results.totalOperational, 400);
    a.energy.pue = 0;
    assert.equal(results.totalOperational, 200);
    a.energy.pue = '';
    assert.equal(results.totalOperational, 300);
    store.clearDatacenterEnergy('dc1');
    assert.equal(results.totalOperational, 200);
    assert.equal(store.resultsStatus, 'partial');
    store.clearDatacenterEnergy('b');
    assert.equal(results.totalOperational, null);
    assert.equal(results.totalLifespan, 50);
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
    assert.equal(results.totalOperational, 0);
    assert.equal(results.totalLifespan, 0);
    assert.equal(results.perFunctionalUnit, 0);
    assert.equal(results.totalPerResource, 0);
    assert.equal(store.resultsStatus, 'complete');
    store.monitoringPeriod.value = 0;
    assert.equal(results.totalOperational, null);
    assert.equal(results.operationalPerDc[0].co2Period, null);
    assert.equal(store.resultsStatus, 'partial');
    store.monitoringPeriod.value = 1;
    store.scope.lifespanYears = 0;
    assert.equal(results.operationalPerDc[0].co2Period, 0);
    assert.equal(results.operationalPerDc[0].co2Lifespan, null);
    assert.equal(results.totalOperational, null);
    assert.equal(results.perFunctionalUnit, null);
    store.scope.lifespanYears = 1;
    store.hardware[0].cpuQuantity = 0;
    assert.equal(results.perFunctionalUnit, null);
    assert.equal(results.totalPerResource, null);
});

test('unfinished hardware edits withhold invalid totals and resource ratios until corrected', () => {
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
    assert.equal(results.totalEmbodied.success, 'partial');
    assert.equal(results.totalEmbodied.result, 50);
    assert.equal(results.totalLifespan, null);
    assert.equal(results.perFunctionalUnit, null);
    assert.equal(results.totalPerResource, null);

    data.hardware[1].quantity = 1;
    data.hardware[1].cpuQuantity = undefined;
    assert.equal(results.totalLifespan, 100);
    assert.equal(results.resourcesInService, null);
    assert.equal(results.perFunctionalUnit, null);
    assert.equal(results.totalPerResource, null);

    data.hardware[1].cpuQuantity = 1;
    assert.equal(results.resourcesInService, 2);
    assert.equal(results.totalPerResource, 50);
    assert.equal(results.perFunctionalUnit, 100 / (8760 * 2));
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
        assert.equal(results.totalOperational, null);
        assert.equal(results.totalLifespan, null);
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
    assert.equal(results.rowsCount, 2);
    assert.deepEqual(results.elementsCount, {
        success: 'success',
        result: 5,
        inputErrors: [],
        ignoredInputs: [],
    });
    assert.equal(results.totalEmbodied.result, 20);
    assert.equal(results.resourcesInService, 8);
    assert.equal(results.secondHandExcludedCount, 1);
    const reusedGroup = results.embodiedByCategory.find(
        (group) => group.category === 'storage_bay',
    );
    assert.equal(reusedGroup.categoryTotal, 0);
    assert.equal(reusedGroup.rows[0].excluded, true);
    assert.equal(results.rowSubtotal(data.hardware[1]).result, 60);

    data.includeSecondHandEmbodied = true;
    assert.equal(results.totalEmbodied.result, 80);
    assert.equal(results.resourcesInService, 14);
    assert.equal(results.secondHandExcludedCount, 0);
    data.hardware[1].quantity = 4;
    assert.equal(results.totalEmbodied.result, 100);
    assert.equal(results.elementsCount.success, 'success');
    assert.equal(results.elementsCount.result, 6);
    assert.equal(
        results.embodiedByCategory.find((group) => group.category === 'storage_bay').categoryTotal,
        80,
    );

    data.underlyingServices = [UnderlyingServiceDraftSchema.parse({ co2EstimateKg: 30 })];
    assert.equal(results.totalUnderlying, 0);
    data.includeUnderlyingServices = true;
    assert.equal(results.totalUnderlying, 30);
    assert.equal(results.totalLifespan, 130);
    data.underlyingServices[0].co2EstimateKg = 40;
    assert.equal(results.totalLifespan, 140);

    data.hardware = [];
    assert.equal(results.rowsCount, 0);
    assert.deepEqual(results.elementsCount, {
        success: 'success',
        result: 0,
        inputErrors: [],
        ignoredInputs: [],
    });
    assert.equal(results.totalEmbodied.result, 0);
    assert.deepEqual(results.embodiedByCategory, []);
    assert.equal(results.totalLifespan, 40);
    data.includeUnderlyingServices = false;
    assert.equal(results.totalLifespan, null);
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

        const count = results.elementsCount;
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
    assert.deepEqual(results.elementsCount, {
        success: 'success',
        result: 2,
        inputErrors: [],
        ignoredInputs: [],
    });
    assert.equal(results.embodiedByCategory[0].rows[0].number, 2);

    for (const invalid of [null, undefined, '', NaN, Infinity, -Infinity, 0, -1, 0.5, '12']) {
        row.quantity = invalid;
        const count = results.elementsCount;
        assert.equal(count.success, 'failure');
        assert.equal(count.result, null);
        assert.equal(count.ignoredInputs.length, 1);
        assert.equal(count.ignoredInputs[0], row);
        assert.equal(count.inputErrors.length, 1);
        assert.ok(count.inputErrors[0] instanceof z.ZodError);
        assert.ok(
            count.inputErrors[0].issues.every((issue) => issue.path.join('.') === 'quantity'),
        );
        assert.equal(results.embodiedByCategory[0].rows[0].number, null);
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
    assert.equal(results.elementsCount.success, 'partial');
    assert.equal(results.elementsCount.result, 2);
    assert.equal(results.elementsCount.ignoredInputs[0], data.hardware[1]);

    data.hardware[1].quantity = 3;
    assert.deepEqual(results.elementsCount, {
        success: 'success',
        result: 5,
        inputErrors: [],
        ignoredInputs: [],
    });

    data.hardware[0].quantity = 0;
    assert.equal(results.elementsCount.success, 'partial');
    assert.equal(results.elementsCount.result, 3);
    assert.equal(results.elementsCount.ignoredInputs[0], data.hardware[0]);

    data.hardware[1].quantity = null;
    assert.equal(results.elementsCount.success, 'failure');
    assert.equal(results.elementsCount.result, null);
    assert.equal(results.elementsCount.ignoredInputs.length, 2);

    data.hardware.splice(0, 1);
    assert.equal(results.elementsCount.ignoredInputs.length, 1);
    assert.equal(results.elementsCount.ignoredInputs[0], data.hardware[0]);

    data.hardware = [{ ...validHardware(), id: 'replacement', quantity: 6 }];
    assert.deepEqual(results.elementsCount, {
        success: 'success',
        result: 6,
        inputErrors: [],
        ignoredInputs: [],
    });
    data.hardware = [];
    assert.deepEqual(results.elementsCount, {
        success: 'success',
        result: 0,
        inputErrors: [],
        ignoredInputs: [],
    });
});

test('existing results follow imported, loaded, and reset data without stale references', () => {
    const results = useSurveyResultsStore();
    const data = useSurveyDataStore();
    assert.equal(results.totalLifespan, null);
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
    assert.equal(results.totalLifespan, 150);
    assert.equal(results.totalPerResource, 75);
    const oldDatacenter = data.datacenters[0];
    const oldHardware = data.hardware[0];

    assessment.scope.lifespanYears = 2;
    assessment.hardware[0].quantity = 2;
    stored.set(MITSI_STORAGE_KEY, JSON.stringify({ assessment, savedAt: 123 }));
    data.loadFromStorage();
    assert.equal(results.totalEmbodied.result, 100);
    assert.equal(results.totalOperational, 200);
    assert.equal(results.totalLifespan, 300);
    assert.equal(results.resourcesInService, 4);
    assert.equal(results.operationalPerDc[0].datacenter, data.datacenters[0]);
    oldDatacenter.energy.energyConsumption = 999;
    oldHardware.quantity = 999;
    assert.equal(results.totalLifespan, 300);

    data.reset();
    assert.equal(results.totalLifespan, null);
    assert.equal(results.totalOperational, null);
    assert.deepEqual(results.operationalPerDc, []);
    assert.deepEqual(results.energyCoverage, {
        completeDatacenters: 0,
        totalDatacenters: 0,
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
    assert.equal(results.totalOperational, 100);
    assert.equal(results.totalLifespan, 100);
    assert.equal(results.energyCoverage.isComplete, true);
    assert.equal(results.perFunctionalUnit, null);
    assert.deepEqual(results.embodiedByCategory, []);
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
    assert.equal(results.operationalPerDc[0].co2Period, 1800);
    assert.ok(Math.abs(results.totalOperational - 43800) < 1e-8);
    for (const [unit, value] of [
        ['day', 365],
        ['week', 52],
        ['month', 12],
        ['year', 1],
    ]) {
        data.monitoringPeriod.unit = unit;
        data.monitoringPeriod.value = value;
        assert.equal(results.operationalPerDc[0].co2Period, 1800);
        assert.equal(results.totalOperational, 3600);
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
    assert.equal(results.totalEmbodied.result, 770880);
    assert.equal(results.resourcesInService, 176);
    assert.equal(results.perFunctionalUnit, 1);
    data.scope.functionalUnit.timeUnit = 'minute';
    data.scope.functionalUnit.usageDuration = 120;
    assert.equal(results.perFunctionalUnit, 1);
    data.scope.lifespanYears = 4;
    assert.equal(results.perFunctionalUnit, 0.5);
    data.scope.lifespanYears = 2;
    for (const resourceType of ['GPU', 'other']) {
        data.scope.functionalUnit.resourceType = resourceType;
        assert.equal(results.resourcesInService, 352);
        assert.equal(results.perFunctionalUnit, 0.5);
    }
    data.hardware[0].impactManufacturingDistributionEol = 0;
    assert.equal(results.perFunctionalUnit, 0);
    data.hardware = [];
    assert.equal(results.resourcesInService, 0);
    assert.equal(results.perFunctionalUnit, null);
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
    assert.equal(results.totalEmbodied.result, 50);
    for (const missing of [null, undefined, '', NaN, Infinity, -1, '12']) {
        editing.impactManufacturingDistributionEol = missing;
        assert.equal(results.rowSubtotal(editing).result, null);
        assert.equal(results.totalEmbodied.success, 'partial');
        assert.equal(results.totalEmbodied.result, 50);
        assert.equal(results.embodiedByCategory[0].categoryTotal, null);
        assert.equal(results.totalLifespan, null);
        assert.equal(results.totalPerResource, null);
        assert.equal(results.perFunctionalUnit, null);
    }
    editing.impactManufacturingDistributionEol = 0;
    assert.equal(results.rowSubtotal(editing).result, 0);
    assert.equal(results.totalEmbodied.result, 50);
    for (const missing of [null, undefined, '', NaN, 0, -1, 0.5]) {
        editing.quantity = missing;
        assert.equal(results.elementsCount.success, 'partial');
        assert.equal(results.elementsCount.result, 1);
        assert.equal(results.resourcesInService, null);
        assert.equal(results.totalEmbodied.success, 'partial');
        assert.equal(results.totalEmbodied.result, 50);
    }
    editing.quantity = 1;
    for (const missing of [null, undefined, '', NaN, -1, 0.5]) {
        editing.cpuQuantity = missing;
        assert.equal(results.resourcesInService, null);
        assert.equal(results.totalPerResource, null);
        assert.equal(results.perFunctionalUnit, null);
    }
    editing.cpuQuantity = 0;
    assert.equal(results.resourcesInService, 1);
    editing.isSecondHand = true;
    editing.quantity = null;
    editing.impactManufacturingDistributionEol = null;
    assert.equal(results.totalEmbodied.result, 50);
    assert.equal(results.resourcesInService, 1);
    data.includeSecondHandEmbodied = true;
    assert.equal(results.totalEmbodied.success, 'partial');
    assert.equal(results.totalEmbodied.result, 50);
});

test('embodied totals retain partial sums and diagnostics through edits and exclusion changes', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    assert.deepEqual(results.totalEmbodied, {
        success: 'success',
        result: 0,
        inputErrors: [],
        ignoredInputs: [],
    });

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
    const partial = results.totalEmbodied;
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
    assert.equal(results.totalLifespan, null);

    editing.quantity = 3;
    assert.equal(results.totalEmbodied.success, 'partial');
    assert.deepEqual(
        results.totalEmbodied.inputErrors[0].issues.map((issue) => issue.path),
        [['impactManufacturingDistributionEol']],
    );
    editing.impactManufacturingDistributionEol = 10;
    assert.deepEqual(results.totalEmbodied, {
        success: 'success',
        result: 50,
        inputErrors: [],
        ignoredInputs: [],
    });
    assert.equal(results.totalLifespan, 50);

    valid.quantity = null;
    assert.equal(results.totalEmbodied.success, 'partial');
    assert.equal(results.totalEmbodied.result, 30);
    assert.equal(results.totalEmbodied.ignoredInputs[0], valid);
    editing.impactManufacturingDistributionEol = null;
    assert.equal(results.totalEmbodied.success, 'failure');
    assert.equal(results.totalEmbodied.result, null);
    assert.deepEqual(results.totalEmbodied.ignoredInputs, [valid, editing]);
    assert.deepEqual(
        results.totalEmbodied.inputErrors.map((error) => error.issues.map((issue) => issue.path)),
        [[['quantity']], [['impactManufacturingDistributionEol']]],
    );

    data.hardware.splice(1, 1);
    assert.equal(results.totalEmbodied.success, 'failure');
    assert.equal(results.totalEmbodied.ignoredInputs.length, 1);
    assert.equal(results.totalEmbodied.ignoredInputs[0], valid);
    data.includeSecondHandEmbodied = true;
    assert.equal(results.totalEmbodied.success, 'failure');
    assert.deepEqual(results.totalEmbodied.ignoredInputs, [valid, excluded]);

    valid.quantity = 1;
    valid.impactManufacturingDistributionEol = 0;
    assert.equal(results.totalEmbodied.success, 'partial');
    assert.equal(results.totalEmbodied.result, 0);
    assert.equal(results.totalEmbodied.ignoredInputs[0], excluded);
    excluded.quantity = 1;
    assert.deepEqual(results.totalEmbodied, {
        success: 'success',
        result: 0,
        inputErrors: [],
        ignoredInputs: [],
    });

    valid.isSecondHand = true;
    valid.quantity = null;
    data.includeSecondHandEmbodied = false;
    assert.deepEqual(results.totalEmbodied, {
        success: 'success',
        result: 0,
        inputErrors: [],
        ignoredInputs: [],
    });
    data.hardware = [
        { ...validHardware(), id: 'replacement', impactManufacturingDistributionEol: 100 },
    ];
    assert.deepEqual(results.totalEmbodied, {
        success: 'success',
        result: 100,
        inputErrors: [],
        ignoredInputs: [],
    });
    data.hardware = [];
    assert.deepEqual(results.totalEmbodied, {
        success: 'success',
        result: 0,
        inputErrors: [],
        ignoredInputs: [],
    });
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
    assert.equal(results.memoryTotal(row).result, 32);
    assert.equal(results.storageTotal(row).result, 300);
    for (const missing of [null, undefined, '', NaN, -1, 0.5]) {
        assert.equal(results.memoryTotal({ ...row, memorySizeGb: missing }).result, null);
        assert.equal(results.storageTotal({ ...row, storageQuantity: missing }).result, null);
    }
    assert.equal(results.memoryTotal({ ...row, memoryQuantity: 0 }).result, 0);
    assert.equal(results.storageTotal({ ...row, storageSize: 0 }).result, 0);
});

test('hardware computations return results and field-specific Zod errors without mutating drafts', () => {
    const results = useSurveyResultsStore();
    const cases = [
        ['hardwareImpact', { impactManufacturingDistributionEol: 12.5 }, 12.5],
        ['rowSubtotal', { quantity: 3, impactManufacturingDistributionEol: 12.5 }, 37.5],
        ['memoryTotal', { memoryQuantity: 2, memorySizeGb: 16 }, 32],
        ['storageTotal', { storageQuantity: 3, storageSize: 100 }, 300],
    ];

    for (const [name, measurements, expected] of cases) {
        const row = Object.freeze({ ...HardwareItemDraftSchema.parse({}), ...measurements });
        assert.deepEqual(results[name](row), {
            success: 'success',
            result: expected,
            inputErrors: [],
            ignoredInputs: [],
        });

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
                assert.deepEqual(results[name](Object.freeze({ ...row, [field]: 0 })), {
                    success: 'success',
                    result: 0,
                    inputErrors: [],
                    ignoredInputs: [],
                });
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
    assert.equal(results.hardwareImpact(unrelatedInvalid).result, 12);
    assert.equal(results.memoryTotal(unrelatedInvalid).result, 32);
    assert.equal(results.storageTotal(unrelatedInvalid).result, 300);
});

test('failed subtotals do not create an embodied contribution from excluded unfinished rows', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    data.hardware = [HardwareItemDraftSchema.parse({ id: 'unfinished', isSecondHand: true })];
    assert.equal(results.rowSubtotal(data.hardware[0]).success, 'failure');
    assert.equal(results.totalEmbodied.result, 0);
    assert.equal(results.totalLifespan, null);
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
        assert.equal(results.totalUnderlying, null);
        assert.equal(results.totalLifespan, null);
        assert.equal(data.resultsStatus, 'partial');
    }
    data.underlyingServices[1].co2EstimateKg = 0;
    assert.equal(results.totalUnderlying, 10);
    assert.equal(results.totalLifespan, 10);
    assert.equal(data.resultsStatus, 'complete');
    data.underlyingServices[1].co2EstimateKg = null;
    data.includeUnderlyingServices = false;
    assert.equal(results.totalUnderlying, 0);
    assert.equal(results.totalLifespan, 0);
    assert.equal(data.resultsStatus, 'complete');
    data.includeUnderlyingServices = true;
    data.underlyingServices = [];
    assert.equal(results.totalUnderlying, 0);
});

test('store-owned PUE presentation preserves supplied zero and labels invalid drafts unavailable', () => {
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
        assert.equal(results.operationalPerDc[0].co2Period, expected);
        assert.equal(results.totalOperational, expected);
        assert.deepEqual(
            results.operationalPerDc[0].pueInclusion,
            pue === null ? { status: 'omitted' } : { status: 'included', value: pue },
        );
    }
    for (const invalid of [-1, NaN, Infinity, '1']) {
        dc.energy.pue = invalid;
        assert.deepEqual(results.operationalPerDc[0].pueInclusion, { status: 'unavailable' });
        assert.equal(results.operationalPerDc[0].co2Period, null);
    }
    dc.energy.pue = null;
    dc.energy.carbonIntensity = 0;
    assert.equal(results.totalOperational, 0);
    assert.equal(data.energyConsumptionStatus, 'complete');
    data.scope.functionalUnit.usageDuration = 0;
    assert.equal(data.isScopeValid, false);
    assert.equal(results.perFunctionalUnit, null);
});

test('arithmetic overflow is unavailable in operational, underlying, and functional-unit calculations', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.monitoringPeriod.unit = 'year';
    const dc = data.datacenters[0];
    dc.energy = DatacenterEnergyDraftSchema.parse({
        carbonIntensity: 1000,
        energyConsumption: Number.MAX_VALUE,
        pue: 2,
    });
    assert.equal(results.operationalPerDc[0].co2Period, null);
    assert.equal(results.totalOperational, null);
    dc.energy.pue = 1;
    data.scope.lifespanYears = 2;
    assert.equal(results.operationalPerDc[0].co2Period, Number.MAX_VALUE);
    assert.equal(results.operationalPerDc[0].co2Lifespan, null);
    data.scope.lifespanYears = 1;
    data.datacenters.push(DatacenterDraftSchema.parse({ id: 'overflow', energy: dc.energy }));
    assert.equal(results.totalOperational, null);
    data.datacenters = [];
    data.includeUnderlyingServices = true;
    data.underlyingServices = [1, 2].map(() =>
        UnderlyingServiceDraftSchema.parse({ co2EstimateKg: Number.MAX_VALUE }),
    );
    assert.equal(results.totalUnderlying, null);
    assert.equal(results.totalLifespan, null);
    data.hardware = [
        {
            ...validHardware(),
            cpuQuantity: 1,
            impactManufacturingDistributionEol: Number.MAX_VALUE,
        },
    ];
    data.scope.functionalUnit = {
        resourceType: 'CPU',
        timeUnit: 'year',
        usageDuration: Number.MAX_VALUE,
        resourceCount: 1,
    };
    data.includeUnderlyingServices = false;
    assert.equal(results.totalLifespan, Number.MAX_VALUE);
    assert.equal(results.perFunctionalUnit, null);
});

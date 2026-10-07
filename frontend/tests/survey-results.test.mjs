import assert from 'node:assert/strict';
import { beforeEach, afterEach, mock, test } from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { LocalStorage } from 'quasar';
import { useSurveyResultsStore } from '../src/stores/surveyResults.ts';
import { useSurveyDataStore, MITSI_STORAGE_KEY } from '../src/stores/surveyData.ts';

import {
    DatacenterEnergyDraftSchema,
    DatacenterDraftSchema,
} from '../src/models/Datacenter/schema.ts';
import { MitsiStateDraftSchema } from '../src/models/MitsiState/schema.ts';
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
    assert.equal(results.totalEmbodied, null);
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
    assert.equal(results.elementsCount, 5);
    assert.equal(results.totalEmbodied, 20);
    assert.equal(results.resourcesInService, 8);
    assert.equal(results.secondHandExcludedCount, 1);
    const reusedGroup = results.embodiedByCategory.find(
        (group) => group.category === 'storage_bay',
    );
    assert.equal(reusedGroup.categoryTotal, 0);
    assert.equal(reusedGroup.rows[0].excluded, true);
    assert.equal(results.rowSubtotal(data.hardware[1]), 60);

    data.includeSecondHandEmbodied = true;
    assert.equal(results.totalEmbodied, 80);
    assert.equal(results.resourcesInService, 14);
    assert.equal(results.secondHandExcludedCount, 0);
    data.hardware[1].quantity = 4;
    assert.equal(results.totalEmbodied, 100);
    assert.equal(results.elementsCount, 6);
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
    assert.equal(results.elementsCount, 0);
    assert.equal(results.totalEmbodied, 0);
    assert.deepEqual(results.embodiedByCategory, []);
    assert.equal(results.totalLifespan, 40);
    data.includeUnderlyingServices = false;
    assert.equal(results.totalLifespan, null);
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
    assert.equal(results.totalEmbodied, 100);
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
    assert.equal(results.totalEmbodied, 770880);
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
    assert.equal(results.totalEmbodied, 50);
    for (const missing of [null, undefined, '', NaN, Infinity, -1, '12']) {
        editing.impactManufacturingDistributionEol = missing;
        assert.equal(results.rowSubtotal(editing), null);
        assert.equal(results.totalEmbodied, null);
        assert.equal(results.embodiedByCategory[0].categoryTotal, null);
        assert.equal(results.totalLifespan, null);
        assert.equal(results.totalPerResource, null);
        assert.equal(results.perFunctionalUnit, null);
    }
    editing.impactManufacturingDistributionEol = 0;
    assert.equal(results.rowSubtotal(editing), 0);
    assert.equal(results.totalEmbodied, 50);
    for (const missing of [null, undefined, '', NaN, 0, -1, 0.5]) {
        editing.quantity = missing;
        assert.equal(results.elementsCount, null);
        assert.equal(results.resourcesInService, null);
        assert.equal(results.totalEmbodied, null);
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
    assert.equal(results.totalEmbodied, 50);
    assert.equal(results.resourcesInService, 1);
    data.includeSecondHandEmbodied = true;
    assert.equal(results.totalEmbodied, null);
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
    assert.equal(results.memoryTotal(row), 32);
    assert.equal(results.storageTotal(row), 300);
    for (const missing of [null, undefined, '', NaN, -1, 0.5]) {
        assert.equal(results.memoryTotal({ ...row, memorySizeGb: missing }), null);
        assert.equal(results.storageTotal({ ...row, storageQuantity: missing }), null);
    }
    assert.equal(results.memoryTotal({ ...row, memoryQuantity: 0 }), 0);
    assert.equal(results.storageTotal({ ...row, storageSize: 0 }), 0);
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

test('arithmetic overflow is unavailable at calculation and aggregation boundaries', () => {
    const data = useSurveyDataStore();
    const results = useSurveyResultsStore();
    setupScope(data);
    data.monitoringPeriod.unit = 'year';
    data.hardware = [
        {
            ...validHardware(),
            cpuQuantity: 1,
            quantity: 2,
            impactManufacturingDistributionEol: Number.MAX_VALUE,
        },
    ];
    assert.equal(results.rowSubtotal(data.hardware[0]), null);
    assert.equal(results.totalEmbodied, null);
    data.hardware = ['a', 'b'].map((id) => ({
        ...validHardware(),
        id,
        cpuQuantity: 1,
        impactManufacturingDistributionEol: Number.MAX_VALUE,
    }));
    assert.equal(results.rowSubtotal(data.hardware[0]), Number.MAX_VALUE);
    assert.equal(results.totalEmbodied, null);
    data.hardware = [];
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

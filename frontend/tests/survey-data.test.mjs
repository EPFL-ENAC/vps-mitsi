import assert from 'node:assert/strict';
import { beforeEach, afterEach, mock, test } from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { LocalStorage } from 'quasar';
import { useSurveyDataStore } from '../src/stores/surveyData.ts';
import { MITSI_STORAGE_KEY } from '../src/models/mitsi.ts';
import {
    BoundaryItemDraftSchema,
    DatacenterEnergyDraftSchema,
    HardwareItemDraftSchema,
    MITSI_SCHEMA_VERSION,
    MitsiStateDraftSchema,
    ScopeDraftSchema,
    UnderlyingServiceDraftSchema,
} from '../src/models/schema.ts';

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

test('blank and partially edited assessments survive save and reload, including unassigned rows', () => {
    const store = useSurveyDataStore();
    assert.equal(store.saveToStorage(), true);
    store.addDatacenter();
    store.addBoundaryItem('included');
    store.addHardwareItem();
    store.scope.organizationName = 'EPFL';
    assert.equal(store.saveToStorage(), true);
    const snapshot = store.exportJson();
    setActivePinia(createPinia());
    const restored = useSurveyDataStore();
    restored.loadFromStorage();
    assert.equal(restored.exportJson(), snapshot);
    assert.equal(restored.hardware.length, 1);
    assert.equal(restored.datacenters.length, 1);
    assert.equal(restored.scope.includedItems.length, 1);
    assert.equal(restored.isScopeValid, false);
});

test('save timestamps survive reload and only advance on successful persistence', () => {
    let now = 1_790_000_000_000;
    mock.method(Date, 'now', () => now);
    const store = useSurveyDataStore();
    store.loadFromStorage();
    assert.equal(store.savedAt, null);
    assert.equal(store.saveToStorage(), true);
    const firstSavedAt = now;
    assert.equal(store.savedAt, firstSavedAt);
    assert.deepEqual(JSON.parse(stored.get(MITSI_STORAGE_KEY)), {
        assessment: JSON.parse(store.exportJson()),
        savedAt: firstSavedAt,
    });

    now += 60_000;
    store.scope.organizationName = 'Edited';
    const exported = JSON.parse(store.exportJson());
    assert.equal('savedAt' in exported, false);
    assert.equal('assessment' in exported, false);
    assert.equal(store.savedAt, firstSavedAt);
    assert.equal(JSON.parse(stored.get(MITSI_STORAGE_KEY)).savedAt, firstSavedAt);

    setActivePinia(createPinia());
    const restored = useSurveyDataStore();
    restored.loadFromStorage();
    assert.equal(restored.savedAt, firstSavedAt);
    assert.equal(restored.scope.organizationName, '');
    assert.equal(restored.saveToStorage(), true);
    assert.equal(restored.savedAt, now);
    assert.equal(JSON.parse(stored.get(MITSI_STORAGE_KEY)).savedAt, now);
});

test('import persists its local save time and restores it on reload', () => {
    const now = 1_790_000_000_000;
    mock.method(Date, 'now', () => now);
    const store = useSurveyDataStore();
    const assessment = MitsiStateDraftSchema.parse({ scope: { organizationName: 'Imported' } });
    assert.equal(store.importJson(JSON.stringify({ ...assessment, savedAt: 123 })), true);
    assert.equal(store.savedAt, now);
    assert.deepEqual(JSON.parse(stored.get(MITSI_STORAGE_KEY)), { assessment, savedAt: now });
    setActivePinia(createPinia());
    const restored = useSurveyDataStore();
    restored.loadFromStorage();
    assert.equal(restored.savedAt, now);
    assert.equal(restored.scope.organizationName, 'Imported');
});

test('legacy drafts load without an invented timestamp and use the wrapper on their next save', () => {
    const assessment = MitsiStateDraftSchema.parse({ scope: { organizationName: 'Legacy' } });
    const legacy = JSON.stringify(assessment);
    stored.set(MITSI_STORAGE_KEY, legacy);
    const store = useSurveyDataStore();
    store.savedAt = 123;
    store.loadFromStorage();
    assert.equal(store.savedAt, null);
    assert.equal(store.scope.organizationName, 'Legacy');
    assert.equal(stored.get(MITSI_STORAGE_KEY), legacy);
    assert.equal(store.saveToStorage(), true);
    assert.deepEqual(JSON.parse(stored.get(MITSI_STORAGE_KEY)).assessment, assessment);
});

test('missing or invalid timestamp metadata does not discard valid assessments', () => {
    const assessment = MitsiStateDraftSchema.parse({ scope: { organizationName: 'Keep me' } });
    const store = useSurveyDataStore();
    for (const savedAt of [undefined, null, '123', -1, 1.5, {}, 8_640_000_000_000_001]) {
        const json = JSON.stringify({ assessment, savedAt });
        stored.set(MITSI_STORAGE_KEY, json);
        store.savedAt = 123;
        store.scope.organizationName = '';
        store.loadFromStorage();
        assert.equal(store.savedAt, null);
        assert.equal(store.scope.organizationName, 'Keep me');
        assert.equal(stored.get(MITSI_STORAGE_KEY), json);
    }
    stored.set(MITSI_STORAGE_KEY, JSON.stringify({ assessment, savedAt: 0 }));
    store.loadFromStorage();
    assert.equal(store.savedAt, 0);
});

test('hardware creation uses draft defaults and gives each row its own id', () => {
    const store = useSurveyDataStore();
    store.addHardwareItem();
    store.addHardwareItem();
    const [first, second] = store.hardware;
    assert.ok(first.id);
    assert.ok(second.id);
    assert.notEqual(first.id, second.id);
    for (const row of store.hardware) {
        assert.deepEqual({ ...row, id: '' }, HardwareItemDraftSchema.parse({}));
    }
    first.name = 'Edited';
    assert.equal(second.name, '');
});

test('invalid saves and exports preserve previous storage and timestamps', () => {
    const store = useSurveyDataStore();
    store.hardware.push(validHardware());
    assert.equal(store.saveToStorage(), true);
    store.exportJson();
    const previous = stored.get(MITSI_STORAGE_KEY);
    const savedAt = store.savedAt;
    const exportedAt = store.exportedAt;
    store.hardware[0].quantity = -1;
    assert.equal(store.saveToStorage(), false);
    assert.equal(stored.get(MITSI_STORAGE_KEY), previous);
    assert.equal(store.savedAt, savedAt);
    assert.throws(() => store.exportJson());
    assert.equal(store.exportedAt, exportedAt);
    assert.equal(store.hardware[0].quantity, -1);
});

test('storage failures return false and do not mark the assessment saved', () => {
    const store = useSurveyDataStore();
    assert.equal(store.saveToStorage(), true);
    const savedAt = store.savedAt;
    const previous = stored.get(MITSI_STORAGE_KEY);
    mock.method(LocalStorage, 'set', () => {
        throw new Error('Storage full');
    });
    store.scope.organizationName = 'Edited';
    assert.equal(store.saveToStorage(), false);
    assert.equal(store.savedAt, savedAt);
    assert.equal(stored.get(MITSI_STORAGE_KEY), previous);
    assert.equal(store.importJson(JSON.stringify({ schemaVersion: MITSI_SCHEMA_VERSION })), false);
    assert.equal(store.scope.organizationName, 'Edited');
    assert.equal(store.savedAt, savedAt);
    assert.equal(stored.get(MITSI_STORAGE_KEY), previous);
});

test('save and export normalize cleared numerics without turning invalid values into defaults', () => {
    const store = useSurveyDataStore();
    store.scope.lifespanYears = '';
    store.hardware.push({ ...validHardware(), quantity: null });
    store.addDatacenter();
    store.datacenters[0].energy.pue = '';
    store.datacenters[0].energy.energyConsumption = '';
    assert.equal(store.saveToStorage(), true);
    const snapshot = JSON.parse(store.exportJson());
    assert.equal(snapshot.scope.lifespanYears, 1);
    assert.equal(snapshot.hardware[0].quantity, 0);
    assert.equal(snapshot.datacenters[0].energy.pue, null);
    assert.deepEqual(JSON.parse(stored.get(MITSI_STORAGE_KEY)).assessment, snapshot);
});

test('imports reject invalid values and future versions without changing state or storage', () => {
    const store = useSurveyDataStore();
    store.scope.organizationName = 'Keep me';
    store.saveToStorage();
    const previous = stored.get(MITSI_STORAGE_KEY);
    const savedAt = store.savedAt;
    for (const input of [
        '{',
        JSON.stringify({ schemaVersion: MITSI_SCHEMA_VERSION, hardware: [{ quantity: -1 }] }),
        '{}',
        JSON.stringify({ schemaVersion: MITSI_SCHEMA_VERSION - 1 }),
        JSON.stringify({ schemaVersion: MITSI_SCHEMA_VERSION + 1 }),
    ]) {
        assert.equal(store.importJson(input), false);
        assert.equal(store.scope.organizationName, 'Keep me');
        assert.equal(stored.get(MITSI_STORAGE_KEY), previous);
        assert.equal(store.savedAt, savedAt);
    }
});

test('orphan references are filtered only at load/import, while draft placeholders survive', () => {
    const store = useSurveyDataStore();
    setupScope(store);
    store.hardware.push(
        validHardware(),
        HardwareItemDraftSchema.parse({ id: 'blank' }),
        HardwareItemDraftSchema.parse({ id: 'orphan', datacenterId: 'unknown' }),
    );
    assert.equal(store.saveToStorage(), true);
    assert.equal(JSON.parse(store.exportJson()).hardware.length, 3);
    assert.equal(store.importJson(store.exportJson()), true);
    assert.deepEqual(
        store.hardware.map((row) => row.id),
        ['h1', 'blank'],
    );
});

test('completion validates all canonical scope and hardware fields', () => {
    const store = useSurveyDataStore();
    setupScope(store);
    store.hardware.push(validHardware());
    assert.equal(store.isScopeValid, true);
    assert.equal(store.hardwareInventoryStatus, 'complete');
    store.scope.assessors = '';
    assert.equal(store.isScopeValid, false);
    store.scope.assessors = 'Assessor';
    store.scope.includedItems.push(BoundaryItemDraftSchema.parse({}));
    assert.equal(store.isScopeValid, false);
    store.scope.includedItems = [];
    store.scope.functionalUnit.resourceCount = 0;
    assert.equal(store.isScopeValid, false);
    store.scope.functionalUnit.resourceCount = 1;
    store.scope.lifespanYears = 0;
    assert.equal(store.isScopeValid, false);
    store.scope.lifespanYears = 1;
    for (const patch of [
        { quantity: 0 },
        { quantity: 1.5 },
        { impactManufacturing: undefined },
        { cpuQuantity: -1 },
    ]) {
        store.hardware[0] = { ...validHardware(), ...patch };
        assert.equal(store.hardwareInventoryStatus, 'partial');
        assert.equal(store.missingMandatoryHardware, 1);
    }
});

test('energy and results completion require a valid monitoring period and optional PUE', () => {
    const store = useSurveyDataStore();
    setupScope(store);
    store.datacenters[0].energy = DatacenterEnergyDraftSchema.parse({
        carbonIntensity: 1,
        energyConsumption: 0,
    });
    assert.equal(store.energyConsumptionStatus, 'complete');
    assert.equal(store.resultsStatus, 'partial');
    for (const patch of [{ value: 0.5 }, { unit: 'unknown' }]) {
        store.monitoringPeriod = { value: 1, unit: 'day', comment: '', ...patch };
        assert.equal(store.energyConsumptionStatus, 'partial');
        assert.equal(store.resultsStatus, 'partial');
    }
    store.monitoringPeriod = { value: 1, unit: 'day', comment: '' };
    store.datacenters[0].energy.pue = -1;
    assert.equal(store.energyConsumptionStatus, 'partial');
    store.datacenters[0].energy.pue = '';
    assert.equal(store.energyConsumptionStatus, 'complete');
    store.datacenters[0].energy.carbonIntensity = 0;
    assert.equal(store.energyConsumptionStatus, 'partial');
});

test('datacenter lifecycle owns energy and checks current hardware references', () => {
    const store = useSurveyDataStore();
    const a = store.addDatacenter();
    const b = store.addDatacenter();
    assert.notEqual(a, b);
    const first = store.datacenters[0];
    first.generalInfo.name = 'A';
    first.energy.energyConsumption = 42;
    assert.equal(store.datacenters[1].energy.energyConsumption, null);
    assert.equal(store.getDatacenterDeletionBlock(a), null);
    store.hardware.push({ ...validHardware(), datacenterId: a });
    assert.deepEqual(store.removeDatacenter(a), {
        removed: false,
        reason: 'in_use',
        usage: { hardwareRowCount: 1 },
    });
    assert.equal(first.energy.energyConsumption, 42);
    assert.equal(store.clearDatacenterEnergy(a), true);
    assert.equal(first.generalInfo.name, 'A');
    assert.equal(first.id, a);
    assert.equal(first.energy.energyConsumption, null);
    assert.equal(store.datacenters.length, 2);
    first.energy.comment = 'Owned energy data';
    store.hardware[0].datacenterId = b;
    assert.deepEqual(store.removeDatacenter(a), { removed: true });
    assert.deepEqual(
        store.datacenters.map((dc) => dc.id),
        [b],
    );
    assert.equal(store.clearDatacenterEnergy('missing'), false);
    assert.deepEqual(store.removeDatacenter('missing'), { removed: false, reason: 'not_found' });
    assert.equal(store.getDatacenterDeletionBlock('missing'), null);
});

test('unsupported stored versions are ignored without modifying state or storage', () => {
    const store = useSurveyDataStore();
    store.scope.organizationName = 'Keep me';
    for (const raw of [
        {},
        { schemaVersion: 3 },
        { schemaVersion: 5 },
        { assessment: { schemaVersion: 3 }, savedAt: 123 },
        { assessment: { schemaVersion: 5 }, savedAt: 123 },
    ]) {
        const json = JSON.stringify(raw);
        stored.set(MITSI_STORAGE_KEY, json);
        store.loadFromStorage();
        assert.equal(store.scope.organizationName, 'Keep me');
        assert.equal(stored.get(MITSI_STORAGE_KEY), json);
    }
});

test('fresh and saved defaults have no progress and never instantiate the results store', () => {
    const pinia = createPinia();
    const data = useSurveyDataStore(pinia);
    const statuses = () => [
        data.scopeStatus,
        data.hardwareInventoryStatus,
        data.energyConsumptionStatus,
        data.resultsStatus,
    ];
    assert.deepEqual(statuses(), Array(4).fill('not_started'));
    data.saveToStorage();
    data.exportJson();
    data.loadFromStorage();
    assert.deepEqual(statuses(), Array(4).fill('not_started'));
    data.scope.organizationName = 'EPFL';
    assert.equal(data.scopeStatus, 'partial');
    assert.equal(data.resultsStatus, 'partial');
    data.scope.organizationName = '';
    assert.deepEqual(statuses(), Array(4).fill('not_started'));
    assert.deepEqual(Object.keys(pinia.state.value), ['surveyData']);
});

test('each scope input marks current progress and restoring defaults clears it', () => {
    const data = useSurveyDataStore();
    const edits = [
        (scope) => {
            scope.organizationName = 'EPFL';
        },
        (scope) => {
            scope.assessors = 'Assessor';
        },
        (scope) => {
            scope.serviceName = 'Service';
        },
        (scope) => {
            scope.function = 'Research';
        },
        (scope) => {
            scope.lifespanYears = 2;
        },
        (scope) => {
            scope.functionalUnit.timeUnit = 'day';
        },
        (scope) => {
            scope.functionalUnit.usageDuration = 2;
        },
        (scope) => {
            scope.functionalUnit.resourceCount = 2;
        },
        (scope) => {
            scope.functionalUnit.resourceType = 'CPU';
        },
        (scope) => {
            scope.includedItems.push(BoundaryItemDraftSchema.parse({}));
        },
        (scope) => {
            scope.excludedItems.push(BoundaryItemDraftSchema.parse({}));
        },
    ];
    for (const edit of edits) {
        edit(data.scope);
        assert.equal(data.scopeStatus, 'partial');
        assert.equal(data.resultsStatus, 'partial');
        data.scope = ScopeDraftSchema.parse({});
        assert.equal(data.scopeStatus, 'not_started');
        assert.equal(data.resultsStatus, 'not_started');
    }
    const id = data.addDatacenter();
    assert.equal(data.scopeStatus, 'partial');
    assert.equal(data.energyConsumptionStatus, 'not_started');
    data.removeDatacenter(id);
    assert.equal(data.scopeStatus, 'not_started');
});

test('section statuses follow input validity, invalidation, clearing, and reset', () => {
    const data = useSurveyDataStore();
    data.addHardwareItem();
    assert.equal(data.hardwareInventoryStatus, 'partial');
    assert.equal(data.resultsStatus, 'partial');
    data.hardware = [];
    assert.equal(data.hardwareInventoryStatus, 'not_started');
    assert.equal(data.resultsStatus, 'not_started');

    setupScope(data);
    data.hardware = [validHardware()];
    data.datacenters[0].energy = DatacenterEnergyDraftSchema.parse({
        carbonIntensity: 100,
        energyConsumption: 0,
    });
    assert.equal(data.scopeStatus, 'complete');
    assert.equal(data.hardwareInventoryStatus, 'complete');
    assert.equal(data.energyConsumptionStatus, 'complete');
    assert.equal(data.resultsStatus, 'complete');

    data.scope.assessors = '';
    assert.equal(data.scopeStatus, 'partial');
    assert.equal(data.hardwareInventoryStatus, 'partial');
    assert.equal(data.energyConsumptionStatus, 'partial');
    assert.equal(data.resultsStatus, 'partial');
    data.scope.assessors = 'Assessor';
    data.hardware[0].quantity = 0;
    assert.equal(data.hardwareInventoryStatus, 'partial');
    assert.equal(data.resultsStatus, 'partial');
    data.hardware[0].quantity = 1;
    assert.equal(data.resultsStatus, 'complete');

    data.monitoringPeriod.value = 0;
    assert.equal(data.energyConsumptionStatus, 'partial');
    data.monitoringPeriod.value = 1;
    assert.equal(data.resultsStatus, 'complete');
    data.clearDatacenterEnergy('dc1');
    assert.equal(data.energyConsumptionStatus, 'not_started');
    assert.equal(data.resultsStatus, 'partial');
    data.datacenters[0].energy.energyConsumption = 0;
    assert.equal(data.energyConsumptionStatus, 'partial');
    for (const cleared of ['', null, undefined]) {
        data.datacenters[0].energy.energyConsumption = cleared;
        assert.equal(data.energyConsumptionStatus, 'not_started');
    }
    data.reset();
    assert.equal(data.scopeStatus, 'not_started');
    assert.equal(data.hardwareInventoryStatus, 'not_started');
    assert.equal(data.energyConsumptionStatus, 'not_started');
    assert.equal(data.resultsStatus, 'not_started');
});

test('results progress includes standalone energy inputs, settings, and underlying services', () => {
    const data = useSurveyDataStore();
    data.monitoringPeriod.comment = 'Measured';
    assert.equal(data.energyConsumptionStatus, 'partial');
    assert.equal(data.resultsStatus, 'partial');
    data.monitoringPeriod.comment = '';
    assert.equal(data.resultsStatus, 'not_started');
    for (const setting of ['includeSecondHandEmbodied', 'includeUnderlyingServices']) {
        data[setting] = true;
        assert.equal(data.resultsStatus, 'partial');
        data[setting] = false;
        assert.equal(data.resultsStatus, 'not_started');
    }
    data.underlyingServices.push(UnderlyingServiceDraftSchema.parse({}));
    assert.equal(data.resultsStatus, 'partial');
    data.underlyingServices = [];
    assert.equal(data.resultsStatus, 'not_started');
});

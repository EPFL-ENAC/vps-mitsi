import assert from 'node:assert/strict';
import { beforeEach, afterEach, mock, test } from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { LocalStorage } from 'quasar';
import { useMitsiStore } from '../src/stores/mitsi.ts';
import { MITSI_STORAGE_KEY, newHardwareItem } from '../src/models/mitsi.ts';
import {
    BoundaryItemDraftSchema,
    DatacenterEnergyDraftSchema,
    DatacenterDraftSchema,
    HardwareItemDraftSchema,
    MITSI_SCHEMA_VERSION,
    ScopeDraftSchema,
} from '../src/models/schema.ts';

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

function validScope() {
    return ScopeDraftSchema.parse({
        organizationName: 'EPFL',
        assessors: 'Assessor',
        serviceName: 'Service',
        function: 'Research',
    });
}
function setupScope(store) {
    store.scope = validScope();
    store.datacenters.push(
        DatacenterDraftSchema.parse({
            id: 'dc1',
            generalInfo: { name: 'Datacenter', abbreviation: 'DC' },
        }),
    );
}
function validHardware() {
    return HardwareItemDraftSchema.parse({
        id: 'h1',
        datacenterId: 'dc1',
        name: 'Server',
        quantity: 1,
        impactManufacturing: 0,
    });
}

test('blank and partially edited assessments survive save and reload, including unassigned rows', () => {
    const store = useMitsiStore();
    assert.equal(store.saveToStorage(), true);
    store.addDatacenter();
    store.addBoundaryItem('included');
    store.hardware.push(newHardwareItem());
    store.scope.organizationName = 'EPFL';
    assert.equal(store.saveToStorage(), true);
    const snapshot = store.exportJson();
    setActivePinia(createPinia());
    const restored = useMitsiStore();
    restored.loadFromStorage();
    assert.equal(restored.exportJson(), snapshot);
    assert.equal(restored.hardware.length, 1);
    assert.equal(restored.datacenters.length, 1);
    assert.equal(restored.scope.includedItems.length, 1);
    assert.equal(restored.isScopeValid, false);
});

test('invalid saves and exports preserve previous storage and timestamps', () => {
    const store = useMitsiStore();
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
    const store = useMitsiStore();
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
});

test('save and export normalize cleared numerics without turning invalid values into defaults', () => {
    const store = useMitsiStore();
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
    assert.deepEqual(JSON.parse(stored.get(MITSI_STORAGE_KEY)), snapshot);
});

test('imports reject invalid values and future versions without changing state or storage', () => {
    const store = useMitsiStore();
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
    const store = useMitsiStore();
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
    const store = useMitsiStore();
    setupScope(store);
    store.hardware.push(validHardware());
    assert.equal(store.isScopeValid, true);
    assert.equal(store.blockStatus.inventory, 'complete');
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
        assert.equal(store.blockStatus.inventory, 'partial');
        assert.equal(store.missingMandatoryHardware, 1);
    }
});

test('energy and results completion require a valid monitoring period and optional PUE', () => {
    const store = useMitsiStore();
    setupScope(store);
    store.datacenters[0].energy = DatacenterEnergyDraftSchema.parse({
        carbonIntensity: 1,
        energyConsumption: 0,
    });
    assert.equal(store.blockStatus.energy, 'complete');
    assert.equal(store.blockStatus.results, 'partial');
    for (const patch of [{ value: 0.5 }, { unit: 'unknown' }]) {
        store.monitoringPeriod = { value: 1, unit: 'day', comment: '', ...patch };
        assert.equal(store.blockStatus.energy, 'partial');
        assert.equal(store.blockStatus.results, 'not_started');
    }
    store.monitoringPeriod = { value: 1, unit: 'day', comment: '' };
    store.datacenters[0].energy.pue = -1;
    assert.equal(store.blockStatus.energy, 'partial');
    store.datacenters[0].energy.pue = '';
    assert.equal(store.blockStatus.energy, 'complete');
    store.datacenters[0].energy.carbonIntensity = 0;
    assert.equal(store.blockStatus.energy, 'partial');
});

test('datacenter lifecycle owns energy and checks current hardware references', () => {
    const store = useMitsiStore();
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

test('scope completion ignores energy; energy progress follows entry, not datacenter creation', () => {
    const store = useMitsiStore();
    setupScope(store);
    assert.equal(store.isScopeValid, true);
    assert.equal(store.blockStatus.energy, 'not_started');
    assert.equal(store.totalOperational, null);
    assert.equal(store.totalLifespan, null);
    assert.equal(store.blockStatus.results, 'not_started');
    store.datacenters[0].energy.energyConsumption = 0;
    assert.equal(store.blockStatus.energy, 'partial');
    assert.equal(store.totalOperational, null);
    store.datacenters[0].energy.carbonIntensity = -1;
    assert.equal(store.isScopeValid, true);
    assert.equal(store.saveToStorage(), false);
    store.clearDatacenterEnergy('dc1');
    assert.equal(store.blockStatus.energy, 'not_started');
    store.datacenters[0].energy.pue = '';
    assert.equal(store.blockStatus.energy, 'not_started');
    store.monitoringPeriod.value = 2;
    assert.equal(store.blockStatus.energy, 'partial');
    store.monitoringPeriod.value = 1;
    store.monitoringPeriod.comment = 'Measured';
    assert.equal(store.blockStatus.energy, 'partial');
    store.monitoringPeriod.comment = '';
    assert.equal(store.blockStatus.energy, 'not_started');
    store.datacenters[0].generalInfo.name = '';
    assert.equal(store.isScopeValid, false);
    store.datacenters = [];
    assert.equal(store.isScopeValid, false);
});

test('partial totals include only computable energy and react to direct nested edits', () => {
    const store = useMitsiStore();
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
    assert.deepEqual(store.operationalPerDc, [
        { datacenterId: 'dc1', co2Period: 100, co2Lifespan: 100 },
        { datacenterId: 'b', co2Period: null, co2Lifespan: null },
    ]);
    assert.deepEqual(store.energyCoverage, {
        completeDatacenters: 1,
        totalDatacenters: 2,
        isComplete: false,
    });
    assert.equal(store.totalOperational, 100);
    assert.equal(store.totalLifespan, 150);
    assert.equal(store.totalPerResource, 150);
    assert.equal(store.perFunctionalUnit, 150 / 8760);
    assert.equal(store.resultsPartial, true);
    assert.equal(store.blockStatus.results, 'partial');
    const b = store.datacenters[1];
    b.energy.carbonIntensity = 1000;
    b.energy.energyConsumption = 200;
    assert.equal(store.totalOperational, 300);
    assert.equal(store.totalLifespan, 350);
    assert.equal(store.blockStatus.energy, 'complete');
    assert.equal(store.blockStatus.results, 'complete');
    assert.equal(store.resultsPartial, false);
    a.energy.pue = 2;
    assert.equal(store.totalOperational, 400);
    a.energy.pue = 0; // Preserve the existing PUE fallback.
    assert.equal(store.totalOperational, 300);
    a.energy.pue = '';
    assert.equal(store.totalOperational, 300);
    store.clearDatacenterEnergy('dc1');
    assert.equal(store.totalOperational, 200);
    assert.equal(store.resultsPartial, true);
    store.clearDatacenterEnergy('b');
    assert.equal(store.totalOperational, null);
    assert.equal(store.totalLifespan, 50);
    assert.equal(store.blockStatus.results, 'partial');
});

test('invalid shared inputs withhold energy estimates and real zero results remain computable', () => {
    const store = useMitsiStore();
    setupScope(store);
    store.scope.functionalUnit.resourceType = 'CPU';
    store.hardware.push({ ...validHardware(), cpuQuantity: 1 });
    store.datacenters[0].energy.carbonIntensity = 100;
    store.datacenters[0].energy.energyConsumption = 0;
    assert.equal(store.totalOperational, 0);
    assert.equal(store.totalLifespan, 0);
    assert.equal(store.perFunctionalUnit, 0);
    assert.equal(store.totalPerResource, 0);
    assert.equal(store.blockStatus.results, 'complete');
    store.monitoringPeriod.value = 0;
    assert.equal(store.totalOperational, null);
    assert.equal(store.operationalPerDc[0].co2Period, null);
    assert.equal(store.resultsPartial, true);
    store.monitoringPeriod.value = 1;
    store.scope.lifespanYears = 0;
    assert.equal(store.operationalPerDc[0].co2Period, 0);
    assert.equal(store.operationalPerDc[0].co2Lifespan, null);
    assert.equal(store.totalOperational, null);
    assert.equal(store.perFunctionalUnit, null);
    store.scope.lifespanYears = 1;
    store.hardware[0].cpuQuantity = 0;
    assert.equal(store.perFunctionalUnit, null);
    assert.equal(store.totalPerResource, null);
});

test('cleared nested energy survives persistence and reset removes the whole collection', () => {
    const store = useMitsiStore();
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
    store.reset();
    assert.deepEqual(store.datacenters, []);
    assert.equal(store.totalOperational, null);
    assert.equal(store.totalLifespan, null);
    assert.equal(store.blockStatus.energy, 'not_started');
});

test('unsupported stored versions are ignored without modifying state or storage', () => {
    const store = useMitsiStore();
    store.scope.organizationName = 'Keep me';
    for (const raw of [{}, { schemaVersion: 3 }, { schemaVersion: 5 }]) {
        const json = JSON.stringify(raw);
        stored.set(MITSI_STORAGE_KEY, json);
        store.loadFromStorage();
        assert.equal(store.scope.organizationName, 'Keep me');
        assert.equal(stored.get(MITSI_STORAGE_KEY), json);
    }
});

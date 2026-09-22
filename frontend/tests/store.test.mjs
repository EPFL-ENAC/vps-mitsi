import assert from 'node:assert/strict';
import { beforeEach, afterEach, mock, test } from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { LocalStorage } from 'quasar';
import { useMitsiStore } from '../src/stores/mitsi.ts';
import { MITSI_STORAGE_KEY, newHardwareItem } from '../src/models/mitsi.ts';
import {
    BoundaryItemDraftSchema,
    DatacenterEnergyDraftSchema,
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
        datacenters: [{ id: 'dc1', name: 'Datacenter', abbreviation: 'DC' }],
    });
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
    assert.equal(restored.energy.length, 1);
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
    assert.equal(store.importJson('{}'), false);
    assert.equal(store.scope.organizationName, 'Edited');
});

test('save and export normalize cleared numerics without turning invalid values into defaults', () => {
    const store = useMitsiStore();
    store.scope.lifespanYears = '';
    store.hardware.push({ ...validHardware(), quantity: null });
    store.energy.push(DatacenterEnergyDraftSchema.parse({ datacenterId: 'dc1' }));
    store.energy[0].pue = '';
    assert.equal(store.saveToStorage(), true);
    const snapshot = JSON.parse(store.exportJson());
    assert.equal(snapshot.scope.lifespanYears, 1);
    assert.equal(snapshot.hardware[0].quantity, 0);
    assert.equal(snapshot.energy[0].pue, undefined);
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
        '{"hardware":[{"quantity":-1}]}',
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
    store.scope = validScope();
    store.hardware.push(
        validHardware(),
        HardwareItemDraftSchema.parse({ id: 'blank' }),
        HardwareItemDraftSchema.parse({ id: 'orphan', datacenterId: 'unknown' }),
    );
    store.energy.push(
        ...['dc1', '', 'unknown'].map((datacenterId) =>
            DatacenterEnergyDraftSchema.parse({ datacenterId }),
        ),
    );
    assert.equal(store.saveToStorage(), true);
    assert.equal(JSON.parse(store.exportJson()).hardware.length, 3);
    assert.equal(store.importJson(store.exportJson()), true);
    assert.deepEqual(
        store.hardware.map((row) => row.id),
        ['h1', 'blank'],
    );
    assert.deepEqual(
        store.energy.map((row) => row.datacenterId),
        ['dc1', ''],
    );
});

test('completion validates all canonical scope and hardware fields', () => {
    const store = useMitsiStore();
    store.scope = validScope();
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
    store.scope = validScope();
    store.energy.push(
        DatacenterEnergyDraftSchema.parse({ datacenterId: 'dc1', carbonIntensity: 1 }),
    );
    assert.equal(store.blockStatus.energy, 'complete');
    assert.equal(store.blockStatus.results, 'complete');
    for (const patch of [{ value: 0.5 }, { unit: 'unknown' }]) {
        store.monitoringPeriod = { value: 1, unit: 'day', comment: '', ...patch };
        assert.equal(store.blockStatus.energy, 'partial');
        assert.equal(store.blockStatus.results, 'not_started');
    }
    store.monitoringPeriod = { value: 1, unit: 'day', comment: '' };
    store.energy[0].pue = -1;
    assert.equal(store.blockStatus.energy, 'partial');
    store.energy[0].pue = '';
    assert.equal(store.blockStatus.energy, 'complete');
    store.energy[0].carbonIntensity = 0;
    assert.equal(store.blockStatus.energy, 'partial');
});

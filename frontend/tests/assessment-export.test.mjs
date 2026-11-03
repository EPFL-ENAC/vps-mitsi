import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { LocalStorage } from 'quasar';
import MainLayout from '../src/layouts/MainLayout.vue';
import en from '../src/i18n/en-GB/index.ts';
import { defaultExportMetadata, validHardware } from './helpers/survey-fixtures.mjs';
import { renderTables } from './helpers/render-tables.mjs';

afterEach(() => mock.restoreAll());

test('invalid export shows a validation toast and preserves saved data and timestamps', async () => {
    const setStorage = mock.method(LocalStorage, 'set', () => {});
    const result = await renderTables(MainLayout, {
        setupStore(store) {
            store.hardware.push(validHardware());
            assert.equal(store.saveToStorage(), true);
            store.exportJson(defaultExportMetadata());
            store.hardware[0].quantity = -1;
        },
    });
    const { savedAt, exportedAt } = result.store;
    assert.equal(result.exportDialogs.length, 1);

    result.exportDialogs[0].$emit('confirm', defaultExportMetadata());

    assert.deepEqual(result.notifications, [
        { type: 'negative', message: en.mainExportInvalidData },
    ]);
    assert.equal(setStorage.mock.callCount(), 1);
    assert.equal(result.store.savedAt, savedAt);
    assert.equal(result.store.exportedAt, exportedAt);
    assert.equal(result.store.hardware[0].quantity, -1);
});

test('unexpected export errors show a failure toast', async () => {
    const result = await renderTables(MainLayout);
    mock.method(result.store, 'exportJson', () => {
        throw new Error('Export failed');
    });

    result.exportDialogs[0].$emit('confirm', defaultExportMetadata());

    assert.deepEqual(result.notifications, [{ type: 'negative', message: en.mainExportError }]);
});

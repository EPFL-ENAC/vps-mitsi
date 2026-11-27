import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import MainLayout from '../src/layouts/MainLayout.vue';
import en from '../src/i18n/en-GB/index.ts';
import { MAX_IMPORT_BYTES, useSurveyDataStore } from '../src/stores/surveyData.ts';
import { renderTables } from './helpers/render-tables.mjs';

test('MainLayout rejects an oversized import before reading the file', async () => {
    const result = await renderTables(MainLayout);
    const file = { size: MAX_IMPORT_BYTES + 1, text: () => assert.fail('file must not be read') };

    const fileInput = result.instances.find((instance) => instance.$options.name === 'QFile');
    await fileInput.$emit('update:model-value', file);

    assert.deepEqual(result.notifications, [
        { type: 'negative', message: 'Import failed: the file exceeds 100 MB.' },
    ]);
    assert.equal(en.mainImportTooLarge, 'Import failed: the file exceeds {max} MB.');
});

test('importJson refuses JSON text larger than the import limit', () => {
    setActivePinia(createPinia());
    const store = useSurveyDataStore();

    assert.equal(store.importJson('x'.repeat(MAX_IMPORT_BYTES + 1)), false);
});

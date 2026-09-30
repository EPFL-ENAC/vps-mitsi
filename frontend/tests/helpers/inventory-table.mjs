import assert from 'node:assert/strict';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { Quasar, QTable, QTr, QTh, QTd, QSelect, QToggle, QBtn } from 'quasar';
import HardwareInventoryTable from '../../src/components/inventory/HardwareInventoryTable.vue';
import { useMitsiStore } from '../../src/stores/mitsi.ts';
import en from '../../src/i18n/en-GB/index.ts';

/** Inspect the columns passed to the real QTable, without exposing component internals. */
export async function renderInventoryTable({
    mode = 'advanced',
    hardware = [],
    datacenters = [],
    messages = en,
} = {}) {
    let table;
    const context = { req: { headers: {} } };
    const app = createSSRApp({ render: () => h(HardwareInventoryTable, { mode }) });
    const pinia = createPinia();
    app.use(pinia);
    const store = useMitsiStore(pinia);
    store.hardware = hardware;
    store.datacenters = datacenters;
    app.mixin({
        created() {
            if (this.$options.name === 'QTable') table = this;
        },
    });
    app.use(Quasar, { components: { QTable, QTr, QTh, QTd, QSelect, QToggle, QBtn } }, context);
    app.use(createI18n({ legacy: false, locale: 'en', messages: { en: messages } }));
    const html = await renderToString(app, context);
    assert.ok(table);
    return { html, columns: table.columns };
}

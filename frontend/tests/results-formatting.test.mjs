import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { useResultFormatting } from '../src/composables/useResultFormatting.ts';
import { useMitsiStore } from '../src/stores/mitsi.ts';
import {
    DatacenterDraftSchema,
    HardwareItemDraftSchema,
    ScopeDraftSchema,
} from '../src/models/schema.ts';
import en from '../src/i18n/en-GB/index.ts';

test('results and footer formatters label partial totals and preserve missing versus zero', async () => {
    let formatters;
    let store;
    const app = createSSRApp({
        setup() {
            store = useMitsiStore();
            formatters = useResultFormatting();
            return () => h('div');
        },
    });
    app.use(createPinia());
    app.use(createI18n({ legacy: false, locale: 'en', messages: { en } }));
    await renderToString(app);
    const { formatOperationalResult, formatCombinedResult } = formatters;
    assert.equal(formatOperationalResult(null), '—');
    assert.equal(formatCombinedResult(null), '—');
    store.scope = ScopeDraftSchema.parse({
        organizationName: 'EPFL',
        assessors: 'A',
        serviceName: 'S',
        function: 'F',
        functionalUnit: { resourceType: 'CPU' },
    });
    store.monitoringPeriod.unit = 'year';
    store.datacenters = ['a', 'b'].map((id) =>
        DatacenterDraftSchema.parse({
            id,
            generalInfo: { abbreviation: id, name: id },
        }),
    );
    store.datacenters[0].energy.carbonIntensity = 1000;
    store.datacenters[0].energy.energyConsumption = 100;
    store.hardware.push(
        HardwareItemDraftSchema.parse({
            id: 'h',
            name: 'Server',
            datacenterId: 'a',
            quantity: 1,
            cpuQuantity: 1,
            impactManufacturing: 0,
            impactManufacturingDistributionEol: 50,
        }),
    );
    assert.equal(
        formatOperationalResult(store.totalOperational),
        '100.00 (Partial — 1 of 2 datacenters)',
    );
    assert.equal(formatCombinedResult(store.totalLifespan), '150.00 (Partial)');
    assert.equal(formatCombinedResult(store.totalPerResource), '150.00 (Partial)');
    assert.match(formatCombinedResult(store.perFunctionalUnit), /\(Partial\)$/);
    assert.equal(
        formatOperationalResult(store.totalOperational, (value) => `${value / 1000} t`),
        '0.1 t (Partial — 1 of 2 datacenters)',
    );
    store.datacenters[1].energy.carbonIntensity = 1000;
    store.datacenters[1].energy.energyConsumption = 0;
    assert.equal(formatOperationalResult(store.totalOperational), '100.00');
    assert.equal(formatCombinedResult(store.totalLifespan), '150.00');
    store.datacenters[0].energy.energyConsumption = 0;
    store.hardware[0].impactManufacturingDistributionEol = 0;
    assert.equal(formatOperationalResult(store.totalOperational), '0.00');
    assert.equal(formatCombinedResult(store.perFunctionalUnit), '0.00');
    store.clearDatacenterEnergy('a');
    store.clearDatacenterEnergy('b');
    assert.equal(formatOperationalResult(store.totalOperational), '—');
    assert.equal(formatCombinedResult(store.totalLifespan), '0.00 (Partial)');
});

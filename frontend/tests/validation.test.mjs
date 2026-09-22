import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createI18n } from 'vue-i18n';
import { useValidation } from '../src/composables/useValidation.ts';
import { buildInventoryColumns } from '../src/models/inventory-columns.ts';
import {
    DatacenterEnergySchema,
    HardwareItemSchema,
    MonitoringPeriodSchema,
    ScopeSchema,
} from '../src/models/schema.ts';
import en from '../src/i18n/en-GB/index.ts';

async function validationRules() {
    let rules;
    const app = createSSRApp({
        setup() {
            rules = useValidation();
            return () => h('div');
        },
    });
    app.use(createI18n({ legacy: false, locale: 'en', messages: { en } }));
    await renderToString(app);
    return rules;
}

test('forms translate canonical errors and preserve optional empty values', async () => {
    const { toValidationRule } = await validationRules();
    const quantity = toValidationRule(HardwareItemSchema.shape.quantity);
    assert.equal(quantity(0), 'Must be at least 1.');
    assert.equal(quantity(1.5), 'Must be a whole number.');
    assert.equal(quantity(1), true);
    assert.equal(quantity(''), 'Must be a number.');
    assert.equal(toValidationRule(ScopeSchema.shape.assessors)(''), 'This field is required.');
    assert.equal(toValidationRule(ScopeSchema.shape.lifespanYears)(0), 'Must be at least 1.');
    assert.equal(toValidationRule(MonitoringPeriodSchema.shape.value)(0.5), 'Must be at least 1.');
    assert.equal(
        toValidationRule(DatacenterEnergySchema.shape.carbonIntensity)(0),
        'Must be greater than 0.',
    );
    const pue = toValidationRule(DatacenterEnergySchema.shape.pue);
    for (const empty of ['', null, undefined]) assert.equal(pue(empty), true);
    assert.equal(pue(-1), 'Must be at least 0.');
    assert.equal(toValidationRule()(undefined), true);
});

test('inventory uses canonical fields directly and skips derived values', () => {
    const { columns } = buildInventoryColumns((key) => key, 'advanced');
    for (const column of columns) {
        assert.equal(
            column.zod,
            column.kind === 'derived' ? undefined : HardwareItemSchema.shape[column.field],
        );
    }
});

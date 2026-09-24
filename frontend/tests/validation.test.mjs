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
    FunctionalUnitSchema,
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

test('numeric field rules reject negative values before submission', async () => {
    const { toValidationRule } = await validationRules();
    const fields = [
        FunctionalUnitSchema.shape.usageDuration,
        FunctionalUnitSchema.shape.resourceCount,
        ScopeSchema.shape.lifespanYears,
        MonitoringPeriodSchema.shape.value,
        DatacenterEnergySchema.shape.carbonIntensity,
        DatacenterEnergySchema.shape.energyConsumption,
        DatacenterEnergySchema.shape.pue,
        ...[
            'quantity',
            'impactManufacturing',
            'impactManufacturingDistributionEol',
            'cpuQuantity',
            'memoryQuantity',
            'memorySizeGb',
            'storageQuantity',
            'storageSize',
            'gpuQuantity',
        ].map((field) => HardwareItemSchema.shape[field]),
    ];
    for (const schema of fields) {
        assert.equal(typeof toValidationRule(schema)(-1), 'string');
    }
    assert.equal(toValidationRule(DatacenterEnergySchema.shape.energyConsumption)(0), true);
});

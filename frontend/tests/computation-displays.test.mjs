import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import HardwareInventoryPage from '../src/pages/HardwareInventoryPage.vue';
import HardwareInventoryTable from '../src/components/inventory/HardwareInventoryTable.vue';
import ResultsEmbodiedSection from '../src/components/results/ResultsEmbodiedSection.vue';
import ResultsOperationalSection from '../src/components/results/ResultsOperationalSection.vue';
import ResultsFunctionalUnitSection from '../src/components/results/ResultsFunctionalUnitSection.vue';
import MainLayout from '../src/layouts/MainLayout.vue';
import { DatacenterDraftSchema } from '../src/models/Datacenter/schema.ts';
import { renderTables } from './helpers/render-tables.mjs';
import { setupScope, validHardware } from './helpers/survey-fixtures.mjs';
import en from '../src/i18n/en-GB/index.ts';

function setupReady(store) {
    setupScope(store);
    store.scope.functionalUnit.resourceType = 'CPU';
    store.scope.functionalUnit.timeUnit = 'year';
    store.monitoringPeriod.unit = 'year';
    store.datacenters[0].energy.carbonIntensity = 1000;
    store.datacenters[0].energy.energyConsumption = 100;
    store.hardware = [
        { ...validHardware(), cpuQuantity: 1, impactManufacturingDistributionEol: 10 },
    ];
}

const text = (html) => html.replace(/<button\b[\s\S]*?<\/button>/g, '').replace(/<[^>]*>/g, '');
async function tooltipText(tooltip) {
    const html = await renderToString(
        createSSRApp({ render: () => h('div', tooltip.$slots.default()) }),
    );
    return text(html);
}

test('inventory statistics use rich translations and identify ignored hardware by name or ID', async () => {
    const result = await renderTables(HardwareInventoryPage, {
        setupStore(store) {
            setupReady(store);
            store.hardware.push({
                ...validHardware(),
                id: 'unfinished-id',
                name: '',
                quantity: null,
            });
        },
        messages: { ...en, inventoryStats: 'Total {total}; elements {elements}; rows {rows}' },
    });
    assert.match(text(result.html), /Total 10\.00; elements 1; rows 2/);
    assert.equal(
        result.computations.filter((display) => display.computation.success === 'partial').length,
        3,
    );
    const diagnostics = await Promise.all(result.tooltips.map(tooltipText));
    assert.ok(
        diagnostics.some(
            (value) =>
                value.includes('quantity: Must be a number.') && value.includes('unfinished-id'),
        ),
    );
    result.store.hardware[1].quantity = 2;
    const repaired = await result.renderAgain();
    assert.match(text(repaired), /Total 10\.00; elements 3; rows 2/);
    assert.doesNotMatch(repaired, /indicator--partial/);
});

test('derived inventory cells diagnose failures in every mode without treating exclusion as failure', async () => {
    for (const mode of ['simple', 'normal', 'advanced']) {
        const result = await renderTables(HardwareInventoryTable, {
            props: { mode },
            setupStore(store) {
                store.hardware = [
                    { ...validHardware(), quantity: null, memoryQuantity: null, storageSize: null },
                ];
            },
        });
        assert.equal(result.computations.length, mode === 'advanced' ? 3 : 1);
        assert.ok(
            result.computations.every((display) => display.computation.success === 'failure'),
        );
        assert.match(await tooltipText(result.tooltips[0]), /quantity: Must be a number/);
        assert.doesNotMatch(result.html, /indicator--partial/);
    }
    const excluded = await renderTables(HardwareInventoryTable, {
        props: { mode: 'simple' },
        setupStore(store) {
            store.hardware = [{ ...validHardware(), isSecondHand: true }];
        },
    });
    assert.match(text(excluded.html), /not counted/);
    assert.doesNotMatch(excluded.html, /indicator--failure|indicator--partial/);
});

test('embodied rows retain independent errors while category totals diagnose ignored rows', async () => {
    const result = await renderTables(ResultsEmbodiedSection, {
        setupStore(store) {
            store.hardware = [
                { ...validHardware(), impactManufacturingDistributionEol: 10 },
                { ...validHardware(), id: 'unfinished', name: 'Unfinished server', quantity: null },
            ];
        },
    });
    const row = result.tables[0].rows[1];
    assert.equal(row.quantity.success, 'failure');
    assert.equal(row.unitEmbodiedEmissionsKg.success, 'success');
    assert.equal(row.rowEmbodiedEmissionsKg.success, 'failure');
    assert.equal(
        result.computations.filter((display) => display.computation.success === 'failure').length,
        2,
    );
    assert.equal(
        result.computations.filter((display) => display.computation.success === 'partial').length,
        2,
    );
    const diagnostics = await Promise.all(result.tooltips.map(tooltipText));
    assert.ok(
        diagnostics.some(
            (value) => value.includes('Unfinished server') && value.includes('1 input ignored'),
        ),
    );
    result.store.hardware[1].quantity = 2;
    const repaired = await result.renderAgain();
    assert.doesNotMatch(repaired, /computation-result-display__indicator/);
    assert.equal(
        result.results.embodiedEmissionsByCategory[0].rows[1].rowEmbodiedEmissionsKg.result,
        0,
    );
});

test('operational totals retain coverage labels and identify ignored datacenters', async () => {
    const result = await renderTables(ResultsOperationalSection, {
        setupStore(store) {
            setupReady(store);
            store.datacenters.push(
                DatacenterDraftSchema.parse({
                    id: 'unfinished',
                    generalInfo: { abbreviation: 'D', name: 'Draft' },
                }),
            );
        },
    });
    assert.match(text(result.html), /100\.00 \(Partial — 1 of 2 datacenters\)/);
    assert.equal(result.computations.length, 1);
    assert.match(await tooltipText(result.tooltips[0]), /D — Draft/);
    assert.match(
        await tooltipText(result.tooltips[0]),
        /energy\.carbonIntensity: Must be a number/,
    );
});

test('functional-unit values preserve units and precision across complete, partial, failed and zero results', async () => {
    const result = await renderTables(ResultsFunctionalUnitSection, { setupStore: setupReady });
    assert.equal(result.computations.length, 3);
    assert.doesNotMatch(result.html, /computation-result-display__indicator/);
    assert.match(text(result.html), /110\.00 kg CO₂/);
    assert.match(text(result.html), /110\.0000 kg CO₂ \/ 110000\.0000 g CO₂/);

    result.store.hardware.push({
        ...validHardware(),
        id: 'unfinished',
        cpuQuantity: 1,
        impactManufacturingDistributionEol: null,
    });
    const partial = await result.renderAgain();
    assert.equal((partial.match(/indicator--partial/g) ?? []).length, 2);
    assert.match(text(partial), /55\.00 kg CO₂ \(Partial\)/);
    assert.match(text(partial), /55\.0000 kg CO₂ \/ 55000\.0000 g CO₂ \(Partial\)/);

    result.store.hardware[1].cpuQuantity = null;
    const failed = await result.renderAgain();
    assert.equal((failed.match(/indicator--failure/g) ?? []).length, 2);
    assert.equal((failed.match(/indicator--partial/g) ?? []).length, 1);

    result.store.hardware.pop();
    result.store.hardware[0].impactManufacturingDistributionEol = 0;
    result.store.datacenters[0].energy.energyConsumption = 0;
    const zero = await result.renderAgain();
    assert.match(text(zero), /0\.00 kg CO₂/);
    assert.match(text(zero), /0\.0000 kg CO₂ \/ 0\.0000 g CO₂/);
    assert.doesNotMatch(zero, /computation-result-display__indicator/);
});

test('footer summaries retain gating, translated word order and their own computation status', async () => {
    const result = await renderTables(MainLayout, {
        setupStore: setupReady,
        messages: {
            ...en,
            mainFooterEmbodied: '{value} embodied',
            mainFooterPerFu: '{value} per FU',
        },
    });
    assert.equal(result.computations.length, 4);
    assert.doesNotMatch(result.html, /computation-result-display__indicator/);
    assert.match(text(result.html), /0\.0 t embodied/);
    assert.match(text(result.html), /Operational 0\.1 t/);
    assert.match(text(result.html), /Total, lifespan 0\.1 tCO₂e/);
    assert.match(text(result.html), /110000\.00 gCO₂e per FU/);

    result.store.hardware.push({
        ...validHardware(),
        id: 'draft',
        impactManufacturingDistributionEol: null,
        cpuQuantity: null,
    });
    const failedRatio = await result.renderAgain();
    assert.equal((failedRatio.match(/indicator--partial/g) ?? []).length, 2);
    assert.equal((failedRatio.match(/indicator--failure/g) ?? []).length, 1);
    assert.match(text(failedRatio), /— per FU/);
    assert.match(text(failedRatio), /0\.1 tCO₂e \(Partial\)/);

    result.store.scope.assessors = '';
    const gated = await result.renderAgain();
    assert.match(text(gated), /— embodied/);
    assert.match(text(gated), /Operational —/);
    assert.match(text(gated), /Total, lifespan —/);
    assert.equal((gated.match(/class="computation-result-display__indicator /g) ?? []).length, 1);
});

test('treemap data still contains only positive accounted values in both variants', async () => {
    const result = await renderTables(ResultsEmbodiedSection, {
        props: { showChart: true },
        setupStore(store) {
            store.hardware = [
                { ...validHardware(), name: 'Counted', impactManufacturingDistributionEol: 10 },
                { ...validHardware(), id: 'zero', name: 'Zero' },
                {
                    ...validHardware(),
                    id: 'unfinished',
                    name: 'Unfinished',
                    impactManufacturingDistributionEol: null,
                },
                {
                    ...validHardware(),
                    id: 'excluded',
                    name: 'Excluded',
                    isSecondHand: true,
                    impactManufacturingDistributionEol: 100,
                },
            ];
        },
    });
    assert.equal(result.charts.length, 2);
    const [element, category] = result.charts.map((chart) => chart.option.series[0].data);
    assert.deepEqual(
        element.map(({ name, value }) => ({ name, value })),
        [{ name: 'Counted', value: 10 }],
    );
    assert.equal(category[0].value, 10);
    assert.deepEqual(
        category[0].children.map(({ name, value }) => ({ name, value })),
        [{ name: 'Counted', value: 10 }],
    );
});

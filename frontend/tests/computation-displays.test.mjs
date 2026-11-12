import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import HardwareInventoryPage from '../src/pages/HardwareInventoryPage.vue';
import ResultsEmbodiedSection from '../src/components/results/ResultsEmbodiedSection.vue';
import ResultsOperationalSection from '../src/components/results/ResultsOperationalSection.vue';
import ResultsFunctionalUnitSection from '../src/components/results/ResultsFunctionalUnitSection.vue';
import MainLayout from '../src/layouts/MainLayout.vue';
import { DatacenterDraftSchema } from '../src/models/Datacenter/schema.ts';
import { HardwareItemDraftSchema } from '../src/models/HardwareItem/schema.ts';
import { renderTables, renderInventoryDialog } from './helpers/render-tables.mjs';
import { setupScope, validEnergy, validHardware } from './helpers/survey-fixtures.mjs';
import en from '../src/i18n/en-GB/index.ts';

function setupReady(store) {
    setupScope(store);
    store.scope.functionalUnit.resourceType = 'CPU';
    store.scope.functionalUnit.timeUnit = 'year';
    store.monitoringPeriod.unit = 'year';
    // Mandatory energy strings must be filled for the datacenter to be computable.
    Object.assign(store.datacenters[0].energy, validEnergy());
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
    // The page-level partial displays are the header element count and the header total;
    // table rows expose their own displays separately.
    assert.equal(
        result.computations.filter((display) => display.computation.success === 'partial').length,
        2,
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

test('derived inventory diagnostics surface in the detail form without treating exclusion as failure', async () => {
    const incomplete = await renderInventoryDialog({
        row: HardwareItemDraftSchema.parse({
            ...validHardware(),
            quantity: null,
            memoryQuantity: null,
            storageQuantity: null,
        }),
    });
    assert.equal(incomplete.computations.length, 3);
    assert.deepEqual(
        incomplete.computations.map((display) => display.computation.success),
        ['failure', 'failure', 'failure'],
    );
    assert.match(await tooltipText(incomplete.tooltips[0]), /quantity: Must be a number/);
    assert.doesNotMatch(incomplete.html, /indicator--partial/);

    // Second-hand rows are excluded from the embodied subtotal, not reported as failures.
    const excluded = await renderInventoryDialog({
        row: HardwareItemDraftSchema.parse({ ...validHardware(), isSecondHand: true }),
    });
    const embodied = excluded.computations[0].computation;
    assert.equal(embodied.success, 'success');
    assert.equal(embodied.result, 0);
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
    const messages = {
        ...en,
        mainFooterEmbodied: '{value} embodied',
        mainFooterPerFu: '{value} per FU',
    };
    const footerComputationDisplays = (html) =>
        (html.match(/class="computation-result-display[ "]/g) ?? []).length;

    const footerText = (html) =>
        text(html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '')
            .replace(/\s+/g, ' ')
            .trim();

    // An empty survey unlock nothing: the footer keeps the save status only (Issue #90).
    const empty = await renderTables(MainLayout, { messages });
    assert.equal(empty.store.resultsStatus, 'not_started');
    assert.equal(empty.computations.length, 0);
    assert.equal(footerComputationDisplays(empty.html), 0);
    assert.doesNotMatch(footerText(empty.html), /embodied|per FU|Total, lifespan/);
    assert.match(footerText(empty.html), new RegExp(en.mainFooterNeverSaved.split('{')[0].trim()));

    // Started but incomplete data keeps the footer gated as well.
    const partial = await renderTables(MainLayout, {
        setupStore(store) {
            setupReady(store);
            store.scope.assessors = '';
        },
        messages,
    });
    assert.equal(partial.store.resultsStatus, 'partial');
    assert.equal(partial.computations.length, 0);
    assert.equal(footerComputationDisplays(partial.html), 0);
    assert.doesNotMatch(footerText(partial.html), /embodied|per FU|Total, lifespan/);

    // Complete survey data unlocks the results, so the footer renders its computation displays.
    const unlocked = await renderTables(MainLayout, {
        setupStore: setupReady,
        messages,
    });
    assert.equal(unlocked.store.resultsStatus, 'complete');
    assert.equal(unlocked.computations.length, 4);
    assert.equal(footerComputationDisplays(unlocked.html), 4);
    assert.doesNotMatch(unlocked.html, /computation-result-display__indicator/);
    assert.match(text(unlocked.html), /0\.0 t embodied/);
    assert.match(text(unlocked.html), /Operational 0\.1 t/);
    assert.match(text(unlocked.html), /Total, lifespan 0\.1 tCO₂e/);
    assert.match(text(unlocked.html), /110000\.00 gCO₂e per FU/);

    // A draft row makes the survey incomplete again, so the footer metrics disappear.
    unlocked.store.hardware.push({
        ...validHardware(),
        id: 'draft',
        impactManufacturingDistributionEol: null,
        cpuQuantity: null,
    });
    const relocked = await unlocked.renderAgain();
    assert.equal(unlocked.store.resultsStatus, 'partial');
    assert.equal((relocked.match(/indicator--partial/g) ?? []).length, 0);
    assert.equal(footerComputationDisplays(relocked), 0);
    assert.doesNotMatch(footerText(relocked), /embodied|per FU|Total, lifespan/);
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

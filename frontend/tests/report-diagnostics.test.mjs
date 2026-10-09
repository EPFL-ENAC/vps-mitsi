import assert from 'node:assert/strict';
import { test } from 'node:test';
import { h, nextTick } from 'vue';
import ResultsPage from '../src/pages/ResultsPage.vue';
import GenerateReportButton from '../src/components/GenerateReportButton.vue';
import ReportPreviewPage from '../src/pages/ReportPreviewPage.vue';
import ResultsEmbodiedSection from '../src/components/results/ResultsEmbodiedSection.vue';
import ResultsOperationalSection from '../src/components/results/ResultsOperationalSection.vue';
import ResultsTotalSection from '../src/components/results/ResultsTotalSection.vue';
import ResultsFunctionalUnitSection from '../src/components/results/ResultsFunctionalUnitSection.vue';
import { UnderlyingServiceDraftSchema } from '../src/models/UnderlyingService/schema.ts';
import { DatacenterDraftSchema } from '../src/models/Datacenter/schema.ts';
import en from '../src/i18n/en-GB/index.ts';
import { renderTables } from './helpers/render-tables.mjs';
import { setupScope, validHardware } from './helpers/survey-fixtures.mjs';

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

function setupIncomplete(store) {
    setupReady(store);
    store.hardware.push({
        ...validHardware(),
        id: 'draft',
        name: 'Draft server',
        quantity: null,
        cpuQuantity: null,
        impactManufacturingDistributionEol: null,
    });
    store.datacenters.push(
        DatacenterDraftSchema.parse({
            id: 'draft-dc',
            generalInfo: { abbreviation: 'D', name: 'Draft datacenter' },
        }),
    );
}

const fields = [
    'hardwareItemCount',
    'totalEmbodiedEmissionsKg',
    'datacenterOperationalResults',
    'totalOperationalEmissionsKg',
    'totalLifespanEmissionsKg',
    'selectedResourceFleetCount',
    'lifespanEmissionsPerResourceKg',
    'emissionsPerFunctionalUnitKg',
];
const text = (html) =>
    html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
const button = (result, label) => {
    const found = result.buttons.find((item) => item.label === label);
    assert.ok(found, `Missing button: ${label}`);
    return found;
};
const warningContent = (result) =>
    renderTables({
        render: () => h('div', result.modalDialogs[0].$slots.default()),
    });

test('unsuccessful computations have ordered computation names and retain current computed instances', async () => {
    const result = await renderTables(ResultsTotalSection, { setupStore: setupIncomplete });
    const entries = result.results.allUnsuccessfulComputations();
    assert.deepEqual(
        entries.map(({ name }) => name),
        fields,
    );
    entries.forEach(({ name, computation }, index) => {
        assert.equal(computation, result.results[fields[index]]);
        assert.ok(en.computationNames[name]);
        assert.notEqual(computation.success, 'success');
    });
    assert.equal(entries[1].computation.inputErrors[0], entries[4].computation.inputErrors[0]);
    const previous = entries[1].computation;
    result.store.hardware.pop();
    result.store.datacenters.pop();
    assert.deepEqual(result.results.allUnsuccessfulComputations(), []);
    assert.notEqual(result.results.totalEmbodiedEmissionsKg, previous);
    result.store.hardware[0].quantity = null;
    result.store.hardware[0].cpuQuantity = null;
    result.store.hardware[0].impactManufacturingDistributionEol = null;
    result.store.datacenters[0].energy.energyConsumption = null;
    const failed = result.results.allUnsuccessfulComputations();
    assert.deepEqual(
        failed.map(({ name }) => name),
        fields,
    );
    assert.ok(failed.every(({ computation }) => computation.success === 'failure'));
});

test('collector excludes successful zeros, v2 computations and failed row-only or nested computations', async () => {
    const result = await renderTables(ResultsTotalSection, { setupStore: setupReady });
    result.store.hardware[0].impactManufacturingDistributionEol = 0;
    result.store.datacenters[0].energy.energyConsumption = 0;
    assert.deepEqual(result.results.allUnsuccessfulComputations(), []);
    result.store.hardware.push({
        ...validHardware(),
        id: 'excluded',
        isSecondHand: true,
        impactManufacturingDistributionEol: null,
        memoryQuantity: null,
    });
    assert.equal(
        result.results.hardwareRowEmbodiedEmissionsKg(result.store.hardware[1]).success,
        'failure',
    );
    assert.deepEqual(result.results.allUnsuccessfulComputations(), []);
    result.store.includeUnderlyingServices = true;
    result.store.underlyingServices = [UnderlyingServiceDraftSchema.parse({})];
    assert.deepEqual(
        result.results.allUnsuccessfulComputations().map(({ name }) => name),
        [
            'totalLifespanEmissionsKg',
            'lifespanEmissionsPerResourceKg',
            'emissionsPerFunctionalUnitKg',
        ],
    );
});

test('complete assessments navigate immediately; invalid scope keeps Generate report disabled', async () => {
    const result = await renderTables(GenerateReportButton, { setupStore: setupReady });
    assert.equal(button(result, en.resultsGenerateReport).disable, false);
    const navigation = new Promise((resolve) => result.router.afterEach(resolve));
    button(result, en.resultsGenerateReport).$emit('click');
    await navigation;
    assert.equal(result.router.currentRoute.value.path, '/report');
    const invalid = await renderTables(GenerateReportButton);
    assert.equal(button(invalid, en.resultsGenerateReport).disable, true);
});

test('results page delegates report generation to its full-width button', async () => {
    const result = await renderTables(ResultsPage, { setupStore: setupIncomplete });
    assert.match(result.html, /class="[^"]*full-width q-mt-md/);
    button(result, en.resultsGenerateReport).$emit('click');
    const warning = await warningContent(result);
    assert.match(text(warning.html), /Total embodied emissions — Partial result/);
});

test('report warning lists translated current computations and only confirmation navigates', async () => {
    const result = await renderTables(GenerateReportButton, { setupStore: setupIncomplete });
    const generate = button(result, en.resultsGenerateReport);
    generate.$emit('click');
    assert.equal(result.router.currentRoute.value.path, '/');
    let warning = await warningContent(result);
    for (const field of fields) assert.ok(text(warning.html).includes(en.computationNames[field]));
    assert.match(text(warning.html), /Partial result/);
    assert.match(text(warning.html), /Failed computation/);
    button(warning, en.reportWarningCancel).$emit('click');
    await nextTick();
    assert.equal(result.router.currentRoute.value.path, '/');

    result.store.hardware.pop();
    generate.$emit('click');
    warning = await warningContent(result);
    assert.doesNotMatch(text(warning.html), /Hardware element count|Total embodied emissions —/);
    assert.match(text(warning.html), /Total operational emissions — Partial result/);
    const navigation = new Promise((resolve) => result.router.afterEach(resolve));
    button(warning, en.reportWarningContinue).$emit('click');
    await navigation;
    assert.equal(result.router.currentRoute.value.path, '/report');
});

test('the whole report uses plain statuses without diagnostic controls or duplicate chart labels', async () => {
    const result = await renderTables(ReportPreviewPage, { setupStore: setupIncomplete });
    assert.equal(result.tooltips.length, 0);
    assert.ok(result.computations.length > 10);
    assert.ok(result.computations.every((display) => display.disableTooltip === true));
    assert.doesNotMatch(result.html, /computation-result-display__indicator|aria-describedby/);
    const contents = text(result.html);
    assert.match(contents, /10\.00 Partial result/);
    assert.match(contents, /100\.00 \(Partial — 1 of 2 datacenters\) Partial result/);
    assert.match(contents, /— Failed computation/);
    for (const title of [
        en.resultsChartTreemapByElement,
        en.resultsChartTreemapByCategory,
        en.resultsChartPieByDatacenter,
        en.resultsChartSplitTitle,
    ]) {
        assert.ok(contents.includes(`${title} Partial result`));
    }
    assert.doesNotMatch(
        contents,
        /Partial Partial result|Unavailable Failed computation|\(Partial\)/,
    );
    assert.equal((result.html.match(/class="report-sheet"/g) ?? []).length, 5);
});

test('plain report sections preserve units, coverage, precision, exclusions, zeros and failed headings', async () => {
    const partial = await renderTables(ResultsFunctionalUnitSection, {
        props: { disableTooltip: true },
        setupStore(store) {
            setupReady(store);
            store.hardware.push({
                ...validHardware(),
                id: 'draft',
                cpuQuantity: 1,
                impactManufacturingDistributionEol: null,
            });
        },
    });
    assert.match(text(partial.html), /55\.00 kg CO₂ Partial result/);
    assert.match(text(partial.html), /55\.0000 kg CO₂ \/ 55000\.0000 g CO₂ Partial result/);
    assert.doesNotMatch(text(partial.html), /\(Partial\)/);
    for (const component of [
        ResultsEmbodiedSection,
        ResultsOperationalSection,
        ResultsTotalSection,
    ]) {
        const failed = await renderTables(component, {
            props: { disableTooltip: true, showChart: true },
            setupStore(store) {
                setupReady(store);
                store.hardware[0].impactManufacturingDistributionEol = null;
                store.datacenters[0].energy.energyConsumption = null;
            },
        });
        assert.equal(failed.tooltips.length, 0);
        assert.doesNotMatch(failed.html, /computation-result-display__indicator/);
        const contents = text(failed.html);
        assert.match(contents, /— Failed computation/);
        if (component === ResultsTotalSection)
            assert.match(contents, /Emissions repartition Partial result/);
        else
            assert.ok(
                contents.includes(
                    `${component === ResultsEmbodiedSection ? en.resultsChartTreemapByElement : en.resultsChartPieByDatacenter} Failed computation`,
                ),
            );
    }
    const zero = await renderTables(ReportPreviewPage, {
        setupStore(store) {
            setupReady(store);
            store.hardware[0].impactManufacturingDistributionEol = 0;
            store.datacenters[0].energy.energyConsumption = 0;
            store.hardware.push({
                ...validHardware(),
                id: 'excluded',
                isSecondHand: true,
                impactManufacturingDistributionEol: 100,
            });
        },
    });
    assert.doesNotMatch(zero.html, /computation-result-display__status/);
    assert.match(text(zero.html), /0\.00 kg CO₂/);
    assert.match(text(zero.html), /0\.0000 kg CO₂ \/ 0\.0000 g CO₂/);
    assert.match(text(zero.html), /100\.00 \(not counted\)/);
});

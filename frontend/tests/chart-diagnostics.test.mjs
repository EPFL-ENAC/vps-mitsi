import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import ResultsEmbodiedSection from '../src/components/results/ResultsEmbodiedSection.vue';
import ResultsOperationalSection from '../src/components/results/ResultsOperationalSection.vue';
import ResultsTotalSection from '../src/components/results/ResultsTotalSection.vue';
import TotalSplitPieChart from '../src/components/results/TotalSplitPieChart.vue';
import { DatacenterDraftSchema } from '../src/models/Datacenter/schema.ts';
import { UnderlyingServiceDraftSchema } from '../src/models/UnderlyingService/schema.ts';
import { ComputationResult } from '../src/utils/computation.ts';
import { BLUE_SCALE, RED_SCALE } from '../src/utils/charts.ts';
import { useSurveyResultsStore } from '../src/stores/surveyResults.ts';
import en from '../src/i18n/en-GB/index.ts';
import { renderTables } from './helpers/render-tables.mjs';
import { setupScope, validHardware } from './helpers/survey-fixtures.mjs';

const statuses = ['success', 'partial', 'failure'];
const text = (html) =>
    html
        .replace(/<button\b[\s\S]*?<\/button>/g, '')
        .replace(/<[^>]*>/g, '')
        .trim();

function heading(html, title) {
    const match = html.match(
        new RegExp(`<div class="text-subtitle1[^>]*>\\s*${title}([\\s\\S]*?)</div>`),
    );
    assert.ok(match, `Missing chart title: ${title}`);
    return match[1];
}

async function tooltipText(tooltip) {
    return text(
        await renderToString(createSSRApp({ render: () => h('div', tooltip.$slots.default()) })),
    );
}

function setupSources(
    store,
    embodiedStatus = 'success',
    operationalStatus = 'success',
    value = 10,
) {
    setupScope(store);
    store.monitoringPeriod.unit = 'year';
    const readyHardware = { ...validHardware(), impactManufacturingDistributionEol: value };
    const draftHardware = {
        ...validHardware(),
        id: 'draft-hw',
        name: 'Draft server',
        impactManufacturingDistributionEol: null,
    };
    store.hardware =
        embodiedStatus === 'success'
            ? [readyHardware]
            : embodiedStatus === 'partial'
              ? [readyHardware, draftHardware]
              : [draftHardware];
    const readyDatacenter = store.datacenters[0];
    readyDatacenter.energy.carbonIntensity = 1000;
    readyDatacenter.energy.energyConsumption = value * 10;
    const draftDatacenter = DatacenterDraftSchema.parse({
        id: 'draft-dc',
        generalInfo: { abbreviation: 'D', name: 'Draft datacenter' },
    });
    store.datacenters =
        operationalStatus === 'success'
            ? [readyDatacenter]
            : operationalStatus === 'partial'
              ? [readyDatacenter, draftDatacenter]
              : [draftDatacenter];
}

test('both treemap headings show their own status and named diagnostics, including unavailable and zero charts', async () => {
    for (const status of statuses) {
        const result = await renderTables(ResultsEmbodiedSection, {
            props: { showChart: true },
            setupStore: (store) => setupSources(store, status),
        });
        const headings = [en.resultsChartTreemapByElement, en.resultsChartTreemapByCategory].map(
            (title) => heading(result.html, title),
        );
        for (const content of headings) {
            assert.equal(
                text(content),
                status === 'success' ? '' : status === 'partial' ? 'Partial' : 'Unavailable',
            );
            if (status === 'success') assert.doesNotMatch(content, /<button/);
            else assert.match(content, new RegExp(`indicator--${status}`));
        }
        const displays = result.computations.slice(-2);
        assert.ok(
            displays.every(
                (display) => display.computation === result.results.totalEmbodiedEmissionsKg,
            ),
        );
        if (status !== 'success') {
            for (const tooltip of result.tooltips.slice(-2)) {
                assert.match(
                    await tooltipText(tooltip),
                    /impactManufacturingDistributionEol: Must be a number/,
                );
                assert.match(await tooltipText(tooltip), /Draft server/);
            }
        }
        assert.equal(result.charts.length, status === 'failure' ? 0 : 2);
        for (const chart of result.charts) assert.equal(chart.option.series[0].data[0].value, 10);
    }
    const zero = await renderTables(ResultsEmbodiedSection, {
        props: { showChart: true },
        setupStore: (store) => setupSources(store, 'success', 'success', 0),
    });
    assert.equal(zero.charts.length, 0);
    assert.equal(text(heading(zero.html, en.resultsChartTreemapByElement)), '');
    assert.equal(text(heading(zero.html, en.resultsChartTreemapByCategory)), '');
});

test('datacenter heading preserves status, named inputs, chart values and percentages', async () => {
    for (const status of statuses) {
        const result = await renderTables(ResultsOperationalSection, {
            props: { showChart: true },
            setupStore: (store) => setupSources(store, 'success', status),
        });
        const content = heading(result.html, en.resultsChartTreemapByDatacenter);
        assert.equal(
            text(content),
            status === 'success' ? '' : status === 'partial' ? 'Partial' : 'Unavailable',
        );
        if (status === 'success') assert.doesNotMatch(content, /<button/);
        else {
            assert.match(content, new RegExp(`indicator--${status}`));
            assert.match(await tooltipText(result.tooltips.at(-1)), /D — Draft datacenter/);
        }
        assert.equal(result.charts.length, status === 'failure' ? 0 : 1);
        if (result.charts.length) {
            const option = result.charts[0].option;
            assert.equal(option.series.length, 1);
            assert.equal(option.series[0].type, 'treemap');
            assert.deepEqual(option.series[0].data, [
                { name: 'DC — Datacenter', value: 100, itemStyle: { color: RED_SCALE[0] } },
            ]);
            assert.equal(
                option.tooltip.formatter({ name: 'DC — Datacenter', value: 100 }),
                'DC — Datacenter<br/>100.00 (100.0%)',
            );
        }
    }
    const zero = await renderTables(ResultsOperationalSection, {
        props: { showChart: true },
        setupStore: (store) => setupSources(store, 'success', 'success', 0),
    });
    assert.equal(zero.charts.length, 0);
    assert.equal(text(heading(zero.html, en.resultsChartTreemapByDatacenter)), '');
});

test('datacenter treemap sorts emissions into equal-width bands with correct shares', async () => {
    const result = await renderTables(ResultsOperationalSection, {
        props: { showChart: true },
        setupStore(store) {
            setupSources(store);
            store.datacenters = [
                DatacenterDraftSchema.parse({
                    id: 'smaller',
                    generalInfo: { abbreviation: 'S', name: 'Smaller' },
                    energy: { carbonIntensity: 1000, energyConsumption: 25 },
                }),
                DatacenterDraftSchema.parse({
                    id: 'larger',
                    generalInfo: { abbreviation: 'L', name: 'Larger' },
                    energy: { carbonIntensity: 1000, energyConsumption: 75 },
                }),
            ];
        },
    });
    assert.equal(result.results.totalOperationalEmissionsKg.result, 100);
    assert.equal(result.charts.length, 1);
    const option = result.charts[0].option;
    assert.deepEqual(
        option.series.map(({ type, left, width, data }) => ({ type, left, width, data })),
        [
            {
                type: 'treemap',
                left: '0%',
                width: '50%',
                data: [
                    {
                        name: 'L — Larger',
                        value: 75,
                        itemStyle: { color: 'rgba(210, 95, 95, 1.00)' },
                    },
                ],
            },
            {
                type: 'treemap',
                left: '50%',
                width: '50%',
                data: [
                    {
                        name: 'S — Smaller',
                        value: 25,
                        itemStyle: { color: 'rgba(210, 95, 95, 0.60)' },
                    },
                ],
            },
        ],
    );
    for (const series of option.series) {
        const item = series.data[0];
        assert.equal(series.label.formatter(item), `${item.value.toFixed(1)}%`);
        assert.equal(
            option.tooltip.formatter(item),
            `${item.name}<br/>${item.value.toFixed(2)} (${item.value.toFixed(1)}%)`,
        );
    }
    const captions = [...result.html.matchAll(/class="datacenter-captions__name">([^<]+)</g)].map(
        (match) => match[1],
    );
    assert.deepEqual(captions, ['L — Larger', 'S — Smaller']);
});

for (const embodiedStatus of statuses) {
    for (const operationalStatus of statuses) {
        test(`split chart for ${embodiedStatus} embodied / ${operationalStatus} operational renders available sources`, async () => {
            const result = await renderTables(ResultsTotalSection, {
                props: { showChart: true },
                setupStore: (store) => setupSources(store, embodiedStatus, operationalStatus),
            });
            const expectedStatus =
                embodiedStatus === 'success' && operationalStatus === 'success'
                    ? 'success'
                    : embodiedStatus === 'failure' && operationalStatus === 'failure'
                      ? 'failure'
                      : 'partial';
            const display = result.computations.at(-1);
            assert.equal(display.computation.success, expectedStatus);
            assert.equal(
                display.computation.result,
                expectedStatus === 'failure' ? null : undefined,
            );
            assert.equal(
                text(heading(result.html, en.resultsChartSplitTitle)),
                expectedStatus === 'success'
                    ? ''
                    : expectedStatus === 'failure'
                      ? 'Unavailable'
                      : 'Partial',
            );
            if (expectedStatus === 'failure') {
                assert.match(heading(result.html, en.resultsChartSplitTitle), /indicator--failure/);
                assert.doesNotMatch(
                    heading(result.html, en.resultsChartSplitTitle),
                    /Partial|indicator--partial/,
                );
            } else {
                assert.doesNotMatch(
                    heading(result.html, en.resultsChartSplitTitle),
                    /Unavailable|indicator--failure/,
                );
            }
            assert.deepEqual(display.computation.inputErrors, [
                ...result.results.totalEmbodiedEmissionsKg.inputErrors,
                ...result.results.totalOperationalEmissionsKg.inputErrors,
            ]);
            assert.deepEqual(display.computation.ignoredInputs, [
                ...result.results.totalEmbodiedEmissionsKg.ignoredInputs,
                ...result.results.totalOperationalEmissionsKg.ignoredInputs,
            ]);
            const chartProps = result.splitCharts[0];
            assert.equal(chartProps.embodied, result.results.totalEmbodiedEmissionsKg);
            assert.equal(chartProps.operational, result.results.totalOperationalEmissionsKg);
            assert.ok(!('total' in chartProps.$props));
            assert.ok(!('underlying' in chartProps.$props));
            assert.equal(
                result.charts.length,
                embodiedStatus === 'failure' && operationalStatus === 'failure' ? 0 : 1,
            );
            if (result.charts.length) {
                const option = result.charts[0].option;
                const expectedData = [
                    ...(embodiedStatus === 'failure'
                        ? []
                        : [
                              {
                                  name: en.resultsRowEmbodied,
                                  value: 10,
                                  itemStyle: { color: BLUE_SCALE[0] },
                              },
                          ]),
                    ...(operationalStatus === 'failure'
                        ? []
                        : [
                              {
                                  name: en.resultsRowOperational,
                                  value: 100,
                                  itemStyle: { color: RED_SCALE[0] },
                              },
                          ]),
                ];
                assert.equal(option.series.length, 1);
                assert.deepEqual(option.series[0].data, expectedData);
                assert.equal(option.series[0].type, 'pie');
                assert.deepEqual(option.series[0].radius, ['40%', '70%']);
                assert.equal(option.series[0].label.formatter, '{b}');
                assert.deepEqual(option.legend, { bottom: 0 });
                if (embodiedStatus !== 'failure') {
                    assert.equal(
                        option.tooltip.formatter({ name: en.resultsRowEmbodied, value: 10 }),
                        `Embodied emissions<br/>10.00 (${operationalStatus === 'failure' ? '100.0' : '9.1'}%)`,
                    );
                }
                if (operationalStatus !== 'failure') {
                    assert.equal(
                        option.tooltip.formatter({ name: en.resultsRowOperational, value: 100 }),
                        `Operational emissions<br/>100.00 (${embodiedStatus === 'failure' ? '100.0' : '90.9'}%)`,
                    );
                }
            } else {
                assert.match(result.html, /class="text-grey-6 text-center q-py-md">—<\/div>/);
            }
            if (expectedStatus === 'partial') {
                const diagnostics = await tooltipText(result.tooltips.at(-1));
                assert.doesNotMatch(diagnostics, /Draft server|Draft datacenter/);
                if (embodiedStatus !== 'success' && operationalStatus !== 'success') {
                    assert.match(
                        diagnostics,
                        /impactManufacturingDistributionEol:[\s\S]*energy\.carbonIntensity:/,
                    );
                    assert.match(diagnostics, /2 inputs ignored/);
                }
            }
        });
    }
}

test('split title ignores underlying-service diagnostics and successful zero values remain complete', async () => {
    const result = await renderTables(ResultsTotalSection, {
        props: { showChart: true },
        setupStore(store) {
            setupSources(store, 'success', 'success', 0);
            store.includeUnderlyingServices = true;
            store.underlyingServices = [UnderlyingServiceDraftSchema.parse({})];
        },
    });
    assert.equal(result.results.totalLifespanEmissionsKg.success, 'partial');
    assert.equal(result.computations.at(-1).computation.success, 'success');
    assert.doesNotMatch(
        heading(result.html, en.resultsChartSplitTitle),
        /Partial|Unavailable|<button/,
    );
    assert.equal(result.results.totalEmbodiedEmissionsKg.result, 0);
    assert.equal(result.results.totalOperationalEmissionsKg.result, 0);
    assert.equal(result.charts.length, 0);
    assert.match(result.html, /class="text-grey-6 text-center q-py-md">—<\/div>/);
});

test('standalone split chart keeps a partial heading and fallback for a single available zero', async () => {
    for (const source of ['embodied', 'operational']) {
        const result = await renderTables(TotalSplitPieChart, {
            props: {
                embodied:
                    source === 'embodied'
                        ? ComputationResult.success(0)
                        : ComputationResult.failure(),
                operational:
                    source === 'operational'
                        ? ComputationResult.partial(0)
                        : ComputationResult.failure(),
                labels: { embodied: 'Hardware', operational: 'Energy' },
            },
        });
        assert.equal((result.html.match(/Emissions repartition/g) ?? []).length, 1);
        assert.equal(text(heading(result.html, en.resultsChartSplitTitle)), 'Partial');
        assert.match(await tooltipText(result.tooltips[0]), /No further details available/);
        assert.equal(result.splitCharts[0][source].result, 0);
        assert.equal(result.computations[0].computation.success, 'partial');
        assert.equal(result.charts.length, 0);
        assert.match(result.html, /class="text-grey-6 text-center q-py-md">—<\/div>/);
    }
});

test('standalone split chart preserves custom labels and colors for either available source', async () => {
    for (const source of ['embodied', 'operational']) {
        const result = await renderTables(TotalSplitPieChart, {
            props: {
                embodied:
                    source === 'embodied'
                        ? ComputationResult.success(10)
                        : ComputationResult.failure(),
                operational:
                    source === 'operational'
                        ? ComputationResult.partial(10)
                        : ComputationResult.failure(),
                labels: { embodied: 'Hardware', operational: 'Energy' },
            },
        });
        assert.equal((result.html.match(/Emissions repartition/g) ?? []).length, 1);
        assert.equal(text(heading(result.html, en.resultsChartSplitTitle)), 'Partial');
        assert.equal(result.charts.length, 1);
        const option = result.charts[0].option;
        const name = source === 'embodied' ? 'Hardware' : 'Energy';
        assert.deepEqual(option.series[0].data, [
            {
                name,
                value: 10,
                itemStyle: { color: source === 'embodied' ? BLUE_SCALE[0] : RED_SCALE[0] },
            },
        ]);
        assert.equal(option.tooltip.formatter({ name, value: 10 }), `${name}<br/>10.00 (100.0%)`);
        assert.equal(option.series[0].label.formatter, '{b}');
    }
});

test('split chart preserves a successful zero beside a positive source and computes their shares', async () => {
    for (const zeroSource of ['embodied', 'operational']) {
        const result = await renderTables(TotalSplitPieChart, {
            props: {
                embodied: ComputationResult.success(zeroSource === 'embodied' ? 0 : 10),
                operational: ComputationResult.success(zeroSource === 'operational' ? 0 : 10),
                labels: { embodied: 'Hardware', operational: 'Energy' },
            },
        });
        assert.equal(result.computations[0].computation.success, 'success');
        assert.equal(text(heading(result.html, en.resultsChartSplitTitle)), '');
        assert.equal(result.charts.length, 1);
        const option = result.charts[0].option;
        assert.deepEqual(
            option.series[0].data.map(({ name, value }) => ({ name, value })),
            [
                { name: 'Hardware', value: zeroSource === 'embodied' ? 0 : 10 },
                { name: 'Energy', value: zeroSource === 'operational' ? 0 : 10 },
            ],
        );
        for (const item of option.series[0].data) {
            const percentage = item.value === 0 ? '0.0' : '100.0';
            assert.equal(
                option.tooltip.formatter(item),
                `${item.name}<br/>${item.value.toFixed(2)} (${percentage}%)`,
            );
        }
        assert.equal(option.series[0].label.formatter, '{b}');
    }
});

test('split heading retains repeated diagnostics and supports partial sources with no details', async () => {
    const result = await renderTables(ResultsTotalSection, {
        props: { showChart: true },
        setupStore(store) {
            setupSources(store, 'partial', 'partial');
            store.hardware.push({ ...store.hardware[1], id: 'another-draft' });
        },
    });
    const diagnostics = await tooltipText(result.tooltips.at(-1));
    assert.equal((diagnostics.match(/impactManufacturingDistributionEol:/g) ?? []).length, 2);
    assert.match(diagnostics, /Input validation 3/);
    assert.match(diagnostics, /3 inputs ignored/);

    // Supply a valid computation with deliberately empty diagnostics through the
    // store's public facade, without replacing the component or its tooltip.
    const emptyDetails = await renderTables(
        {
            setup() {
                const results = useSurveyResultsStore();
                Object.defineProperty(results, 'totalEmbodiedEmissionsKg', {
                    value: ComputationResult.partial(10),
                    configurable: true,
                });
                return () => h(ResultsTotalSection, { showChart: true });
            },
        },
        { setupStore: setupSources },
    );
    assert.equal(text(heading(emptyDetails.html, en.resultsChartSplitTitle)), 'Partial');
    assert.match(await tooltipText(emptyDetails.tooltips.at(-1)), /No further details available/);
});

test('heading statuses translate and disappear when the sources are repaired', async () => {
    const messages = { ...en, resultsPartial: 'Incomplete', resultsUnavailable: 'Cannot compute' };
    const embodied = await renderTables(ResultsEmbodiedSection, {
        props: { showChart: true },
        messages,
        setupStore: (store) => setupSources(store, 'failure'),
    });
    assert.equal(text(heading(embodied.html, en.resultsChartTreemapByElement)), 'Cannot compute');
    embodied.store.hardware[0].impactManufacturingDistributionEol = 10;
    assert.equal(text(heading(await embodied.renderAgain(), en.resultsChartTreemapByElement)), '');

    const split = await renderTables(ResultsTotalSection, {
        props: { showChart: true },
        messages,
        setupStore: (store) => setupSources(store, 'partial', 'partial'),
    });
    assert.equal(text(heading(split.html, en.resultsChartSplitTitle)), 'Incomplete');
    split.store.hardware[1].impactManufacturingDistributionEol = 0;
    split.store.datacenters[1].energy.carbonIntensity = 0;
    split.store.datacenters[1].energy.energyConsumption = 0;
    assert.equal(text(heading(await split.renderAgain(), en.resultsChartSplitTitle)), '');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createI18n } from 'vue-i18n';
import { Quasar } from 'quasar';
import { z } from 'zod';
import ComputationResultDisplay from '../src/components/ComputationResultDisplay.vue';
import ResultsTotalSection from '../src/components/results/ResultsTotalSection.vue';
import { ComputationResult } from '../src/utils/computation.ts';
import { formatKg } from '../src/utils/format.ts';
import en from '../src/i18n/en-GB/index.ts';
import { renderTables } from './helpers/render-tables.mjs';
import { setupScope, validHardware } from './helpers/survey-fixtures.mjs';

/** Inspect the real tooltip's slot separately: Quasar portals are closed during SSR. */
async function renderResult(computation, { props = {}, slots = {}, messages = en } = {}) {
    let tooltip;
    const context = { req: { headers: {} } };
    const app = createSSRApp({
        render: () => h(ComputationResultDisplay, { computation, ...props }, slots),
    });
    app.mixin({
        created() {
            if (this.$options.name === 'QTooltip') tooltip = this;
        },
    });
    app.use(Quasar, {}, context);
    app.use(createI18n({ legacy: false, locale: 'en', messages: { en: messages } }));
    const html = await renderToString(app, context);
    const diagnosticHtml = tooltip
        ? await renderToString(createSSRApp({ render: () => h('div', tooltip.$slots.default()) }))
        : '';
    return { html, diagnosticHtml, tooltip };
}

const text = (html) => html.replace(/<[^>]*>/g, '');
const errorFor = (schema, input) => schema.safeParse(input).error;

test('successful values preserve zero and arbitrary values without an indicator or tooltip', async () => {
    for (const value of [0, 'ready', false, { count: 2 }]) {
        const result = await renderResult(ComputationResult.success(value));
        assert.equal(result.tooltip, undefined);
        assert.doesNotMatch(result.html, /<button/);
        assert.match(
            text(result.html),
            new RegExp(typeof value === 'object' ? 'count' : String(value)),
        );
    }
    const formatted = await renderResult(ComputationResult.success(0), {
        props: { formatValue: formatKg },
    });
    assert.equal(text(formatted.html), '0.00');
});

test('partial and failed computations have accessible indicators and useful empty diagnostics', async () => {
    for (const computation of [ComputationResult.partial(0), ComputationResult.failure()]) {
        const result = await renderResult(computation);
        assert.match(result.html, /<button type="button"/);
        assert.match(result.html, new RegExp(`indicator--${computation.success}`));
        assert.match(result.html, new RegExp(en.computationResult[computation.success].label));
        assert.match(
            result.diagnosticHtml,
            new RegExp(en.computationResult[computation.success].explanation),
        );
        assert.match(result.diagnosticHtml, /No further details available/);
        assert.equal(result.tooltip.noParentEvent, true);
        assert.equal(result.tooltip.modelValue, false);
        assert.match(result.tooltip.$attrs.id, /^computation-tooltip-/);
        assert.ok(result.tooltip.maxHeight);
        assert.ok(result.tooltip.maxWidth);
    }
    const partial = await renderResult(ComputationResult.partial(0), {
        props: { formatValue: formatKg },
    });
    assert.match(text(partial.html), /^0\.00/);
    const missing = await renderResult(ComputationResult.failure(), {
        props: {
            missingLabel: 'Unavailable',
            formatValue: () => assert.fail('No failure formatting'),
        },
    });
    assert.match(text(missing.html), /^Unavailable/);
    assert.match(text((await renderResult(ComputationResult.failure())).html), /^—/);
});

test('diagnostics preserve paths, repeated errors, and independent ignored-input counts', async () => {
    const nested = errorFor(
        z.object({ rows: z.array(z.object({ quantity: z.number().min(1) })) }),
        {
            rows: [{ quantity: 0 }],
        },
    );
    const root = errorFor(z.string().min(1), '');
    const custom = errorFor(
        z.string().refine(() => false, 'Check the measurement source.'),
        'source',
    );
    const result = await renderResult(
        ComputationResult.partial(
            4,
            [nested, root, nested, custom],
            [{ name: 'Do not serialize me' }],
        ),
    );
    assert.equal((result.diagnosticHtml.match(/rows\.0\.quantity/g) ?? []).length, 2);
    assert.equal((result.diagnosticHtml.match(/Must be at least 1/g) ?? []).length, 2);
    assert.match(result.diagnosticHtml, /Input:<\/strong> Must not be empty/);
    assert.match(result.diagnosticHtml, /Check the measurement source/);
    assert.match(result.diagnosticHtml, /Input validation 4/);
    assert.match(result.diagnosticHtml, /1 input ignored/);
    assert.doesNotMatch(result.diagnosticHtml, /Do not serialize me|No further details/);

    const ignoredOnly = await renderResult(ComputationResult.failure([], ['a', 'b']));
    assert.match(ignoredOnly.diagnosticHtml, /2 inputs ignored/);
    assert.doesNotMatch(ignoredOnly.diagnosticHtml, /No further details/);
});

test('value, failure, and indicator slots receive narrowed computations', async () => {
    const success = ComputationResult.success({ label: 'Available' });
    const rendered = await renderResult(success, {
        props: { formatValue: () => assert.fail('Slot replaces formatting') },
        slots: {
            default({ result, computation }) {
                assert.equal(computation, success);
                return h('b', result.label);
            },
            failure: () => assert.fail('Success cannot render failure slot'),
        },
    });
    assert.match(rendered.html, /<b>Available<\/b>/);

    const failure = ComputationResult.failure();
    const failed = await renderResult(failure, {
        slots: {
            default: () => assert.fail('Failure cannot render value slot'),
            failure({ computation }) {
                assert.equal(computation, failure);
                return 'No measurement';
            },
            indicator({ computation }) {
                assert.equal(computation, failure);
                return h('span', 'Details');
            },
        },
    });
    assert.match(failed.html, /No measurement/);
    assert.match(failed.html, /<span>Details<\/span>/);
    assert.doesNotMatch(failed.html, /info_outline/);
    assert.match(failed.html, /aria-label=/);
});

test('issue and ignored-input slots customize independent entries without losing defaults', async () => {
    const error = errorFor(z.object({ quantity: z.number() }), {});
    const inputs = [{ name: 'Server A' }, { name: 'Server B' }];
    const issues = [];
    const ignored = [];
    const result = await renderResult(ComputationResult.failure([error, error], inputs), {
        slots: {
            issue(props) {
                issues.push(props);
                return `Issue ${props.errorIndex}:${props.issueIndex}`;
            },
            'ignored-input'(props) {
                ignored.push(props);
                return props.input.name;
            },
        },
    });
    assert.deepEqual(
        issues.map(({ issue, errorIndex, issueIndex }) => [issue, errorIndex, issueIndex]),
        [
            [error.issues[0], 0, 0],
            [error.issues[0], 1, 0],
        ],
    );
    assert.deepEqual(
        ignored,
        inputs.map((input, index) => ({ input, index })),
    );
    assert.match(result.diagnosticHtml, /2 inputs ignored/);
    assert.match(result.diagnosticHtml, /Issue 0:0/);
    assert.match(result.diagnosticHtml, /Server A[\s\S]*Server B/);
    assert.doesNotMatch(result.diagnosticHtml, /Must be a number/);
});

test('tooltip slot replaces all defaults and diagnostic text follows translations', async () => {
    const computation = ComputationResult.partial(2, [], ['ignored']);
    const custom = await renderResult(computation, {
        slots: {
            tooltip({ computation: received }) {
                assert.equal(received, computation);
                return 'Custom explanation';
            },
            'ignored-input': () => assert.fail('Whole tooltip override suppresses entry slots'),
        },
    });
    assert.equal(text(custom.diagnosticHtml), 'Custom explanation');
    const translated = await renderResult(ComputationResult.failure(), {
        messages: {
            ...en,
            mainNotApplicable: 'Missing',
            computationResult: {
                ...en.computationResult,
                failure: { label: 'Translated label', explanation: 'Translated explanation' },
                noDetails: 'Translated fallback',
            },
        },
    });
    assert.match(text(translated.html), /^Missing/);
    assert.match(translated.html, /aria-label="Translated label"/);
    assert.match(translated.diagnosticHtml, /Translated explanation/);
    assert.match(translated.diagnosticHtml, /Translated fallback/);
});

test('totals keep numeric formatting, coverage labels, emphasis, and status-specific indicators', async () => {
    const result = await renderTables(ResultsTotalSection, {
        setupStore(store) {
            setupScope(store);
            store.datacenters = [];
            store.hardware = [
                { ...validHardware(), impactManufacturingDistributionEol: 10 },
                { ...validHardware(), id: 'unfinished', impactManufacturingDistributionEol: null },
            ];
        },
    });
    assert.equal((result.html.match(/indicator--partial/g) ?? []).length, 2);
    assert.doesNotMatch(result.html, /indicator--failure/);
    assert.match(text(result.html), /10\.00 \(Partial\)/);
    assert.match(result.html, /<strong><span class="computation-result-display">/);

    const empty = await renderTables(ResultsTotalSection);
    assert.equal((empty.html.match(/indicator--failure/g) ?? []).length, 2);

    const complete = await renderTables(ResultsTotalSection, {
        setupStore(store) {
            setupScope(store);
            store.datacenters[0].energy.carbonIntensity = 1000;
            store.datacenters[0].energy.energyConsumption = 100;
            store.monitoringPeriod.unit = 'year';
            store.hardware = [validHardware()];
        },
    });
    assert.doesNotMatch(complete.html, /computation-result-display__indicator/);
    assert.match(text(complete.html), /100\.00/);
});

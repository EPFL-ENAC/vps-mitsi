import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createI18n } from 'vue-i18n';
import en from '../src/i18n/en-GB/index.ts';
import { FunctionalUnitSchema } from '../src/models/FunctionalUnit/schema.ts';
import {
    buildFunctionalUnitSentence,
    formatPueInclusion,
    formatResult,
} from '../src/utils/format.ts';

test('missing results use the supplied label without formatting or a partial suffix', () => {
    assert.equal(
        formatResult(null, {
            missingLabel: 'Not available',
            partialLabel: 'Partial',
            formatValue: () => assert.fail('Missing values should not be formatted'),
        }),
        'Not available',
    );
});

test('complete and partial results preserve zero and use caller-provided labels', () => {
    const options = { missingLabel: '—' };
    assert.equal(formatResult(150, options), '150.00');
    assert.equal(formatResult(0, options), '0.00');
    assert.equal(formatResult(150, { ...options, partialLabel: '' }), '150.00');
    assert.equal(formatResult(150, { ...options, partialLabel: 'Partial' }), '150.00 (Partial)');
    assert.equal(formatResult(0, { ...options, partialLabel: 'Partial' }), '0.00 (Partial)');
    assert.equal(
        formatResult(100, { ...options, partialLabel: 'Partial — 1 of 2 datacenters' }),
        '100.00 (Partial — 1 of 2 datacenters)',
    );
});

test('custom unit formatting works with complete and partial results', () => {
    const options = {
        missingLabel: '—',
        formatValue: (value) => `${value / 1000} t`,
    };
    assert.equal(formatResult(100, options), '0.1 t');
    assert.equal(
        formatResult(100, { ...options, partialLabel: 'Partial — 1 of 2 datacenters' }),
        '0.1 t (Partial — 1 of 2 datacenters)',
    );
});

test('functional-unit text uses the current translated sentence and time unit', () => {
    const { t, locale } = createI18n({
        legacy: false,
        locale: 'en',
        messages: {
            en,
            alternate: {
                scopeFuSentence: '{count} {type}: {duration} {unit}',
                scopeTimeUnit_day: 'days',
            },
        },
    }).global;
    const fu = FunctionalUnitSchema.parse({
        timeUnit: 'day',
        usageDuration: 2,
        resourceCount: 3,
        resourceType: 'CPU',
    });
    assert.equal(buildFunctionalUnitSentence(t, fu), 'Usage of 2 day of the service with 3 CPU');
    locale.value = 'alternate';
    assert.equal(buildFunctionalUnitSentence(t, fu), '3 CPU: 2 days');
});

test('PUE labels follow schema normalization and the calculation convention', () => {
    const { t } = createI18n({ legacy: false, locale: 'en', messages: { en } }).global;
    for (const pue of [null, '', 0]) {
        assert.equal(formatPueInclusion(t, pue), 'not included');
    }
    assert.equal(formatPueInclusion(t, 1), 'included (1)');
    assert.equal(formatPueInclusion(t, 1.5), 'included (1.5)');
    for (const pue of [-1, 'invalid', NaN]) {
        assert.equal(formatPueInclusion(t, pue), '—');
    }
});

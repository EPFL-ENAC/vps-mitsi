import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatResult } from '../src/utils/format.ts';

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

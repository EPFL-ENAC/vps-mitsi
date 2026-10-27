import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MITSI_SCHEMA_VERSION, MitsiStateDraftSchema } from '../src/models/MitsiState/schema.ts';
import { isImportEmpty, isStateEmpty, parseState } from '../src/models/MitsiState/utils.ts';

import { defaultExportMetadata, validHardware } from './helpers/survey-fixtures.mjs';

/** A blank draft produced by the schema defaults (no store involved). */
function blankState(overrides = {}) {
    return MitsiStateDraftSchema.parse({
        schemaVersion: MITSI_SCHEMA_VERSION,
        ...overrides,
    });
}

test('isStateEmpty only flags assessments without scope names, hardware, or datacenters', () => {
    assert.equal(isStateEmpty(blankState()), true);

    for (const field of ['organizationName', 'serviceName', 'function']) {
        assert.equal(isStateEmpty(blankState({ scope: { [field]: 'Filled' } })), false, field);
    }

    assert.equal(
        isStateEmpty(blankState({ hardware: [validHardware()], datacenters: [] })),
        false,
        'hardware row',
    );
    assert.equal(
        isStateEmpty(blankState({ datacenters: [{ id: 'dc1' }] })),
        false,
        'datacenter row',
    );
});

test('parseState returns a validated state, drops orphan hardware, and rejects invalid payloads', () => {
    assert.equal(parseState(null), null);
    assert.equal(parseState({}), null);
    assert.equal(parseState({ ...blankState(), schemaVersion: MITSI_SCHEMA_VERSION + 1 }), null);

    const withOrphan = {
        ...blankState({ datacenters: [{ id: 'dc1' }] }),
        hardware: [validHardware(), { ...validHardware(), id: 'h2', datacenterId: 'missing' }],
    };
    const parsed = parseState(withOrphan);
    assert.ok(parsed);
    // The real orphan is filtered out while the assigned row survives.
    assert.deepEqual(
        parsed.hardware.map((row) => row.id),
        ['h1'],
    );
});

test('parseState keeps unassigned rows (empty datacenterId) as unfinished drafts', () => {
    const withUnassigned = {
        ...blankState({ datacenters: [{ id: 'dc1' }] }),
        hardware: [{ ...validHardware(), id: 'h2', datacenterId: '' }],
    };
    const parsed = parseState(withUnassigned);
    assert.ok(parsed);
    assert.deepEqual(
        parsed.hardware.map((row) => row.id),
        ['h2'],
    );
});

test('isImportEmpty is true only for valid JSON describing an empty assessment', () => {
    assert.equal(isImportEmpty(JSON.stringify(blankState())), true);
    assert.equal(isImportEmpty(JSON.stringify(blankState({ scope: { serviceName: 'S' } }))), false);
    assert.equal(isImportEmpty('not json'), false, 'malformed JSON');
    assert.equal(isImportEmpty('null'), false, 'valid JSON, wrong shape');
    // Export metadata does not make an otherwise empty assessment count as filled.
    const exported = blankState();
    exported.metadata = { ...defaultExportMetadata(), exportedAt: new Date().toISOString() };
    assert.equal(isImportEmpty(JSON.stringify(exported)), true);
});

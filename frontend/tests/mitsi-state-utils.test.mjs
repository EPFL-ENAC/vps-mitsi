import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MITSI_SCHEMA_VERSION, MitsiStateDraftSchema } from '../src/models/MitsiState/schema.ts';
import {
    isImportEmpty,
    isStateEmpty,
    PersistedAssessmentSchema,
} from '../src/models/MitsiState/utils.ts';

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

test('PersistedAssessmentSchema validates the declared schema version, not a creation default', () => {
    // No version supplied -> rejected (unlike the draft schema, which fills a default).
    const withoutVersion = { ...blankState() };
    delete withoutVersion.schemaVersion;
    assert.equal(PersistedAssessmentSchema.safeParse(withoutVersion).success, false);

    // Stale or unknown versions are rejected.
    assert.equal(
        PersistedAssessmentSchema.safeParse({
            ...blankState(),
            schemaVersion: MITSI_SCHEMA_VERSION + 1,
        }).success,
        false,
    );
    assert.equal(
        PersistedAssessmentSchema.safeParse({ ...blankState(), schemaVersion: 'v5' }).success,
        false,
    );

    // The current version on a well-formed payload is accepted and returned verbatim.
    const parsed = PersistedAssessmentSchema.safeParse(blankState());
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.schemaVersion, MITSI_SCHEMA_VERSION);
});

test('PersistedAssessmentSchema keeps invalid shapes out and never drops hardware rows', () => {
    assert.equal(PersistedAssessmentSchema.safeParse(null).success, false);
    assert.equal(PersistedAssessmentSchema.safeParse({}).success, false);
    assert.equal(
        PersistedAssessmentSchema.safeParse({ ...blankState(), hardware: 'not-an-array' }).success,
        false,
    );

    // Hardware referencing an unknown datacenterId is retained, not silently filtered out.
    const withOrphan = {
        ...blankState({ datacenters: [{ id: 'dc1' }] }),
        hardware: [validHardware(), { ...validHardware(), id: 'h2', datacenterId: 'missing' }],
    };
    const parsed = PersistedAssessmentSchema.safeParse(withOrphan);
    assert.equal(parsed.success, true);
    assert.deepEqual(
        parsed.data.hardware.map((row) => row.id),
        ['h1', 'h2'],
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

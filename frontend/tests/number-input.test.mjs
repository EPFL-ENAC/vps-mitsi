import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { numberInputAttributes } from '../src/utils/number-input.ts';
import { DatacenterEnergySchema, HardwareItemSchema } from '../src/models/schema.ts';
import { buildInventoryColumns } from '../src/models/inventory-columns.ts';

test('native bounds distinguish integers, decimals and unbounded numbers', () => {
    assert.deepEqual(numberInputAttributes(z.number().int().min(1).max(10)), {
        min: 1,
        max: 10,
        step: 1,
    });
    assert.deepEqual(numberInputAttributes(z.number().min(0.25).max(2.5)), {
        min: 0.25,
        max: 2.5,
        step: 'any',
    });
    assert.deepEqual(numberInputAttributes(z.number()), {
        min: undefined,
        max: undefined,
        step: 'any',
    });
});

test('optional and nullable preprocessors preserve numeric hints', () => {
    assert.deepEqual(numberInputAttributes(HardwareItemSchema.shape.rackUnit), {
        min: undefined,
        max: undefined,
        step: 'any',
    });
    assert.deepEqual(numberInputAttributes(DatacenterEnergySchema.shape.pue), {
        min: 0,
        max: undefined,
        step: 'any',
    });
    assert.deepEqual(numberInputAttributes(z.number().min(1).max(5).nullable().optional()), {
        min: 1,
        max: 5,
        step: 'any',
    });
});

test('exclusive bounds remain enforced by Zod rather than invented precision', () => {
    const schema = z.number().positive().lt(10);
    assert.deepEqual(numberInputAttributes(schema), { min: 0, max: 10, step: 'any' });
    assert.equal(schema.safeParse(0).success, false);
    assert.equal(schema.safeParse(10).success, false);
    assert.equal(schema.safeParse(0.000001).success, true);
});

test('every numeric inventory column supports attribute extraction', () => {
    const { columns } = buildInventoryColumns((key) => key, 'advanced');
    for (const column of columns.filter((column) => column.kind === 'number')) {
        assert.doesNotThrow(() => numberInputAttributes(column.zod), column.field);
    }
    assert.throws(() => numberInputAttributes(z.string()), /Expected a numeric field schema/);
});

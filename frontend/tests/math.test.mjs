import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sum } from '../src/utils/math.ts';
import { rowSubtotal } from '../src/models/HardwareItem/utils.ts';
import { HardwareItemDraftSchema } from '../src/models/HardwareItem/schema.ts';
import { calculatePeriodEmissions } from '../src/models/Datacenter/utils.ts';
import { TimeUnitSchema } from '../src/models/TimeUnit/schema.ts';
import { unitsPerYear } from '../src/models/TimeUnit/utils.ts';

test('measured energy emissions depend only on local energy fields', () => {
    const energy = Object.freeze({
        energyConsumption: 3000,
        carbonIntensity: 400,
        pue: 1.5,
    });
    assert.equal(calculatePeriodEmissions(energy), 1800);
    for (const pue of [null, 1]) {
        assert.equal(calculatePeriodEmissions(Object.freeze({ ...energy, pue })), 1200);
    }
    assert.equal(calculatePeriodEmissions({ ...energy, pue: 0 }), 0);
    assert.equal(calculatePeriodEmissions({ ...energy, carbonIntensity: 0 }), 0);
    assert.equal(calculatePeriodEmissions({ ...energy, energyConsumption: 0 }), 0);
});

test('inventory subtotals use per-item impacts without changing the input', () => {
    const hardware = [
        Object.freeze(
            HardwareItemDraftSchema.parse({
                quantity: 44,
                impactManufacturingDistributionEol: 100,
            }),
        ),
        Object.freeze(
            HardwareItemDraftSchema.parse({ quantity: 2, impactManufacturingDistributionEol: 200 }),
        ),
    ];
    assert.equal(sum(hardware.map(rowSubtotal)), 4800);
    assert.equal(rowSubtotal({ ...hardware[0], quantity: 0 }), 0);
    assert.equal(sum([]), 0);
});

test('time conversion preserves workbook factors for every supported unit', () => {
    assert.deepEqual(
        Object.fromEntries(TimeUnitSchema.options.map((unit) => [unit, unitsPerYear(unit)])),
        { second: 31536000, minute: 525600, hour: 8760, day: 365, week: 52, month: 12, year: 1 },
    );
});

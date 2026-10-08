import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sum } from '../src/utils/math.ts';
import { rowSubtotal } from '../src/models/HardwareItem/computations.ts';
import { HardwareItemDraftSchema } from '../src/models/HardwareItem/schema.ts';
import {
    calculatePeriodEmissions,
    calculateDatacenterOperational,
    pueInclusion,
} from '../src/models/Datacenter/computations.ts';
import { DatacenterDraftSchema, DatacenterSchema } from '../src/models/Datacenter/schema.ts';
import { TimeUnitSchema } from '../src/models/TimeUnit/schema.ts';
import { timeUnitsPerYear } from '../src/models/TimeUnit/utils.ts';

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

test('one trusted datacenter produces operational emissions without changing its inputs', () => {
    const draft = DatacenterDraftSchema.parse({
        id: 'dc',
        generalInfo: { name: 'Datacenter', abbreviation: 'DC' },
        energy: { energyConsumption: 100, carbonIntensity: 500, pue: 1.5 },
    });
    const validated = DatacenterSchema.parse(draft);
    const datacenter = Object.freeze({
        ...validated,
        generalInfo: Object.freeze(validated.generalInfo),
        energy: Object.freeze(validated.energy),
    });
    const before = JSON.stringify(datacenter);
    const result = calculateDatacenterOperational(datacenter, 0.5, 2);
    assert.deepEqual(result, {
        datacenter,
        pueInclusion: { status: 'included', value: 1.5 },
        co2Period: 75,
        co2Lifespan: 300,
    });
    assert.equal(result.datacenter, datacenter);
    assert.equal(JSON.stringify(datacenter), before);
});

test('trusted datacenter calculations preserve optional PUE and valid zero measurements', () => {
    for (const [patch, pue, period] of [
        [{}, { status: 'omitted' }, 50],
        [{ pue: 0 }, { status: 'included', value: 0 }, 0],
        [{ carbonIntensity: 0 }, { status: 'omitted' }, 0],
        [{ energyConsumption: 0 }, { status: 'omitted' }, 0],
    ]) {
        const draft = DatacenterDraftSchema.parse({
            id: 'dc',
            generalInfo: { name: 'Datacenter', abbreviation: 'DC' },
            energy: { carbonIntensity: 500, energyConsumption: 100, ...patch },
        });
        const datacenter = DatacenterSchema.parse(draft);
        const result = calculateDatacenterOperational(datacenter, 1, 3);
        assert.deepEqual(result.pueInclusion, pue);
        assert.equal(result.co2Period, period);
        assert.equal(result.co2Lifespan, period * 3);
    }
    assert.deepEqual(pueInclusion(null), { status: 'omitted' });
    assert.deepEqual(pueInclusion(0), { status: 'included', value: 0 });
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
        Object.fromEntries(TimeUnitSchema.options.map((unit) => [unit, timeUnitsPerYear(unit)])),
        { second: 31536000, minute: 525600, hour: 8760, day: 365, week: 52, month: 12, year: 1 },
    );
});

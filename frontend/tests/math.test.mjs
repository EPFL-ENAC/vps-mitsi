import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    calculateFunctionalUnitEmissions,
    calculateOperationalEmissions,
    countResources,
    rowSubtotal,
    sum,
} from '../src/utils/math.ts';

test('operational emissions include the monitoring period and lifespan', () => {
    const input = {
        energy: { energyConsumption: 3000, carbonIntensity: 400, pue: 1.5 },
        monitoringPeriod: { unit: 'day', value: 30 },
        lifespanYears: 2,
    };
    const result = calculateOperationalEmissions(input);
    assert.equal(result.co2Period, 1800);
    assert.ok(Math.abs(result.co2Lifespan - 43800) < 1e-8);
    for (const monitoringPeriod of [
        { unit: 'day', value: 365 },
        { unit: 'week', value: 52 },
        { unit: 'month', value: 12 },
        { unit: 'year', value: 1 },
    ]) {
        assert.deepEqual(calculateOperationalEmissions({ ...input, monitoringPeriod }), {
            co2Period: 1800,
            co2Lifespan: 3600,
        });
    }
    assert.deepEqual(calculateOperationalEmissions({ ...input, lifespanYears: null }), {
        co2Period: 1800,
        co2Lifespan: null,
    });
});

test('PUE preserves omitted and zero conventions; measured zero consumption stays zero', () => {
    const input = {
        monitoringPeriod: { unit: 'year', value: 1 },
        lifespanYears: 2,
    };
    for (const pue of [null, 0, 1]) {
        assert.deepEqual(
            calculateOperationalEmissions({
                ...input,
                energy: { energyConsumption: 100, carbonIntensity: 500, pue },
            }),
            { co2Period: 50, co2Lifespan: 100 },
        );
    }
    assert.deepEqual(
        calculateOperationalEmissions({
            ...input,
            energy: { energyConsumption: 0, carbonIntensity: 500, pue: 2 },
        }),
        { co2Period: 0, co2Lifespan: 0 },
    );
});

test('inventory math uses per-item impacts and counts resources across the fleet', () => {
    const hardware = [
        { quantity: 44, cpuQuantity: 4, gpuQuantity: 8, impactManufacturingDistributionEol: 100 },
        { quantity: 2, cpuQuantity: 2, gpuQuantity: 1, impactManufacturingDistributionEol: 200 },
    ];
    assert.equal(sum(hardware.map(rowSubtotal)), 4800);
    assert.equal(countResources(hardware, ' CPU '), 180);
    assert.equal(countResources(hardware, 'GPU'), 354);
    assert.equal(countResources([], 'CPU'), 0);
});

test('functional-unit emissions account for lifespan, fleet, duration and allocated resources', () => {
    const input = {
        totalEmissions: 770880,
        lifespanYears: 2,
        resourcesInService: 176,
        functionalUnit: { timeUnit: 'hour', usageDuration: 2, resourceCount: 2 },
    };
    assert.equal(calculateFunctionalUnitEmissions(input), 1);
    assert.equal(calculateFunctionalUnitEmissions({ ...input, totalEmissions: 0 }), 0);
    assert.equal(
        calculateFunctionalUnitEmissions({
            ...input,
            functionalUnit: { timeUnit: 'minute', usageDuration: 120, resourceCount: 2 },
        }),
        1,
    );
    assert.equal(calculateFunctionalUnitEmissions({ ...input, resourcesInService: 352 }), 0.5);
    assert.equal(calculateFunctionalUnitEmissions({ ...input, lifespanYears: 4 }), 0.5);
});

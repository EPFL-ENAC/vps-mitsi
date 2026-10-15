import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computed, reactive } from 'vue';
import { z } from 'zod';
import { ComputationResult } from '../src/utils/computation.ts';
import { sum } from '../src/utils/math.ts';

const Measurements = z.object({ quantity: z.number().positive() });
const invalidInput = Object.freeze({ quantity: null });
const inputError = Measurements.safeParse(invalidInput).error;

test('factories return instances with the existing fields and independent defaults', () => {
    const value = { measurement: 0 };
    const success = ComputationResult.success(value);
    assert.ok(success instanceof ComputationResult);
    assert.equal(success.result, value);
    assert.deepEqual(
        { ...success },
        {
            success: 'success',
            result: value,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    const failure = ComputationResult.failure([inputError], [invalidInput]);
    assert.ok(failure instanceof ComputationResult);
    assert.deepEqual(
        { ...failure },
        {
            success: 'failure',
            result: null,
            inputErrors: [inputError],
            ignoredInputs: [invalidInput],
        },
    );
    assert.equal(failure.inputErrors[0], inputError);
    assert.equal(failure.ignoredInputs[0], invalidInput);
    const partial = ComputationResult.partial(0);
    assert.ok(partial instanceof ComputationResult);
    assert.deepEqual(
        { ...partial },
        {
            success: 'partial',
            result: 0,
            inputErrors: [],
            ignoredInputs: [],
        },
    );
    for (const factory of [
        () => ComputationResult.success(0),
        () => ComputationResult.partial(0),
        () => ComputationResult.failure(),
    ]) {
        const first = factory();
        const second = factory();
        assert.notEqual(first.inputErrors, second.inputErrors);
        assert.notEqual(first.ignoredInputs, second.ignoredInputs);
    }
});

test('map preserves status and diagnostics and skips failed computations', () => {
    const partial = ComputationResult.partial(2, [inputError], [invalidInput]);
    let calls = 0;
    const mapper = (value) => {
        calls++;
        return `${value} kg`;
    };
    const mapped = partial.map(mapper);
    assert.equal(mapped.success, 'partial');
    assert.equal(mapped.result, '2 kg');
    assert.equal(mapped.inputErrors, partial.inputErrors);
    assert.equal(mapped.ignoredInputs, partial.ignoredInputs);
    assert.ok(mapped instanceof ComputationResult);
    assert.equal(partial.result, 2);
    const successful = ComputationResult.success(0).map(mapper);
    assert.equal(successful.success, 'success');
    assert.equal(successful.result, '0 kg');
    const failure = ComputationResult.failure([inputError], [invalidInput]);
    assert.equal(failure.map(mapper), failure);
    assert.equal(calls, 2);
});

test('validation maps transformed output and retains paths without mutating the original input', () => {
    const schema = z.object({ quantity: z.string().transform(Number).pipe(z.number().positive()) });
    const input = Object.freeze({ quantity: '3' });
    let calls = 0;
    const mapper = (parsed) => {
        calls++;
        assert.equal(typeof parsed.quantity, 'number');
        return parsed.quantity * 2;
    };
    const valid = ComputationResult.validateAndMap(schema, input, mapper);
    assert.equal(valid.success, 'success');
    assert.equal(valid.result, 6);
    assert.equal(input.quantity, '3');
    const invalid = ComputationResult.validateAndMap(schema, { quantity: '-1' }, mapper);
    assert.equal(invalid.success, 'failure');
    assert.equal(invalid.result, null);
    assert.ok(invalid.inputErrors[0] instanceof z.ZodError);
    assert.deepEqual(invalid.inputErrors[0].issues[0].path, ['quantity']);
    assert.deepEqual(invalid.ignoredInputs, []);
    assert.equal(calls, 1);
});

test('mapper exceptions surface rather than becoming input errors', () => {
    const error = new Error('Mapper bug');
    const mapper = () => {
        throw error;
    };
    assert.throws(
        () => ComputationResult.validateAndMap(Measurements, { quantity: 2 }, mapper),
        (thrown) => thrown === error,
    );
    assert.throws(
        () => ComputationResult.success(2).map(mapper),
        (thrown) => thrown === error,
    );
    assert.throws(
        () => ComputationResult.partial(2).map(mapper),
        (thrown) => thrown === error,
    );
    assert.throws(
        () => ComputationResult.bulkValidateAndMap([{ quantity: 2 }], Measurements, mapper),
        (thrown) => thrown === error,
    );
    assert.equal(ComputationResult.failure().map(mapper).success, 'failure');
});

test('sum distinguishes empty, complete, partial and failed collections and retains duplicate diagnostics', () => {
    const failure = ComputationResult.failure([inputError], [invalidInput]);
    const partial = ComputationResult.partial(3, [inputError], [invalidInput]);
    for (const [computations, options, status, total] of [
        [[], undefined, 'success', 0],
        [[], { empty: 'failure' }, 'failure', null],
        [[ComputationResult.success(0)], undefined, 'success', 0],
        [[ComputationResult.success(2), ComputationResult.success(3)], undefined, 'success', 5],
        [[failure, failure], undefined, 'failure', null],
        [[failure, ComputationResult.success(0)], undefined, 'partial', 0],
        [[partial], undefined, 'partial', 3],
        [[partial, failure, ComputationResult.success(2)], undefined, 'partial', 5],
    ]) {
        const result = ComputationResult.sum(computations, options);
        assert.ok(result instanceof ComputationResult);
        assert.equal(result.success, status);
        assert.equal(result.result, total);
        assert.deepEqual(
            result.inputErrors,
            computations.flatMap((c) => c.inputErrors),
        );
        assert.deepEqual(
            result.ignoredInputs,
            computations.flatMap((c) => c.ignoredInputs),
        );
        for (const ignored of result.ignoredInputs) assert.equal(ignored, invalidInput);
        for (const error of result.inputErrors) assert.equal(error, inputError);
    }
});

test('class instances and map remain usable through reactive proxies and computed updates', () => {
    const input = reactive({ quantity: 2 });
    const result = computed(() => ComputationResult.partial(input.quantity, [inputError], [input]));
    const state = reactive({ result });
    const mapped = computed(() => state.result.map((value) => value * 3));
    assert.ok(state.result instanceof ComputationResult);
    assert.ok(mapped.value instanceof ComputationResult);
    assert.equal(mapped.value.result, 6);
    assert.equal(mapped.value.ignoredInputs[0], input);
    input.quantity = 4;
    assert.equal(mapped.value.result, 12);
    assert.equal(mapped.value.ignoredInputs[0], input);
});

test('validated arrays distinguish empty, complete, partial and failed collections including zero', () => {
    const schema = z.object({ quantity: z.number().min(0) });
    for (const [quantities, status, expected] of [
        [[], 'success', []],
        [[0, 2, 3], 'success', [0, 2, 3]],
        [[null, 0, -1, 3], 'partial', [0, 3]],
        [[null, -1], 'failure', null],
    ]) {
        const inputs = Object.freeze(quantities.map((quantity) => Object.freeze({ quantity })));
        const visited = [];
        const result = ComputationResult.bulkValidateAndMap(inputs, schema, (parsed, original) => {
            visited.push(original);
            return parsed.quantity;
        });
        assert.ok(result instanceof ComputationResult);
        assert.equal(result.success, status);
        assert.deepEqual(result.result, expected);
        assert.deepEqual(
            visited,
            inputs.filter((input) => input.quantity !== null && input.quantity >= 0),
        );
        const ignored = inputs.filter((input) => input.quantity === null || input.quantity < 0);
        assert.equal(result.inputErrors.length, ignored.length);
        assert.deepEqual(result.ignoredInputs, ignored);
        ignored.forEach((input, index) => {
            assert.equal(result.ignoredInputs[index], input);
            assert.ok(result.inputErrors[index] instanceof z.ZodError);
            assert.deepEqual(result.inputErrors[index].issues[0].path, ['quantity']);
        });
        const total = result.map(sum);
        assert.equal(total.success, status);
        assert.equal(total.result, expected === null ? null : sum(expected));
        assert.deepEqual(total.inputErrors, result.inputErrors);
        assert.deepEqual(total.ignoredInputs, result.ignoredInputs);
    }
});

test('validated arrays map transformed values while retaining original inputs and all field issues', () => {
    const schema = z.object({
        quantity: z.string().transform(Number).pipe(z.number().min(0)),
        name: z.string().min(1),
    });
    const valid = Object.freeze({ quantity: '3', name: 'Valid', note: 'Original only' });
    const invalid = Object.freeze({ quantity: '-1', name: '' });
    const result = ComputationResult.bulkValidateAndMap(
        [invalid, valid],
        schema,
        (parsed, original) => {
            assert.notEqual(parsed, original);
            assert.equal(typeof parsed.quantity, 'number');
            return { quantity: parsed.quantity, original };
        },
    );
    assert.equal(result.success, 'partial');
    assert.equal(result.result[0].quantity, 3);
    assert.equal(result.result[0].original, valid);
    assert.equal(result.ignoredInputs[0], invalid);
    assert.deepEqual(
        result.inputErrors[0].issues.map((issue) => issue.path),
        [['quantity'], ['name']],
    );
    assert.equal(valid.quantity, '3');
    assert.equal(invalid.quantity, '-1');
});

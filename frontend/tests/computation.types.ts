import { z } from 'zod';
import { ComputationResult } from '../src/utils/computation';

// These examples are checked by the frontend typecheck, without being executed.
export function narrowResult<T, Input>(computation: ComputationResult<T, Input>): T | null {
    if (computation.success === 'failure') {
        const result: null = computation.result;
        return result;
    }
    const result: T = computation.result;
    return result;
}

export function mapResult<T, U, Input>(
    computation: ComputationResult<T, Input>,
    map: (result: T) => U,
): ComputationResult<U, Input> {
    return computation.map(map);
}

export const transformedResult: ComputationResult<number> = ComputationResult.validateAndMap(
    z.string().transform(Number),
    '2',
    (value) => value * 3,
);

export const summedResult: ComputationResult<number> = ComputationResult.sum([
    ComputationResult.success(2),
]);

export const validatedArray: ComputationResult<number[], { quantity: string }> =
    ComputationResult.bulkValidateAndMap(
        [{ quantity: '2' }],
        z.object({ quantity: z.string().transform(Number) }),
        (validated, original) => {
            const quantity: number = validated.quantity;
            const raw: string = original.quantity;
            return quantity + raw.length;
        },
    );

export function resultFieldsAreReadonly(computation: ComputationResult<number>) {
    // @ts-expect-error Results cannot be reassigned.
    computation.result = 3;
    // @ts-expect-error Status cannot be reassigned.
    computation.success = 'failure';
    // @ts-expect-error Diagnostics cannot be reassigned.
    computation.inputErrors = [];
    // @ts-expect-error Ignored inputs cannot be reassigned.
    computation.ignoredInputs = [];
}

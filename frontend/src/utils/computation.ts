import type { z } from 'zod';
import type { ComputationResult } from 'src/types/computation';

export function successfulComputation<T>(result: T): ComputationResult<T> & { success: 'success' } {
    return { success: 'success', result, inputErrors: [], ignoredInputs: [] };
}

export function failedComputation(
    errors: z.ZodError[],
): ComputationResult<never> & { success: 'failure' } {
    return { success: 'failure', result: null, inputErrors: errors, ignoredInputs: [] };
}

export function partiallySuccessfulComputation<T, Input = never>(
    result: T,
    errors: z.ZodError[] = [],
    ignoredInputs: Input[] = [],
): ComputationResult<T, Input> & { success: 'partial' } {
    return { success: 'partial', result, inputErrors: errors, ignoredInputs };
}

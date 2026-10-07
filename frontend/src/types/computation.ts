import type { z } from 'zod';

interface ComputationDetails<Input> {
    inputErrors: z.ZodError[];
    ignoredInputs: Input[];
}

export type ComputationResult<T, Input = never> = ComputationDetails<Input> &
    ({ success: 'success' | 'partial'; result: T } | { success: 'failure'; result: null });

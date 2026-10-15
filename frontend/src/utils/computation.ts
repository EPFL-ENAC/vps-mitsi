import type { z } from 'zod';

export type ComputationResult<T, Input = never> =
    | SuccessfulComputation<T, Input>
    | PartiallySuccessfulComputation<T, Input>
    | FailedComputation<Input>;

abstract class ComputationResultBase<T, Input = never> {
    abstract readonly success: 'success' | 'partial' | 'failure';
    abstract readonly result: T | null;

    protected constructor(
        public readonly inputErrors: z.ZodError[] = [],
        public readonly ignoredInputs: Input[] = [],
    ) {}

    abstract map<U>(map: (result: T) => U): ComputationResult<U, Input>;

    static success<T>(result: T): SuccessfulComputation<T> {
        return new SuccessfulComputation(result);
    }

    static failure<Input = never>(
        errors: z.ZodError[] = [],
        ignoredInputs: Input[] = [],
    ): FailedComputation<Input> {
        return new FailedComputation(errors, ignoredInputs);
    }

    static partial<T, Input = never>(
        result: T,
        errors: z.ZodError[] = [],
        ignoredInputs: Input[] = [],
    ): PartiallySuccessfulComputation<T, Input> {
        return new PartiallySuccessfulComputation(result, errors, ignoredInputs);
    }

    /** Validate only inputs; mapper exceptions and arithmetic results pass through. */
    static validateAndMap<S extends z.ZodType, T>(
        schema: S,
        input: unknown,
        map: (input: z.output<S>) => T,
    ): ComputationResult<T> {
        const parsed = schema.safeParse(input);
        return parsed.success
            ? ComputationResultBase.success(map(parsed.data))
            : ComputationResultBase.failure([parsed.error]);
    }

    /** Combine available contributions and concatenate their diagnostics unchanged. */
    static sum<Input>(
        computations: readonly ComputationResult<number, Input>[],
        options: { empty: 'success' | 'failure' } = { empty: 'success' },
    ): ComputationResult<number, Input> {
        let total = 0;
        let available = 0;
        let complete = true;
        const inputErrors: z.ZodError[] = [];
        const ignoredInputs: Input[] = [];

        for (const computation of computations) {
            inputErrors.push(...computation.inputErrors);
            ignoredInputs.push(...computation.ignoredInputs);
            if (computation.success !== 'success') complete = false;
            if (computation.success !== 'failure') {
                total += computation.result;
                available++;
            }
        }

        if (available === 0 && (computations.length > 0 || options.empty === 'failure')) {
            return ComputationResultBase.failure(inputErrors, ignoredInputs);
        }
        return complete
            ? ComputationResultBase.success(total)
            : ComputationResultBase.partial(total, inputErrors, ignoredInputs);
    }

    /** Validate each input independently, preserving original inputs and field paths. */
    static bulkValidateAndMap<Input, S extends z.ZodType, T>(
        inputs: readonly Input[],
        schema: S,
        compute: (validated: z.output<S>, original: Input) => T,
    ): ComputationResult<T[], Input> {
        const rows: T[] = [];
        const inputErrors: z.ZodError[] = [];
        const ignoredInputs: Input[] = [];

        for (const input of inputs) {
            const parsed = schema.safeParse(input);
            if (!parsed.success) {
                inputErrors.push(parsed.error);
                ignoredInputs.push(input);
                continue;
            }
            rows.push(compute(parsed.data, input));
        }

        if (ignoredInputs.length === 0) return ComputationResultBase.success(rows);

        if (rows.length === 0) {
            return ComputationResultBase.failure(inputErrors, ignoredInputs);
        }

        return ComputationResultBase.partial(rows, inputErrors, ignoredInputs);
    }
}

class SuccessfulComputation<T, Input = never> extends ComputationResultBase<T, Input> {
    readonly success = 'success';

    constructor(public readonly result: T) {
        super();
    }

    map<U>(map: (result: T) => U): SuccessfulComputation<U, Input> {
        return new SuccessfulComputation(map(this.result));
    }
}

class PartiallySuccessfulComputation<T, Input = never> extends ComputationResultBase<T, Input> {
    readonly success = 'partial';

    constructor(
        public readonly result: T,
        errors: z.ZodError[] = [],
        ignoredInputs: Input[] = [],
    ) {
        super(errors, ignoredInputs);
    }

    map<U>(map: (result: T) => U): PartiallySuccessfulComputation<U, Input> {
        return new PartiallySuccessfulComputation(
            map(this.result),
            this.inputErrors,
            this.ignoredInputs,
        );
    }
}

class FailedComputation<Input = never> extends ComputationResultBase<never, Input> {
    readonly success = 'failure';
    readonly result = null;

    constructor(errors: z.ZodError[] = [], ignoredInputs: Input[] = []) {
        super(errors, ignoredInputs);
    }

    map<U>(map: (result: never) => U): FailedComputation<Input> {
        void map;
        return this;
    }
}

export const ComputationResult = ComputationResultBase;

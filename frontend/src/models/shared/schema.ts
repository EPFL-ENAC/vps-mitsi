import { z } from 'zod';

/** Quasar clears numeric inputs to an empty string or null. */
const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

/** Accept a declared placeholder in drafts without relaxing other constraints. */
export function draftField<
    S extends z.ZodType,
    D extends z.output<S> & (string | number | boolean),
>(schema: S, defaultValue: D) {
    return schema.or(z.literal(defaultValue)).default(defaultValue);
}

export function draftNumber<S extends z.ZodNumber>(schema: S, defaultValue: z.output<S> & number) {
    return z.preprocess(emptyToUndefined, draftField(schema, defaultValue));
}

/** Empty optional numbers are absent, including during whole-row validation. */
export function optionalNumber(schema = z.number()) {
    return z.preprocess(emptyToUndefined, schema.optional());
}

/** Empty numeric inputs are unanswered values, never zero measurements. */
export function nullableNumber(schema: z.ZodNumber = z.number()) {
    return z.preprocess(
        (value) => (value === '' || value === undefined || value === null ? null : value),
        schema.nullable(),
    );
}

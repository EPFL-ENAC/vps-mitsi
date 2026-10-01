import { z } from 'zod';

export interface NumberInputAttributes {
    min: number | undefined;
    max: number | undefined;
    step: 1 | 'any';
}

function finiteBound(value: number | null): number | undefined {
    return value !== null && Number.isFinite(value) ? value : undefined;
}

function unwrapNumber(schema: z.core.$ZodType): z.ZodNumber {
    if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
        return unwrapNumber(schema.unwrap());
    }

    // Our empty-value preprocessors validate through the output schema.
    if (schema instanceof z.ZodPipe) {
        return unwrapNumber(schema.out);
    }

    if (!(schema instanceof z.ZodNumber)) {
        throw new TypeError('Expected a numeric field schema');
    }

    return schema;
}

/**
 * Native input hints for canonical numeric fields, including optional/nullable
 * fields and our empty-value preprocessors. Arbitrary value transforms are not
 * supported. Exclusive bounds and other constraints remain enforced by Zod.
 */
export function numberInputAttributes(schema: z.ZodType): NumberInputAttributes {
    const number = unwrapNumber(schema);

    return {
        min: finiteBound(number.minValue),
        max: finiteBound(number.maxValue),
        step: number.isInt ? 1 : 'any',
    };
}

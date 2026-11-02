import type { z } from 'zod';

/**
 * Build a column definition from a Zod schema shape.
 */
export function createSchemaColumn<Field extends string>(
    shape: Record<Field, z.ZodType>,
    labelFor: (field: Field) => string,
) {
    return (field: Field, label?: string) => ({
        name: field,
        field,
        label: label ?? labelFor(field),
        align: 'left' as const,
        zod: shape[field],
    });
}

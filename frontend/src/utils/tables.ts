import type { z } from 'zod';

export function createSchemaColumn<Field extends string>(
    shape: Record<Field, z.ZodType>,
    labelFor: (field: Field) => string,
) {
    return (field: Field, label?: string) => ({
        name: field,
        field,
        label: label ?? labelFor(field),
        zod: shape[field],
    });
}

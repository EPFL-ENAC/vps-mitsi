/**
 * Shared helpers for building Quasar select options from schema enums.
 *
 * Any select whose values come from a Zod enum (see ARCHITECTURE.md — the
 * "Dropdown enum rule") must build its options from the schema's `.options`
 * and map each value to an i18n label, always using `emit-value` + `map-options`
 * so the store receives the primitive value, never an option object.
 */
import type { z } from 'zod';

/** A Zod enum schema that exposes its permitted values via `.options`. */
type EnumSchema = z.ZodTypeAny & { options: readonly string[] };

export interface SchemaOption {
    label: string;
    value: string;
}

/**
 * Maps a Zod enum's `.options` to `{ label, value }` pairs. The label is the
 * i18n string located at `<keyPrefix><PascalCase value>` — e.g. for the value
 * `'compute_server'` with prefix `'inventoryCategory'` the key is
 * `inventoryCategoryComputeServer`, and `'2.5 inch'` maps to `25Inch`.
 *
 * Each segment (split on anything non-alphanumeric such as `_`, space, `.`) is
 * Pascal-cased and joined, so casing is always a valid identifier: `compute_server`
 * → `ComputeServer`, `HDD` → `Hdd`, `2.5 inch` → `25Inch`.
 */
export function schemaEnumOptions(
    schema: EnumSchema,
    t: (key: string) => string,
    keyPrefix: string,
): SchemaOption[] {
    return schema.options.map((value) => {
        const key = `${keyPrefix}${toPascalCaseKey(value)}`;
        return { label: t(key), value };
    });
}

/**
 * Splits a value on any non-alphanumeric character, Pascal-cases each segment
 * and rejoins without separators: `compute_server` → `ComputeServer`,
 * `2.5 inch` → `25Inch`, `SLC` → `Slc`.
 */
function toPascalCaseKey(value: string): string {
    return value
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
        .join('');
}

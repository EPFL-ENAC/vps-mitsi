/**
 * MITSI — Quasar form validation via Zod (silent adapter).
 *
 * Adapts canonical entity fields from src/models/schema.ts to Quasar rules.
 * Pages and registries pass schemas directly; this adapter supplies translated
 * validation messages and normalizes empty inputs.
 */
import type { ValidationRule } from 'quasar';
import type * as z from 'zod';
import { useI18n } from 'vue-i18n';

export function useValidation() {
    const { t } = useI18n();

    /** Map a Zod issue to a validation.* key (origin = number/string/int/…). */
    function toKey(issue: z.core.$ZodIssue): string {
        if (issue.code === 'too_small')
            return `validation.too_small.${issue.origin}.${
                issue.inclusive ? 'inclusive' : 'exclusive'
            }`;
        if (issue.code === 'too_big') return `validation.too_big.${issue.origin}`;
        if (issue.code === 'invalid_type') return `validation.invalid_type.${issue.expected}`;
        // z.enum emits invalid_value (no expected string) for empty/invalid
        // selections; category is mandatory so treat it as required-string.
        if (issue.code === 'invalid_value') return 'validation.invalid_type.string';
        return `validation.${issue.code}`;
    }

    /**
     * Wrap a strict field schema as a Quasar ValidationRule. An absent schema
     * (no rule attached) always passes. Quasar text/number inputs hand an empty
     * field back as '' or null — treat those as undefined so `optional()`
     * schemas (e.g. PUE) stay valid while required fields report "required"
     * instead of a confusing type error.
     */
    function toValidationRule(schema?: z.ZodType): ValidationRule {
        if (!schema) return () => true;
        return (value: unknown) => {
            const v = value === '' || value === null ? undefined : value;
            const r = schema.safeParse(v);
            return r.success
                ? true
                : r.error.issues.map((is) => t(toKey(is), { ...is })).join(', ');
        };
    }

    return { toValidationRule };
}

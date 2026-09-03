/**
 * MITSI — form validation rules
 *
 * Simple validation rule factories compatible with Quasar's `QInput`/`QSelect`
 * `:rules` prop (each rule returns `true` when valid, or a string error message).
 *
 * No Zod — kept intentionally light, per project decision.
 */

export type ValidationRule = (value: unknown) => true | string;

/** Field must be filled with a non-empty string. */
export function required(label = 'This field'): ValidationRule {
    return (value) => {
        const v = value as string | number | null | undefined;
        const valid =
            v !== null &&
            v !== undefined &&
            (typeof v === 'number' ? !Number.isNaN(v) : String(v).trim().length > 0);
        return valid || `${label} is required.`;
    };
}

/** Value must be a finite number (numeric strings are allowed). */
export function isNumber(label = 'This field'): ValidationRule {
    return (value) => {
        const n = Number(value);
        const valid = value !== '' && value !== null && value !== undefined && !Number.isNaN(n);
        return valid || `${label} must be a number.`;
    };
}

/** Value must be a number >= 0 (allows 0). */
export function nonNegativeNumber(label = 'This field'): ValidationRule {
    return (value) => {
        const n = Number(value);
        const valid = Number.isFinite(n) && n >= 0;
        return valid || `${label} must be zero or a positive number.`;
    };
}

/** Value must be a number > 0 (quantity, durations…). */
export function positiveNumber(label = 'This field'): ValidationRule {
    return (value) => {
        const n = Number(value);
        const valid = Number.isFinite(n) && n > 0;
        return valid || `${label} must be greater than zero.`;
    };
}

/** Value must be an integer >= 1 (units, quantities). */
export function positiveInteger(label = 'This field'): ValidationRule {
    return (value) => {
        const n = Number(value);
        const valid = Number.isInteger(n) && n >= 1;
        return valid || `${label} must be a whole number greater than zero.`;
    };
}

/** Combines several rules into one array to pass to Quasar controls. */
export function combine(...rules: ValidationRule[]): ValidationRule[] {
    return rules;
}

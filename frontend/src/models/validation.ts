/**
 * MITSI — form validation rules
 *
 * Rule factories for Quasar QInput/QSelect `:rules` (true | error string).
 * Form-level validation only — data-boundary validation (LocalStorage,
 * JSON import/export) is Zod's job in src/models/schema.ts.
 */

/** Translator injected once at app boot (see boot/i18n.ts), because
 *  rule factories run outside component setup and cannot use useI18n(). */
type Translate = (key: string, params?: Record<string, unknown>) => string;
let translate: Translate = (key, params) =>
    params && 'label' in params ? String(params['label']) : key;
export function setValidationTranslator(fn: Translate): void {
    translate = fn;
}

export type ValidationRule = (value: unknown) => true | string;

/** Field must be filled with a non-empty string. */
export function required(label = 'This field'): ValidationRule {
    return (value) => {
        const v = value as string | number | null | undefined;
        const valid =
            v !== null &&
            v !== undefined &&
            (typeof v === 'number' ? !Number.isNaN(v) : String(v).trim().length > 0);
        return valid || translate('validationRequired', { label });
    };
}

/** Value must be a finite number (numeric strings are allowed). */
export function isNumber(label = 'This field'): ValidationRule {
    return (value) => {
        const n = Number(value);
        const valid = value !== '' && value !== null && value !== undefined && !Number.isNaN(n);
        return valid || translate('validationNotANumber', { label });
    };
}

/** Value must be a number >= 0 (allows 0). */
export function nonNegativeNumber(label = 'This field'): ValidationRule {
    return (value) => {
        const n = Number(value);
        const valid = Number.isFinite(n) && n >= 0;
        return valid || translate('validationNonNegative', { label });
    };
}

/** Value must be empty OR a finite number >= 0 (optional numeric field). */
export function optionalNumber(label = 'This field'): ValidationRule {
    return (value) => {
        if (value === null || value === undefined || value === '') return true;
        const n = Number(value);
        const valid = Number.isFinite(n) && n >= 0;
        return valid || translate('validationNonNegative', { label });
    };
}

/** Value must be a number > 0 (quantity, durations…). */
export function positiveNumber(label = 'This field'): ValidationRule {
    return (value) => {
        const n = Number(value);
        const valid = Number.isFinite(n) && n > 0;
        return valid || translate('validationPositive', { label });
    };
}

/** Value must be an integer >= 1 (units, quantities). */
export function positiveInteger(label = 'This field'): ValidationRule {
    return (value) => {
        const n = Number(value);
        const valid = Number.isInteger(n) && n >= 1;
        return valid || translate('validationPositiveInteger', { label });
    };
}

/** Combines several rules into one array to pass to Quasar controls. */
export function combine(...rules: ValidationRule[]): ValidationRule[] {
    return rules;
}

/** kg CO₂-eq, en-US formatting with comma thousands separator, 2 decimals ("48,852.77"). */
export function formatKg(n: number): string {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}

/** Normalizes a schema enum value into an i18n key suffix: every run of
 *  non-alphanumeric characters becomes a single underscore. e.g. 'compute_server'
 *  → 'compute_server', '2.5 inch' → '2_5_inch', 'HDD' → 'HDD'. */
export function normalizeKey(v: string): string {
    return v.replace(/[^A-Za-z0-9]+/g, '_');
}

/** Assembled functional-unit sentence, per-language word order driven from i18n. */
export function buildFunctionalUnitSentence(
    t: (key: string, params?: Record<string, unknown>) => string,
    fu: { usageDuration: number; resourceCount: number; resourceType: string },
    timeUnitLabel: string,
): string {
    return t('scopeFuSentence', {
        duration: fu.usageDuration,
        unit: timeUnitLabel,
        count: fu.resourceCount,
        type: fu.resourceType,
    });
}

import { type Datacenter, DatacenterEnergySchema } from 'src/models/Datacenter/schema';
import type { Scope } from 'src/models/Scope/schema';

/** Show both names when available, with the ID as the unfinished-draft fallback. */
export function formatDatacenterName(dc: Pick<Datacenter, 'id' | 'generalInfo'>): string {
    const { abbreviation, name } = dc.generalInfo;
    return abbreviation && name ? `${abbreviation} — ${name}` : abbreviation || name || dc.id;
}

/** kg CO₂-eq, en-US formatting with comma thousands separator, 2 decimals ("48,852.77"). */
export function formatKg(n: number | null): string {
    if (n === null) return '—';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}

/** Format a result with caller-provided missing and partial-result labels. */
export function formatResult(
    value: number | null,
    {
        formatValue = formatKg,
        missingLabel,
        partialLabel,
    }: {
        formatValue?: (value: number) => string;
        missingLabel: string;
        partialLabel?: string;
    },
): string {
    if (value === null) return missingLabel;
    const formatted = formatValue(value);
    return partialLabel ? `${formatted} (${partialLabel})` : formatted;
}

/** Normalizes a schema enum value into an i18n key suffix: every run of
 *  non-alphanumeric characters becomes a single underscore. e.g. 'compute_server'
 *  → 'compute_server', '2.5 inch' → '2_5_inch', 'HDD' → 'HDD'. */
export function normalizeKey(v: string): string {
    return v.replace(/[^A-Za-z0-9]+/g, '_');
}

/** Assemble the functional unit using the locale's word order and time-unit label. */
export function buildFunctionalUnitSentence(
    t: (key: string, params?: Record<string, unknown>) => string,
    fu: Scope['functionalUnit'],
): string {
    return t('scopeFuSentence', {
        duration: fu.usageDuration,
        unit: t('scopeTimeUnit_' + normalizeKey(fu.timeUnit)),
        count: fu.resourceCount,
        type: fu.resourceType,
    });
}

/** Omitted or zero PUE applies no multiplier; invalid drafts have no result yet. */
export function formatPueInclusion(
    t: (key: string, params?: Record<string, unknown>) => string,
    pue: Datacenter['energy']['pue'],
): string {
    const parsed = DatacenterEnergySchema.shape.pue.safeParse(pue);
    if (!parsed.success) return t('mainNotApplicable');
    return parsed.data === null || parsed.data === 0
        ? t('resultsPueNotIncluded')
        : t('resultsPueIncluded', { value: parsed.data });
}

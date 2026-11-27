import { i18n } from 'src/i18n/index';
import type { DatacenterDraft } from 'src/models/Datacenter/schema';
import type { PueInclusion } from 'src/models/Datacenter/computations';
import type { Scope } from 'src/models/Scope/schema';
import { HardwareCategorySchema } from 'src/models/HardwareItem/schema';

/** Show both names when available, with the ID as the unfinished-draft fallback. */
export function formatDatacenterName(dc: Pick<DatacenterDraft, 'id' | 'generalInfo'>): string {
    const { abbreviation, name } = dc.generalInfo;
    return abbreviation && name ? `${abbreviation} — ${name}` : abbreviation || name || dc.id;
}

/** Number with en-US comma thousands separator ("915,000" or "1,568.32"). */
export function formatNumber(n: number | null, options?: Intl.NumberFormatOptions): string {
    if (n === null) return '—';
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 10,
        ...options,
    }).format(n);
}

/** Strips comma thousand separators and parses to number; leaves invalid text for Zod. */
export function parseNumber(text: string): string | number {
    const cleaned = text.replaceAll(',', '').trim();
    if (cleaned === '') return '';
    const value = Number(cleaned);
    return Number.isNaN(value) ? text : value;
}

/** Format kg CO₂-eq with two decimal places in the active locale. */
export function formatKg(value: number | null): string {
    if (value === null) return '—';

    return new Intl.NumberFormat(i18n.global.locale.value, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

/** Integer capacity in GB, with comma thousands separators. */
export function formatGb(value: number): string {
    return `${formatNumber(value, { maximumFractionDigits: 0 })} GB`;
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

/** Display name of a hardware category: custom text is shown as typed,
 *  standard keys are translated. */
export function formatCategoryName(
    category: string,
    categoryOther?: string,
    t?: (key: string) => string,
): string {
    if (category === 'other' && categoryOther?.trim()) {
        return categoryOther.trim();
    }
    const isStandard = HardwareCategorySchema.safeParse(category).success;
    return isStandard && t ? t(`inventoryCategory_${category}`) : category;
}

/** Assemble the functional unit using the locale's word order and time-unit label. */
export function buildFunctionalUnitSentence(
    t: (key: string, params?: Record<string, unknown>) => string,
    fu: Scope['functionalUnit'],
): string {
    // A custom resource shows the user's own noun, falling back to the generic label.
    const type =
        fu.resourceType === 'Other'
            ? fu.resourceTypeOther?.trim() || t('scopeResourceType.Other')
            : fu.resourceType;
    return t('scopeFuSentence', {
        duration: fu.usageDuration ?? '—',
        unit: t('scopeTimeUnit_' + normalizeKey(fu.timeUnit)),
        count: fu.resourceCount ?? '—',
        type,
    });
}

/** Format the store's validated PUE result without interpreting raw drafts. */
export function formatPueInclusion(
    t: (key: string, params?: Record<string, unknown>) => string,
    pue: PueInclusion,
): string {
    if (pue.status === 'unavailable') return t('mainNotApplicable');
    return pue.status === 'omitted'
        ? t('resultsPueNotIncluded')
        : t('resultsPueIncluded', { value: pue.value });
}

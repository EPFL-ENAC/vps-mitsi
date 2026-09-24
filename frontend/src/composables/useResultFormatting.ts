import { useI18n } from 'vue-i18n';
import { useMitsiStore } from 'src/stores/mitsi';
import { formatKg } from 'src/utils/format';

/** Keep partial-result labels consistent in Results and the persistent footer. */
export function useResultFormatting() {
    const { t } = useI18n();
    const mitsi = useMitsiStore();

    function formatOperationalResult(
        value: number | null,
        formatValue: (value: number) => string = formatKg,
    ): string {
        if (value === null) return t('mainNotApplicable');
        const formatted = formatValue(value);
        const coverage = mitsi.energyCoverage;
        return coverage.isComplete
            ? formatted
            : `${formatted} (${t('resultsEnergyCoverage', {
                  complete: coverage.completeDatacenters,
                  total: coverage.totalDatacenters,
              })})`;
    }

    function formatCombinedResult(
        value: number | null,
        formatValue: (value: number) => string = formatKg,
    ): string {
        if (value === null) return t('mainNotApplicable');
        const formatted = formatValue(value);
        return mitsi.resultsPartial ? `${formatted} (${t('resultsPartial')})` : formatted;
    }

    return { formatOperationalResult, formatCombinedResult };
}

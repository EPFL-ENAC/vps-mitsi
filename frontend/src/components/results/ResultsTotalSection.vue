<template>
    <div class="results-total-wrapper">
        <q-markup-table dense flat bordered class="results-table">
            <tbody>
                <tr>
                    <td data-kind="text">{{ $t('resultsRowEmbodied') }}</td>
                    <td class="text-right" data-kind="number">
                        {{ formatKg(mitsi.totalEmbodied) }}
                    </td>
                </tr>
                <tr>
                    <td data-kind="text">{{ $t('resultsRowOperational') }}</td>
                    <td class="text-right" data-kind="number">
                        {{ formatResult(mitsi.totalOperational, operationalResultOptions) }}
                    </td>
                </tr>
                <tr class="results-total">
                    <td data-kind="text">
                        <strong>{{ $t('resultsRowTotal') }}</strong>
                    </td>
                    <td class="text-right" data-kind="number">
                        <strong>{{
                            formatResult(mitsi.totalLifespan, combinedResultOptions)
                        }}</strong>
                    </td>
                </tr>
            </tbody>
        </q-markup-table>

        <!-- Split pie chart -->
        <div v-if="showChart" class="q-mt-md">
            <div class="text-subtitle1 text-weight-bold text-grey-8 q-mb-xs">
                {{ $t('resultsChartSplitTitle') }}
            </div>
            <TotalSplitPieChart
                :embodied="mitsi.totalEmbodied"
                :operational="mitsi.totalOperational"
                :total="mitsi.totalLifespan"
                :labels="{
                    embodied: t('resultsRowEmbodied'),
                    operational: t('resultsRowOperational'),
                }"
            />
            <!-- v2 (lead decision): underlying services excluded in v1 — one-line restore:
            :underlying="mitsi.totalUnderlying"  and  labels.underlying: t('resultsRowUnderlying') -->
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMitsiStore } from 'src/stores/mitsi';
import { formatKg, formatResult } from 'src/utils/format';
import TotalSplitPieChart from 'src/components/results/TotalSplitPieChart.vue';

withDefaults(
    defineProps<{
        showChart?: boolean;
    }>(),
    { showChart: false },
);

const { t } = useI18n();
const mitsi = useMitsiStore();
const operationalResultOptions = computed(() => ({
    missingLabel: t('mainNotApplicable'),
    partialLabel: mitsi.energyCoverage.isComplete
        ? ''
        : t('resultsEnergyCoverage', {
              complete: mitsi.energyCoverage.completeDatacenters,
              total: mitsi.energyCoverage.totalDatacenters,
          }),
}));
const combinedResultOptions = computed(() => ({
    missingLabel: t('mainNotApplicable'),
    partialLabel: mitsi.resultsPartial ? t('resultsPartial') : '',
}));
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.results-table {
    @include table-cells.cells;
    overflow: visible !important;
}

.results-total td {
    border-top: 2px solid rgba(0, 0, 0, 0.2);
    font-weight: 700;
}
</style>

<template>
    <div class="results-total-wrapper">
        <q-markup-table dense flat bordered class="results-table">
            <tbody>
                <tr>
                    <td data-kind="text">{{ $t('resultsRowEmbodied') }}</td>
                    <td class="text-right" data-kind="number">
                        {{ formatKg(surveyResults.totalEmbodied) }}
                    </td>
                </tr>
                <tr>
                    <td data-kind="text">{{ $t('resultsRowOperational') }}</td>
                    <td class="text-right" data-kind="number">
                        {{ formatResult(surveyResults.totalOperational, operationalResultOptions) }}
                    </td>
                </tr>
                <tr class="results-total">
                    <td data-kind="text">
                        <strong>{{ $t('resultsRowTotal') }}</strong>
                    </td>
                    <td class="text-right" data-kind="number">
                        <strong>{{
                            formatResult(surveyResults.totalLifespan, combinedResultOptions)
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
                :embodied="surveyResults.totalEmbodied"
                :operational="surveyResults.totalOperational"
                :total="surveyResults.totalLifespan"
                :labels="{
                    embodied: t('resultsRowEmbodied'),
                    operational: t('resultsRowOperational'),
                }"
            />
            <!-- v2 (lead decision): underlying services excluded in v1 — one-line restore:
            :underlying="surveyResults.totalUnderlying"  and  labels.underlying: t('resultsRowUnderlying') -->
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSurveyDataStore } from 'src/stores/surveyData';
import { useSurveyResultsStore } from 'src/stores/surveyResults';

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatKg, formatResult } from 'src/utils/format';
import TotalSplitPieChart from 'src/components/results/TotalSplitPieChart.vue';

const surveyData = useSurveyDataStore();
const surveyResults = useSurveyResultsStore();

withDefaults(
    defineProps<{
        showChart?: boolean;
    }>(),
    { showChart: false },
);

const { t } = useI18n();
const operationalResultOptions = computed(() => ({
    missingLabel: t('mainNotApplicable'),
    partialLabel: surveyResults.energyCoverage.isComplete
        ? ''
        : t('resultsEnergyCoverage', {
              complete: surveyResults.energyCoverage.completeDatacenters,
              total: surveyResults.energyCoverage.totalDatacenters,
          }),
}));
const combinedResultOptions = computed(() => ({
    missingLabel: t('mainNotApplicable'),
    partialLabel: surveyData.resultsStatus === 'partial' ? t('resultsPartial') : '',
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

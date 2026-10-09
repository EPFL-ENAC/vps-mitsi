<template>
    <div class="results-total-wrapper">
        <q-markup-table dense flat bordered class="results-table">
            <tbody>
                <tr>
                    <td data-kind="text">{{ $t('resultsRowEmbodied') }}</td>
                    <td class="text-right" data-kind="number">
                        <ComputationResultDisplay
                            :computation="surveyResults.totalEmbodiedEmissionsKg"
                            :format-value="formatKg"
                        >
                            <template #ignored-input="{ input }">{{
                                input.name || input.id
                            }}</template>
                        </ComputationResultDisplay>
                    </td>
                </tr>
                <tr>
                    <td data-kind="text">{{ $t('resultsRowOperational') }}</td>
                    <td class="text-right" data-kind="number">
                        <ComputationResultDisplay
                            :computation="surveyResults.totalOperationalEmissionsKg"
                            :missing-label="t('mainNotApplicable')"
                        >
                            <template #default="{ result }">
                                {{ formatResult(result, operationalResultOptions) }}
                            </template>
                            <template #ignored-input="{ input }">{{
                                formatDatacenterName(input)
                            }}</template>
                        </ComputationResultDisplay>
                    </td>
                </tr>
                <tr class="results-total">
                    <td data-kind="text">
                        <strong>{{ $t('resultsRowTotal') }}</strong>
                    </td>
                    <td class="text-right" data-kind="number">
                        <strong>
                            <ComputationResultDisplay
                                :computation="surveyResults.totalLifespanEmissionsKg"
                                :missing-label="t('mainNotApplicable')"
                            >
                                <template #default="{ result }">
                                    {{ formatResult(result, combinedResultOptions) }}
                                </template>
                            </ComputationResultDisplay>
                        </strong>
                    </td>
                </tr>
            </tbody>
        </q-markup-table>

        <!-- Split pie chart -->
        <div v-if="showChart" class="q-mt-md">
            <TotalSplitPieChart
                :embodied="surveyResults.totalEmbodiedEmissionsKg"
                :operational="surveyResults.totalOperationalEmissionsKg"
                :labels="{
                    embodied: t('resultsRowEmbodied'),
                    operational: t('resultsRowOperational'),
                }"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSurveyResultsStore } from 'src/stores/surveyResults';

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatDatacenterName, formatKg, formatResult } from 'src/utils/format';
import TotalSplitPieChart from 'src/components/results/TotalSplitPieChart.vue';
import ComputationResultDisplay from 'src/components/ComputationResultDisplay.vue';

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
    partialLabel: surveyResults.operationalCalculationCoverage.isComplete
        ? ''
        : t('resultsEnergyCoverage', {
              complete: surveyResults.operationalCalculationCoverage.validDatacenterCount,
              total: surveyResults.operationalCalculationCoverage.totalDatacenterCount,
          }),
}));
const combinedResultOptions = computed(() => ({
    missingLabel: t('mainNotApplicable'),
    partialLabel:
        surveyResults.totalLifespanEmissionsKg.success === 'partial' ? t('resultsPartial') : '',
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

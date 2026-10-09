<template>
    <div class="results-operational-wrapper">
        <q-table
            flat
            bordered
            dense
            hide-pagination
            :pagination="{ rowsPerPage: 0 }"
            :rows="surveyResults.datacenterOperationalResults.result ?? []"
            :columns="operationalColumns"
            :row-key="(row: DatacenterOperationalResult) => row.datacenter.id"
            class="results-table"
        >
            <template #header-cell="props">
                <q-th :props="props" :data-kind="props.col.kind">
                    {{ props.col.label }}
                </q-th>
            </template>

            <template #body-cell="props">
                <q-td :props="props" :data-kind="props.col.kind">
                    {{ props.value }}
                </q-td>
            </template>

            <template #bottom-row>
                <q-tr class="results-total">
                    <q-td colspan="2">
                        <strong>{{ $t('resultsTotalOperational') }}</strong>
                    </q-td>
                    <q-td></q-td>
                    <q-td class="text-right">
                        <strong>
                            <ComputationResultDisplay
                                :disable-tooltip="disableTooltip"
                                :computation="surveyResults.totalOperationalEmissionsKg"
                            >
                                <template #default="{ result }">
                                    {{ formatResult(result, operationalResultOptions) }}
                                </template>
                                <template #ignored-input="{ input }">{{
                                    formatDatacenterName(input)
                                }}</template>
                            </ComputationResultDisplay>
                        </strong>
                    </q-td>
                </q-tr>
            </template>
        </q-table>

        <!-- Pie chart po datacenter -->
        <div v-if="showChart" class="q-mt-md">
            <div class="text-subtitle1 text-weight-bold text-grey-8 q-mb-xs">
                {{ $t('resultsChartPieByDatacenter') }}
                <ComputationResultDisplay
                    :disable-tooltip="disableTooltip"
                    class="q-ml-sm"
                    :computation="surveyResults.totalOperationalEmissionsKg"
                    :missing-label="disableTooltip ? '' : t('resultsUnavailable')"
                    hide-value
                    :partial-flag-label="t('resultsPartial')"
                >
                    <template #ignored-input="{ input }">{{
                        formatDatacenterName(input)
                    }}</template>
                </ComputationResultDisplay>
            </div>
            <DatacentersPieChart
                :rows="surveyResults.datacenterOperationalResults.result ?? []"
                :total="surveyResults.totalOperationalEmissionsKg.result"
                metric="lifespan"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSurveyResultsStore } from 'src/stores/surveyResults';
import type { DatacenterOperationalResult } from 'src/models/Datacenter/computations';

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { QTableColumn } from 'quasar';
import { formatDatacenterName, formatKg, formatPueInclusion, formatResult } from 'src/utils/format';
import DatacentersPieChart from 'src/components/results/DatacentersPieChart.vue';
import ComputationResultDisplay from 'src/components/ComputationResultDisplay.vue';

const surveyResults = useSurveyResultsStore();

withDefaults(
    defineProps<{
        showChart?: boolean;
        disableTooltip?: boolean;
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

interface OperationalTableColumn extends QTableColumn<DatacenterOperationalResult> {
    kind: 'text' | 'number';
}

const operationalColumns = computed<OperationalTableColumn[]>(() => [
    {
        name: 'datacenter',
        label: t('resultsOperationalColumns.datacenterId'),
        align: 'left',
        field: (row) => formatDatacenterName(row.datacenter),
        kind: 'text',
    },
    {
        name: 'pue',
        label: t('resultsOperationalColumns.pue'),
        align: 'left',
        field: (row) => formatPueInclusion(t, row.pueInclusion),
        kind: 'text',
    },
    {
        name: 'co2Period',
        label: t('resultsOperationalColumns.co2Period'),
        align: 'right',
        field: (row) => formatKg(row.co2Period),
        kind: 'number',
    },
    {
        name: 'co2Lifespan',
        label: t('resultsOperationalColumns.co2Lifespan'),
        align: 'right',
        field: (row) => formatKg(row.co2Lifespan),
        kind: 'number',
    },
]);
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.results-table {
    @include table-cells.cells;
    overflow: visible !important;

    :deep(th),
    :deep(td) {
        white-space: normal !important;
        word-break: break-word;
    }
}

.results-total td {
    border-top: 2px solid rgba(0, 0, 0, 0.2);
    font-weight: 700;
}
</style>

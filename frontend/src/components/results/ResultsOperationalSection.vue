<template>
    <div class="results-operational-wrapper">
        <q-markup-table dense flat bordered class="results-table">
            <thead>
                <tr>
                    <th
                        v-for="col in operationalColumns"
                        :key="col.name"
                        :data-kind="col.kind"
                        scope="col"
                    >
                        {{ col.label }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in mitsi.operationalPerDc" :key="row.datacenterId">
                    <td v-for="col in operationalColumns" :key="col.name" :data-kind="col.kind">
                        {{ col.display(row) }}
                    </td>
                </tr>
                <tr class="results-total">
                    <td colspan="2">
                        <strong>{{ $t('resultsTotalOperational') }}</strong>
                    </td>
                    <td></td>
                    <td class="text-right">
                        <strong>{{ formatOperationalResult(mitsi.totalOperational) }}</strong>
                    </td>
                </tr>
            </tbody>
        </q-markup-table>

        <!-- Pie chart po datatsentram -->
        <div v-if="showChart" class="q-mt-md">
            <div class="text-subtitle1 text-weight-bold text-grey-8 q-mb-xs">
                {{ $t('resultsChartPieByDatacenter') }}
            </div>
            <DatacentersPieChart
                :rows="mitsi.operationalPerDc"
                :label-for="dcLabel"
                :total="mitsi.totalOperational"
                metric="lifespan"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMitsiStore } from 'src/stores/mitsi';
import { useResultFormatting } from 'src/composables/useResultFormatting';
import { formatDatacenterName, formatKg, formatPueInclusion } from 'src/utils/format';
import DatacentersPieChart from 'src/components/results/DatacentersPieChart.vue';

withDefaults(
    defineProps<{
        showChart?: boolean;
    }>(),
    { showChart: false },
);

const { t } = useI18n();
const mitsi = useMitsiStore();
const { formatOperationalResult } = useResultFormatting();

type OperationalRow = (typeof mitsi.operationalPerDc)[number];

interface OperationalColumn {
    name: keyof OperationalRow | 'pue';
    label: string;
    kind: 'text' | 'number';
    display: (row: OperationalRow) => string;
}

function dcLabel(datacenterId: string): string {
    const dc = mitsi.datacenters.find((d) => d.id === datacenterId);
    return dc ? formatDatacenterName(dc) : datacenterId;
}

function pueFor(datacenterId: string): number | null {
    return mitsi.datacenters.find((d) => d.id === datacenterId)?.energy.pue ?? null;
}

function pueText(datacenterId: string): string {
    return formatPueInclusion(t, pueFor(datacenterId));
}

const operationalColumns = computed<OperationalColumn[]>(() => [
    {
        name: 'datacenterId',
        label: t('resultsOperationalColumns.datacenterId'),
        kind: 'text',
        display: (row) => dcLabel(row.datacenterId),
    },
    {
        name: 'pue',
        label: t('resultsOperationalColumns.pue'),
        kind: 'text',
        display: (row) => pueText(row.datacenterId),
    },
    {
        name: 'co2Period',
        label: t('resultsOperationalColumns.co2Period'),
        kind: 'number',
        display: (row) => formatKg(row.co2Period),
    },
    {
        name: 'co2Lifespan',
        label: t('resultsOperationalColumns.co2Lifespan'),
        kind: 'number',
        display: (row) => formatKg(row.co2Lifespan),
    },
]);
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.results-table {
    @include table-cells.cells;
    overflow: visible !important;

    th,
    td {
        white-space: normal !important;
        word-break: break-word;
    }
}

.results-total td {
    border-top: 2px solid rgba(0, 0, 0, 0.2);
    font-weight: 700;
}
</style>

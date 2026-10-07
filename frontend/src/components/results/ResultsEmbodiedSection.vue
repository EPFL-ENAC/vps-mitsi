<template>
    <div class="results-embodied-wrapper">
        <div v-if="showToggle" class="row items-center q-mb-md">
            <q-toggle
                v-model="surveyData.includeSecondHandEmbodied"
                :label="$t('resultsSecondHandToggle')"
                color="primary"
            />
        </div>

        <div v-for="g in surveyResults.embodiedByCategory" :key="g.category" class="q-mb-md">
            <component
                :is="interactive ? QExpansionItem : 'div'"
                :label="t('inventoryCategory_' + normalizeKey(g.category))"
                default-opened
                dense
                class="results-category"
            >
                <div v-if="!interactive" class="text-subtitle2 text-weight-bold q-mb-xs">
                    {{ t('inventoryCategory_' + normalizeKey(g.category)) }}
                </div>

                <q-table
                    flat
                    bordered
                    dense
                    hide-pagination
                    :pagination="{ rowsPerPage: 0 }"
                    :rows="g.rows"
                    :columns="embodiedColumns"
                    row-key="id"
                    class="results-table"
                >
                    <template #header-cell="props">
                        <q-th :props="props" :data-kind="props.col.kind">
                            {{ props.col.label }}
                        </q-th>
                    </template>

                    <template #body="props">
                        <q-tr :props="props" :class="{ 'results-excluded': props.row.excluded }">
                            <q-td
                                v-for="col in props.cols"
                                :key="col.name"
                                :props="props"
                                :data-kind="col.kind"
                            >
                                <template v-if="col.name === 'co2RowTotal'">
                                    <span :class="{ 'results-strike': props.row.excluded }">
                                        {{ col.value }}
                                    </span>
                                    <span
                                        v-if="props.row.excluded"
                                        class="results-not-counted q-ml-xs"
                                    >
                                        ({{ $t('inventoryNotCounted') }})
                                    </span>
                                </template>
                                <template v-else>
                                    {{ col.value }}
                                </template>
                            </q-td>
                        </q-tr>
                    </template>
                </q-table>

                <div class="results-category-total text-right q-py-xs text-caption">
                    {{ $t('resultsCategoryTotal') }}:
                    <strong>{{ formatKg(g.categoryTotal) }}</strong>
                </div>
            </component>
        </div>

        <q-markup-table dense flat bordered class="results-table results-total-table q-mt-sm">
            <tbody>
                <tr class="results-total">
                    <td>
                        <strong>{{ $t('resultsTotalEmbodied') }}</strong>
                    </td>
                    <td class="text-right">
                        <strong>{{ formatKg(surveyResults.totalEmbodied) }}</strong>
                    </td>
                </tr>
            </tbody>
        </q-markup-table>

        <!-- treemap by element + treemap by category -->
        <div v-if="showChart" class="row q-col-gutter-md q-mt-sm">
            <div class="col-12 col-md-6">
                <div class="text-subtitle1 text-weight-bold text-grey-8 q-mb-xs">
                    {{ $t('resultsChartTreemapByElement') }}
                </div>
                <EmbodiedTreemapChart
                    :groups="surveyResults.embodiedByCategory"
                    :grand-total="surveyResults.totalEmbodied"
                    variant="element"
                />
            </div>
            <div class="col-12 col-md-6">
                <div class="text-subtitle1 text-weight-bold text-grey-8 q-mb-xs">
                    {{ $t('resultsChartTreemapByCategory') }}
                </div>
                <EmbodiedTreemapChart
                    :groups="surveyResults.embodiedByCategory"
                    :grand-total="surveyResults.totalEmbodied"
                    variant="category"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSurveyDataStore } from 'src/stores/surveyData';
import { useSurveyResultsStore } from 'src/stores/surveyResults';

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { QExpansionItem, type QTableColumn } from 'quasar';
import { formatKg, normalizeKey } from 'src/utils/format';
import EmbodiedTreemapChart from 'src/components/results/EmbodiedTreemapChart.vue';

const surveyData = useSurveyDataStore();
const surveyResults = useSurveyResultsStore();

withDefaults(
    defineProps<{
        showToggle?: boolean;
        interactive?: boolean;
        showChart?: boolean;
    }>(),
    {
        showToggle: false,
        interactive: false,
        showChart: false,
    },
);

const { t } = useI18n();

type EmbodiedRow = (typeof surveyResults.embodiedByCategory)[number]['rows'][number];

interface EmbodiedTableColumn extends QTableColumn<EmbodiedRow> {
    kind: 'text' | 'number';
}

const embodiedColumns = computed<EmbodiedTableColumn[]>(() => [
    {
        name: 'name',
        label: t('resultsEmbodiedColumns.name'),
        align: 'left',
        field: (row) => row.name,
        kind: 'text',
    },
    {
        name: 'description',
        label: t('resultsEmbodiedColumns.description'),
        align: 'left',
        field: (row) => row.description,
        kind: 'text',
    },
    {
        name: 'number',
        label: t('resultsEmbodiedColumns.number'),
        align: 'right',
        field: (row) => row.number ?? '—',
        kind: 'number',
    },
    {
        name: 'co2PerUnit',
        label: t('resultsEmbodiedColumns.co2PerUnit'),
        align: 'right',
        field: (row) => formatKg(row.co2PerUnit),
        kind: 'number',
    },
    {
        name: 'co2RowTotal',
        label: t('resultsEmbodiedColumns.co2RowTotal'),
        align: 'right',
        field: (row) => formatKg(row.co2RowTotal),
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

.results-category {
    margin-bottom: 8px;
}

.results-category-total {
    page-break-after: avoid;
    break-after: avoid;
}

.results-excluded {
    opacity: 0.55;
}

.results-strike {
    text-decoration: line-through;
}

.results-not-counted {
    font-style: italic;
    color: rgba(0, 0, 0, 0.5);
}

.results-total td {
    border-top: 2px solid rgba(0, 0, 0, 0.2);
    font-weight: 700;
}
</style>

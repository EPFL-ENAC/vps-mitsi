<template>
    <div class="results-embodied-wrapper">
        <div v-if="showToggle" class="row items-center q-mb-md">
            <q-toggle
                v-model="mitsi.includeSecondHandEmbodied"
                :label="$t('resultsSecondHandToggle')"
                color="primary"
            />
        </div>

        <div v-for="g in mitsi.embodiedByCategory" :key="g.category" class="q-mb-md">
            <component
                :is="interactive ? 'q-expansion-item' : 'div'"
                :label="t('inventoryCategory_' + normalizeKey(g.category))"
                default-opened
                dense
                class="results-category"
            >
                <div v-if="!interactive" class="text-subtitle2 text-weight-bold q-mb-xs">
                    {{ t('inventoryCategory_' + normalizeKey(g.category)) }}
                </div>

                <q-markup-table dense flat bordered class="results-table">
                    <thead>
                        <tr>
                            <th
                                v-for="col in embodiedColumns"
                                :key="col.name"
                                :data-kind="col.kind"
                                scope="col"
                            >
                                {{ col.label }}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="row in g.rows"
                            :key="row.id"
                            :class="{ 'results-excluded': row.excluded }"
                        >
                            <td
                                v-for="col in embodiedColumns"
                                :key="col.name"
                                :data-kind="col.kind"
                            >
                                <template v-if="col.name === 'co2RowTotal'">
                                    <span :class="{ 'results-strike': row.excluded }">
                                        {{ col.display(row) }}
                                    </span>
                                    <span v-if="row.excluded" class="results-not-counted q-ml-xs">
                                        ({{ $t('inventoryNotCounted') }})
                                    </span>
                                </template>
                                <template v-else>{{ col.display(row) }}</template>
                            </td>
                        </tr>
                    </tbody>
                </q-markup-table>

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
                        <strong>{{ formatKg(mitsi.totalEmbodied) }}</strong>
                    </td>
                </tr>
            </tbody>
        </q-markup-table>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMitsiStore } from 'src/stores/mitsi';
import { formatKg, normalizeKey } from 'src/utils/format';

withDefaults(
    defineProps<{
        showToggle?: boolean;
        interactive?: boolean;
    }>(),
    {
        showToggle: false,
        interactive: false,
    },
);

const { t } = useI18n();
const mitsi = useMitsiStore();

type EmbodiedRow = (typeof mitsi.embodiedByCategory)[number]['rows'][number];

interface EmbodiedColumn {
    name: Exclude<keyof EmbodiedRow, 'id' | 'excluded'>;
    label: string;
    kind: 'text' | 'number';
    display: (row: EmbodiedRow) => string | number;
}

const embodiedColumns = computed<EmbodiedColumn[]>(() => [
    {
        name: 'name',
        label: t('resultsEmbodiedColumns.name'),
        kind: 'text',
        display: (row) => row.name,
    },
    {
        name: 'description',
        label: t('resultsEmbodiedColumns.description'),
        kind: 'text',
        display: (row) => row.description,
    },
    {
        name: 'number',
        label: t('resultsEmbodiedColumns.number'),
        kind: 'number',
        display: (row) => row.number,
    },
    {
        name: 'co2PerUnit',
        label: t('resultsEmbodiedColumns.co2PerUnit'),
        kind: 'number',
        display: (row) => formatKg(row.co2PerUnit),
    },
    {
        name: 'co2RowTotal',
        label: t('resultsEmbodiedColumns.co2RowTotal'),
        kind: 'number',
        display: (row) => formatKg(row.co2RowTotal),
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

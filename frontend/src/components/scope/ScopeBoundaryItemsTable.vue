<template>
    <q-btn flat color="primary" dense class="q-mb-sm" :label="t('scopeBndAdd')" @click="addItem" />
    <q-table
        :rows="items"
        :columns="columns"
        :table-colspan="columns.length + 1"
        row-key="id"
        :pagination="{ rowsPerPage: 0 }"
        :rows-per-page-options="[0]"
        dense
        flat
        bordered
        hide-bottom
        class="scope-boundary-table"
    >
        <template #header="props">
            <q-tr :props="props">
                <q-th
                    v-for="col in props.cols"
                    :key="col.name"
                    :props="props"
                    :data-kind="col.kind"
                >
                    {{ col.label }}
                </q-th>
                <q-th auto-width />
            </q-tr>
        </template>

        <template #body="props">
            <q-tr :props="props">
                <q-td
                    v-for="col in props.cols"
                    :key="col.name"
                    :props="props"
                    :data-kind="col.kind"
                >
                    <ZodValidatedTextInput
                        v-model="props.row[col.field]"
                        :schema="col.zod"
                        :aria-label="col.label"
                        dense
                        outlined
                        hide-bottom-space
                    />
                </q-td>
                <q-td auto-width>
                    <q-btn
                        flat
                        dense
                        icon="delete"
                        :aria-label="t('scopeBndDelete')"
                        @click="removeItem(props.row.id)"
                    />
                </q-td>
            </q-tr>
        </template>
    </q-table>
</template>

<script setup lang="ts">
import { useSurveyDataStore } from 'src/stores/surveyData';

import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import { computed } from 'vue';
import type { QTableColumn } from 'quasar';
import type { z } from 'zod';
import type { BoundaryItem } from 'src/models/mitsi';
import { useI18n } from 'vue-i18n';

import { BoundaryItemSchema } from 'src/models/schema';
import { createSchemaColumn } from 'src/utils/tables';

const surveyData = useSurveyDataStore();

interface BoundaryColumn extends QTableColumn<BoundaryItem> {
    field: Exclude<keyof BoundaryItem, 'id'>;
    kind: 'text';
    zod: z.ZodType;
}

const props = defineProps<{
    kind: 'included' | 'excluded';
}>();

const { t } = useI18n();

const items = computed(() =>
    props.kind === 'included' ? surveyData.scope.includedItems : surveyData.scope.excludedItems,
);

type ColumnSpec = Omit<BoundaryColumn, 'name' | 'label' | 'zod'> & {
    label?: string;
};

const schemaColumn = createSchemaColumn(BoundaryItemSchema.shape, (field) =>
    t(`scopeBoundaryColumns.${field}`),
);

function column(spec: ColumnSpec): BoundaryColumn {
    const { label, ...options } = spec;

    return {
        ...schemaColumn(spec.field, label),
        ...options,
    };
}

const columns = computed<BoundaryColumn[]>(() => [
    column({ field: 'type', kind: 'text' }),
    column({ field: 'purpose', kind: 'text' }),
    column({
        field: 'reason',
        kind: 'text',
        label: t(`scopeBoundaryColumns.${props.kind}.reason`),
    }),
]);

function addItem(): void {
    surveyData.addBoundaryItem(props.kind);
}

function removeItem(id: string): void {
    const i = items.value.findIndex((item) => item.id === id);
    if (i >= 0) items.value.splice(i, 1);
}
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.scope-boundary-table {
    @include table-cells.cells;
}
</style>

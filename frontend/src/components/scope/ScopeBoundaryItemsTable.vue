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
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import { computed } from 'vue';
import type { QTableColumn } from 'quasar';
import type { z } from 'zod';
import type { BoundaryItem } from 'src/models/mitsi';
import { useI18n } from 'vue-i18n';

import { BoundaryItemSchema } from 'src/models/schema';
import { useMitsiStore } from 'src/stores/mitsi';

interface BoundaryColumn extends QTableColumn<BoundaryItem> {
    field: Exclude<keyof BoundaryItem, 'id'>;
    kind: 'text';
    zod: z.ZodType;
}

const props = defineProps<{
    kind: 'included' | 'excluded';
}>();

const { t } = useI18n();
const mitsi = useMitsiStore();

const items = computed(() =>
    props.kind === 'included' ? mitsi.scope.includedItems : mitsi.scope.excludedItems,
);

const columns = computed<BoundaryColumn[]>(() => [
    {
        name: 'type',
        field: 'type',
        label: t('scopeBoundaryColumns.type'),
        kind: 'text',
        zod: BoundaryItemSchema.shape.type,
    },
    {
        name: 'purpose',
        field: 'purpose',
        label: t('scopeBoundaryColumns.purpose'),
        kind: 'text',
        zod: BoundaryItemSchema.shape.purpose,
    },
    {
        name: 'reason',
        field: 'reason',
        label: t(`scopeBoundaryColumns.${props.kind}.reason`),
        kind: 'text',
        zod: BoundaryItemSchema.shape.reason,
    },
]);

function addItem(): void {
    mitsi.addBoundaryItem(props.kind);
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

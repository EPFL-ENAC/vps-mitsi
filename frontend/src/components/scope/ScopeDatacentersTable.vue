<template>
    <q-btn flat color="primary" class="q-mb-sm" :label="t('scopeDcAdd')" @click="addDatacenter" />
    <q-table
        :rows="surveyData.datacenters"
        :columns="columns"
        :table-colspan="columns.length + 1"
        row-key="id"
        :pagination="{ rowsPerPage: 0 }"
        :rows-per-page-options="[0]"
        dense
        flat
        bordered
        hide-bottom
        class="scope-datacenters-table"
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
                    <span v-if="col.name === 'usedBy'" class="text-grey-7">{{ col.value }}</span>
                    <ZodValidatedTextInput
                        v-else-if="col.zod"
                        v-model="props.row.generalInfo[col.name]"
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
                        :aria-label="t('scopeDcDelete')"
                        @click="removeDatacenter(props.row)"
                    />
                </q-td>
            </q-tr>
        </template>
    </q-table>
</template>

<script setup lang="ts">
import { useSurveyDataStore } from 'src/stores/surveyData';

import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import type { z } from 'zod';

import {
    type Datacenter,
    type DatacenterGeneralInfo,
    DatacenterGeneralInfoSchema,
} from 'src/models/Datacenter/schema';

import { formatDatacenterName } from 'src/utils/format';
import { createSchemaColumn } from 'src/utils/tables';

const surveyData = useSurveyDataStore();

interface DatacenterColumn extends QTableColumn<Datacenter> {
    name: keyof DatacenterGeneralInfo | 'usedBy';
    kind: 'text' | 'number';
    zod?: z.ZodType;
}

const { t } = useI18n();
const $q = useQuasar();

type ColumnSpec = Omit<DatacenterColumn, 'name' | 'label' | 'field' | 'zod'> & {
    field: keyof DatacenterGeneralInfo;
};

const schemaColumn = createSchemaColumn(DatacenterGeneralInfoSchema.shape, (field) =>
    t(`scopeDatacenterColumns.${field}`),
);

function column(spec: ColumnSpec): DatacenterColumn {
    const { field, ...options } = spec;

    return {
        ...schemaColumn(field),
        ...options,
        field: (dc) => dc.generalInfo[field],
    };
}

const columns = computed<DatacenterColumn[]>(() => [
    column({ field: 'abbreviation', kind: 'text' }),
    column({ field: 'name', kind: 'text' }),
    column({ field: 'comment', kind: 'text' }),
    {
        name: 'usedBy',
        field: usedByCell,
        label: t('scopeDatacenterColumns.usedBy'),
        kind: 'number',
    },
]);

function addDatacenter(): void {
    surveyData.addDatacenter();
}

function usedByCell(dc: Datacenter): string {
    const guard = surveyData.getDatacenterDeletionBlock(dc.id);
    return guard ? t('scopeDcInvRows', guard.hardwareRowCount) : t('scopeDcUsedByNone');
}

function showDeletionBlocked(name: string, hardwareRowCount: number): void {
    $q.dialog({
        title: t('scopeDcDeleteBlockedTitle'),
        message: t('scopeDcDeleteBlocked', {
            name,
            inv: t('scopeDcInvRows', hardwareRowCount),
        }),
        ok: true,
    });
}

function removeDatacenter(dc: Datacenter): void {
    const name = formatDatacenterName(dc);
    const guard = surveyData.getDatacenterDeletionBlock(dc.id);
    if (guard) {
        showDeletionBlocked(name, guard.hardwareRowCount);
        return;
    }
    $q.dialog({
        title: t('scopeDcDeleteConfirmTitle'),
        message: t('scopeDcDeleteConfirmMessage', { name }),
        cancel: true,
        persistent: true,
    }).onOk(() => {
        const result = surveyData.removeDatacenter(dc.id);
        if (!result.removed && result.reason === 'in_use') {
            showDeletionBlocked(name, result.usage.hardwareRowCount);
        }
    });
}
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.scope-datacenters-table {
    @include table-cells.cells;
}
</style>

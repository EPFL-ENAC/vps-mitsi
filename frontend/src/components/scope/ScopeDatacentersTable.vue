<template>
    <q-btn flat color="primary" class="q-mb-sm" :label="t('scopeDcAdd')" @click="addDatacenter" />
    <q-table
        :rows="mitsi.datacenters"
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
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import type { z } from 'zod';

import type { Datacenter, DatacenterGeneralInfo } from 'src/models/mitsi';
import { DatacenterGeneralInfoSchema } from 'src/models/schema';
import { useMitsiStore } from 'src/stores/mitsi';
import { formatDatacenterName } from 'src/utils/format';

interface DatacenterColumn extends QTableColumn<Datacenter> {
    name: keyof DatacenterGeneralInfo | 'usedBy';
    kind: 'text' | 'number';
    zod?: z.ZodType;
    sort?: (a: unknown, b: unknown, rowA: Datacenter, rowB: Datacenter) => number;
}

const { t } = useI18n();
const $q = useQuasar();
const mitsi = useMitsiStore();

const columns = computed<DatacenterColumn[]>(() => [
    {
        name: 'abbreviation',
        field: (dc) => dc.generalInfo.abbreviation,
        label: t('scopeDatacenterColumns.abbreviation'),
        kind: 'text',
        zod: DatacenterGeneralInfoSchema.shape.abbreviation,
    },
    {
        name: 'name',
        field: (dc) => dc.generalInfo.name,
        label: t('scopeDatacenterColumns.name'),
        kind: 'text',
        zod: DatacenterGeneralInfoSchema.shape.name,
    },
    {
        name: 'comment',
        field: (dc) => dc.generalInfo.comment,
        label: t('scopeDatacenterColumns.comment'),
        kind: 'text',
        zod: DatacenterGeneralInfoSchema.shape.comment,
    },
    {
        name: 'usedBy',
        field: usedByCell,
        label: t('scopeDatacenterColumns.usedBy'),
        kind: 'number',
    },
]);

function addDatacenter(): void {
    mitsi.addDatacenter();
}

function usedByCell(dc: Datacenter): string {
    const guard = mitsi.getDatacenterDeletionBlock(dc.id);
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
    const guard = mitsi.getDatacenterDeletionBlock(dc.id);
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
        const result = mitsi.removeDatacenter(dc.id);
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

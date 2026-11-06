<template>
    <div>
        <q-table
            :rows="surveyData.hardware"
            :columns="columns"
            row-key="id"
            flat
            bordered
            dense
            :pagination="{ rowsPerPage: 0 }"
            :rows-per-page-options="[0]"
            hide-bottom
            class="inventory-table bg-white"
        >
            <template #body="slotProps">
                <q-tr
                    :props="slotProps"
                    :class="{
                        'inventory-row--excluded': surveyResults.isSecondHandExcluded(
                            slotProps.row,
                        ),
                    }"
                >
                    <q-td key="category">{{ categoryLabel(slotProps.row) }}</q-td>
                    <q-td key="name" class="text-weight-medium">{{ rowName(slotProps.row) }}</q-td>
                    <q-td key="quantity">{{ slotProps.row.quantity ?? '—' }}</q-td>
                    <q-td key="datacenterId">{{ datacenterLabel(slotProps.row) }}</q-td>

                    <!-- Actions buttons: read, edit, delete -->
                    <q-td key="actions" class="text-right">
                        <div class="row items-center justify-end no-wrap q-gutter-x-xs">
                            <q-btn
                                flat
                                round
                                dense
                                size="sm"
                                icon="visibility"
                                text-color="dark"
                                :aria-label="$t('inventoryViewRow')"
                                @click="open(slotProps.row, 'view')"
                            >
                                <q-tooltip>{{ $t('inventoryViewRow') }}</q-tooltip>
                            </q-btn>
                            <q-btn
                                flat
                                round
                                dense
                                size="sm"
                                icon="edit"
                                text-color="dark"
                                :aria-label="$t('inventoryEditRow')"
                                @click="open(slotProps.row, 'edit')"
                            >
                                <q-tooltip>{{ $t('inventoryEditRow') }}</q-tooltip>
                            </q-btn>
                            <q-btn
                                flat
                                round
                                dense
                                size="sm"
                                icon="delete"
                                text-color="negative"
                                :aria-label="$t('inventoryDeleteRow')"
                                @click="confirmDeleteRow(slotProps.row)"
                            >
                                <q-tooltip>{{ $t('inventoryDeleteRow') }}</q-tooltip>
                            </q-btn>
                        </div>
                    </q-td>
                </q-tr>
            </template>
        </q-table>

        <HardwareDetailDialog
            v-if="selectedRow"
            v-model:open="dialogOpen"
            v-model:row="selectedRow"
            :readonly="dialogMode === 'view'"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar, type QTableColumn } from 'quasar';
import type { z } from 'zod';

import HardwareDetailDialog from 'src/components/inventory/HardwareDetailDialog.vue';
import { useSurveyDataStore } from 'src/stores/surveyData';
import { useSurveyResultsStore } from 'src/stores/surveyResults';
import { HardwareItemSchema, type HardwareItem } from 'src/models/HardwareItem/schema';
import { useHardwareDialog } from 'src/composables/useHardwareDialog';
import { formatDatacenterName } from 'src/utils/format';

const surveyData = useSurveyDataStore();
const surveyResults = useSurveyResultsStore();
const { dialogOpen, dialogMode, selectedRow, open, close } = useHardwareDialog();

const { t } = useI18n();
const $q = useQuasar();

interface InventoryColumn extends QTableColumn<HardwareItem> {
    kind?: 'enum' | 'datacenter' | 'text' | 'number' | 'toggle' | 'derived';
    zod?: z.ZodType;
}

const columns = computed<InventoryColumn[]>(() => [
    {
        name: 'category',
        label: t('inventoryColumns.category'),
        field: 'category',
        align: 'left',
        kind: 'enum',
        zod: HardwareItemSchema.shape.category,
    },
    {
        name: 'name',
        label: t('inventoryColumns.name'),
        field: 'name',
        align: 'left',
        kind: 'text',
        zod: HardwareItemSchema.shape.name,
    },
    {
        name: 'quantity',
        label: t('inventoryColumns.quantity'),
        field: 'quantity',
        align: 'left',
        kind: 'number',
        zod: HardwareItemSchema.shape.quantity,
    },
    {
        name: 'datacenterId',
        label: t('inventoryColumns.datacenterId'),
        field: 'datacenterId',
        align: 'left',
        kind: 'datacenter',
        zod: HardwareItemSchema.shape.datacenterId,
    },
    {
        name: 'actions',
        label: '',
        field: 'id',
        align: 'right',
        kind: 'derived',
    },
]);

function categoryLabel(row: HardwareItem): string {
    return t(`inventoryCategory_${row.category}`);
}

function rowName(row: HardwareItem): string {
    return row.name.trim() || '—';
}

function datacenterLabel(row: HardwareItem): string {
    const dc = surveyData.datacenters.find((item) => item.id === row.datacenterId);
    return dc ? formatDatacenterName(dc) : '—';
}

function confirmDeleteRow(row: HardwareItem): void {
    $q.dialog({
        title: t('inventoryDeleteConfirmTitle'),
        message: t('inventoryDeleteConfirmMessage', { name: rowName(row) }),
        cancel: true,
        persistent: true,
    }).onOk(() => {
        const i = surveyData.hardware.findIndex((h) => h.id === row.id);
        if (i >= 0) surveyData.hardware.splice(i, 1);
        if (selectedRow.value?.id === row.id) {
            close();
        }
    });
}

defineExpose({ openDialog: open });
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.inventory-table {
    @include table-cells.cells;

    .q-td {
        vertical-align: middle;
    }
}

.inventory-row--excluded .q-td {
    background: #faf8f8;
}
</style>

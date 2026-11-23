<template>
    <div>
        <q-table
            :rows="surveyData.datacenters"
            :columns="columns"
            row-key="id"
            flat
            bordered
            dense
            :pagination="{ rowsPerPage: 0 }"
            :rows-per-page-options="[0]"
            hide-bottom
            class="energy-table bg-white"
        >
            <template #body="slotProps">
                <q-tr :props="slotProps">
                    <q-td key="datacenter" class="text-weight-medium">
                        {{ formatDatacenterName(slotProps.row) }}
                    </q-td>
                    <q-td key="location">{{ formatCell(slotProps.row.energy.location) }}</q-td>
                    <q-td key="carbonIntensity">
                        {{ formatCell(slotProps.row.energy.carbonIntensity, 'gCO₂/kWh') }}
                    </q-td>
                    <q-td key="pue">{{ formatCell(slotProps.row.energy.pue) }}</q-td>
                    <q-td key="energyConsumption">
                        {{ formatCell(slotProps.row.energy.energyConsumption, 'kWh') }}
                    </q-td>

                    <!-- Actions buttons: read, edit, clear -->
                    <q-td key="actions" class="text-right">
                        <div class="row items-center justify-end no-wrap q-gutter-x-xs">
                            <q-btn
                                flat
                                round
                                dense
                                size="sm"
                                icon="visibility"
                                text-color="dark"
                                :aria-label="$t('energyViewRow')"
                                @click="openDialog(slotProps.row, 'view')"
                            >
                                <q-tooltip>{{ $t('energyViewRow') }}</q-tooltip>
                            </q-btn>
                            <q-btn
                                flat
                                round
                                dense
                                size="sm"
                                icon="edit"
                                text-color="dark"
                                :aria-label="$t('energyEditRow')"
                                @click="openDialog(slotProps.row)"
                            >
                                <q-tooltip>{{ $t('energyEditRow') }}</q-tooltip>
                            </q-btn>
                            <q-btn
                                flat
                                round
                                dense
                                size="sm"
                                icon="restart_alt"
                                text-color="negative"
                                :aria-label="$t('energyDcClear')"
                                @click="clearEnergy(slotProps.row)"
                            >
                                <q-tooltip>{{ $t('energyDcClear') }}</q-tooltip>
                            </q-btn>
                        </div>
                    </q-td>
                </q-tr>
            </template>
        </q-table>

        <EnergyDatacenterDetailDialog ref="dialog" @close="emit('close', $event)" />
    </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar, type QTableColumn } from 'quasar';

import EnergyDatacenterDetailDialog from 'src/components/energy/EnergyDatacenterDetailDialog.vue';
import { useSurveyDataStore } from 'src/stores/surveyData';
import type { DialogMode } from 'src/types/ui';
import type { DatacenterDraft } from 'src/models/Datacenter/schema';
import { formatDatacenterName } from 'src/utils/format';

const surveyData = useSurveyDataStore();
const dialog = useTemplateRef<InstanceType<typeof EnergyDatacenterDetailDialog>>('dialog');
const emit = defineEmits<{ close: [rowId: string] }>();

const { t } = useI18n();
const $q = useQuasar();

interface EnergyColumn extends QTableColumn<DatacenterDraft> {
    kind?: 'datacenter' | 'text' | 'number' | 'actions';
}

/** Compact master list: only the comments stay in the detail dialog. */
const columns = computed<EnergyColumn[]>(() => [
    {
        name: 'datacenter',
        label: t('energyColumns.datacenter'),
        field: formatDatacenterName,
        align: 'left',
        kind: 'datacenter',
    },
    {
        name: 'location',
        label: t('energyColumns.location'),
        field: (dc) => dc.energy.location,
        align: 'left',
        kind: 'text',
    },
    {
        name: 'carbonIntensity',
        label: t('energyColumns.carbonIntensity'),
        field: (dc) => dc.energy.carbonIntensity,
        align: 'left',
        kind: 'number',
    },
    {
        name: 'pue',
        label: t('energyColumns.pue'),
        field: (dc) => dc.energy.pue,
        align: 'left',
        kind: 'number',
    },
    {
        name: 'energyConsumption',
        label: t('energyColumns.energyConsumption'),
        field: (dc) => dc.energy.energyConsumption,
        align: 'left',
        kind: 'number',
    },
    {
        name: 'actions',
        label: '',
        field: 'id',
        align: 'right',
        kind: 'actions',
    },
]);

function formatCell(val: string | number | null | undefined, unit?: string): string {
    if (val === null || val === undefined || val === '' || Number.isNaN(val)) return '—';
    const text = typeof val === 'number' ? val.toLocaleString() : val.trim();
    return !text ? '—' : unit ? `${text} ${unit}` : text;
}

function clearEnergy(dc: DatacenterDraft): void {
    $q.dialog({
        title: t('energyClearConfirmTitle'),
        message: t('energyClearConfirmMessage', {
            name: formatDatacenterName(dc),
        }),
        cancel: true,
        persistent: true,
    }).onOk(() => surveyData.clearDatacenterEnergy(dc.id));
}

function openDialog(row: DatacenterDraft, mode: DialogMode = 'edit'): void {
    void dialog.value?.showAndFocus(row, { mode });
}

function showAndFocus(rowId: string, field?: string): Promise<void> | undefined {
    const row = surveyData.datacenters.find((item) => item.id === rowId);
    if (row) return dialog.value?.showAndFocus(row, { field });
}

defineExpose({ openDialog, showAndFocus });
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.energy-table {
    @include table-cells.master-detail-table;
}
</style>

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
                                @click="open(slotProps.row, 'view')"
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
                                @click="open(slotProps.row, 'edit')"
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

        <EnergyDatacenterDetailDialog
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

import EnergyDatacenterDetailDialog from 'src/components/energy/EnergyDatacenterDetailDialog.vue';
import { useSurveyDataStore } from 'src/stores/surveyData';
import { useEnergyDialog } from 'src/composables/useDetailDialog';
import { DatacenterEnergySchema, type DatacenterDraft } from 'src/models/Datacenter/schema';
import { formatDatacenterName } from 'src/utils/format';

const surveyData = useSurveyDataStore();
const { dialogOpen, dialogMode, selectedRow, open } = useEnergyDialog();

const { t } = useI18n();
const $q = useQuasar();

interface EnergyColumn extends QTableColumn<DatacenterDraft> {
    kind?: 'datacenter' | 'text' | 'number' | 'actions';
    zod?: z.ZodType;
}

/** Compact master list: PUE and the comments live in the detail dialog only. */
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
        zod: DatacenterEnergySchema.shape.location,
    },
    {
        name: 'carbonIntensity',
        label: t('energyColumns.carbonIntensity'),
        field: (dc) => dc.energy.carbonIntensity,
        align: 'left',
        kind: 'number',
        zod: DatacenterEnergySchema.shape.carbonIntensity,
    },
    {
        name: 'energyConsumption',
        label: t('energyColumns.energyConsumption'),
        field: (dc) => dc.energy.energyConsumption,
        align: 'left',
        kind: 'number',
        zod: DatacenterEnergySchema.shape.energyConsumption,
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

defineExpose({ openDialog: open });
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.energy-table {
    @include table-cells.master-detail-table;
}
</style>

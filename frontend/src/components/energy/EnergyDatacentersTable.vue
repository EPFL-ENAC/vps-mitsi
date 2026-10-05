<template>
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
        class="energy-table"
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
                    <template v-if="col.name === 'datacenter'">{{ col.value }}</template>
                    <ZodValidatedNumberInput
                        v-else-if="col.kind === 'number' && col.zod"
                        v-model="props.row.energy[col.name]"
                        :schema="col.zod"
                        :aria-label="col.label"
                        dense
                        outlined
                        hide-bottom-space
                    />
                    <ZodValidatedTextInput
                        v-else-if="col.kind === 'text' && col.zod"
                        v-model="props.row.energy[col.name]"
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
                        icon="restart_alt"
                        :aria-label="t('energyDcClear')"
                        @click="clearEnergy(props.row)"
                    />
                </q-td>
            </q-tr>
        </template>
    </q-table>
</template>

<script setup lang="ts">
import ZodValidatedNumberInput from 'src/components/inputs/ZodValidatedNumberInput.vue';
import { computed } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import type { z } from 'zod';
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import { useI18n } from 'vue-i18n';
import { useMitsiStore } from 'src/stores/mitsi';
import { formatDatacenterName } from 'src/utils/format';
import { DatacenterEnergySchema } from 'src/models/schema';
import type { Datacenter, DatacenterEnergy } from 'src/models/mitsi';

interface EnergyColumn extends QTableColumn<Datacenter> {
    name: keyof DatacenterEnergy | 'datacenter';
    kind: 'datacenter' | 'text' | 'number';
    zod?: z.ZodType;
}

const mitsi = useMitsiStore();
const { t } = useI18n();
const $q = useQuasar();

const columns = computed<EnergyColumn[]>(() => [
    {
        name: 'datacenter',
        field: formatDatacenterName,
        label: t('energyColumns.datacenter'),
        kind: 'datacenter',
    },
    {
        name: 'comment',
        field: (dc) => dc.energy.comment,
        label: t('energyColumns.comment'),
        kind: 'text',
        zod: DatacenterEnergySchema.shape.comment,
    },
    {
        name: 'location',
        field: (dc) => dc.energy.location,
        label: t('energyColumns.location'),
        kind: 'text',
        zod: DatacenterEnergySchema.shape.location,
    },
    {
        name: 'locationComment',
        field: (dc) => dc.energy.locationComment,
        label: t('energyColumns.locationComment'),
        kind: 'text',
        zod: DatacenterEnergySchema.shape.locationComment,
    },
    {
        name: 'carbonIntensity',
        field: (dc) => dc.energy.carbonIntensity,
        label: t('energyColumns.carbonIntensity'),
        kind: 'number',
        zod: DatacenterEnergySchema.shape.carbonIntensity,
    },
    {
        name: 'carbonIntensityComment',
        field: (dc) => dc.energy.carbonIntensityComment,
        label: t('energyColumns.carbonIntensityComment'),
        kind: 'text',
        zod: DatacenterEnergySchema.shape.carbonIntensityComment,
    },
    {
        name: 'pue',
        field: (dc) => dc.energy.pue,
        label: t('energyColumns.pue'),
        kind: 'number',
        zod: DatacenterEnergySchema.shape.pue,
    },
    {
        name: 'pueComment',
        field: (dc) => dc.energy.pueComment,
        label: t('energyColumns.pueComment'),
        kind: 'text',
        zod: DatacenterEnergySchema.shape.pueComment,
    },
    {
        name: 'energyConsumption',
        field: (dc) => dc.energy.energyConsumption,
        label: t('energyColumns.energyConsumption'),
        kind: 'number',
        zod: DatacenterEnergySchema.shape.energyConsumption,
    },
    {
        name: 'energyComment',
        field: (dc) => dc.energy.energyComment,
        label: t('energyColumns.energyComment'),
        kind: 'text',
        zod: DatacenterEnergySchema.shape.energyComment,
    },
]);

function clearEnergy(dc: Datacenter): void {
    $q.dialog({
        title: t('energyClearConfirmTitle'),
        message: t('energyClearConfirmMessage', {
            name: formatDatacenterName(dc),
        }),
        cancel: true,
        persistent: true,
    }).onOk(() => mitsi.clearDatacenterEnergy(dc.id));
}
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.energy-table {
    @include table-cells.cells;
}
</style>

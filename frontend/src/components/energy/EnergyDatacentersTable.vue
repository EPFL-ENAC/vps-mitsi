<template>
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
import { useSurveyDataStore } from 'src/stores/surveyData';

import ZodValidatedNumberInput from 'src/components/inputs/ZodValidatedNumberInput.vue';
import { computed } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import type { z } from 'zod';
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import { useI18n } from 'vue-i18n';
import { formatDatacenterName } from 'src/utils/format';
import { createSchemaColumn } from 'src/utils/tables';
import { DatacenterEnergySchema } from 'src/models/schema';
import type { Datacenter, DatacenterEnergy } from 'src/models/mitsi';

const surveyData = useSurveyDataStore();

interface EnergyColumn extends QTableColumn<Datacenter> {
    name: keyof DatacenterEnergy | 'datacenter';
    kind: 'datacenter' | 'text' | 'number';
    zod?: z.ZodType;
}

const { t } = useI18n();
const $q = useQuasar();

type ColumnSpec = Omit<EnergyColumn, 'name' | 'label' | 'field' | 'zod'> & {
    field: keyof DatacenterEnergy;
};

const schemaColumn = createSchemaColumn(DatacenterEnergySchema.shape, (field) =>
    t(`energyColumns.${field}`),
);

function column(spec: ColumnSpec): EnergyColumn {
    const { field, ...options } = spec;

    return {
        ...schemaColumn(field),
        ...options,
        field: (dc) => dc.energy[field],
    };
}

const columns = computed<EnergyColumn[]>(() => [
    {
        name: 'datacenter',
        field: formatDatacenterName,
        label: t('energyColumns.datacenter'),
        kind: 'datacenter',
    },
    column({ field: 'comment', kind: 'text' }),
    column({ field: 'location', kind: 'text' }),
    column({ field: 'locationComment', kind: 'text' }),
    column({ field: 'carbonIntensity', kind: 'number' }),
    column({ field: 'carbonIntensityComment', kind: 'text' }),
    column({ field: 'pue', kind: 'number' }),
    column({ field: 'pueComment', kind: 'text' }),
    column({ field: 'energyConsumption', kind: 'number' }),
    column({ field: 'energyComment', kind: 'text' }),
]);

function clearEnergy(dc: Datacenter): void {
    $q.dialog({
        title: t('energyClearConfirmTitle'),
        message: t('energyClearConfirmMessage', {
            name: formatDatacenterName(dc),
        }),
        cancel: true,
        persistent: true,
    }).onOk(() => surveyData.clearDatacenterEnergy(dc.id));
}
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.energy-table {
    @include table-cells.cells;
}
</style>

<template>
    <div class="row items-center q-col-gutter-x-sm q-py-xs">
        <div class="col-1">
            <div class="energy-th">{{ $t('energyDcColName') }}</div>
        </div>
        <div class="col-1">
            <div class="energy-th">{{ $t('energyDcColNameComment') }}</div>
        </div>
        <div class="col-1">
            <div class="energy-th">{{ $t('energyDcColLocation') }}</div>
        </div>
        <div class="col-1">
            <div class="energy-th">{{ $t('energyDcColLocationComment') }}</div>
        </div>
        <div class="col-1">
            <div class="energy-th">{{ $t('energyDcColIntensity') }}</div>
        </div>
        <div class="col-1">
            <div class="energy-th">{{ $t('energyDcColIntensityComment') }}</div>
        </div>
        <div class="col-1">
            <div class="energy-th">{{ $t('energyDcColPue') }}</div>
        </div>
        <div class="col-1">
            <div class="energy-th">{{ $t('energyDcColPueComment') }}</div>
        </div>
        <div class="col-1">
            <div class="energy-th">{{ $t('energyDcColKwh') }}</div>
        </div>
        <div class="col-2">
            <div class="energy-th">{{ $t('energyDcColKwhComment') }}</div>
        </div>
        <div class="col-1" />
    </div>
    <div
        v-for="e in mitsi.energy"
        :key="e.datacenterId"
        class="row items-center q-col-gutter-x-sm q-py-xs"
    >
        <div class="col-1">
            <div class="text-grey-8 ellipsis">{{ dcLabel(e.datacenterId) }}</div>
        </div>
        <div class="col-1">
            <q-input class="full-width" v-model="e.comment" dense outlined hide-bottom-space />
        </div>
        <div class="col-1">
            <q-input class="full-width" v-model="e.location" dense outlined hide-bottom-space />
        </div>
        <div class="col-1">
            <q-input
                class="full-width"
                v-model="e.locationComment"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1">
            <q-input
                type="number"
                class="full-width"
                v-model.number="e.carbonIntensity"
                :rules="[toValidationRule(DatacenterEnergySchema.shape.carbonIntensity)]"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1">
            <q-input
                class="full-width"
                v-model="e.carbonIntensityComment"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1">
            <q-input
                type="number"
                class="full-width"
                v-model.number="e.pue"
                :rules="[toValidationRule(DatacenterEnergySchema.shape.pue)]"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1">
            <q-input class="full-width" v-model="e.pueComment" dense outlined hide-bottom-space />
        </div>
        <div class="col-1">
            <q-input
                type="number"
                class="full-width"
                v-model.number="e.energyConsumption"
                :rules="[toValidationRule(DatacenterEnergySchema.shape.energyConsumption)]"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-2">
            <q-input
                class="full-width"
                v-model="e.energyComment"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1 text-right">
            <q-btn
                flat
                dense
                icon="delete"
                :aria-label="$t('energyDcDeleteRow')"
                @click="deleteEnergyRow(e)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useMitsiStore } from 'src/stores/mitsi';
import { useValidation } from 'src/composables/useValidation';
import { DatacenterEnergySchema } from 'src/models/schema';
import type { DatacenterEnergy } from 'src/models/mitsi';

const mitsi = useMitsiStore();
const { t } = useI18n();
const $q = useQuasar();
const { toValidationRule } = useValidation();

// ── Display-only helpers (never written back to the store) ──────────────────
function dcLabel(datacenterId: string): string {
    return mitsi.scope.datacenters.find((dc) => dc.id === datacenterId)?.name || datacenterId;
}

function deleteEnergyRow(row: DatacenterEnergy): void {
    $q.dialog({
        title: t('energyDeleteRowConfirmTitle'),
        message: t('energyDeleteRowConfirmMessage', { name: dcLabel(row.datacenterId) }),
        cancel: true,
        persistent: true,
    }).onOk(() => {
        const i = mitsi.energy.findIndex((e) => e.datacenterId === row.datacenterId);
        if (i !== -1) mitsi.energy.splice(i, 1);
    });
}
</script>

<style scoped>
.energy-th {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgba(0, 0, 0, 0.6);
}
</style>

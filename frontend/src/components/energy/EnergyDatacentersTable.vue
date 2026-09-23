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
        v-for="dc in mitsi.datacenters"
        :key="dc.id"
        class="row items-center q-col-gutter-x-sm q-py-xs"
    >
        <div class="col-1">
            <div class="text-grey-8 ellipsis">
                {{ formatDatacenterName(dc) }}
            </div>
        </div>
        <div class="col-1">
            <q-input
                class="full-width"
                v-model="dc.energy.comment"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1">
            <q-input
                class="full-width"
                v-model="dc.energy.location"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1">
            <q-input
                class="full-width"
                v-model="dc.energy.locationComment"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1">
            <q-input
                type="number"
                class="full-width"
                v-model.number="dc.energy.carbonIntensity"
                :rules="[toValidationRule(DatacenterEnergySchema.shape.carbonIntensity)]"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1">
            <q-input
                class="full-width"
                v-model="dc.energy.carbonIntensityComment"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1">
            <q-input
                type="number"
                class="full-width"
                v-model.number="dc.energy.pue"
                :rules="[toValidationRule(DatacenterEnergySchema.shape.pue)]"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1">
            <q-input
                class="full-width"
                v-model="dc.energy.pueComment"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1">
            <q-input
                type="number"
                class="full-width"
                v-model.number="dc.energy.energyConsumption"
                :rules="[toValidationRule(DatacenterEnergySchema.shape.energyConsumption)]"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-2">
            <q-input
                class="full-width"
                v-model="dc.energy.energyComment"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-1 text-right">
            <q-btn
                flat
                dense
                icon="restart_alt"
                :aria-label="$t('energyDcClear')"
                @click="clearEnergy(dc)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useMitsiStore } from 'src/stores/mitsi';
import { formatDatacenterName } from 'src/utils/format';
import { useValidation } from 'src/composables/useValidation';
import { DatacenterEnergySchema } from 'src/models/schema';
import type { Datacenter } from 'src/models/mitsi';

const mitsi = useMitsiStore();
const { t } = useI18n();
const $q = useQuasar();
const { toValidationRule } = useValidation();

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

<style scoped>
.energy-th {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgba(0, 0, 0, 0.6);
}
</style>

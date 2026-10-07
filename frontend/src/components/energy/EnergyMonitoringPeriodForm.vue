<template>
    <div class="row items-center q-col-gutter-x-sm q-py-xs">
        <div class="col-2">
            <div class="energy-th">{{ $t('energyMonitorUnitLabel') }}</div>
        </div>
        <div class="col-2">
            <div class="energy-th">{{ $t('energyMonitorValueLabel') }}</div>
        </div>
        <div class="col-8">
            <div class="energy-th">{{ $t('energyMonitorCommentLabel') }}</div>
        </div>
    </div>
    <div class="row items-center q-col-gutter-x-sm q-py-xs">
        <div class="col-2">
            <ZodValidatedSelect
                class="full-width"
                v-model="mitsi.monitoringPeriod.unit"
                :schema="MonitoringPeriodSchema.shape.unit"
                :options="monitoringUnitOptions"
                emit-value
                map-options
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-2">
            <ZodValidatedNumberInput
                class="full-width"
                v-model="mitsi.monitoringPeriod.value"
                :schema="MonitoringPeriodSchema.shape.value"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-8">
            <q-input
                class="full-width"
                v-model="mitsi.monitoringPeriod.comment"
                dense
                outlined
                hide-bottom-space
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import ZodValidatedNumberInput from 'src/components/inputs/ZodValidatedNumberInput.vue';
import ZodValidatedSelect from 'src/components/inputs/ZodValidatedSelect.vue';
import { useI18n } from 'vue-i18n';
import { useMitsiStore } from 'src/stores/mitsi';
import { MonitoringPeriodSchema, MonitoringUnitSchema } from 'src/models/schema';
import { normalizeKey } from 'src/utils/format';

const mitsi = useMitsiStore();
const { t } = useI18n();

const monitoringUnitOptions = MonitoringUnitSchema.options.map((unit) => ({
    label: t('energyMonitorUnit_' + normalizeKey(unit)),
    value: unit,
}));
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

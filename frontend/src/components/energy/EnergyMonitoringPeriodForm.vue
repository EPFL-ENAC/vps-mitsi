<template>
    <div class="row items-start q-col-gutter-sm q-py-xs">
        <div class="col-2">
            <ZodValidatedSelect
                class="full-width"
                v-model="mitsi.monitoringPeriod.unit"
                :label="$t('energyMonitorUnitLabel')"
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
                :label="$t('energyMonitorValueLabel')"
                :schema="MonitoringPeriodSchema.shape.value"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-8">
            <ZodValidatedTextInput
                class="full-width"
                v-model="mitsi.monitoringPeriod.comment"
                :label="$t('energyMonitorCommentLabel')"
                :schema="MonitoringPeriodSchema.shape.comment"
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
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
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

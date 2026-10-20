<template>
    <div class="row items-start q-col-gutter-sm q-py-xs">
        <div class="col-2">
            <ZodValidatedSelect
                v-model="surveyData.monitoringPeriod.unit"
                class="full-width"
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
                v-model="surveyData.monitoringPeriod.value"
                class="full-width"
                :label="$t('energyMonitorValueLabel')"
                :schema="MonitoringPeriodSchema.shape.value"
                dense
                outlined
                hide-bottom-space
            />
        </div>
        <div class="col-8">
            <ZodValidatedTextInput
                v-model="surveyData.monitoringPeriod.comment"
                class="full-width"
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
import { useSurveyDataStore } from 'src/stores/surveyData';

import ZodValidatedNumberInput from 'src/components/inputs/ZodValidatedNumberInput.vue';
import ZodValidatedSelect from 'src/components/inputs/ZodValidatedSelect.vue';
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import { useI18n } from 'vue-i18n';
import { MonitoringPeriodSchema, MonitoringUnitSchema } from 'src/models/MonitoringPeriod/schema';
import { normalizeKey } from 'src/utils/format';

const surveyData = useSurveyDataStore();

const { t } = useI18n();

const monitoringUnitOptions = MonitoringUnitSchema.options.map((unit) => ({
    label: t('energyMonitorUnit_' + normalizeKey(unit)),
    value: unit,
}));
</script>

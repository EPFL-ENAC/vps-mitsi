<template>
    <div class="q-pa-md scope-page">
        <div class="text-h4 q-mb-sm">{{ $t('scopePageTitle') }}</div>
        <p class="text-grey-7">
            {{ $t('scopePageHint') }}
        </p>

        <q-banner
            v-if="!surveyData.isScopeValid"
            inline-actions
            class="bg-warning text-white q-mb-md"
        >
            {{ $t('scopeBlockFirstHint') }}
        </q-banner>

        <!-- General (report-only) -->
        <AssessmentSection :title="$t('scopeGeneralTitle')" purpose="report" default-opened>
            <div class="row q-col-gutter-md">
                <div class="col-12 col-md-4">
                    <ZodValidatedTextInput
                        v-model="surveyData.scope.organizationName"
                        :label="$t('scopeOrganizationLabel')"
                        :schema="ScopeSchema.shape.organizationName"
                        dense
                        outlined
                    />
                </div>
                <div class="col-12 col-md-4">
                    <ZodValidatedTextInput
                        v-model="surveyData.scope.assessors"
                        :label="$t('scopeAssessorsLabel')"
                        :schema="ScopeSchema.shape.assessors"
                        dense
                        outlined
                    />
                </div>
                <div class="col-12 col-md-4">
                    <ZodValidatedTextInput
                        v-model="surveyData.scope.serviceName"
                        :label="$t('scopeServiceNameLabel')"
                        :schema="ScopeSchema.shape.serviceName"
                        dense
                        outlined
                    >
                        <q-tooltip>{{ $t('scopeServiceNameTooltip') }}</q-tooltip>
                    </ZodValidatedTextInput>
                </div>
            </div>
        </AssessmentSection>

        <!-- Function (used in calculation) -->
        <AssessmentSection
            :title="$t('scopeFunctionTitle')"
            purpose="calculation"
            :default-opened="!surveyData.isScopeValid"
        >
            <div class="row q-col-gutter-md">
                <div class="col-12">
                    <ZodValidatedTextInput
                        type="textarea"
                        v-model="surveyData.scope.function"
                        :label="$t('scopeFunctionLabel')"
                        :schema="ScopeSchema.shape.function"
                        outlined
                    >
                        <q-tooltip>{{ $t('scopeFunctionTooltip') }}</q-tooltip>
                    </ZodValidatedTextInput>
                </div>

                <div class="col-12">
                    <div class="text-subtitle2 q-mb-xs">
                        {{ $t('scopeFunctionalUnitLabel') }}
                    </div>
                    <div class="scope-fu row items-center q-gutter-sm flex-nowrap">
                        <span>{{ $t('scopeFuBefore') }}</span>
                        <ZodValidatedNumberInput
                            class="scope-fu-input"
                            v-model="surveyData.scope.functionalUnit.usageDuration"
                            :schema="FunctionalUnitSchema.shape.usageDuration"
                            dense
                            outlined
                            hide-bottom-space
                        >
                            <q-tooltip>{{ $t('scopeFuDurationTooltip') }}</q-tooltip>
                        </ZodValidatedNumberInput>
                        <q-select
                            class="scope-fu-select"
                            v-model="surveyData.scope.functionalUnit.timeUnit"
                            :options="timeUnitOptions"
                            :rules="[toValidationRule(FunctionalUnitSchema.shape.timeUnit)]"
                            emit-value
                            map-options
                            dense
                            hide-bottom-space
                            outlined
                        >
                            <q-tooltip anchor="top middle" self="top middle">{{
                                $t('scopeFuTimeUnitTooltip')
                            }}</q-tooltip>
                        </q-select>
                        <span>{{ $t('scopeFuMiddle') }}</span>
                        <ZodValidatedNumberInput
                            class="scope-fu-input"
                            v-model="surveyData.scope.functionalUnit.resourceCount"
                            :schema="FunctionalUnitSchema.shape.resourceCount"
                            dense
                            outlined
                            hide-bottom-space
                        >
                            <q-tooltip>{{ $t('scopeFuResourceCountTooltip') }}</q-tooltip>
                        </ZodValidatedNumberInput>
                        <q-select
                            class="scope-fu-select scope-fu-select--grow"
                            v-model="surveyData.scope.functionalUnit.resourceType"
                            :options="resourceTypeOptions"
                            emit-value
                            map-options
                            dense
                            outlined
                        >
                            <q-tooltip anchor="center right" self="center left">{{
                                $t('scopeFuResourceTypeTooltip')
                            }}</q-tooltip>
                        </q-select>
                    </div>
                </div>
            </div>
        </AssessmentSection>

        <!-- Boundaries — datacenters -->
        <AssessmentSection
            :title="$t('scopeBoundariesDcTitle')"
            :title-tooltip="$t('scopeDcColumnsTooltip')"
            purpose="report"
            default-opened
        >
            <ScopeDatacentersTable />
        </AssessmentSection>

        <!-- Boundaries — included & excluded -->
        <AssessmentSection
            :title="$t('scopeBoundariesInclExclTitle')"
            :title-tooltip="$t('scopeBndColumnsTooltip')"
            purpose="report"
        >
            <div class="text-subtitle1 q-mb-xs">{{ $t('scopeBndIncludedTitle') }}</div>
            <ScopeBoundaryItemsTable kind="included" />

            <q-separator spaced />

            <div class="text-subtitle1 q-mb-xs">{{ $t('scopeBndExcludedTitle') }}</div>
            <ScopeBoundaryItemsTable kind="excluded" />
        </AssessmentSection>

        <!-- Lifespan -->
        <AssessmentSection :title="$t('scopeLifespanTitle')" purpose="calculation" default-opened>
            <ZodValidatedNumberInput
                class="scope-lifespan"
                v-model="surveyData.scope.lifespanYears"
                :label="$t('scopeLifespanLabel')"
                :suffix="$t('scopeLifespanYears')"
                :schema="ScopeSchema.shape.lifespanYears"
                dense
                outlined
            />
        </AssessmentSection>
    </div>
</template>

<script setup lang="ts">
import { useSurveyDataStore } from 'src/stores/surveyData';

import AssessmentSection from 'src/components/AssessmentSection.vue';
import ZodValidatedNumberInput from 'src/components/inputs/ZodValidatedNumberInput.vue';
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import ScopeDatacentersTable from 'src/components/scope/ScopeDatacentersTable.vue';
import ScopeBoundaryItemsTable from 'src/components/scope/ScopeBoundaryItemsTable.vue';
import { useValidation } from 'src/composables/useValidation';
import { FunctionalUnitSchema, ScopeSchema, TimeUnitSchema } from 'src/models/schema';
import { normalizeKey } from 'src/utils/format';

const surveyData = useSurveyDataStore();

const { t } = useI18n();
const { toValidationRule } = useValidation();

const timeUnitOptions = computed(() =>
    TimeUnitSchema.options.map((unit) => ({
        label: t('scopeTimeUnit_' + normalizeKey(unit)),
        value: unit,
    })),
);

const resourceTypeOptions = computed(() => [
    { label: t('scopeResourceTypeCpu'), value: 'CPU' },
    { label: t('scopeResourceTypeGpu'), value: 'GPU' },
]);
</script>

<style scoped>
.scope-fu-input {
    width: 90px;
}

.scope-fu-select {
    width: 120px;
    min-width: 110px;
}

.scope-fu-select--grow {
    width: 160px;
    min-width: 140px;
}

.scope-lifespan {
    max-width: 220px;
}
</style>

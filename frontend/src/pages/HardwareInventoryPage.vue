<template>
    <div class="q-pa-md inventory-page">
        <!-- Title + hint -->
        <div class="q-mb-md">
            <div class="text-h4">{{ $t('inventoryPageTitle') }}</div>
            <p class="text-grey-7 q-mb-none" style="max-width: 880px">
                {{ $t('inventoryPageHint') }}
            </p>
        </div>

        <!-- Scope gating hint (informational) -->
        <q-banner
            v-if="!surveyData.isScopeValid"
            dense
            inline-actions
            class="bg-blue-1 text-blue-9 q-mb-md rounded-borders"
        >
            <template #avatar>
                <q-icon name="sym_r_info" size="sm" />
            </template>
            {{ $t('inventoryNoScopeHint') }}
        </q-banner>

        <!-- Toolbar: Add row -->
        <div class="row items-center justify-end q-mb-sm inventory-toolbar">
            <q-btn
                unelevated
                color="primary"
                :label="$t('inventoryAddRow')"
                @click="table?.openDialog(surveyData.addHardwareItem(), 'edit', true)"
            />
        </div>

        <!-- Stats line -->
        <div class="row items-baseline q-col-gutter-md q-mb-sm">
            <i18n-t
                keypath="inventoryStats"
                tag="div"
                class="text-body2 text-grey-8"
                scope="global"
            >
                <template #rows>{{ surveyResults.hardwareRowCount }}</template>
                <template #elements>
                    <ComputationResultDisplay :computation="surveyResults.hardwareItemCount">
                        <template #ignored-input="{ input }">{{ input.name || input.id }}</template>
                    </ComputationResultDisplay>
                </template>
                <template #total>
                    <ComputationResultDisplay
                        :computation="surveyResults.totalEmbodiedEmissionsKg"
                        :format-value="formatKg"
                    >
                        <template #ignored-input="{ input }">{{ input.name || input.id }}</template>
                    </ComputationResultDisplay>
                </template>
            </i18n-t>
        </div>

        <!-- Warning bar -->
        <q-banner
            v-if="surveyData.missingMandatoryHardware > 0"
            inline-actions
            class="bg-warning text-dark q-mb-md"
        >
            <template #avatar>
                <q-icon name="sym_r_warning" />
            </template>
            {{ $t('inventoryWarningBar', { n: surveyData.missingMandatoryHardware }) }}
        </q-banner>

        <!-- No datacenters hint -->
        <q-banner
            v-if="!surveyData.datacenters.length"
            inline-actions
            class="bg-grey-3 text-grey-8 q-mb-md"
        >
            {{ $t('inventoryNoDatacentersHint') }}
        </q-banner>

        <!-- Inventory table -->
        <HardwareInventoryTable ref="table" @close="clearRowSelection" />

        <!-- Footer -->
        <div class="row items-center q-mt-md inventory-footer">
            <div class="text-body2 text-grey-7">
                {{ $t('inventoryFooter', { n: surveyResults.excludedSecondHandRowCount }) }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useSurveyDataStore } from 'src/stores/surveyData';
import { useSurveyResultsStore } from 'src/stores/surveyResults';

import HardwareInventoryTable from 'src/components/inventory/HardwareInventoryTable.vue';
import ComputationResultDisplay from 'src/components/ComputationResultDisplay.vue';
import { useAssessmentQueryFocus } from 'src/composables/useAssessmentQueryFocus';
import { formatKg } from 'src/utils/format';

const surveyData = useSurveyDataStore();
const surveyResults = useSurveyResultsStore();
const table = useTemplateRef<InstanceType<typeof HardwareInventoryTable>>('table');

const { clearRowSelection } = useAssessmentQueryFocus((rowId, field) =>
    table.value?.showAndFocus(rowId, field),
);
</script>

<style scoped>
.inventory-toolbar {
    flex-wrap: nowrap;
}

.inventory-footer {
    border-top: 1px solid var(--epfl-grey-100);
    padding-top: 12px;
}
</style>

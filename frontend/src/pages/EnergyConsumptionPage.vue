<template>
    <div class="q-pa-md">
        <div class="text-h4 q-mb-sm">{{ $t('energyPageTitle') }}</div>
        <p class="text-grey-7 q-mb-md">{{ $t('energyPageHint') }}</p>
        <!-- Scope gating hint -->
        <q-banner
            v-if="!surveyData.isScopeValid"
            inline-actions
            class="bg-warning text-white q-mb-md"
        >
            {{ $t('energyNoScopeHint') }}
        </q-banner>

        <!-- Usage monitoring period -->
        <AssessmentSection :title="$t('energyMonitorTitle')" purpose="calculation" default-opened>
            <EnergyMonitoringPeriodForm />
        </AssessmentSection>

        <q-banner
            v-if="!surveyData.datacenters.length"
            inline-actions
            class="bg-info text-white q-mb-md"
        >
            {{ $t('energyNoDatacentersHint') }}
        </q-banner>

        <!-- Datacenters' information -->
        <AssessmentSection
            :title="$t('energyDcTitle')"
            :title-tooltip="$t('energyDcColumnsTooltip')"
            purpose="calculation"
            default-opened
        >
            <EnergyDatacentersTable />
        </AssessmentSection>
    </div>
</template>

<script setup lang="ts">
import { useSurveyDataStore } from 'src/stores/surveyData';

import AssessmentSection from 'src/components/AssessmentSection.vue';
import EnergyMonitoringPeriodForm from 'src/components/energy/EnergyMonitoringPeriodForm.vue';
import EnergyDatacentersTable from 'src/components/energy/EnergyDatacentersTable.vue';

const surveyData = useSurveyDataStore();
</script>

<template>
    <div class="q-pa-md">
        <div class="text-h4 q-mb-sm">{{ $t('resultsPageTitle') }}</div>

        <!-- Scope gating hint -->
        <q-banner
            v-if="!surveyData.isScopeValid"
            inline-actions
            class="bg-warning text-white q-mb-md"
        >
            {{ $t('resultsNoScopeHint') }}
        </q-banner>

        <!-- Summary -->
        <AssessmentSection :title="$t('resultsSummaryTitle')" default-opened>
            <ResultsSummarySection />
        </AssessmentSection>

        <!-- Embodied emissions -->
        <AssessmentSection :title="$t('resultsEmbodiedTitle')" default-opened>
            <ResultsEmbodiedSection show-toggle interactive show-chart />
        </AssessmentSection>

        <!-- Operational emissions -->
        <AssessmentSection :title="$t('resultsOperationalTitle')" default-opened>
            <ResultsOperationalSection show-chart />
        </AssessmentSection>

        <!-- v2 FEATURE (lead decision: excluded from v1; spec contradiction — Results
             proposes the checkbox+editable table while "What we will not do yet" lists
             underlying services as a future evolution). The store already supports it:
             includeUnderlyingServices, underlyingServices, totalUnderlying (0 while off).
             To enable: add an editable Quasar-grid table
             (name / usage description / co2EstimateKg), include totalUnderlying in the
             Total zone and the split pie. -->

        <!-- Total emissions -->
        <AssessmentSection :title="$t('resultsTotalTitle')" default-opened>
            <ResultsTotalSection show-chart />
        </AssessmentSection>

        <!-- Emissions related to the functional unit -->
        <AssessmentSection :title="$t('resultsFuTitle')" default-opened>
            <ResultsFunctionalUnitSection />
        </AssessmentSection>

        <q-btn
            unelevated
            color="primary"
            class="full-width q-mt-md"
            :label="$t('resultsGenerateReport')"
            :disable="!surveyData.isScopeValid"
            @click="router.push('/report')"
        />
    </div>
</template>

<script setup lang="ts">
import { useSurveyDataStore } from 'src/stores/surveyData';

import { useRouter } from 'vue-router';
import AssessmentSection from 'src/components/AssessmentSection.vue';
import ResultsSummarySection from 'src/components/results/ResultsSummarySection.vue';
import ResultsEmbodiedSection from 'src/components/results/ResultsEmbodiedSection.vue';
import ResultsOperationalSection from 'src/components/results/ResultsOperationalSection.vue';
import ResultsTotalSection from 'src/components/results/ResultsTotalSection.vue';
import ResultsFunctionalUnitSection from 'src/components/results/ResultsFunctionalUnitSection.vue';

const surveyData = useSurveyDataStore();

const router = useRouter();
</script>

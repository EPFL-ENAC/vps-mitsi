<template>
    <div class="q-pa-md">
        <div class="text-h4 q-mb-sm">{{ $t('resultsPageTitle') }}</div>

        <!-- Scope gating hint -->
        <q-banner v-if="!mitsi.isScopeValid" inline-actions class="bg-warning text-white q-mb-md">
            {{ $t('resultsNoScopeHint') }}
        </q-banner>

        <!-- Summary -->
        <AssessmentSection :title="$t('resultsSummaryTitle')" default-opened>
            <ResultsSummarySection />
        </AssessmentSection>

        <!-- Embodied emissions -->
        <AssessmentSection :title="$t('resultsEmbodiedTitle')" default-opened>
            <ResultsEmbodiedSection show-toggle interactive />
        </AssessmentSection>

        <!-- Operational emissions -->
        <AssessmentSection :title="$t('resultsOperationalTitle')" default-opened>
            <ResultsOperationalSection />
        </AssessmentSection>

        <!-- Total emissions -->
        <AssessmentSection :title="$t('resultsTotalTitle')" default-opened>
            <ResultsTotalSection />
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
            :disable="!mitsi.isScopeValid"
            @click="router.push('/report')"
        />
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useMitsiStore } from 'src/stores/mitsi';
import AssessmentSection from 'src/components/AssessmentSection.vue';
import ResultsSummarySection from 'src/components/results/ResultsSummarySection.vue';
import ResultsEmbodiedSection from 'src/components/results/ResultsEmbodiedSection.vue';
import ResultsOperationalSection from 'src/components/results/ResultsOperationalSection.vue';
import ResultsTotalSection from 'src/components/results/ResultsTotalSection.vue';
import ResultsFunctionalUnitSection from 'src/components/results/ResultsFunctionalUnitSection.vue';

const router = useRouter();
const mitsi = useMitsiStore();
</script>

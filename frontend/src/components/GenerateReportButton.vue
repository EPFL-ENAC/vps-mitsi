<template>
    <q-btn
        unelevated
        color="primary"
        :label="t('resultsGenerateReport')"
        :disable="!surveyData.isScopeValid"
        v-bind="$attrs"
        @click="generateReport"
    />

    <q-dialog v-model="reportWarningOpen" :aria-label="t('reportWarningTitle')">
        <q-card style="width: 560px; max-width: 100%">
            <q-card-section class="text-h6">{{ t('reportWarningTitle') }}</q-card-section>
            <q-card-section>
                <p>{{ t('reportWarningMessage') }}</p>
                <ul>
                    <li v-for="{ name, computation } in unsuccessfulComputations" :key="name">
                        {{ t(`computationNames.${name}`) }} —
                        {{ t(`computationResult.${computation.success}.status`) }}
                    </li>
                </ul>
            </q-card-section>
            <q-card-actions align="right">
                <q-btn flat :label="t('reportWarningCancel')" @click="reportWarningOpen = false" />
                <q-btn color="primary" :label="t('reportWarningContinue')" @click="openReport" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useSurveyDataStore } from 'src/stores/surveyData';
import { useSurveyResultsStore, type NamedComputation } from 'src/stores/surveyResults';

defineOptions({ inheritAttrs: false });

const surveyData = useSurveyDataStore();
const surveyResults = useSurveyResultsStore();
const { t } = useI18n();
const reportWarningOpen = ref(false);
const unsuccessfulComputations = shallowRef<NamedComputation[]>([]);

const router = useRouter();

function openReport(): void {
    reportWarningOpen.value = false;
    void router.push('/report');
}

function generateReport(): void {
    const computations = surveyResults.allUnsuccessfulComputations();
    if (computations.length === 0) {
        openReport();
        return;
    }
    unsuccessfulComputations.value = computations;
    reportWarningOpen.value = true;
}
</script>

<template>
    <div class="report-view-container bg-grey-3">
        <!-- toolbar-->
        <q-toolbar class="print-hide report-toolbar bg-white text-dark shadow-1">
            <q-btn flat round dense icon="arrow_back" aria-label="Back" @click="router.back()" />
            <q-toolbar-title class="text-weight-bold text-subtitle1">
                {{ $t('reportToolbarTitle') }}
            </q-toolbar-title>
            <q-space />
            <q-btn
                color="primary"
                unelevated
                icon="print"
                :label="$t('reportPrint')"
                @click="printReport"
            />
        </q-toolbar>

        <div class="report-container">
            <q-banner
                v-if="!surveyData.isScopeValid"
                inline-actions
                class="bg-warning text-white q-mb-md print-hide"
            >
                {{ $t('resultsNoScopeHint') }}
            </q-banner>

            <template v-else>
                <!-- Sheet 1: Title Sheet -->
                <ReportSheet>
                    <div class="report-cover">
                        <h1 class="text-h3 text-weight-bolder text-primary q-mb-xl">
                            {{ surveyData.scope.serviceName || $t('resultsSummaryServiceName') }}
                        </h1>

                        <div class="q-gutter-y-lg text-body1">
                            <div>
                                <div class="text-caption text-weight-bold text-grey-7">
                                    {{ $t('scopeOrganizationLabel') }}
                                </div>
                                <div class="text-h6">
                                    {{ surveyData.scope.organizationName || '—' }}
                                </div>
                            </div>

                            <div>
                                <div class="text-caption text-weight-bold text-grey-7">
                                    {{ $t('scopeAssessorsLabel') }}
                                </div>
                                <div class="text-h6">{{ surveyData.scope.assessors || '—' }}</div>
                            </div>

                            <div>
                                <div class="text-caption text-weight-bold text-grey-7">
                                    {{ $t('resultsSummaryLifespan') }}
                                </div>
                                <div class="text-h6">
                                    {{
                                        $t('resultsLifespanYears', {
                                            n: surveyData.scope.lifespanYears ?? '—',
                                        })
                                    }}
                                </div>
                            </div>
                        </div>

                        <div class="cover-footer text-caption text-grey-6">
                            {{ $t('reportGeneratedOn', { date: reportDate }) }}
                        </div>
                    </div>
                </ReportSheet>

                <!-- Sheet 2: Scope -->
                <ReportSheet :title="$t('scopePageTitle')">
                    <div class="q-mb-md">
                        <div class="text-weight-bold text-subtitle2">
                            {{ $t('scopeFunctionLabel') }}
                        </div>
                        <div class="text-body2 text-grey-9">
                            {{ surveyData.scope.function || '—' }}
                        </div>
                    </div>

                    <div class="q-mb-lg text-body2 text-primary text-weight-medium">
                        {{ fuSentence }}
                    </div>

                    <q-markup-table dense flat bordered class="report-table">
                        <thead>
                            <tr>
                                <th class="text-left">
                                    {{ $t('scopeDatacenterColumns.abbreviation') }}
                                </th>
                                <th class="text-left">
                                    {{ $t('scopeDatacenterColumns.name') }}
                                </th>
                                <th class="text-left">
                                    {{ $t('scopeDatacenterColumns.comment') }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="dc in surveyData.datacenters" :key="dc.id">
                                <td>{{ dc.generalInfo.abbreviation }}</td>
                                <td>{{ dc.generalInfo.name }}</td>
                                <td>{{ dc.generalInfo.comment || '—' }}</td>
                            </tr>
                        </tbody>
                    </q-markup-table>
                </ReportSheet>

                <!-- Sheet 3: Embodied emissions -->
                <ReportSheet :title="$t('resultsEmbodiedTitle')">
                    <ResultsEmbodiedSection disable-tooltip show-chart />
                </ReportSheet>

                <!-- Sheet 4: Operational Emissions -->
                <ReportSheet :title="$t('resultsOperationalTitle')">
                    <ResultsOperationalSection disable-tooltip show-chart />
                </ReportSheet>

                <!-- Sheet 5: Results & Functional Unit -->
                <ReportSheet :title="$t('resultsPageTitle')">
                    <div class="text-subtitle2 text-weight-bold q-mb-xs">
                        {{ $t('resultsTotalTitle') }}
                    </div>
                    <ResultsTotalSection disable-tooltip class="q-mb-lg" show-chart />

                    <div class="text-subtitle2 text-weight-bold q-mb-xs">
                        {{ $t('resultsFuTitle') }}
                    </div>
                    <ResultsFunctionalUnitSection disable-tooltip />
                </ReportSheet>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSurveyDataStore } from 'src/stores/surveyData';

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { buildFunctionalUnitSentence } from 'src/utils/format';

import ReportSheet from 'src/components/report/ReportSheet.vue';
import ResultsEmbodiedSection from 'src/components/results/ResultsEmbodiedSection.vue';
import ResultsOperationalSection from 'src/components/results/ResultsOperationalSection.vue';
import ResultsTotalSection from 'src/components/results/ResultsTotalSection.vue';
import ResultsFunctionalUnitSection from 'src/components/results/ResultsFunctionalUnitSection.vue';

const surveyData = useSurveyDataStore();

const { t, locale } = useI18n();
const router = useRouter();
const fuSentence = computed(() => buildFunctionalUnitSentence(t, surveyData.scope.functionalUnit));

const reportDate = computed(() => {
    const df = new Intl.DateTimeFormat(locale.value, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    return df.format(new Date());
});

const printReport = () => {
    window.print();
};
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.report-view-container {
    min-height: 100vh;
}

.report-toolbar {
    position: sticky;
    top: 0;
    z-index: 1000;
}

.report-container {
    counter-reset: report-page;
    padding: 24px 0;
    margin: 0 auto;
}

.report-cover {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: 35mm;
}

.cover-footer {
    margin-top: auto;
    padding-top: 40mm;
}

.report-table {
    @include table-cells.cells;
    overflow: visible !important;

    th,
    td {
        white-space: normal !important;
        word-break: break-word;
    }
}

@media print {
    .print-hide {
        display: none !important;
    }

    .report-view-container {
        background: transparent !important;
    }

    .report-container {
        padding: 0 !important;
        margin: 0 !important;
        max-width: none !important;
    }

    .report-table {
        box-shadow: none !important;
    }
}
</style>

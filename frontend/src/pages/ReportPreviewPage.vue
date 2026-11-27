<template>
    <div class="report-view-container bg-grey-3">
        <!-- toolbar-->
        <q-toolbar class="print-hide report-toolbar bg-white text-dark bordered">
            <q-btn
                flat
                round
                dense
                icon="sym_r_arrow_back"
                aria-label="Back"
                @click="router.back()"
            />
            <q-toolbar-title class="text-weight-bold text-subtitle1">
                {{ $t('reportToolbarTitle') }}
            </q-toolbar-title>
            <q-space />
            <q-btn
                color="primary"
                unelevated
                icon="sym_r_print"
                :label="$t('reportPrint')"
                @click="printReport"
            />
        </q-toolbar>

        <div class="report-container">
            <q-banner
                v-if="!surveyData.isScopeValid"
                inline-actions
                class="bg-warning text-dark q-mb-md print-hide"
            >
                <template #avatar>
                    <q-icon name="sym_r_warning" />
                </template>
                {{ $t('resultsNoScopeHint') }}
            </q-banner>

            <template v-else>
                <!-- Sheet 1: Title Sheet -->
                <ReportSheet>
                    <div class="report-cover">
                        <h1 class="text-h3 text-weight-bolder text-epfl-red q-mb-lg">
                            {{ surveyData.scope.serviceName || $t('resultsSummaryServiceName') }}
                        </h1>

                        <div class="q-gutter-y-md text-body1">
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
                        </div>

                        <!-- Table of contents: smooth-scroll, no router hash navigation. -->
                        <nav class="report-toc" :aria-label="$t('reportTocTitle')">
                            <div class="text-caption text-weight-bold text-grey-7 q-mb-sm">
                                {{ $t('reportTocTitle') }}
                            </div>
                            <ol class="report-toc__list">
                                <li v-for="section in reportSections" :key="section.id">
                                    <a
                                        :href="`#${section.id}`"
                                        class="report-toc__link"
                                        @click.prevent="scrollToSection(section.id)"
                                    >
                                        {{ $t(section.labelKey) }}
                                    </a>
                                </li>
                            </ol>
                        </nav>

                        <div class="cover-footer text-caption text-grey-6">
                            {{ $t('reportGeneratedOn', { date: reportDate }) }}
                        </div>
                    </div>
                </ReportSheet>

                <!-- Sheet 2: Scope -->
                <ReportSheet id="report-scope" :title="$t('scopePageTitle')">
                    <div class="q-mb-md">
                        <div class="text-weight-bold text-subtitle2">
                            {{ $t('scopeFunctionLabel') }}
                        </div>
                        <div class="text-body2 text-grey-9">
                            {{ surveyData.scope.function || '—' }}
                        </div>
                    </div>

                    <div class="q-mb-md text-body2 text-epfl-red text-weight-medium">
                        {{ fuSentence }}
                    </div>

                    <div class="q-mb-lg">
                        <div class="text-weight-bold text-subtitle2">
                            {{ $t('scopeLifespanLabel') }}
                        </div>
                        <div class="text-body2 text-grey-9">
                            {{
                                $t('resultsLifespanYears', {
                                    n: surveyData.scope.lifespanYears ?? '—',
                                })
                            }}
                        </div>
                    </div>

                    <div class="text-weight-bold text-subtitle2 q-mb-sm">
                        {{ $t('scopeBoundariesDcTitle') }}
                    </div>
                    <q-markup-table dense flat bordered class="report-table q-mb-lg">
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

                    <div class="text-weight-bold text-subtitle2 q-mb-sm">
                        {{ $t('scopeBoundariesInclExclTitle') }}
                    </div>
                    <q-markup-table dense flat bordered class="report-table report-boundary-table">
                        <colgroup>
                            <col
                                v-for="(width, index) in BOUNDARY_COL_WIDTHS"
                                :key="index"
                                :style="{ width }"
                            />
                        </colgroup>
                        <tbody>
                            <tr v-for="line in boundaryLines" :key="line.id">
                                <td class="text-weight-bold boundary-nowrap">{{ line.prefix }}</td>
                                <td class="text-weight-medium text-dark">{{ line.type }}</td>
                                <td class="text-grey-7 boundary-nowrap">
                                    {{ $t('scopeBoundary.separators.usedFor') }}
                                </td>
                                <td class="text-weight-medium text-dark">{{ line.purpose }}</td>
                                <td class="text-grey-7 boundary-nowrap">{{ line.connector }}</td>
                                <td class="text-weight-medium text-dark">{{ line.reason }}</td>
                            </tr>
                            <tr v-if="boundaryLines.length === 0">
                                <td colspan="6" class="text-grey-7">—</td>
                            </tr>
                        </tbody>
                    </q-markup-table>
                </ReportSheet>

                <!-- Sheet 3: Embodied emissions -->
                <ReportSheet id="report-embodied" :title="$t('resultsEmbodiedTitle')">
                    <ResultsEmbodiedSection disable-tooltip show-chart />
                </ReportSheet>

                <!-- Sheet 4: Operational Emissions -->
                <ReportSheet id="report-operational" :title="$t('resultsOperationalTitle')">
                    <ResultsOperationalSection disable-tooltip show-chart />
                </ReportSheet>

                <!-- Sheet 5: Results & Functional Unit -->
                <ReportSheet id="report-results" :title="$t('resultsPageTitle')">
                    <div>
                        <div class="text-subtitle2 text-weight-bold q-mb-xs">
                            {{ $t('resultsTotalTitle') }}
                        </div>
                        <ResultsTotalSection disable-tooltip class="q-mb-lg" show-chart />
                    </div>

                    <div>
                        <div class="text-subtitle2 text-weight-bold q-mb-xs">
                            {{ $t('resultsFuTitle') }}
                        </div>
                        <ResultsFunctionalUnitSection disable-tooltip />
                    </div>
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

/** Report sheets in order; the anchor id and the TOC label both derive from these entries. */
const reportSections = [
    { id: 'report-scope', labelKey: 'scopePageTitle' },
    { id: 'report-embodied', labelKey: 'resultsEmbodiedTitle' },
    { id: 'report-operational', labelKey: 'resultsOperationalTitle' },
    { id: 'report-results', labelKey: 'resultsPageTitle' },
] as const;

/** Stay in-page: Vue Router owns the hash, so a plain `#id` link would hit a 404 route. */
function scrollToSection(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** prefix, type, "used for", purpose, "comment"/"because", reason. */
const BOUNDARY_COL_WIDTHS = ['16%', '20%', '8%', '23%', '8%', '25%'] as const;

/** Included and excluded items in one read-only table; blank drafts are skipped. */
const boundaryLines = computed(() =>
    (['included', 'excluded'] as const).flatMap((kind) =>
        surveyData.scope[`${kind}Items`]
            .filter((item) => item.type || item.purpose || item.reason)
            .map((item) => ({
                id: item.id,
                prefix: t(`scopeBoundary.${kind}.prefix`),
                type: item.type || '—',
                purpose: item.purpose || '—',
                connector: t(`scopeBoundary.separators.${kind}Reason`),
                reason: item.reason || '—',
            })),
    ),
);

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
    padding-top: 18mm;
}

.report-toc {
    margin-top: 12mm;
}

.report-toc__list {
    margin: 0;
    padding-left: 6mm;
    font-size: 0.95rem;
    line-height: 1.6;

    li::marker {
        color: var(--q-primary);
        font-weight: 700;
    }
}

.report-toc__link {
    color: #1a1a1a;
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }
}

.cover-footer {
    margin-top: auto;
    padding-top: 10mm;
}

/* Report tables: Quasar's rounded horizontal separators, darker for print. */
.report-table,
.report-sheet :deep(.results-table) {
    @include table-cells.cells;
    overflow: visible !important;
    /* Keeps Quasar's `border-collapse: separate` so the 4px card radius survives. */
    border: 1px solid rgba(0, 0, 0, 0.45) !important;
    border-radius: 4px;

    th,
    td {
        white-space: normal !important;
        overflow-wrap: anywhere;
        word-break: break-word;
    }

    /* Horizontal rules only — header row and every row but the last. */
    thead > tr > th,
    tbody > tr:not(:last-child) > td {
        border-bottom: 1px solid rgba(0, 0, 0, 0.45) !important;
    }

    /* Total rows keep the heavier top rule. */
    .results-total > td {
        border-top: 1px solid rgba(0, 0, 0, 0.6) !important;
    }
}

/* Labels stay on one line; user values wrap at word boundaries in fixed columns. */
.report-boundary-table {
    :deep(table) {
        table-layout: fixed;
        width: 100%;
    }

    td {
        word-break: normal !important;
        overflow-wrap: break-word !important;
    }

    td.boundary-nowrap {
        white-space: nowrap !important;
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
        width: 100% !important;

        /* No horizontal overflow in landscape print; cells wrap instead. */
        th,
        td {
            overflow-wrap: anywhere !important;
        }
    }

    /* A wrapper border stretches to the page bottom when a table splits. */
    .report-sheet :deep(.q-table__container),
    .report-sheet :deep(.report-boundary-table) {
        border: none !important;
        border-radius: 0 !important;
    }

    .report-sheet :deep(.q-table__container table),
    .report-sheet :deep(.report-boundary-table table) {
        border-collapse: separate !important;
        border-spacing: 0 !important;
        border: 1px solid rgba(0, 0, 0, 0.45) !important;
        border-radius: 4px !important;
    }

    .report-toc__link {
        color: #1a1a1a !important;
    }

    /* Tightened vertical rhythm keeps Scope and Results on one page each. */
    .report-sheet :deep(.q-mb-lg) {
        margin-bottom: 8px !important;
    }

    .report-sheet :deep(.q-mb-md) {
        margin-bottom: 6px !important;
    }

    .report-sheet :deep(.q-mt-md) {
        margin-top: 6px !important;
    }
}
</style>

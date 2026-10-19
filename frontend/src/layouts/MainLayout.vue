<template>
    <q-layout view="hHh LpR lFf">
        <q-header elevated class="bg-white text-dark">
            <q-toolbar>
                <q-btn
                    flat
                    dense
                    round
                    icon="menu"
                    :aria-label="$t('mainMenuAriaLabel')"
                    @click="leftDrawerOpen = !leftDrawerOpen"
                />
                <q-toolbar-title class="header-brand text-weight-medium">
                    <img :src="epflLogoUrl" alt="EPFL" class="header-brand__logo" />
                    <span>MITSI</span>
                </q-toolbar-title>
                <q-space />
                <span class="text-caption text-grey-7 q-mr-sm gt-xs">
                    {{ $t('mainTagline') }}
                </span>
                <q-btn unelevated color="primary" :label="$t('mainSave')" @click="saveAssessment" />
                <q-btn
                    unelevated
                    color="primary"
                    class="q-ml-sm"
                    :label="$t('mainExport')"
                    @click="exportAssessment"
                />
                <q-file
                    :model-value="null"
                    accept=".json,application/json"
                    dense
                    outlined
                    class="q-ml-sm"
                    :label="$t('mainImport')"
                    @update:model-value="onFilePicked"
                />
            </q-toolbar>
        </q-header>

        <q-drawer v-model="leftDrawerOpen" show-if-above :width="280" bordered>
            <q-list padding>
                <q-item clickable v-ripple to="/" exact>
                    <q-item-section avatar>
                        <q-icon name="home" />
                    </q-item-section>
                    <q-item-section>{{ $t('mainNavWelcome') }}</q-item-section>
                </q-item>

                <q-separator spaced />

                <q-item
                    v-for="(block, key) in assessmentBlocks"
                    :key="key"
                    clickable
                    v-ripple
                    :to="block.to"
                >
                    <q-item-section avatar>
                        <q-icon :name="block.icon" />
                    </q-item-section>
                    <q-item-section>{{ $t(block.labelKey) }}</q-item-section>
                    <q-item-section side>
                        <span
                            class="completion-dot"
                            :class="`completion-dot--${block.status}`"
                            :title="$t(completionLabelKey(block.status))"
                        />
                    </q-item-section>
                </q-item>
                <q-separator spaced />
                <q-item clickable v-ripple to="/report">
                    <q-item-section avatar><q-icon name="print" /></q-item-section>
                    <q-item-section>{{ $t('mainNavReport') }}</q-item-section>
                </q-item>
            </q-list>
        </q-drawer>

        <q-page-container>
            <router-view />
        </q-page-container>

        <q-footer bordered class="bg-white text-dark">
            <q-toolbar class="assessment-summary q-px-md">
                <span class="text-caption text-grey-7">{{ savedText }}</span>
                <span v-if="exportedText" class="text-caption text-grey-6 q-ml-sm">
                    · {{ exportedText }}
                </span>
                <i18n-t
                    keypath="mainFooterEmbodied"
                    tag="span"
                    scope="global"
                    class="text-caption text-grey-8"
                >
                    <template #value>
                        <ComputationResultDisplay
                            v-if="surveyData.isScopeValid"
                            :computation="surveyResults.totalEmbodiedEmissionsKg"
                            :format-value="formatEmbodiedTonnes"
                        >
                            <template #ignored-input="{ input }">{{
                                input.name || input.id
                            }}</template>
                        </ComputationResultDisplay>
                        <template v-else>{{ t('mainNotApplicable') }}</template>
                    </template>
                </i18n-t>
                <i18n-t
                    keypath="mainFooterOperational"
                    tag="span"
                    scope="global"
                    class="text-caption text-grey-8"
                >
                    <template #value>
                        <ComputationResultDisplay
                            v-if="surveyData.isScopeValid"
                            :computation="surveyResults.totalOperationalEmissionsKg"
                            :format-value="formatOperationalTonnes"
                        >
                            <template #ignored-input="{ input }">{{
                                formatDatacenterName(input)
                            }}</template>
                        </ComputationResultDisplay>
                        <template v-else>{{ t('mainNotApplicable') }}</template>
                    </template>
                </i18n-t>
                <i18n-t
                    keypath="mainFooterTotal"
                    tag="span"
                    scope="global"
                    class="text-caption text-grey-8"
                >
                    <template #value>
                        <ComputationResultDisplay
                            v-if="surveyData.isScopeValid"
                            :computation="surveyResults.totalLifespanEmissionsKg"
                            :format-value="formatTotalTonnes"
                        />
                        <template v-else>{{ t('mainNotApplicable') }}</template>
                    </template>
                </i18n-t>
                <i18n-t
                    keypath="mainFooterPerFu"
                    tag="span"
                    scope="global"
                    class="text-caption text-grey-7"
                >
                    <template #value>
                        <ComputationResultDisplay
                            :computation="surveyResults.emissionsPerFunctionalUnitKg"
                            :format-value="formatFunctionalUnitGrams"
                        />
                    </template>
                </i18n-t>
            </q-toolbar>
        </q-footer>
    </q-layout>
</template>

<script setup lang="ts">
import { useSurveyDataStore } from 'src/stores/surveyData';
import { useSurveyResultsStore } from 'src/stores/surveyResults';

import { computed, ref } from 'vue';
import { useQuasar, date, exportFile } from 'quasar';
import { useI18n } from 'vue-i18n';

import type { BlockKey, BlockStatus } from 'src/types/ui';
import { formatDatacenterName, formatResult } from 'src/utils/format';
import ComputationResultDisplay from 'src/components/ComputationResultDisplay.vue';

const surveyData = useSurveyDataStore();
const surveyResults = useSurveyResultsStore();

interface BlockDef {
    labelKey: string;
    to: string;
    icon: string;
    status: BlockStatus;
}

const { t, locale } = useI18n();
const epflLogoUrl = `${import.meta.env.BASE_URL}epfl.svg`;

const leftDrawerOpen = ref(false);
const operationalResultOptions = computed(() => ({
    missingLabel: t('mainNotApplicable'),
    partialLabel: surveyResults.operationalCalculationCoverage.isComplete
        ? ''
        : t('resultsEnergyCoverage', {
              complete: surveyResults.operationalCalculationCoverage.validDatacenterCount,
              total: surveyResults.operationalCalculationCoverage.totalDatacenterCount,
          }),
}));
const combinedResultOptions = computed(() => ({
    missingLabel: t('mainNotApplicable'),
    partialLabel:
        surveyResults.totalLifespanEmissionsKg.success === 'partial' ? t('resultsPartial') : '',
}));
const $q = useQuasar();

function saveAssessment(): void {
    if (!surveyData.saveToStorage()) {
        $q.notify({ type: 'negative', message: t('mainSaveFailed') });
    }
}

/** QFile returns a File object directly, empty draft results in immediate import, while one containing data triggers warning */
function onFilePicked(file: File | null): void {
    if (!file) return;

    if (surveyData.isStoreEmpty) {
        readAndImport(file);
        return;
    }

    $q.dialog({
        title: t('mainImportWarningTitle'),
        message: t('mainImportWarning'),
        cancel: true,
        persistent: true,
    }).onOk(() => {
        readAndImport(file);
    });
}

/** Reads the file and gives text to the store */
function readAndImport(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') return;
        if (surveyData.importJson(result)) {
            $q.notify({ type: 'positive', message: t('mainImportSuccess') });
        } else {
            $q.notify({ type: 'negative', message: t('mainImportFailed') });
        }
    };
    reader.onerror = () => {
        $q.notify({ type: 'negative', message: t('mainImportFailed') });
    };
    reader.readAsText(file);
}

/** Downloads whole assessment as a JSON file, named with the current date-time. */
function exportAssessment(): void {
    const status = exportFile(
        `mitsi-assessment-${date.formatDate(new Date(), 'YYYY-MM-DD_HH-mm-ss')}.json`,
        surveyData.exportJson(),
        { mimeType: 'application/json' },
    );
    if (status === true) {
        $q.notify({ type: 'positive', message: t('mainExportSuccess') });
    } else {
        $q.notify({ type: 'negative', message: t('mainExportFailed') });
    }
}

const assessmentBlocks = computed<Record<BlockKey, BlockDef>>(() => {
    return {
        scope: {
            labelKey: 'mainNavScope',
            to: '/scope',
            icon: 'scope',
            status: surveyData.scopeStatus,
        },
        inventory: {
            labelKey: 'mainNavInventory',
            to: '/inventory',
            icon: 'dns',
            status: surveyData.hardwareInventoryStatus,
        },
        energy: {
            labelKey: 'mainNavEnergy',
            to: '/energy',
            icon: 'bolt',
            status: surveyData.energyConsumptionStatus,
        },
        results: {
            labelKey: 'mainNavResults',
            to: '/results',
            icon: 'insights',
            status: surveyData.resultsStatus,
        },
    };
});

function completionLabelKey(status: BlockStatus): string {
    switch (status) {
        case 'complete':
            return 'mainStatusComplete';
        case 'partial':
            return 'mainStatusPartial';
        default:
            return 'mainStatusNotStarted';
    }
}

function formatEmbodiedTonnes(value: number): string {
    return `${(value / 1000).toFixed(1)} ${t('mainUnitTonnes')}`;
}

function formatOperationalTonnes(value: number): string {
    return formatResult(value, {
        ...operationalResultOptions.value,
        formatValue: formatEmbodiedTonnes,
    });
}

function formatTotalTonnes(value: number): string {
    return formatResult(value, {
        ...combinedResultOptions.value,
        formatValue: (result) => `${(result / 1000).toFixed(1)} ${t('mainUnitTonnesCo2e')}`,
    });
}

function formatFunctionalUnitGrams(value: number): string {
    return formatResult(value, {
        missingLabel: t('mainNotApplicable'),
        partialLabel:
            surveyResults.emissionsPerFunctionalUnitKg.success === 'partial'
                ? t('resultsPartial')
                : '',
        formatValue: (result) => `${(result * 1000).toFixed(2)} ${t('mainUnitGramsCo2e')}`,
    });
}

const savedText = computed<string>(() =>
    surveyData.savedAt === null
        ? t('mainFooterNeverSaved')
        : t('mainFooterSavedAt', {
              dateTime: new Intl.DateTimeFormat(locale.value, {
                  dateStyle: 'medium',
                  timeStyle: 'medium',
              }).format(surveyData.savedAt),
          }),
);
const exportedText = computed<string | null>(() =>
    surveyData.exportedAt
        ? t('mainFooterExportedAt', { timeAgo: formatTimeAgo(surveyData.exportedAt) })
        : null,
);

function formatTimeAgo(ts: number): string {
    const diffSec = Math.round((Date.now() - ts) / 1000);
    if (diffSec < 60) return t('mainTimeAgoJustNow');
    const mins = Math.round(diffSec / 60);
    if (mins < 60) return t('mainTimeAgoMinutes', { n: mins });
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return t('mainTimeAgoHours', { n: hrs });
    return t('mainTimeAgoDays', { n: Math.round(hrs / 24) });
}
</script>

<style scoped>
.assessment-summary {
    flex-wrap: wrap;
    gap: 4px 24px;
    padding-block: 8px;
}

.completion-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid #c2cbd6;
}

.completion-dot--partial {
    border-color: #8a5a00;
    background: linear-gradient(90deg, #8a5a00 50%, transparent 50%);
}

.completion-dot--complete {
    border-color: #0b7a55;
    background: #0b7a55;
}
</style>

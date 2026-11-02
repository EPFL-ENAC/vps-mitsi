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

        <ExportAssessmentDialog v-model:open="exportDialogOpen" @confirm="onExportConfirmed" />

        <q-drawer v-model="leftDrawerOpen" show-if-above :width="280" bordered>
            <q-list padding>
                <!-- Welcome -->
                <q-item v-ripple clickable to="/" exact>
                    <q-item-section avatar>
                        <q-icon name="home" />
                    </q-item-section>
                    <q-item-section>{{ $t('mainNavWelcome') }}</q-item-section>
                    <q-item-section side class="nav-badge text-caption text-grey-7">
                        {{ $t('mainStatusRead') }}
                    </q-item-section>
                </q-item>

                <!-- Assessment Dropdown -->
                <q-expansion-item
                    default-opened
                    dense
                    switch-toggle-side
                    expand-icon="keyboard_arrow_down"
                    header-class="text-weight-bold"
                    :label="$t('mainNavAssessment')"
                >
                    <q-item v-ripple clickable to="/scope" class="q-pl-lg">
                        <q-item-section avatar>
                            <q-icon name="my_location" />
                        </q-item-section>
                        <q-item-section>
                            <q-item-label>{{ $t('mainNavScope') }}</q-item-label>
                            <q-item-label caption lines="1">
                                {{ $t('mainNavScopeSubtitle') }}
                            </q-item-label>
                        </q-item-section>
                        <q-item-section side class="nav-badge text-caption text-grey-7">
                            {{
                                $t('mainNavScopeSteps', {
                                    done: surveyData.scopeCompletedStepCount,
                                    total: 3,
                                })
                            }}
                        </q-item-section>
                    </q-item>

                    <q-item v-ripple clickable to="/inventory" class="q-pl-lg">
                        <q-item-section avatar>
                            <q-icon name="memory" />
                        </q-item-section>
                        <q-item-section>
                            <q-item-label>{{ $t('mainNavInventory') }}</q-item-label>
                            <q-item-label caption lines="1">
                                {{ $t('mainNavInventorySubtitle') }}
                            </q-item-label>
                        </q-item-section>
                        <q-item-section side class="nav-badge text-caption text-grey-7">
                            {{ $t('mainNavHardwareRows', { n: surveyData.hardware.length }) }}
                        </q-item-section>
                    </q-item>

                    <q-item v-ripple clickable to="/energy" class="q-pl-lg">
                        <q-item-section avatar>
                            <q-icon name="bolt" />
                        </q-item-section>
                        <q-item-section>
                            <q-item-label>{{ $t('mainNavEnergy') }}</q-item-label>
                            <q-item-label caption lines="1">
                                {{ $t('mainNavEnergySubtitle') }}
                            </q-item-label>
                        </q-item-section>
                        <q-item-section side class="nav-badge text-caption text-grey-7">
                            {{ energyBadgeLabel }}
                        </q-item-section>
                    </q-item>
                </q-expansion-item>

                <q-separator spaced />

                <!-- Results -->
                <q-item
                    v-ripple
                    clickable
                    :disable="!resultsUnlocked"
                    :to="resultsUnlocked ? '/results' : undefined"
                >
                    <q-item-section avatar>
                        <q-icon :name="resultsUnlocked ? 'insights' : 'lock'" />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label>{{ $t('mainNavResults') }}</q-item-label>
                        <q-item-label v-if="!resultsUnlocked" caption lines="2">
                            {{ $t('mainNavResultsLockedHint') }}
                        </q-item-label>
                    </q-item-section>
                    <q-item-section
                        v-if="!resultsUnlocked"
                        side
                        class="nav-badge text-caption text-grey-7"
                    >
                        {{ $t('mainNavLocked') }}
                    </q-item-section>
                </q-item>

                <!-- Report -->
                <q-item
                    v-ripple
                    clickable
                    :disable="!resultsUnlocked"
                    :to="resultsUnlocked ? '/report' : undefined"
                >
                    <q-item-section avatar>
                        <q-icon :name="resultsUnlocked ? 'print' : 'lock'" />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label>{{ $t('mainNavReport') }}</q-item-label>
                        <q-item-label v-if="!resultsUnlocked" caption lines="2">
                            {{ $t('mainNavResultsLockedHint') }}
                        </q-item-label>
                    </q-item-section>
                    <q-item-section
                        v-if="!resultsUnlocked"
                        side
                        class="nav-badge text-caption text-grey-7"
                    >
                        {{ $t('mainNavLocked') }}
                    </q-item-section>
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

import type { ExportMetadataInput } from 'src/models/ExportMetadata/schema';
import { isImportEmpty } from 'src/models/MitsiState/utils';
import { formatDatacenterName, formatResult } from 'src/utils/format';
import ComputationResultDisplay from 'src/components/ComputationResultDisplay.vue';
import ExportAssessmentDialog from 'src/components/ExportAssessmentDialog.vue';

const surveyData = useSurveyDataStore();
const surveyResults = useSurveyResultsStore();

const { t, locale } = useI18n();
const epflLogoUrl = `${import.meta.env.BASE_URL}epfl.svg`;

const leftDrawerOpen = ref(false);
/** Controls the modal that collects export metadata before downloading. */
const exportDialogOpen = ref(false);

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

/** QFile returns a File object directly; existing data triggers a confirmation dialog */
async function onFilePicked(file: File | null): Promise<void> {
    if (!file) return;

    const json = await file.text().catch(() => null);
    if (json === null) {
        $q.notify({ type: 'negative', message: t('mainImportFailed') });
        return;
    }

    if (surveyData.isEmpty) {
        importText(json);
        return;
    }

    const fileIsEmpty = isImportEmpty(json);

    $q.dialog({
        title: fileIsEmpty ? `⚠️ ${t('mainImportWarningTitle')}` : t('mainImportWarningTitle'),
        message: fileIsEmpty ? t('mainImportWarningEmptyFile') : t('mainImportWarning'),
        cancel: true,
        persistent: true,
        // Red OK button looks different for case when file is empty
        ...(fileIsEmpty && { ok: { color: 'negative' } }),
    }).onOk(() => importText(json));
}

/** Gives the text to the store and reports the result */
function importText(json: string): void {
    if (!surveyData.importJson(json)) {
        $q.notify({ type: 'negative', message: t('mainImportFailed') });
        return;
    }
    $q.notify(
        surveyData.isEmpty
            ? { type: 'warning', message: t('mainImportEmpty') }
            : { type: 'positive', message: t('mainImportSuccess') },
    );
}

/** Downloads whole assessment as a JSON file, named with the current date-time. */
function exportAssessment(): void {
    exportDialogOpen.value = true;
}

/** Runs once the export dialog collected and validated its metadata. */
function onExportConfirmed(metadata: ExportMetadataInput): void {
    const status = exportFile(
        `mitsi-assessment-${date.formatDate(new Date(), 'YYYY-MM-DD_HH-mm-ss')}.json`,
        surveyData.exportJson(metadata),
        { mimeType: 'application/json' },
    );
    if (status === true) {
        $q.notify({ type: 'positive', message: t('mainExportSuccess') });
    } else {
        $q.notify({ type: 'negative', message: t('mainExportFailed') });
    }
}

/** True once every assessment block is complete; drives the Results lock. */
const resultsUnlocked = computed<boolean>(() => surveyData.resultsStatus === 'complete');

/** Energy badge: untouched usage shows "Not started", otherwise the datacenter count. */
const energyBadgeLabel = computed<string>(() =>
    surveyData.energyConsumptionStatus === 'not_started'
        ? t('mainStatusNotStarted')
        : t('mainNavDatacenters', { n: surveyData.datacenters.length }),
);

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
/* bage status */
.nav-badge {
    white-space: nowrap;
    color: #6b7280;
}
</style>

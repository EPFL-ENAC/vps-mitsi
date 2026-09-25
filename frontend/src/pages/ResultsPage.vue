<template>
    <div class="q-pa-md">
        <div class="text-h4 q-mb-sm">{{ $t('resultsPageTitle') }}</div>
        <!-- Scope gating hint -->
        <q-banner v-if="!mitsi.isScopeValid" inline-actions class="bg-warning text-white q-mb-md">
            {{ $t('resultsNoScopeHint') }}
        </q-banner>

        <!-- Summary -->
        <q-card flat bordered class="results-zone q-mb-md">
            <q-expansion-item default-opened>
                <template #header>
                    <q-item-section class="results-zone-title">
                        <q-item-label>{{ $t('resultsSummaryTitle') }}</q-item-label>
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section class="q-pa-sm">
                    <q-markup-table dense flat bordered>
                        <tbody>
                            <tr>
                                <td class="results-key">{{ $t('resultsSummaryServiceName') }}</td>
                                <td>{{ mitsi.scope.serviceName }}</td>
                            </tr>
                            <tr>
                                <td class="results-key">{{ $t('resultsSummaryFunction') }}</td>
                                <td>{{ mitsi.scope.function }}</td>
                            </tr>
                            <tr>
                                <td class="results-key">
                                    {{ $t('resultsSummaryFunctionalUnit') }}
                                </td>
                                <td>{{ fuSentence }}</td>
                            </tr>
                            <tr>
                                <td class="results-key">{{ $t('resultsSummaryLifespan') }}</td>
                                <td>
                                    {{
                                        $t('resultsLifespanYears', { n: mitsi.scope.lifespanYears })
                                    }}
                                </td>
                            </tr>
                        </tbody>
                    </q-markup-table>
                </q-card-section>
            </q-expansion-item>
        </q-card>

        <!-- Embodied emissions -->
        <q-card flat bordered class="results-zone q-mb-md">
            <q-expansion-item default-opened>
                <template #header>
                    <q-item-section class="results-zone-title">
                        <q-item-label>{{ $t('resultsEmbodiedTitle') }}</q-item-label>
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section>
                    <div class="row items-center q-mb-md">
                        <q-toggle
                            v-model="mitsi.includeSecondHandEmbodied"
                            :label="$t('resultsSecondHandToggle')"
                            color="primary"
                        />
                    </div>

                    <q-expansion-item
                        v-for="g in mitsi.embodiedByCategory"
                        :key="g.category"
                        :label="t('inventoryCategory_' + normalizeKey(g.category))"
                        default-opened
                        dense
                        class="results-category"
                    >
                        <q-markup-table dense flat bordered>
                            <thead>
                                <tr>
                                    <th class="text-left">{{ $t('resultsColName') }}</th>
                                    <th class="text-left">{{ $t('resultsColDescription') }}</th>
                                    <th class="text-right">{{ $t('resultsColNumber') }}</th>
                                    <th class="text-right">{{ $t('resultsColCo2Unit') }}</th>
                                    <th class="text-right">{{ $t('resultsColCo2Total') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="r in g.rows"
                                    :key="r.id"
                                    :class="{ 'results-excluded': r.excluded }"
                                >
                                    <td>{{ r.name }}</td>
                                    <td>{{ r.description }}</td>
                                    <td class="text-right">{{ r.number }}</td>
                                    <td class="text-right">{{ formatKg(r.co2PerUnit) }}</td>
                                    <td class="text-right">
                                        <span :class="{ 'results-strike': r.excluded }">{{
                                            formatKg(r.co2RowTotal)
                                        }}</span>
                                        <span v-if="r.excluded" class="results-not-counted"
                                            >({{ $t('inventoryNotCounted') }})</span
                                        >
                                    </td>
                                </tr>
                            </tbody>
                        </q-markup-table>
                        <div class="results-category-total">
                            {{ $t('resultsCategoryTotal') }}:
                            <strong>{{ formatKg(g.categoryTotal) }}</strong>
                        </div>
                    </q-expansion-item>

                    <q-markup-table dense flat bordered class="results-total-table">
                        <tbody>
                            <tr class="results-total">
                                <td>
                                    <strong>{{ $t('resultsTotalEmbodied') }}</strong>
                                </td>
                                <td class="text-right">
                                    <strong>{{ formatKg(mitsi.totalEmbodied) }}</strong>
                                </td>
                            </tr>
                        </tbody>
                    </q-markup-table>

                    <!-- treemap by element + treemap by category -->
                    <div class="row q-col-gutter-md q-mt-sm">
                        <div class="col-12 col-md-6">
                            <div class="results-chart-title">
                                {{ $t('resultsChartTreemapByElement') }}
                            </div>
                            <EmbodiedTreemapChart
                                :groups="mitsi.embodiedByCategory"
                                :grand-total="mitsi.totalEmbodied"
                                variant="element"
                            />
                        </div>
                        <div class="col-12 col-md-6">
                            <div class="results-chart-title">
                                {{ $t('resultsChartTreemapByCategory') }}
                            </div>
                            <EmbodiedTreemapChart
                                :groups="mitsi.embodiedByCategory"
                                :grand-total="mitsi.totalEmbodied"
                                variant="category"
                            />
                        </div>
                    </div>
                </q-card-section>
            </q-expansion-item>
        </q-card>

        <!-- Operational emissions -->
        <q-card flat bordered class="results-zone q-mb-md">
            <q-expansion-item default-opened>
                <template #header>
                    <q-item-section class="results-zone-title">
                        <q-item-label>{{ $t('resultsOperationalTitle') }}</q-item-label>
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section class="q-pa-sm">
                    <q-markup-table dense flat bordered>
                        <thead>
                            <tr>
                                <th class="text-left">{{ $t('resultsColDcName') }}</th>
                                <th class="text-right">{{ $t('resultsColCo2Period') }}</th>
                                <th class="text-right">{{ $t('resultsColCo2Lifespan') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="op in mitsi.operationalPerDc" :key="op.datacenterId">
                                <td>{{ dcLabel(op.datacenterId) }}</td>
                                <td class="text-right">{{ formatKg(op.co2Period) }}</td>
                                <td class="text-right">{{ formatKg(op.co2Lifespan) }}</td>
                            </tr>
                            <tr class="results-total">
                                <td>
                                    <strong>{{ $t('resultsTotalOperational') }}</strong>
                                </td>
                                <td></td>
                                <td class="text-right">
                                    <strong>{{
                                        formatOperationalResult(mitsi.totalOperational)
                                    }}</strong>
                                </td>
                            </tr>
                        </tbody>
                    </q-markup-table>

                    <!-- pie by datacenter -->
                    <div class="results-chart-title">{{ $t('resultsChartPieByDatacenter') }}</div>
                    <DatacentersPieChart
                        :rows="mitsi.operationalPerDc"
                        :label-for="dcLabel"
                        :total="mitsi.totalOperational ?? 0"
                        metric="lifespan"
                    />
                </q-card-section>
            </q-expansion-item>
        </q-card>

        <!-- v2 FEATURE (lead decision: excluded from v1; spec contradiction — Results
             proposes the checkbox+editable table while "What we will not do yet" lists
             underlying services as a future evolution). The store already supports it:
             includeUnderlyingServices, underlyingServices, totalUnderlying (0 while off).
             To enable: add an editable Quasar-grid table
             (name / usage description / co2EstimateKg), include totalUnderlying in the
             Total zone and the split pie. -->

        <!-- Total emissions -->
        <q-card flat bordered class="results-zone q-mb-md">
            <q-expansion-item default-opened>
                <template #header>
                    <q-item-section class="results-zone-title">
                        <q-item-label>{{ $t('resultsTotalTitle') }}</q-item-label>
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section class="q-pa-sm">
                    <q-markup-table dense flat bordered>
                        <tbody>
                            <tr>
                                <td>{{ $t('resultsRowEmbodied') }}</td>
                                <td class="text-right">{{ formatKg(mitsi.totalEmbodied) }}</td>
                            </tr>
                            <tr>
                                <td>{{ $t('resultsRowOperational') }}</td>
                                <td class="text-right">
                                    {{ formatOperationalResult(mitsi.totalOperational) }}
                                </td>
                            </tr>
                            <tr class="results-total">
                                <td>
                                    <strong>{{ $t('resultsRowTotal') }}</strong>
                                </td>
                                <td class="text-right">
                                    <strong>{{ formatCombinedResult(mitsi.totalLifespan) }}</strong>
                                </td>
                            </tr>
                        </tbody>
                    </q-markup-table>

                    <!-- split pie embodied/operational/underlying -->
                    <div class="results-chart-title">{{ $t('resultsChartSplitTitle') }}</div>
                    <TotalSplitPieChart
                        :embodied="mitsi.totalEmbodied"
                        :operational="mitsi.totalOperational"
                        :total="mitsi.totalLifespan"
                        :labels="{
                            embodied: t('resultsRowEmbodied'),
                            operational: t('resultsRowOperational'),
                        }"
                    />
                    <!-- v2 (lead decision): underlying services excluded in v1 — one-line restore:
                    :underlying="mitsi.totalUnderlying"  and  labels.underlying: t('resultsRowUnderlying') -->
                </q-card-section>
            </q-expansion-item>
        </q-card>

        <!-- Emissions related to the functional unit -->
        <q-card flat bordered class="results-zone q-mb-md">
            <q-expansion-item default-opened>
                <template #header>
                    <q-item-section class="results-zone-title">
                        <q-item-label>{{ $t('resultsFuTitle') }}</q-item-label>
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section class="q-pa-sm">
                    <q-markup-table dense flat bordered>
                        <tbody>
                            <tr>
                                <td class="results-key">{{ $t('resultsFuNumber') }}</td>
                                <td class="text-right">{{ mitsi.resourcesInService }}</td>
                            </tr>
                            <tr>
                                <td class="results-key">{{ $t('resultsFuLifespanNote') }}</td>
                                <td class="text-right">{{ totalPerResourceText }}</td>
                            </tr>
                            <tr>
                                <td class="results-key">{{ fuSentence }}</td>
                                <td class="text-right">{{ perFunctionalUnitText }}</td>
                            </tr>
                            <tr class="results-total">
                                <td colspan="2">
                                    <strong>{{
                                        $t('resultsHostedIn', { dcs: hostedInDcs })
                                    }}</strong>
                                </td>
                            </tr>
                        </tbody>
                    </q-markup-table>
                </q-card-section>
            </q-expansion-item>
        </q-card>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useMitsiStore } from 'src/stores/mitsi';
import { useResultFormatting } from 'src/composables/useResultFormatting';
import EmbodiedTreemapChart from 'src/components/results/EmbodiedTreemapChart.vue';
import DatacentersPieChart from 'src/components/results/DatacentersPieChart.vue';
import TotalSplitPieChart from 'src/components/results/TotalSplitPieChart.vue';
import {
    buildFunctionalUnitSentence,
    formatDatacenterName,
    formatKg,
    normalizeKey,
} from 'src/utils/format';

const { t } = useI18n();
const mitsi = useMitsiStore();
const { formatOperationalResult, formatCombinedResult } = useResultFormatting();

/** Time-unit label resolved with the same keys the ScopePage FU select uses. */
const timeUnitLabel = computed(() =>
    t('scopeTimeUnit_' + normalizeKey(mitsi.scope.functionalUnit.timeUnit)),
);

/** Assembled functional-unit sentence ('Usage of 1 hour of the service with 1 GPU'). */
const fuSentence = computed(() =>
    buildFunctionalUnitSentence(t, mitsi.scope.functionalUnit, timeUnitLabel.value),
);

/** Datacenter label 'abbreviation — name', falling back gracefully on missing parts. */
function dcLabel(datacenterId: string): string {
    const dc = mitsi.datacenters.find((d) => d.id === datacenterId);
    if (!dc) return datacenterId;
    return formatDatacenterName(dc);
}

/** Where the service runs: datacenter labels and locations. */
const hostedInDcs = computed(() =>
    mitsi.datacenters
        .map((dc) => {
            const location = dc.energy.location.trim();
            const label = formatDatacenterName(dc);
            return location ? `${label} (${location})` : label;
        })
        .join(', '),
);

const totalPerResourceText = computed(() =>
    formatCombinedResult(
        mitsi.totalPerResource,
        (value) => `${formatKg(value)} ${t('resultsUnitKg')}`,
    ),
);

const perFunctionalUnitText = computed(() =>
    formatCombinedResult(
        mitsi.perFunctionalUnit,
        (value) =>
            `${value.toFixed(4)} ${t('resultsUnitKg')} / ${(value * 1000).toFixed(4)} ${t('resultsUnitG')}`,
    ),
);
</script>

<style scoped>
.results-zone-title {
    font-weight: 600;
}
.results-key {
    font-weight: 600;
    color: rgba(0, 0, 0, 0.7);
}
.results-category {
    margin-bottom: 8px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 6px;
}
.results-category-total {
    text-align: right;
    padding: 4px 8px 8px;
    font-size: 0.85rem;
}
.results-total-table {
    margin-top: 8px;
}
.results-excluded {
    opacity: 0.55;
}
.results-strike {
    text-decoration: line-through;
}
.results-not-counted {
    font-style: italic;
    color: rgba(0, 0, 0, 0.5);
}
.results-total td {
    border-top: 2px solid rgba(0, 0, 0, 0.2);
}
.results-chart-title {
    font-weight: 600;
    color: rgba(0, 0, 0, 0.7);
    margin-bottom: 4px;
}
</style>

<template>
    <div class="q-pa-md">
        <div class="text-h4 q-mb-sm">{{ $t('resultsPageTitle') }}</div>
        <!-- Scope gating hint -->
        <q-banner v-if="!mitsi.isScopeValid" inline-actions class="bg-warning text-white q-mb-md">
            {{ $t('resultsNoScopeHint') }}
        </q-banner>

        <!-- Summary -->
        <AssessmentSection :title="$t('resultsSummaryTitle')" default-opened>
            <q-markup-table dense flat bordered class="results-table">
                <tbody>
                    <tr>
                        <th scope="row" class="results-key text-left">
                            {{ $t('resultsSummaryServiceName') }}
                        </th>
                        <td>{{ mitsi.scope.serviceName }}</td>
                    </tr>
                    <tr>
                        <th scope="row" class="results-key text-left">
                            {{ $t('resultsSummaryFunction') }}
                        </th>
                        <td>{{ mitsi.scope.function }}</td>
                    </tr>
                    <tr>
                        <th scope="row" class="results-key text-left">
                            {{ $t('resultsSummaryFunctionalUnit') }}
                        </th>
                        <td>{{ fuSentence }}</td>
                    </tr>
                    <tr>
                        <th scope="row" class="results-key text-left">
                            {{ $t('resultsSummaryLifespan') }}
                        </th>
                        <td>
                            {{ $t('resultsLifespanYears', { n: mitsi.scope.lifespanYears }) }}
                        </td>
                    </tr>
                </tbody>
            </q-markup-table>
        </AssessmentSection>

        <!-- Embodied emissions -->
        <AssessmentSection :title="$t('resultsEmbodiedTitle')" default-opened>
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
                <q-markup-table dense flat bordered class="results-table">
                    <thead>
                        <tr>
                            <th
                                v-for="col in embodiedColumns"
                                :key="col.name"
                                :data-kind="col.kind"
                                scope="col"
                            >
                                {{ col.label }}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="row in g.rows"
                            :key="row.id"
                            :class="{ 'results-excluded': row.excluded }"
                        >
                            <td
                                v-for="col in embodiedColumns"
                                :key="col.name"
                                :data-kind="col.kind"
                            >
                                <template v-if="col.name === 'co2RowTotal'">
                                    <span :class="{ 'results-strike': row.excluded }">{{
                                        col.display(row)
                                    }}</span>
                                    <span v-if="row.excluded" class="results-not-counted"
                                        >({{ $t('inventoryNotCounted') }})</span
                                    >
                                </template>
                                <template v-else>{{ col.display(row) }}</template>
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
                    <div class="text-subtitle1 text-weight-bold text-grey-8 q-mb-xs">
                        {{ $t('resultsChartTreemapByElement') }}
                    </div>
                    <EmbodiedTreemapChart
                        :groups="mitsi.embodiedByCategory"
                        :grand-total="mitsi.totalEmbodied"
                        variant="element"
                    />
                </div>
                <div class="col-12 col-md-6">
                    <div class="text-subtitle1 text-weight-bold text-grey-8 q-mb-xs">
                        {{ $t('resultsChartTreemapByCategory') }}
                    </div>
                    <EmbodiedTreemapChart
                        :groups="mitsi.embodiedByCategory"
                        :grand-total="mitsi.totalEmbodied"
                        variant="category"
                    />
                </div>
            </div>
        </AssessmentSection>

        <!-- Operational emissions -->
        <AssessmentSection :title="$t('resultsOperationalTitle')" default-opened>
            <q-markup-table dense flat bordered class="results-table">
                <thead>
                    <tr>
                        <th
                            v-for="col in operationalColumns"
                            :key="col.name"
                            :data-kind="col.kind"
                            scope="col"
                        >
                            {{ col.label }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in mitsi.operationalPerDc" :key="row.datacenterId">
                        <td v-for="col in operationalColumns" :key="col.name" :data-kind="col.kind">
                            {{ col.display(row) }}
                        </td>
                    </tr>
                    <tr class="results-total">
                        <td>
                            <strong>{{ $t('resultsTotalOperational') }}</strong>
                        </td>
                        <td></td>
                        <td class="text-right">
                            <strong>{{
                                formatResult(mitsi.totalOperational, operationalResultOptions)
                            }}</strong>
                        </td>
                    </tr>
                </tbody>
            </q-markup-table>

            <!-- pie by datacenter -->
            <div class="text-subtitle1 text-weight-bold text-grey-8 q-mb-xs">
                {{ $t('resultsChartPieByDatacenter') }}
            </div>
            <DatacentersPieChart
                :rows="mitsi.operationalPerDc"
                :label-for="dcLabel"
                :total="mitsi.totalOperational"
                metric="lifespan"
            />
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
            <q-markup-table dense flat bordered class="results-table">
                <tbody>
                    <tr>
                        <td>{{ $t('resultsRowEmbodied') }}</td>
                        <td class="text-right">{{ formatKg(mitsi.totalEmbodied) }}</td>
                    </tr>
                    <tr>
                        <td>{{ $t('resultsRowOperational') }}</td>
                        <td class="text-right">
                            {{ formatResult(mitsi.totalOperational, operationalResultOptions) }}
                        </td>
                    </tr>
                    <tr class="results-total">
                        <td>
                            <strong>{{ $t('resultsRowTotal') }}</strong>
                        </td>
                        <td class="text-right">
                            <strong>{{
                                formatResult(mitsi.totalLifespan, combinedResultOptions)
                            }}</strong>
                        </td>
                    </tr>
                </tbody>
            </q-markup-table>

            <!-- split pie embodied/operational/underlying -->
            <div class="text-subtitle1 text-weight-bold text-grey-8 q-mb-xs">
                {{ $t('resultsChartSplitTitle') }}
            </div>
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
        </AssessmentSection>

        <!-- Emissions related to the functional unit -->
        <AssessmentSection :title="$t('resultsFuTitle')" default-opened>
            <q-markup-table dense flat bordered class="results-table">
                <tbody>
                    <tr>
                        <th scope="row" class="results-key text-left">
                            {{ $t('resultsFuNumber') }}
                        </th>
                        <td class="text-right">{{ mitsi.resourcesInService }}</td>
                    </tr>
                    <tr>
                        <th scope="row" class="results-key text-left">
                            {{ $t('resultsFuLifespanNote') }}
                        </th>
                        <td class="text-right">{{ totalPerResourceText }}</td>
                    </tr>
                    <tr>
                        <th scope="row" class="results-key text-left">{{ fuSentence }}</th>
                        <td class="text-right">{{ perFunctionalUnitText }}</td>
                    </tr>
                    <tr class="results-total">
                        <td colspan="2">
                            <strong>{{ $t('resultsHostedIn', { dcs: hostedInDcs }) }}</strong>
                        </td>
                    </tr>
                </tbody>
            </q-markup-table>
        </AssessmentSection>
    </div>
</template>

<script setup lang="ts">
import AssessmentSection from 'src/components/AssessmentSection.vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMitsiStore } from 'src/stores/mitsi';

import { formatDatacenterName, formatKg, formatResult, normalizeKey } from 'src/utils/format';
import EmbodiedTreemapChart from 'src/components/results/EmbodiedTreemapChart.vue';
import DatacentersPieChart from 'src/components/results/DatacentersPieChart.vue';
import TotalSplitPieChart from 'src/components/results/TotalSplitPieChart.vue';

const { t } = useI18n();
const mitsi = useMitsiStore();
const operationalResultOptions = computed(() => ({
    missingLabel: t('mainNotApplicable'),
    partialLabel: mitsi.energyCoverage.isComplete
        ? ''
        : t('resultsEnergyCoverage', {
              complete: mitsi.energyCoverage.completeDatacenters,
              total: mitsi.energyCoverage.totalDatacenters,
          }),
}));
const combinedResultOptions = computed(() => ({
    missingLabel: t('mainNotApplicable'),
    partialLabel: mitsi.resultsPartial ? t('resultsPartial') : '',
}));

type EmbodiedRow = (typeof mitsi.embodiedByCategory)[number]['rows'][number];
type OperationalRow = (typeof mitsi.operationalPerDc)[number];

interface EmbodiedColumn {
    name: Exclude<keyof EmbodiedRow, 'id' | 'excluded'>;
    label: string;
    kind: 'text' | 'number';
    display: (row: EmbodiedRow) => string | number;
}

interface OperationalColumn {
    name: keyof OperationalRow;
    label: string;
    kind: 'text' | 'number';
    display: (row: OperationalRow) => string;
}

const embodiedColumns = computed<EmbodiedColumn[]>(() => [
    {
        name: 'name',
        label: t('resultsEmbodiedColumns.name'),
        kind: 'text',
        display: (row) => row.name,
    },
    {
        name: 'description',
        label: t('resultsEmbodiedColumns.description'),
        kind: 'text',
        display: (row) => row.description,
    },
    {
        name: 'number',
        label: t('resultsEmbodiedColumns.number'),
        kind: 'number',
        display: (row) => row.number,
    },
    {
        name: 'co2PerUnit',
        label: t('resultsEmbodiedColumns.co2PerUnit'),
        kind: 'number',
        display: (row) => formatKg(row.co2PerUnit),
    },
    {
        name: 'co2RowTotal',
        label: t('resultsEmbodiedColumns.co2RowTotal'),
        kind: 'number',
        display: (row) => formatKg(row.co2RowTotal),
    },
]);

const operationalColumns = computed<OperationalColumn[]>(() => [
    {
        name: 'datacenterId',
        label: t('resultsOperationalColumns.datacenterId'),
        kind: 'text',
        display: (row) => dcLabel(row.datacenterId),
    },
    {
        name: 'co2Period',
        label: t('resultsOperationalColumns.co2Period'),
        kind: 'number',
        display: (row) => formatKg(row.co2Period),
    },
    {
        name: 'co2Lifespan',
        label: t('resultsOperationalColumns.co2Lifespan'),
        kind: 'number',
        display: (row) => formatKg(row.co2Lifespan),
    },
]);

/** Time-unit label resolved with the same keys the ScopePage FU select uses. */
const timeUnitLabel = computed(() =>
    t('scopeTimeUnit_' + normalizeKey(mitsi.scope.functionalUnit.timeUnit)),
);

/** Assembled functional-unit sentence ('Usage of 1 hour of the service with 1 GPU'). */
const fuSentence = computed(() => {
    const fu = mitsi.scope.functionalUnit;
    return t('scopeFuSentence', {
        duration: fu.usageDuration,
        unit: timeUnitLabel.value,
        count: fu.resourceCount,
        type: fu.resourceType,
    });
});

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
    formatResult(mitsi.totalPerResource, {
        ...combinedResultOptions.value,
        formatValue: (value) => `${formatKg(value)} ${t('resultsUnitKg')}`,
    }),
);

const perFunctionalUnitText = computed(() =>
    formatResult(mitsi.perFunctionalUnit, {
        ...combinedResultOptions.value,
        formatValue: (value) =>
            `${value.toFixed(4)} ${t('resultsUnitKg')} / ${(value * 1000).toFixed(4)} ${t('resultsUnitG')}`,
    }),
);
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.results-table {
    @include table-cells.cells;
}

.results-table tbody tr:not(:last-child) > th[scope='row'] {
    border-bottom-width: 1px;
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
</style>

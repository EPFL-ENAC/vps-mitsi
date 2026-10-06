<template>
    <q-markup-table dense flat bordered class="results-table">
        <tbody>
            <tr>
                <th scope="row" class="results-key text-left" data-kind="text">
                    {{ $t('resultsFuNumber') }}
                </th>
                <td class="text-right" data-kind="number">{{ mitsi.resourcesInService }}</td>
            </tr>
            <tr>
                <th scope="row" class="results-key text-left" data-kind="text">
                    {{ $t('resultsFuLifespanNote') }}
                </th>
                <td class="text-right" data-kind="number">{{ totalPerResourceText }}</td>
            </tr>
            <tr>
                <th scope="row" class="results-key text-left" data-kind="text">{{ fuSentence }}</th>
                <td class="text-right" data-kind="number">{{ perFunctionalUnitText }}</td>
            </tr>
            <tr class="results-total">
                <td colspan="2" class="text-left" data-kind="text">
                    <strong>{{ $t('resultsHostedIn', { dcs: hostedInDcs }) }}</strong>
                </td>
            </tr>
        </tbody>
    </q-markup-table>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMitsiStore } from 'src/stores/mitsi';
import {
    buildFunctionalUnitSentence,
    formatDatacenterName,
    formatKg,
    formatResult,
} from 'src/utils/format';

const { t } = useI18n();
const mitsi = useMitsiStore();
const combinedResultOptions = computed(() => ({
    missingLabel: t('mainNotApplicable'),
    partialLabel: mitsi.resultsPartial ? t('resultsPartial') : '',
}));
const fuSentence = computed(() => buildFunctionalUnitSentence(t, mitsi.scope.functionalUnit));

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
    overflow: visible !important;
    th,
    td {
        white-space: normal !important;
        word-break: break-word;
    }
}

.results-key {
    font-weight: 600;
    color: rgba(0, 0, 0, 0.7);
    width: 60%;
}

.results-total td {
    border-top: 2px solid rgba(0, 0, 0, 0.2);
    font-weight: 700;
}
</style>

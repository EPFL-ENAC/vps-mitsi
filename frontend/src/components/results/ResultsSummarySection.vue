<template>
    <q-markup-table dense flat bordered class="results-table">
        <tbody>
            <tr>
                <td class="results-key text-left" data-kind="text">
                    {{ $t('resultsSummaryServiceName') }}
                </td>
                <td data-kind="text">{{ mitsi.scope.serviceName || '—' }}</td>
            </tr>
            <tr>
                <td class="results-key text-left" data-kind="text">
                    {{ $t('resultsSummaryFunction') }}
                </td>
                <td data-kind="text">{{ mitsi.scope.function || '—' }}</td>
            </tr>
            <tr>
                <td class="results-key text-left" data-kind="text">
                    {{ $t('resultsSummaryFunctionalUnit') }}
                </td>
                <td data-kind="text">{{ fuSentence }}</td>
            </tr>
            <tr>
                <td class="results-key text-left" data-kind="text">
                    {{ $t('resultsSummaryLifespan') }}
                </td>
                <td data-kind="text">
                    {{ $t('resultsLifespanYears', { n: mitsi.scope.lifespanYears }) }}
                </td>
            </tr>
        </tbody>
    </q-markup-table>
</template>

<script setup lang="ts">
import { useMitsiStore } from 'src/stores/mitsi';
import { useResultFormatting } from 'src/composables/useResultFormatting';

const mitsi = useMitsiStore();
const { fuSentence } = useResultFormatting();
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.results-table {
    @include table-cells.cells;
}

.results-key {
    font-weight: 600;
    color: rgba(0, 0, 0, 0.7);
    width: 60%;
}
</style>

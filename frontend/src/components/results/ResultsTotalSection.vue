<template>
    <q-markup-table dense flat bordered class="results-table">
        <tbody>
            <tr>
                <td data-kind="text">{{ $t('resultsRowEmbodied') }}</td>
                <td class="text-right" data-kind="number">{{ formatKg(mitsi.totalEmbodied) }}</td>
            </tr>
            <tr>
                <td data-kind="text">{{ $t('resultsRowOperational') }}</td>
                <td class="text-right" data-kind="number">
                    {{ formatOperationalResult(mitsi.totalOperational) }}
                </td>
            </tr>
            <tr class="results-total">
                <td data-kind="text">
                    <strong>{{ $t('resultsRowTotal') }}</strong>
                </td>
                <td class="text-right" data-kind="number">
                    <strong>{{ formatCombinedResult(mitsi.totalLifespan) }}</strong>
                </td>
            </tr>
        </tbody>
    </q-markup-table>
</template>

<script setup lang="ts">
import { useMitsiStore } from 'src/stores/mitsi';
import { useResultFormatting } from 'src/composables/useResultFormatting';
import { formatKg } from 'src/utils/format';

const mitsi = useMitsiStore();
const { formatOperationalResult, formatCombinedResult } = useResultFormatting();
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.results-table {
    @include table-cells.cells;
    overflow: visible !important;
}

.results-total td {
    border-top: 2px solid rgba(0, 0, 0, 0.2);
    font-weight: 700;
}
</style>

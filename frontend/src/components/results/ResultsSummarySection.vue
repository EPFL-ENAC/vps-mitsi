<template>
    <q-markup-table dense flat bordered class="results-table">
        <tbody>
            <tr>
                <th scope="row" class="results-key text-left" data-kind="text">
                    {{ $t('resultsSummaryServiceName') }}
                </th>
                <td data-kind="text">{{ surveyData.scope.serviceName || '—' }}</td>
            </tr>
            <tr>
                <th scope="row" class="results-key text-left" data-kind="text">
                    {{ $t('resultsSummaryFunction') }}
                </th>
                <td data-kind="text">{{ surveyData.scope.function || '—' }}</td>
            </tr>
            <tr>
                <th scope="row" class="results-key text-left" data-kind="text">
                    {{ $t('resultsSummaryFunctionalUnit') }}
                </th>
                <td data-kind="text">{{ fuSentence }}</td>
            </tr>
            <tr>
                <th scope="row" class="results-key text-left" data-kind="text">
                    {{ $t('resultsSummaryLifespan') }}
                </th>
                <td data-kind="text">
                    {{ $t('resultsLifespanYears', { n: surveyData.scope.lifespanYears }) }}
                </td>
            </tr>
        </tbody>
    </q-markup-table>
</template>

<script setup lang="ts">
import { useSurveyDataStore } from 'src/stores/surveyData';

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { buildFunctionalUnitSentence } from 'src/utils/format';

const surveyData = useSurveyDataStore();

const { t } = useI18n();
const fuSentence = computed(() => buildFunctionalUnitSentence(t, surveyData.scope.functionalUnit));
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

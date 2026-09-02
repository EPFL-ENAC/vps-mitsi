<template>
    <PageHeader :eyebrow="t('zooDepthEyebrow')" :level="1">
        <template #default>
            {{ t('zooDepthTitle') }}
        </template>

        <template #subtitle>
            {{ t('zooDepthSubtitle') }}
        </template>
    </PageHeader>

    <ChartContainer borderless :is-loading="isLoading" :loading-text="t('zooDepthLoading')">
        <PlanctonDepthPlot
            :plancton-depth="zooplanktonDepthStore.lastRecordedDepth ?? 0"
            :maxPlotDepth="80"
            :depth-axis-x="132"
        />
    </ChartContainer>
    <PlotAppendix :measured-at="zooplanktonDepthStore.lastAvailableTimestamp" />

    <QuestionCardsRow :items="questionCards" :columns="1" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from 'src/components/PageHeader.vue';
import QuestionCardsRow from 'src/components/QuestionCardsRow.vue';
import PlanctonDepthPlot from 'src/components/plots/waterDepth/PlanctonDepthPlot.vue';
import PlotAppendix from 'src/components/plots/PlotAppendix.vue';
import ChartContainer from 'src/components/ChartContainer.vue';
import { useZooplanctonDepthStore } from 'src/stores/lexplore';

const { t } = useI18n();
const zooplanktonDepthStore = useZooplanctonDepthStore();
const isLoading = computed(() => zooplanktonDepthStore.lastRecordedDepth === null);

const questionCards = computed(() => [
    {
        id: '01',
        kicker: `${t('question')} #1`,
        title: t('zooDepthQ1'),
    },
]);
</script>

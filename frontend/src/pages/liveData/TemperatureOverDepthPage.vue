<template>
    <PageHeader :eyebrow="t('tempDepthEyebrow')" :level="1">
        <template #default>
            {{ t('tempDepthTitle') }}
        </template>
    </PageHeader>

    <ChartContainer borderless :is-loading="isLoading" :loading-text="t('tempDepthLoading')">
        <TemperatureOverDepthPlot :rows="temperatureRows" />
    </ChartContainer>
    <PlotAppendix :measured-at="lakeStore.data?.timestamps.at(-1)" />

    <QuestionCardsRow :items="questionCards" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import PageHeader from 'src/components/PageHeader.vue';
import TemperatureOverDepthPlot from 'src/components/plots/waterDepth/TemperatureOverDepthPlot.vue';
import QuestionCardsRow from 'src/components/QuestionCardsRow.vue';
import PlotAppendix from 'src/components/plots/PlotAppendix.vue';
import ChartContainer from 'src/components/ChartContainer.vue';
import { useWeatherStore, useLakeStore } from 'src/stores/lexplore';
import { computed } from 'vue';

const { t } = useI18n();
const weatherStore = useWeatherStore();
const lakeStore = useLakeStore();
const isLoading = computed(() => !weatherStore.data || !lakeStore.data);

const temperatureRows = computed(() => [
    {
        label: t('tempDepthAir'),
        depth: -5,
        value: weatherStore.data?.airTemperature.at(-1) ?? 0,
    },
    {
        label: '0m',
        depth: 0,
        value: lakeStore.data?.surfaceTemperature.at(-1) ?? 0,
    },
    {
        label: '4m',
        depth: 4,
        value: lakeStore.data?.temperatureOverDepth?.at('rightmost', 4) ?? 0,
    },
    {
        label: '10m',
        depth: 10,
        value: lakeStore.data?.temperatureOverDepth?.at('rightmost', 10) ?? 0,
    },
    {
        label: '16m',
        depth: 16,
        value: lakeStore.data?.temperatureOverDepth?.at('rightmost', 16) ?? 0,
    },
    {
        label: '24m',
        depth: 24,
        value: lakeStore.data?.temperatureOverDepth?.at('rightmost', 24) ?? 0,
    },
    {
        label: '40m',
        depth: 40,
        value: lakeStore.data?.temperatureOverDepth?.at('rightmost', 40) ?? 0,
    },
    {
        label: '60m',
        depth: 60,
        value: lakeStore.data?.temperatureOverDepth?.at('rightmost', 60) ?? 0,
    },
    {
        label: '80m',
        depth: 80,
        value: lakeStore.data?.temperatureOverDepth?.at('rightmost', 80) ?? 0,
    },
]);

const questionCards = computed(() => [
    {
        id: '01',
        kicker: `${t('question')} #1`,
        title: t('tempDepthQ1'),
    },
    {
        id: '02',
        kicker: `${t('question')} #2`,
        title: t('tempDepthQ2'),
    },
]);
</script>

<style scoped></style>

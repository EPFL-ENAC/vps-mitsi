<template>
    <PageHeader :eyebrow="t('planctonGameEyebrow')" eyebrow-class="text-negative" :level="1">
        <template #default> {{ t('planctonGameTitle') }} </template>

        <template #subtitle>
            {{ t('planctonGameSubtitle') }}
        </template>
    </PageHeader>

    <ChartContainer borderless :is-loading="isLoading" :loading-text="t('planctonGameLoading')">
        <PlanctonDepthPlot
            :plancton-depth="planctonDepth?.y ?? 0"
            :maxPlotDepth="80"
            :depth-axis-x="132"
        />
    </ChartContainer>

    <TimestampSlider
        v-if="range"
        v-model="selectedTimestamp"
        :start-timestamp="range.start * 1000"
        :end-timestamp="range.end * 1000"
        :show-ticks="false"
    />

    <PlotAppendix :measured-at="zooplanktonDepthStore.lastAvailableTimestamp" />

    <QuestionCardsRow :items="questions" kickerClass="text-negative" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from 'src/components/PageHeader.vue';
import PlanctonDepthPlot from 'src/components/plots/waterDepth/PlanctonDepthPlot.vue';
import TimestampSlider from 'src/components/TimestampSlider.vue';
import QuestionCardsRow from 'src/components/QuestionCardsRow.vue';
import ChartContainer from 'src/components/ChartContainer.vue';
import PlotAppendix from 'src/components/plots/PlotAppendix.vue';
import { useZooplanctonDepthStore } from 'src/stores/lexplore';
import { daySine } from 'src/utils/datetime';
import { remap } from 'src/utils/math';

const { t } = useI18n();
const zooplanktonDepthStore = useZooplanctonDepthStore();

const selectedTimestamp = ref<number>(Date.now() / 1000);
const range = computed(() => zooplanktonDepthStore.lastFullDayOfDataTimestampRange);
const isLoading = computed(() => zooplanktonDepthStore.lastRecordedDepth === null);

const planctonDepth = computed(() => {
    const remapedSine = remap(daySine(selectedTimestamp.value * 1000), -1, 1, 80, 0);
    if (!zooplanktonDepthStore.processedBackscatterHeatmap || !range.value) {
        return { y: remapedSine, z: 0 };
    }

    return zooplanktonDepthStore.processedBackscatterHeatmap.columnMaximaAtTimestamp(
        selectedTimestamp.value,
        { startY: remapedSine - 40, endY: remapedSine + 40 },
    );
});

const questions = computed(() => [
    {
        id: '01',
        kicker: t('question'),
        title: t('planctonGameQ1'),
    },
]);
</script>

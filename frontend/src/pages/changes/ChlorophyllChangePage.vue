<template>
    <PageHeader :eyebrow="t('chloroChangeEyebrow')" eyebrow-class="text-warning" :level="1">
        <template #default> {{ t('chloroChangeTitle') }} </template>
    </PageHeader>

    <ChartContainer>
        <ScrollableTracksChart
            :timeline="timeline"
            :px-per-hour="10"
            :tick-every-minutes="8 * 60"
            :track-height="200"
            :axis-height="58"
            :bar-gap="2"
            :line-stroke-width="3"
            :locale="locale"
        />
    </ChartContainer>

    <QuestionCardsRow :items="questions" kickerClass="text-warning" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from 'src/components/PageHeader.vue';
import QuestionCardsRow from 'src/components/QuestionCardsRow.vue';
import ScrollableTracksChart from 'src/components/plots/timeline/ScrollableTrackChart.vue';
import ChartContainer from 'src/components/ChartContainer.vue';
import { Timeline, Track, Series } from 'src/components/plots/timeline/types';
import { useAlgaeStore, useLakeStore, useWeatherStore } from 'src/stores/lexplore';

const weatherStore = useWeatherStore();
const lakeStore = useLakeStore();
const algaeStore = useAlgaeStore();

const { locale, t } = useI18n();

function toMs(timestamp: number): number {
    return timestamp * 1000;
}

const chlorophyll0to20 = computed(() => {
    if (!algaeStore.data) {
        return [];
    }

    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;

    const sliced = algaeStore.data.chlorophyllAOverDepth.slice({
        yStart: 0,
        yEnd: 20,
    });

    return algaeStore.data.timestamps
        .filter((timestamp) => toMs(timestamp) >= tenDaysAgo)
        .map((timestamp) => {
            const value = sliced.averageOverDepthAtTimestamp(timestamp);

            if (value == null || !Number.isFinite(value)) {
                return null;
            }

            return {
                timestamp: toMs(timestamp),
                value,
            };
        })
        .filter((point): point is { timestamp: number; value: number } => point !== null);
});

const tracks = computed(() => {
    const result: Track[] = [];
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;

    if (weatherStore.data) {
        result.push(
            new Track({
                title: t('chloroChangeTrackIrradiance'),
                series: [
                    Series.buckets(
                        { id: 'irradiance', type: 'bar', color: '#ffd54a' },
                        weatherStore.data.timestamps
                            .map((timestamp, index) => ({
                                timestamp: toMs(timestamp),
                                value: weatherStore.data!.irradiance[index]!,
                            }))
                            .filter((d) => d.timestamp >= tenDaysAgo),
                        3 * 60 * 60 * 1000,
                    ),
                ],
            }),
        );
    }

    const tempSeries: Series[] = [];

    if (weatherStore.data) {
        tempSeries.push(
            new Series({
                id: 'air-temp',
                title: t('chloroChangeTrackAirTemp'),
                type: 'line',
                color: '#ff5e66',
                data: weatherStore.data.timestamps
                    .map((timestamp, index) => ({
                        timestamp: toMs(timestamp),
                        value: weatherStore.data!.airTemperature[index]!,
                    }))
                    .filter((d) => d.timestamp >= tenDaysAgo),
            }).slidingWindowOutlierRemoval(5, 5),
        );
    }

    if (lakeStore.data) {
        tempSeries.push(
            new Series({
                id: 'water-temp',
                title: t('chloroChangeTrackWaterTemp'),
                type: 'line',
                color: '#2b67f0',
                data: lakeStore.data.timestamps
                    .map((timestamp) => ({
                        timestamp: toMs(timestamp),
                        value: lakeStore.data!.temperatureOverDepth.at(timestamp, 2)!,
                    }))
                    .filter((d) => d.timestamp >= tenDaysAgo),
            }),
        );
    }

    if (tempSeries.length > 0) {
        result.push(
            new Track({
                title: t('windChangeTrackTemperature'),
                series: tempSeries,
            }),
        );
    }

    if (chlorophyll0to20.value.length > 0) {
        result.push(
            new Track({
                title: t('chloroChangeTrackChlorophyll'),
                series: [
                    Series.buckets(
                        { id: 'chlorophyll', type: 'bar', color: '#5df2c1' },
                        chlorophyll0to20.value,
                        3 * 60 * 60 * 1000,
                    ),
                ],
            }),
        );
    }

    return result;
});

const timeline = computed(() => new Timeline(tracks.value));

const questions = computed(() => [
    {
        id: '01',
        kicker: t('question'),
        title: t('chloroChangeQ1'),
    },
]);
</script>

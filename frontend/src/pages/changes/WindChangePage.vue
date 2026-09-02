<template>
    <PageHeader :eyebrow="t('windChangeEyebrow')" eyebrow-class="text-warning" :level="1">
        <template #default> {{ t('windChangeTitle') }} </template>
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
import { useBuoyStore, useLakeStore, useWeatherStore } from 'src/stores/lexplore';

const weatherStore = useWeatherStore();
const lakeStore = useLakeStore();
const buoyStore = useBuoyStore();

const { locale, t } = useI18n();

function toMs(timestamp: number): number {
    return timestamp * 1000;
}

const tracks = computed(() => {
    const result: Track[] = [];
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;

    const tempSeries: Series[] = [];

    // 1. Air Temperature Track
    if (weatherStore.data) {
        const airTempData = weatherStore.data.timestamps
            .map((timestamp, index) => ({
                timestamp: toMs(timestamp),
                value: weatherStore.data!.airTemperature[index]!,
            }))
            .filter((d) => d.timestamp >= tenDaysAgo);

        tempSeries.push(
            new Series({
                id: 'air-temp',
                title: t('windChangeTrackAirTemp'),
                type: 'line',
                color: '#ff5e66',
                data: airTempData,
            }),
        );
    }

    // 2. Water Temperature Track (with Outlier Removal)
    if (lakeStore.data) {
        const waterTempData = lakeStore.data.timestamps
            .map((timestamp) => ({
                timestamp: toMs(timestamp),
                value: lakeStore.data!.temperatureOverDepth.at(timestamp, 2)!,
            }))
            .filter((d) => d.timestamp >= tenDaysAgo);

        const waterSeries = new Series({
            id: 'water-temp',
            title: t('windChangeTrackWaterTemp'),
            type: 'line',
            color: '#2b67f0',
            data: waterTempData,
        }).slidingWindowOutlierRemoval(5, 5);
        tempSeries.push(waterSeries);
    }

    if (tempSeries.length > 0) {
        result.push(
            new Track({
                title: t('windChangeTrackTemperature'),
                series: tempSeries,
            }),
        );
    }

    // 3. Weather Dynamics (Wind & Precipitation)
    if (weatherStore.data) {
        const bucketSizeMs = 8 * 60 * 60 * 1000;

        // Wind Direction
        const windDirData = weatherStore.data.timestamps
            .map((timestamp, index) => ({
                timestamp: toMs(timestamp),
                value: weatherStore.data!.windDirectionDegrees[index]!,
            }))
            .filter((d) => d.timestamp >= tenDaysAgo);

        result.push(
            new Track({
                title: t('windChangeTrackWindDirection'),
                series: [
                    Series.buckets(
                        { id: 'wind-dir', type: 'wind', color: '#7ed957' },
                        windDirData,
                        bucketSizeMs,
                    ),
                ],
            }),
        );

        // Wind Speed
        const windSpeedData = weatherStore.data.timestamps
            .map((timestamp, index) => ({
                timestamp: toMs(timestamp),
                value: weatherStore.data!.windSpeed[index]!,
            }))
            .filter((d) => d.timestamp >= tenDaysAgo);

        result.push(
            new Track({
                title: t('windChangeTrackWindSpeed'),
                series: [
                    Series.buckets(
                        { id: 'wind-speed', type: 'number', color: '#7ed957' },
                        windSpeedData,
                        bucketSizeMs,
                    ),
                ],
            }),
        );

        // Precipitation
        const precipData = weatherStore.data.timestamps
            .map((timestamp, index) => ({
                timestamp: toMs(timestamp),
                value: weatherStore.data!.precipitation[index]!,
            }))
            .filter((d) => d.timestamp >= tenDaysAgo);

        result.push(
            new Track({
                title: t('windChangeTrackPrecipitation'),
                series: [
                    Series.buckets(
                        { id: 'precip', type: 'bar', color: '#4db8ff' },
                        precipData,
                        3 * 60 * 60 * 1000,
                    ),
                ],
            }),
        );
    }

    // 4. Buoy Data
    if (buoyStore.data) {
        const waveData = buoyStore.data.timestamps
            .map((timestamp, index) => ({
                timestamp: toMs(timestamp),
                value: buoyStore.data!.height[index]!,
            }))
            .filter((d) => d.timestamp >= tenDaysAgo);

        result.push(
            new Track({
                title: t('windChangeTrackWaveHeight'),
                series: [
                    Series.buckets(
                        { id: 'wave-height', type: 'bar', color: '#c08cff' },
                        waveData,
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
        title: t('windChangeQ1'),
    },
    {
        id: '02',
        kicker: t('question'),
        title: t('windChangeQ2'),
    },
]);
</script>

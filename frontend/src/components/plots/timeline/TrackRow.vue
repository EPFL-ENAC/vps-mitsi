<template>
    <svg
        :width="width"
        :height="height"
        class="timeline-chart__row-svg"
        xmlns="http://www.w3.org/2000/svg"
    >
        <g>
            <line
                v-for="tick in ticks"
                :key="`grid-${tick.timestamp}`"
                :x1="xForTimestamp(tick.timestamp)"
                :x2="xForTimestamp(tick.timestamp)"
                y1="0"
                :y2="height"
                :class="[
                    'timeline-chart__vertical-grid',
                    tick.isDayStart && 'timeline-chart__vertical-grid--strong',
                ]"
            />

            <line
                x1="0"
                :x2="width"
                :y1="height - 0.5"
                :y2="height - 0.5"
                class="timeline-chart__row-line"
            />
        </g>

        <!-- Use a template loop to handle multiple series per track -->
        <template v-for="series in track.series" :key="series.id">
            <TrackBars
                v-if="series.type === 'bar'"
                :series="series"
                :x-for-timestamp="xForTimestamp"
                :track-top="0"
                :track-height="height"
                :gap="barGap"
            />

            <TrackLine
                v-else-if="series.type === 'line'"
                :series="series"
                :x-for-timestamp="xForTimestamp"
                :track-top="0"
                :track-height="height"
                :stroke-width="lineStrokeWidth"
            />

            <TrackWind
                v-else-if="series.type === 'wind'"
                :series="series"
                :x-for-timestamp="xForTimestamp"
                :track-top="0"
                :track-height="height"
                :gap="barGap"
            />

            <TrackNumber
                v-else-if="series.type === 'number'"
                :series="series"
                :x-for-timestamp="xForTimestamp"
                :track-top="0"
                :track-height="height"
                :gap="barGap"
            />
        </template>
    </svg>
</template>

<script setup lang="ts">
import TrackBars from './TrackBars.vue';
import TrackWind from './TrackWind.vue';
import TrackLine from './TrackLine.vue';
import TrackNumber from './TrackNumber.vue';
import type { TimelineTick, Track } from './types';

defineProps<{
    track: Track;
    width: number;
    height: number;
    ticks: TimelineTick[];
    xForTimestamp: (timestamp: number) => number;
    barGap: number;
    lineStrokeWidth: number;
}>();
</script>

<style scoped>
.timeline-chart__row-svg {
    display: block;
}

.timeline-chart__vertical-grid {
    stroke: rgba(255, 255, 255, 0.1);
    stroke-width: 1;
}

.timeline-chart__vertical-grid--strong {
    stroke: rgba(255, 255, 255, 0.22);
}

.timeline-chart__row-line {
    stroke: rgba(255, 255, 255, 0.12);
    stroke-width: 1;
}
</style>

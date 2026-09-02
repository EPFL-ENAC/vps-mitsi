<template>
    <g>
        <rect
            v-for="(bar, index) in bars"
            :key="index"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            :fill="series.color"
            :opacity="0.9"
            rx="1.5"
        />
    </g>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Series } from './types';
import { clamp } from 'src/utils/math';

const props = withDefaults(
    defineProps<{
        series: Series;
        xForTimestamp: (timestamp: number) => number;
        trackTop: number;
        trackHeight: number;
        gap?: number;
    }>(),
    {
        gap: 2,
    },
);

interface Bar {
    x: number;
    y: number;
    width: number;
    height: number;
}

const bars = computed<Bar[]>(() => {
    const innerTop = props.trackTop + 8;
    const innerHeight = Math.max(1, props.trackHeight - 14);
    const range = props.series.getValueRange().toPretty();

    return props.series.data.map((point, index) => {
        const nextTimestamp =
            props.series.data[index + 1]?.timestamp ?? point.timestamp + props.series.stepMs;

        const x = props.xForTimestamp(point.timestamp);
        const nextX = props.xForTimestamp(nextTimestamp);
        const width = Math.max(1, nextX - x - props.gap);

        const ratio = clamp(range.normalizedValue(point.value), 0, 1);
        const height = Math.max(1, ratio * innerHeight);
        const y = innerTop + innerHeight - height;

        return {
            x,
            y,
            width,
            height,
        };
    });
});
</script>

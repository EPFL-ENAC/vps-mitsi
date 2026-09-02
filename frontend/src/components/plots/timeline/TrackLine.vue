<template>
    <g>
        <path
            v-if="pathD"
            :d="pathD"
            :stroke="series.color"
            :stroke-width="strokeWidth"
            fill="none"
            stroke-linejoin="round"
            stroke-linecap="round"
        />

        <circle
            v-if="singlePoint"
            :cx="singlePoint.x"
            :cy="singlePoint.y"
            :r="(strokeWidth ?? 0) + 1"
            :fill="series.color"
        />
    </g>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { Series } from './types';
import { clamp } from 'src/utils/math';

const props = defineProps<{
    series: Series;
    xForTimestamp: (timestamp: number) => number;
    trackTop: number;
    trackHeight: number;
    strokeWidth?: number;
}>();

function yForValue(value: number): number {
    const innerTop = props.trackTop + 8;
    const innerHeight = Math.max(1, props.trackHeight - 16);
    const ratio = clamp(prettyRange.value.normalizedValue(value), 0, 1);

    return innerTop + innerHeight - ratio * innerHeight;
}
const prettyRange = computed(() => props.series.getValueRange().toPretty());

const pathD = computed(() => {
    if (props.series.data.length === 0) {
        return '';
    }

    return props.series.data
        .map((point, index) => {
            const x = props.xForTimestamp(point.timestamp);
            const y = yForValue(point.value);

            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
});

const singlePoint = computed(() => {
    if (props.series.data.length !== 1) {
        return null;
    }

    const point = props.series.data[0]!;

    return {
        x: props.xForTimestamp(point.timestamp),
        y: yForValue(point.value),
    };
});
</script>

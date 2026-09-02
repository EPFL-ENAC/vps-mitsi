<template>
    <div class="timeline-chart">
        <div class="timeline-chart__frame" :style="{ backgroundColor: backgroundColor }">
            <div class="timeline-chart__left" :style="{ width: `${leftGutterWidth}px` }">
                <div class="timeline-chart__left-header" :style="{ height: `${axisHeight}px` }" />

                <div
                    v-for="(track, index) in props.timeline.tracks"
                    :key="`meta-${index}`"
                    class="timeline-chart__left-row"
                    :style="{ height: `${trackHeightAdjusted(track)}px` }"
                >
                    <TrackHeader
                        :track="track"
                        :leftGutterWidth="leftGutterWidth"
                        :trackHeight="trackHeightAdjusted(track)"
                    />
                </div>
            </div>

            <div ref="rightScroller" class="timeline-chart__right-scroller">
                <div class="timeline-chart__plot-stack" :style="{ width: `${plotWidth}px` }">
                    <svg
                        :width="plotWidth"
                        :height="axisHeight"
                        class="timeline-chart__axis-svg"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <line
                            :x1="0"
                            :x2="plotWidth"
                            :y1="1"
                            :y2="1"
                            class="timeline-chart__axis-line"
                        />

                        <g v-for="tick in ticks" :key="`label-${tick.timestamp}`">
                            <text
                                :x="xForTimestamp(tick.timestamp)"
                                :y="22"
                                text-anchor="middle"
                                class="timeline-chart__axis-text"
                            >
                                <tspan
                                    :x="xForTimestamp(tick.timestamp)"
                                    class="timeline-chart__axis-time"
                                >
                                    {{ tick.label }}
                                </tspan>

                                <tspan
                                    v-if="tick.secondaryLabel"
                                    :x="xForTimestamp(tick.timestamp)"
                                    dy="14"
                                    class="timeline-chart__axis-date"
                                >
                                    {{ tick.secondaryLabel }}
                                </tspan>
                            </text>
                        </g>
                    </svg>

                    <TrackRow
                        v-for="(track, index) in props.timeline.tracks"
                        :key="`row-${index}`"
                        :track="track"
                        :width="plotWidth"
                        :height="trackHeightAdjusted(track)"
                        :ticks="ticks"
                        :x-for-timestamp="xForTimestamp"
                        :bar-gap="barGap"
                        :line-stroke-width="lineStrokeWidth"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';

import TrackHeader from './TrackHeader.vue';
import TrackRow from './TrackRow.vue';
import { HOUR_MS, type Track, type Timeline } from './types';

const props = withDefaults(
    defineProps<{
        timeline: Timeline;
        pxPerHour?: number;
        trackHeight?: number;
        axisHeight?: number;
        tickEveryMinutes?: number;
        barGap?: number;
        lineStrokeWidth?: number;
        backgroundColor?: string;
        leftGutterWidth?: number;
        valueTickCount?: number;
    }>(),
    {
        pxPerHour: 84,
        trackHeight: 120,
        axisHeight: 56,
        tickEveryMinutes: 4 * 60,
        barGap: 2,
        lineStrokeWidth: 3,
        backgroundColor: '#182535',
        leftGutterWidth: 144,
        valueTickCount: 4,
    },
);

defineExpose({
    scrollToRightEnd,
});

const rightScroller = useTemplateRef<HTMLDivElement>('rightScroller');

function scrollToRightEnd() {
    const scroller = rightScroller.value;

    if (scroller) {
        scroller.scrollLeft = scroller.scrollWidth;
    }
}

const { locale } = useI18n();

onMounted(async () => {
    await nextTick();
    scrollToRightEnd();
});

const timeRange = computed(() => props.timeline.getPlotTimeRange());
const ticks = computed(() => props.timeline.getTicks(props.tickEveryMinutes, locale.value));

const plotWidth = computed(() => {
    const durationMs = Math.max(HOUR_MS, timeRange.value.max - timeRange.value.min);

    return (durationMs / HOUR_MS) * props.pxPerHour;
});

function xForTimestamp(timestamp: number): number {
    const duration = Math.max(HOUR_MS, timeRange.value.max - timeRange.value.min);
    const ratio = (timestamp - timeRange.value.min) / duration;

    return ratio * plotWidth.value;
}

function trackHeightAdjusted(track: Track): number {
    if (track.series.some((s) => s.type === 'wind')) {
        return 80;
    } else if (track.series.some((s) => s.type === 'number')) {
        return 50;
    }

    return props.trackHeight;
}
</script>

<style scoped>
.timeline-chart {
    width: 100%;
}

.timeline-chart__frame {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    border-radius: 12px;
    overflow: hidden;
}

.timeline-chart__left {
    position: sticky;
    left: 0;
    z-index: 2;
    background: inherit;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.timeline-chart__left-header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.timeline-chart__left-row {
    position: relative;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.timeline-chart__track-title {
    position: absolute;
    left: 12px;
    top: 10px;
    right: 12px;
    color: #d8deea;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    z-index: 1;
}

.timeline-chart__track-scale {
    display: block;
}

.timeline-chart__value-tick-line {
    stroke: rgba(255, 255, 255, 0.3);
    stroke-width: 1;
}

.timeline-chart__value-tick-text {
    fill: rgba(216, 222, 234, 0.75);
    font-size: 11px;
    user-select: none;
}

.timeline-chart__right-scroller {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
}

.timeline-chart__plot-stack {
    display: flex;
    flex-direction: column;
}

.timeline-chart__axis-svg {
    display: block;
}

.timeline-chart__axis-line {
    stroke: rgba(255, 255, 255, 0.2);
    stroke-width: 1;
}

.timeline-chart__axis-text {
    fill: #d8deea;
    font-size: 12px;
    user-select: none;
}

.timeline-chart__axis-time {
    fill: #d8deea;
}

.timeline-chart__axis-date {
    fill: rgba(216, 222, 234, 0.7);
    font-size: 11px;
}
</style>

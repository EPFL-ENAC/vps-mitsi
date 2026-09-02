<template>
    <div class="timeline-chart__track-text">
        <div class="timeline-chart__track-title">
            {{ track.title }}
        </div>

        <div v-if="legendSeries.length > 1" class="timeline-chart__track-legend">
            <div
                v-for="series in legendSeries"
                :key="series.id"
                class="timeline-chart__track-legend-item"
            >
                <span
                    class="timeline-chart__track-legend-dot"
                    :style="{ backgroundColor: series.color }"
                />
                <span class="timeline-chart__track-legend-label">
                    {{ series.title ?? series.id }}
                </span>
            </div>
        </div>
    </div>

    <svg
        v-if="track.series.some((s) => s.type !== 'wind' && s.type !== 'number')"
        class="timeline-chart__track-scale"
        :width="leftGutterWidth"
        :height="trackHeight"
        xmlns="http://www.w3.org/2000/svg"
    >
        <g v-for="tick in valueTicks" :key="tick.value">
            <line
                :x1="leftGutterWidth - 10"
                :x2="leftGutterWidth"
                :y1="tick.y"
                :y2="tick.y"
                class="timeline-chart__value-tick-line"
            />

            <text
                :x="leftGutterWidth - 14"
                :y="tick.y + 4"
                text-anchor="end"
                class="timeline-chart__value-tick-text"
            >
                {{ formatValueTick(tick.value) }}
            </text>
        </g>
    </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Track } from './types';
import { useI18n } from 'vue-i18n';
import { formatNumber } from 'src/utils/format';

const props = withDefaults(
    defineProps<{
        track: Track;
        leftGutterWidth: number;
        trackHeight: number;
        tickCount?: number;
        topMargin?: number;
        bottomMargin?: number;
    }>(),
    {
        tickCount: 5,
        topMargin: 8,
        bottomMargin: 8,
    },
);

const { locale } = useI18n();

const legendSeries = computed(() =>
    props.track.series.filter((series) => series.type !== 'wind' && series.type !== 'number'),
);

const textBlockHeight = computed(() => {
    if (legendSeries.value.length > 1) {
        return 40;
    }

    return 20;
});

const valueTicks = computed(() => {
    const top = props.topMargin + textBlockHeight.value;
    const innerHeight = Math.max(1, props.trackHeight - top - props.bottomMargin);

    const rangeRaw = props.track.getValueRange();

    if (props.tickCount <= 1 || rangeRaw.min === rangeRaw.max) {
        return [
            {
                value: rangeRaw.max,
                y: top + innerHeight / 2,
            },
        ];
    }

    const rangePretty = rangeRaw.toPretty();

    return Array.from({ length: props.tickCount }, (_, index) => {
        const ratio = index / (props.tickCount - 1);
        const value = rangePretty.max - ratio * rangePretty.length;
        const y = top + ratio * innerHeight;

        return { value, y };
    });
});

function formatValueTick(value: number): string {
    return formatNumber(value, locale.value);
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

.timeline-chart__track-text {
    position: absolute;
    top: 10px;
    left: 12px;
    right: 12px;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: calc(100% - 24px);
    pointer-events: none;
}

.timeline-chart__track-title {
    color: #d8deea;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
}

.timeline-chart__track-legend {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 4px 10px;
}

.timeline-chart__track-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}

.timeline-chart__track-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    flex: 0 0 auto;
}

.timeline-chart__track-legend-label {
    color: rgba(216, 222, 234, 0.8);
    font-size: 11px;
    line-height: 1.2;
    white-space: nowrap;
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

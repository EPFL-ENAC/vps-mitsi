<template>
    <section class="timestamp-slider" :style="sliderStyle">
        <div class="slider-track-wrap">
            <DecoratedTrack
                :start-timestamp="props.startTimestamp"
                :end-timestamp="props.endTimestamp"
                :dynamic-background="props.dynamicBackground"
                :height-px="TRACK_HEIGHT"
                :text-markers="decoratedTrackTextMarkers"
                :marker-min-edge-clearance-pct="props.markerMinEdgeClearancePct"
            />

            <div class="slider-badge" :style="badgeStyle">
                <div class="slider-badge-time">
                    {{ selectedTopLabel }}
                </div>
                <div class="slider-badge-date">
                    {{ selectedBottomLabel }}
                </div>
            </div>

            <input
                :value="sliderValue"
                :min="minTimestamp"
                :max="maxTimestamp"
                :step="stepSeconds"
                type="range"
                class="slider-input"
                @input="onInput"
            />
        </div>

        <div v-if="props.showTicks" class="slider-labels">
            <span v-for="tick in ticks" :key="tick.timestamp" class="slider-label">
                {{ tick.label }}
            </span>
        </div>

        <div v-if="props.infoText" class="slider-info-text">
            {{ t('sliderInfoText') }}
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import DecoratedTrack from 'src/components/DecoratedTrack.vue';
import type { TrackTextMarker } from 'src/components/DecoratedTrack.vue';
import { formatDateShort, formatTime } from 'src/utils/format';
import { clamp } from 'src/utils/math';
import { toUnixSeconds } from 'src/utils/datetime';

const { locale, t } = useI18n();

const props = withDefaults(
    defineProps<{
        startTimestamp: number;
        endTimestamp: number;
        stepSeconds?: number;
        tickCount?: number;
        dynamicBackground?: 'daynight' | 'seasons' | 'none';
        showTicks?: boolean;
        infoText?: boolean;
        textMarkers?: TrackTextMarker[];
        markerMinEdgeClearancePct?: number;
    }>(),
    {
        stepSeconds: 60,
        tickCount: 5,
        dynamicBackground: 'daynight',
        showTicks: true,
        infoText: true,
        textMarkers: () => [],
        markerMinEdgeClearancePct: 5,
    },
);

const model = defineModel<number>();

const BADGE_SIZE = 96;
const TRACK_HEIGHT = 60;
const MONTHS_PER_SEASON = 3;

const startSeconds = computed(() => {
    return toUnixSeconds(props.startTimestamp) ?? 0;
});

const endSeconds = computed(() => {
    return toUnixSeconds(props.endTimestamp) ?? 0;
});

const minTimestamp = computed(() => {
    return Math.min(startSeconds.value, endSeconds.value);
});

const maxTimestamp = computed(() => {
    return Math.max(startSeconds.value, endSeconds.value);
});

const normalizedTickCount = computed(() => {
    return Math.max(2, Math.round(props.tickCount));
});

function timestampToPercent(timestamp: number) {
    const range = maxTimestamp.value - minTimestamp.value;

    if (range <= 0) {
        return 100;
    }

    return clamp(((timestamp - minTimestamp.value) / range) * 100, 0, 100);
}

watchEffect(() => {
    if (model.value == null) {
        model.value = maxTimestamp.value;
        return;
    }

    model.value = clamp(Math.round(model.value), minTimestamp.value, maxTimestamp.value);
});

const sliderValue = computed(() => {
    return clamp(
        Math.round(model.value ?? maxTimestamp.value),
        minTimestamp.value,
        maxTimestamp.value,
    );
});

const thumbPercent = computed(() => {
    return timestampToPercent(sliderValue.value);
});

const selectedTopLabel = computed(() => {
    if (props.dynamicBackground === 'seasons') {
        return formatDateShort(sliderValue.value, locale.value);
    }
    return formatTime(sliderValue.value, locale.value);
});

const selectedBottomLabel = computed(() => {
    if (props.dynamicBackground === 'seasons') {
        return new Date(sliderValue.value * 1000).getFullYear();
    }

    return formatDateShort(sliderValue.value, locale.value);
});

const badgeStyle = computed(() => {
    return {
        left: `${thumbPercent.value}%`,
    };
});

const seasonalMonthMarkers = computed<TrackTextMarker[]>(() => {
    if (props.dynamicBackground !== 'seasons') {
        return [];
    }

    const start = Math.min(props.startTimestamp, props.endTimestamp);
    const end = Math.max(props.startTimestamp, props.endTimestamp);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
        return [];
    }

    const monthFormatter = new Intl.DateTimeFormat(locale.value, {
        month: 'short',
        timeZone: 'Europe/Zurich',
    });

    const cursor = new Date(start);
    cursor.setUTCDate(1);
    cursor.setUTCHours(0, 0, 0, 0);

    if (cursor.getTime() < start) {
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    const markers: TrackTextMarker[] = [];
    while (cursor.getTime() < end) {
        markers.push({
            timestamp: cursor.getTime(),
            text: monthFormatter.format(cursor),
        });

        cursor.setUTCMonth(cursor.getUTCMonth() + MONTHS_PER_SEASON);
    }

    return markers;
});

const decoratedTrackTextMarkers = computed(() => {
    return [...seasonalMonthMarkers.value, ...props.textMarkers];
});

const sliderStyle = computed(() => {
    return {
        '--badge-size': `${BADGE_SIZE}px`,
        '--track-height': `${TRACK_HEIGHT}px`,
    };
});

const ticks = computed(() => {
    if (!props.showTicks) {
        return [];
    }

    const count = normalizedTickCount.value;
    const range = maxTimestamp.value - minTimestamp.value;

    if (range <= 0) {
        return [
            {
                timestamp: minTimestamp.value,
                label: formatTime(minTimestamp.value, locale.value),
            },
        ];
    }

    return Array.from({ length: count }, (_, index) => {
        const ratio = count === 1 ? 0 : index / (count - 1);
        const timestamp = Math.round(minTimestamp.value + range * ratio);

        return {
            timestamp,
            label: formatTime(timestamp, locale.value),
        };
    });
});

function onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);

    model.value = clamp(Math.round(value), minTimestamp.value, maxTimestamp.value);
}
</script>

<style scoped>
.timestamp-slider {
    --vertical-padding: 1rem;
}

.slider-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    padding: 0 var(--vertical-padding);
}

.slider-label {
    font-size: 1rem;
    font-weight: 700;
    color: rgb(255 255 255 / 92%);
}

.slider-track-wrap {
    position: relative;
    padding: 1rem 0;
    overflow-x: visible;
    touch-action: pan-y;
    min-height: 6rem;
}

.slider-badge {
    position: absolute;
    top: calc((var(--track-height) - var(--badge-size)) / 2 + var(--vertical-padding));
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: var(--badge-size);
    height: var(--badge-size);
    border: 2px solid white;
    border-radius: 999px;
    background: #ff846d;
    box-shadow: 0 8px 24px rgb(0 0 0 / 25%);
    text-align: center;
    pointer-events: none;
    transform: translateX(-50%);
}

.slider-badge-time {
    font-size: 1.05rem;
    font-weight: 800;
    line-height: 1.05;
}

.slider-badge-date {
    margin-top: 0.25rem;
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1;
}

.slider-input {
    position: absolute;
    inset: 0;
    top: var(--vertical-padding);
    width: 100%;
    height: var(--track-height);
    margin: 0;
    background: transparent;
    appearance: none;
    cursor: pointer;
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
}

.slider-input::-webkit-slider-runnable-track {
    height: var(--track-height);
    background: transparent;
}

.slider-input::-webkit-slider-thumb {
    width: var(--badge-size);
    height: var(--badge-size);
    border: 0;
    border-radius: 999px;
    background: transparent;
    appearance: none;
}

.slider-input::-moz-range-track {
    height: var(--track-height);
    border: 0;
    border-radius: 999px;
    background: transparent;
}

.slider-input::-moz-range-thumb {
    width: var(--badge-size);
    height: var(--badge-size);
    border: 0;
    border-radius: 999px;
    background: transparent;
}

@media (max-width: 900px) {
    .slider-labels {
        padding: 0 0.5rem;
    }

    .slider-label {
        font-size: 0.9rem;
    }
}
</style>

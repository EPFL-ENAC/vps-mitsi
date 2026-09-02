<template>
    <div class="decorated-track" :style="trackStyle">
        <span
            v-for="marker in visibleTextMarkers"
            :key="`${marker.timestamp}-${marker.text}`"
            class="decorated-track-text-marker"
            :style="marker.style"
        >
            {{ marker.text }}
        </span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { SWITZERLAND_LATITUDE, SWITZERLAND_LONGITUDE } from 'src/utils/countries';
import { getDaynightCyclePeriodsBetween } from 'src/utils/daynightCycle';
import { daynightCyclePeriodsToBands } from 'src/utils/daynightCycleStyle';
import { BackgroundBuilder } from 'src/utils/backgroundBuilder';
import { getSeasonPeriodsBetween } from 'src/utils/seasonsCycle';
import { seasonPeriodsToBands } from 'src/utils/seasonsCycleStyle';
import { clamp } from 'src/utils/math';

export interface TrackTextMarker {
    timestamp: number;
    text: string;
}

const props = withDefaults(
    defineProps<{
        startTimestamp: number;
        endTimestamp: number;
        dynamicBackground?: 'daynight' | 'seasons' | 'none';
        heightPx?: number;
        textMarkers?: TrackTextMarker[];
        markerMinEdgeClearancePct?: number;
    }>(),
    {
        dynamicBackground: 'daynight',
        heightPx: 60,
        textMarkers: () => [],
        markerMinEdgeClearancePct: 5,
    },
);

function timestampToPercent(timestamp: number) {
    const range = props.endTimestamp - props.startTimestamp;

    if (range <= 0) {
        return 0;
    }

    return clamp(((timestamp - props.startTimestamp) / range) * 100, 0, 100);
}

const visibleTextMarkers = computed(() => {
    const minEdgeClearancePct = clamp(props.markerMinEdgeClearancePct, 0, 50);

    return props.textMarkers
        .filter((marker) => {
            const pct = timestampToPercent(marker.timestamp);

            return (
                Number.isFinite(marker.timestamp) &&
                marker.timestamp >= props.startTimestamp &&
                marker.timestamp <= props.endTimestamp &&
                marker.text.trim().length > 0 &&
                pct >= minEdgeClearancePct &&
                pct <= 100 - minEdgeClearancePct
            );
        })
        .map((marker) => {
            return {
                ...marker,
                style: {
                    left: `${timestampToPercent(marker.timestamp)}%`,
                },
            };
        });
});

const trackStyle = computed(() => {
    const baseStyle = {
        height: `${props.heightPx}px`,
    };

    if (props.dynamicBackground === 'none') {
        return {
            ...baseStyle,
            backgroundImage: `linear-gradient(to right, #0b1020 0%, #0b1020 100%)`,
        };
    }

    const backgroundBuilder = new BackgroundBuilder();

    if (props.dynamicBackground === 'seasons') {
        const periods = getSeasonPeriodsBetween(props.startTimestamp, props.endTimestamp, 'north');

        backgroundBuilder.addBand(seasonPeriodsToBands(periods));

        return {
            ...baseStyle,
            ...backgroundBuilder.toCSS(props.startTimestamp, props.endTimestamp, {
                iconSizePx: 0,
                minEdgeClearancePct: 5,
            }),
        };
    }

    const periods = getDaynightCyclePeriodsBetween(
        props.startTimestamp,
        props.endTimestamp,
        SWITZERLAND_LATITUDE,
        SWITZERLAND_LONGITUDE,
    );

    backgroundBuilder.addBand(daynightCyclePeriodsToBands(periods));

    return {
        ...baseStyle,
        ...backgroundBuilder.toCSS(props.startTimestamp, props.endTimestamp, {
            iconSizePx: 32,
            minEdgeClearancePct: 5,
        }),
    };
});
</script>

<style scoped>
.decorated-track {
    position: relative;
    border-radius: 999px;
    box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 12%),
        0 8px 24px rgb(0 0 0 / 18%);
}

.decorated-track-text-marker {
    position: absolute;
    top: 50%;
    z-index: 1;
    max-width: 9rem;
    padding: 0.15rem 0.45rem;
    color: black;
    opacity: 0.4;
    font-size: 0.8rem;
    font-weight: 800;
    line-height: 1.1;
    text-align: center;
    text-shadow: 0 1px 2px rgb(0 0 0 / 35%);
    white-space: nowrap;
    pointer-events: none;
    transform: translate(-50%, -50%);
}
</style>

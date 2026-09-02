<template>
    <div class="wind-speed-dial" :style="{ '--size': `${size}px`, '--font-scale': `${fontScale}` }">
        <svg
            class="dial-svg"
            viewBox="0 0 100 100"
            role="img"
            :aria-label="`Wind speed ${displayValue}`"
        >
            <path class="ring ring-bg" :d="backgroundArcPath" :stroke-width="BG_THICKNESS" />

            <path
                v-if="valueRatio > 0"
                class="ring ring-progress"
                :d="arcPath"
                :stroke="progressColor"
                :stroke-width="BG_THICKNESS * 0.66"
            />

            <circle class="inner-disc" cx="50" cy="50" :r="BG_RADIUS - BG_THICKNESS * 0.5" />

            <text class="dial-mark" x="10" y="85">{{ minValue }}</text>
            <text class="dial-mark" x="90" y="85">{{ maxValue }}</text>

            <text class="speed-value" x="50" :y="VALUE_Y">
                {{ displayValue }}
            </text>
            <text class="speed-unit" x="50" :y="UNIT_Y">
                {{ unit }}
            </text>
        </svg>
    </div>
</template>

<script setup lang="ts">
import { formatNumber } from 'src/utils/format';
import { ColorMap } from 'src/utils/colors';
import { describeArc } from 'src/utils/svg';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
    value?: number | undefined;
    size?: number;
    fontScale?: number;
    unit?: string;
    minValue?: number;
    maxValue?: number;
    colorMap?: ColorMap | null;
}

const props = withDefaults(defineProps<Props>(), {
    size: 120,
    fontScale: 1.25,
    unit: 'km/h',
    minValue: 0,
    maxValue: 50,
    colorMap: () => ColorMap.stylizedHeatHardStops(),
});

const { locale } = useI18n();

const CENTER = 50;
const BG_RADIUS = 45;
const BG_THICKNESS = 6;
const VALUE_Y = 50;
const UNIT_Y = 82;
const PROGRESS_RADIUS = BG_RADIUS;
const DEFAULT_PROGRESS_COLOR = '#5fe3ff';

/*
 Open-bottom gauge:
 - starts at lower-left
 - goes through top
 - ends at lower-right
*/
const START_ANGLE = 225;
const END_ANGLE = 495;

const clampedValue = computed(() => {
    return Math.max(props.minValue, Math.min(props.value ?? props.minValue, props.maxValue));
});

const displayValue = computed(() => {
    return formatNumber(props.value, locale.value);
});

const valueRatio = computed(() => {
    const range = props.maxValue - props.minValue;

    if (range <= 0) {
        return 0;
    }

    return (clampedValue.value - props.minValue) / range;
});

const progressColor = computed(() => {
    return props.colorMap?.toCss(valueRatio.value) ?? DEFAULT_PROGRESS_COLOR;
});

const backgroundArcPath = computed(() => {
    return describeArc(CENTER, CENTER, BG_RADIUS, START_ANGLE, END_ANGLE);
});

const arcPath = computed(() => {
    const angle = START_ANGLE + (END_ANGLE - START_ANGLE) * valueRatio.value;

    return describeArc(CENTER, CENTER, PROGRESS_RADIUS, START_ANGLE, angle);
});
</script>

<style scoped>
.wind-speed-dial {
    --size: 120px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: rgba(255, 255, 255, 0.92);
}

.dial-svg {
    width: var(--size);
    height: var(--size);
    display: block;
    flex: 0 0 auto;
}

.ring {
    fill: none;
    stroke-linecap: round;
}

.ring-bg {
    stroke: rgba(120, 232, 255, 0.24);
}

.ring-progress {
    filter: drop-shadow(0 0 4px rgba(95, 227, 255, 0.2));
}

.inner-disc {
    fill: rgba(95, 227, 255, 0.08);
}

.speed-value {
    fill: #ffffff;
    font-size: calc(var(--font-scale) * 1.75rem);
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: middle;
}

.speed-unit {
    fill: #5fe3ff;
    font-size: calc(var(--font-scale) * 0.6rem);
    font-weight: 600;
    text-anchor: middle;
    dominant-baseline: middle;
    letter-spacing: 0.08em;
}

.dial-mark {
    fill: rgba(255, 255, 255, 0.55);
    font-size: 6px;
    font-weight: 600;
    text-anchor: middle;
    dominant-baseline: middle;
}

.dial-mark-top {
    fill: rgba(255, 255, 255, 0.7);
}
</style>

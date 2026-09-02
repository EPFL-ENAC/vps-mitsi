<template>
    <div
        class="wave-height-gauge"
        :style="{ '--size': `${size}px`, '--font-scale': `${fontScale}` }"
    >
        <svg
            class="wave-svg"
            viewBox="0 0 100 100"
            role="img"
            :aria-label="`Wave height ${displayValue} ${unit}`"
        >
            <defs>
                <clipPath id="wave-basin-clip">
                    <path :d="basinContent" />
                </clipPath>
            </defs>

            <path class="basin-outline" :d="basinPath" :stroke-width="BASIN_OUTLINE_WIDTH" />

            <g clip-path="url(#wave-basin-clip)">
                <rect
                    class="water-body"
                    :x="BASIN_LEFT"
                    :y="waterTop"
                    :width="BASIN_WIDTH"
                    :height="BASIN_BOTTOM - waterTop"
                    :fill="progressColor"
                    opacity="0.22"
                />

                <path class="wave-back" :d="waveBackPath" :fill="progressColor" opacity="0.28" />

                <path class="wave-front" :d="waveFrontPath" :fill="progressColor" opacity="0.6" />

                <circle cx="50" :cy="UNIT_Y + 2" :r="fontScale * 12" fill="rgb(7, 50, 58)" />

                <text class="wave-value" x="50" :y="VALUE_Y">
                    {{ displayValue }}
                </text>

                <text class="wave-unit" x="50" :y="UNIT_Y">
                    {{ unit }}
                </text>
            </g>
        </svg>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatNumber } from 'src/utils/format';
import { ColorMap } from 'src/utils/colors';

interface Props {
    value?: number | undefined;
    size?: number;
    fontScale?: number;
    unit?: string;
    minValue?: number;
    maxValue?: number;
    colorMap?: ColorMap | null;
    topMargin?: number;
    bottomMargin?: number;
}

const props = withDefaults(defineProps<Props>(), {
    size: 120,
    fontScale: 1.25,
    unit: 'cm',
    minValue: 0,
    maxValue: 25,
    colorMap: () => ColorMap.stylizedHeatHardStops(),
    topMargin: 10,
    bottomMargin: 20,
});

const { locale } = useI18n();

const DEFAULT_PROGRESS_COLOR = '#5fe3ff';
const SCALE = 5 / 7;

/*
 Layout normalized to 100x100
 Original design was 140x140, scaled by 5/7
*/
const CX = 50;
const CY = 50;
const BASIN_RX = 45;
const BASIN_RY = 45;

const BASIN_OUTLINE_WIDTH = 6;

const BASIN_LEFT = CX - BASIN_RX;
const BASIN_RIGHT = CX + BASIN_RX;
const BASIN_TOP = CY - BASIN_RY;
const BASIN_BOTTOM = CY + BASIN_RY;
const BASIN_WIDTH = BASIN_RIGHT - BASIN_LEFT;

const VALUE_Y = 48;
const UNIT_Y = 82;

const clampedValue = computed(() => {
    return Math.max(props.minValue, Math.min(props.value ?? props.minValue, props.maxValue));
});

const valueRatio = computed(() => {
    const range = props.maxValue - props.minValue;

    if (range <= 0) {
        return 0;
    }

    return (clampedValue.value - props.minValue) / range;
});

const displayValue = computed(() => {
    return formatNumber(props.value, locale.value);
});

const progressColor = computed(() => {
    return props.colorMap?.toCss(valueRatio.value) ?? DEFAULT_PROGRESS_COLOR;
});

const effectiveTopMargin = computed(() => {
    return Math.max(0, props.topMargin) * SCALE;
});

const effectiveBottomMargin = computed(() => {
    return Math.max(0, props.bottomMargin) * SCALE;
});

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
    return [
        `M ${cx} ${cy - ry}`,
        `A ${rx} ${ry} 0 1 1 ${cx} ${cy + ry}`,
        `A ${rx} ${ry} 0 1 1 ${cx} ${cy - ry}`,
        'Z',
    ].join(' ');
}

function buildWavePath(
    left: number,
    right: number,
    baseY: number,
    amplitude: number,
    phaseOffset = 0,
): string {
    const width = right - left;
    const q1x = left + width * 0.25;
    const q2x = left + width * 0.5;
    const q3x = left + width * 0.75;

    const crest = baseY - amplitude;
    const trough = baseY + amplitude;

    return [
        `M ${left} ${baseY}`,
        `Q ${left + width * 0.125} ${phaseOffset % 2 === 0 ? crest : trough} ${q1x} ${baseY}`,
        `Q ${left + width * 0.375} ${phaseOffset % 2 === 0 ? trough : crest} ${q2x} ${baseY}`,
        `Q ${left + width * 0.625} ${phaseOffset % 2 === 0 ? crest : trough} ${q3x} ${baseY}`,
        `Q ${left + width * 0.875} ${phaseOffset % 2 === 0 ? trough : crest} ${right} ${baseY}`,
        `L ${right} ${BASIN_BOTTOM}`,
        `L ${left} ${BASIN_BOTTOM}`,
        'Z',
    ].join(' ');
}

const basinPath = computed(() => {
    return ellipsePath(CX, CY, BASIN_RX, BASIN_RY);
});

const basinContent = computed(() => {
    return ellipsePath(
        CX,
        CY,
        BASIN_RX - BASIN_OUTLINE_WIDTH * 0.5,
        BASIN_RY - BASIN_OUTLINE_WIDTH * 0.5,
    );
});

const waterTop = computed(() => {
    const minY = BASIN_TOP + effectiveTopMargin.value;
    const maxY = BASIN_BOTTOM - effectiveBottomMargin.value;
    const usableHeight = Math.max(0, maxY - minY);

    return maxY - usableHeight * valueRatio.value;
});

const waveBackPath = computed(() => {
    const y = waterTop.value + 4 * SCALE;
    return buildWavePath(BASIN_LEFT, BASIN_RIGHT, y, 4 * SCALE, 0);
});

const waveFrontPath = computed(() => {
    const y = waterTop.value;
    return buildWavePath(BASIN_LEFT, BASIN_RIGHT, y, 6 * SCALE, 1);
});
</script>

<style scoped>
.wave-height-gauge {
    --size: 120px;
    --font-scale: 1.25;
    display: inline-flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.92);
}

.wave-svg {
    width: var(--size);
    height: var(--size);
    display: block;
    flex: 0 0 auto;
}

.basin-outline {
    fill: rgba(95, 227, 255, 0.05);
    stroke: rgba(120, 232, 255, 0.28);
}

.water-body {
    filter: drop-shadow(0 0 6px rgba(95, 227, 255, 0.16));
}

.wave-back {
    filter: drop-shadow(0 0 4px rgba(95, 227, 255, 0.12));
}

.wave-front {
    filter: drop-shadow(0 0 6px rgba(95, 227, 255, 0.2));
}

.wave-value {
    fill: #ffffff;
    font-size: calc(var(--font-scale) * 1.75rem);
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: middle;
}

.wave-unit {
    fill: #5fe3ff;
    font-size: calc(var(--font-scale) * 0.6rem);
    font-weight: 600;
    text-anchor: middle;
    dominant-baseline: middle;
    letter-spacing: 0.08em;
}
</style>

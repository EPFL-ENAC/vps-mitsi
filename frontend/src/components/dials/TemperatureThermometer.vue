<template>
    <div
        class="temperature-thermometer"
        :style="{ '--size': `${size}px`, '--font-scale': `${fontScale}` }"
    >
        <svg
            class="thermo-svg"
            viewBox="0 0 100 100"
            role="img"
            :aria-label="`Temperature ${displayValue} ${unit}`"
        >
            <g>
                <path class="liquid-fill" :d="innerShapePath" :fill="progressColor" />
            </g>

            <path class="thermo-body-outline" :d="outerShapePath" />

            <text ref="valueTextRef" class="temp-value" :x="VALUE_X" :y="VALUE_Y">
                {{ displayValue }}
            </text>

            <text class="temp-unit" :x="unitX" :y="unitY">
                {{ unit }}
            </text>
        </svg>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
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
    label?: string;
    colorMap?: ColorMap | null;
    unitPlacement?: 'below' | 'right';
}

const props = withDefaults(defineProps<Props>(), {
    size: 140,
    fontScale: 1.25,
    unit: '°C',
    minValue: -10,
    maxValue: 30,
    label: '',
    colorMap: () => ColorMap.stylizedHeatHardStops(),
    unitPlacement: 'below',
});

const { locale } = useI18n();

const DEFAULT_PROGRESS_COLOR = '#f0bf35';

/*
 Layout normalized to 100x100
 Original design was 140x140, scaled by 5/7
*/
const CX = 18;
const TUBE_OUTER_WIDTH = 15;
const TUBE_INNER_WIDTH = TUBE_OUTER_WIDTH * 0.6;

const OUTER_TOP_Y = 2;
const OUTER_BULB_R = 15;
const OUTER_BULB_CY = 82;

const INNER_TOP_Y = 5;
const INNER_BULB_R = 12;
const INNER_BULB_CY = 82;

const INNER_BOTTOM = INNER_BULB_CY - INNER_BULB_R - 8;

const VALUE_X = 31;
const VALUE_Y = 50;
const UNIT_BELOW_Y = VALUE_Y + 18;
const UNIT_RIGHT_GAP = 4;

const valueTextRef = ref<SVGTextElement | null>(null);
const valueTextWidth = ref(0);

const clampedValue = computed(() => {
    return Math.max(props.minValue, Math.min(props.value ?? props.minValue, props.maxValue));
});

const range = computed(() => {
    return props.maxValue - props.minValue;
});

const valueRatio = computed(() => {
    if (range.value <= 0) {
        return 0;
    }

    return (clampedValue.value - props.minValue) / range.value;
});

const displayValue = computed(() => {
    return formatNumber(props.value, locale.value);
});

const progressColor = computed(() => {
    return props.colorMap?.toCss(valueRatio.value) ?? DEFAULT_PROGRESS_COLOR;
});

function buildThermometerPath(
    centerX: number,
    tubeWidth: number,
    topY: number,
    bulbCy: number,
    bulbR: number,
): string {
    const left = centerX - tubeWidth / 2;
    const right = centerX + tubeWidth / 2;
    const topRadius = tubeWidth / 2;
    const halfTube = tubeWidth / 2;
    const joinY = bulbCy - Math.sqrt(bulbR * bulbR - halfTube * halfTube);

    return [
        `M ${left} ${joinY}`,
        `L ${left} ${topY + topRadius}`,
        `A ${topRadius} ${topRadius} 0 0 1 ${right} ${topY + topRadius}`,
        `L ${right} ${joinY}`,
        `A ${bulbR} ${bulbR} 0 1 1 ${left} ${joinY}`,
        'Z',
    ].join(' ');
}

const outerShapePath = computed(() => {
    return buildThermometerPath(CX, TUBE_OUTER_WIDTH, OUTER_TOP_Y, OUTER_BULB_CY, OUTER_BULB_R);
});

const innerShapePath = computed(() => {
    const tubeRange = INNER_BOTTOM - INNER_TOP_Y;
    const progress = tubeRange * (1 - valueRatio.value);

    return buildThermometerPath(
        CX,
        TUBE_INNER_WIDTH,
        progress + INNER_TOP_Y,
        INNER_BULB_CY,
        INNER_BULB_R,
    );
});

async function updateValueTextWidth() {
    await nextTick();

    if (!valueTextRef.value) {
        valueTextWidth.value = 0;
        return;
    }

    valueTextWidth.value = valueTextRef.value.getBBox().width;
}

const unitX = computed(() => {
    if (props.unitPlacement === 'right') {
        return VALUE_X + valueTextWidth.value + UNIT_RIGHT_GAP;
    }

    return VALUE_X;
});

const unitY = computed(() => {
    if (props.unitPlacement === 'right') {
        return VALUE_Y;
    }

    return UNIT_BELOW_Y;
});

watch(
    () => [displayValue.value, props.fontScale, props.unitPlacement],
    () => {
        void updateValueTextWidth();
    },
    { immediate: true },
);

onMounted(() => {
    void updateValueTextWidth();
});
</script>

<style scoped>
.temperature-thermometer {
    --size: 140px;
    --font-scale: 1.25;
    display: inline-flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.92);
}

.thermo-svg {
    width: var(--size);
    height: var(--size);
    display: block;
    flex: 0 0 auto;
}

.thermo-label {
    fill: rgba(255, 255, 255, 0.72);
    font-size: 7px;
    font-weight: 700;
    text-anchor: start;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.thermo-body-bg {
    fill: rgba(95, 227, 255, 0.08);
}

.thermo-body-outline {
    fill: none;
    stroke: rgba(120, 232, 255, 0.28);
    stroke-width: 2.8571428571;
    stroke-linejoin: round;
    stroke-linecap: round;
}

.liquid-fill {
    filter: drop-shadow(0 0 6px rgba(240, 191, 53, 0.18));
}

.temp-value {
    fill: #ffffff;
    font-size: calc(var(--font-scale) * 1.75rem);
    font-weight: 700;
    text-anchor: start;
    dominant-baseline: middle;
}

.temp-unit {
    fill: #5fe3ff;
    font-size: calc(var(--font-scale) * 0.6rem);
    font-weight: 600;
    text-anchor: start;
    dominant-baseline: middle;
    letter-spacing: 0.08em;
}
</style>

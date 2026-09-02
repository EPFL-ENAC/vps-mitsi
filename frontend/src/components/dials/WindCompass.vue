<template>
    <div class="wind-compact" :style="{ '--size': `${size}px` }">
        <svg
            class="wind-svg"
            viewBox="0 0 100 100"
            role="img"
            :aria-label="`Wind ${cardinalLabel}`"
        >
            <path class="ring ring-main" :d="quarterRing(0)" />
            <path class="ring ring-main" :d="quarterRing(1)" />
            <path class="ring ring-main" :d="quarterRing(2)" />
            <path class="ring ring-main" :d="quarterRing(3)" />

            <text class="label label-n" :x="labelPositions.n.x" :y="labelPositions.n.y">N</text>
            <text class="label" :x="labelPositions.e.x" :y="labelPositions.e.y">E</text>
            <text class="label" :x="labelPositions.s.x" :y="labelPositions.s.y">S</text>
            <text class="label" :x="labelPositions.w.x" :y="labelPositions.w.y">W</text>

            <g
                v-if="props.windDirectionDeg !== undefined"
                :transform="`rotate(${normalizedDeg} 50 50)`"
            >
                <path class="wind-triangle" :d="trianglePath" />
            </g>

            <circle class="center-dot" cx="50" cy="50" r="2" />
        </svg>
    </div>
</template>

<script setup lang="ts">
import { describeArc, polarToCartesian } from 'src/utils/svg';
import { computed } from 'vue';

interface Props {
    windDirectionDeg?: number | undefined;
    size?: number;
}

const props = withDefaults(defineProps<Props>(), {
    size: 96,
});

const CENTER = 50;
const RING_DEMI_RADIUS = 45;
const LABEL_RADIUS = RING_DEMI_RADIUS;

function quarterRing(multiplier: number) {
    const factor = 0.8;

    const startAngle = 90 * (multiplier + (1 - factor) / 2);
    const endAngle = 90 * (multiplier + 1 + (factor - 1) / 2);

    return describeArc(CENTER, CENTER, RING_DEMI_RADIUS, startAngle, endAngle);
}

const normalizedDeg = computed(() => {
    const deg = (props.windDirectionDeg ?? 0) % 360;
    return deg < 0 ? deg + 360 : deg;
});

const cardinalLabel = computed(() => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(normalizedDeg.value / 45) % 8;
    return dirs[index];
});
const labelPositions = computed(() => ({
    n: polarToCartesian(CENTER, CENTER, LABEL_RADIUS, 0),
    e: polarToCartesian(CENTER, CENTER, LABEL_RADIUS, 90),
    s: polarToCartesian(CENTER, CENTER, LABEL_RADIUS, 180),
    w: polarToCartesian(CENTER, CENTER, LABEL_RADIUS, 270),
}));

/**
 * Triangle is centered at the compass midpoint.
 * Height grows from 50% to 80% of the ring radius by default.
 */

const trianglePath = computed(() => {
    const h = 50;
    const halfW = 15;

    const topY = CENTER - (2 * h) / 3;
    const bottomY = CENTER + h / 3;
    const leftX = CENTER - halfW;
    const rightX = CENTER + halfW;

    return [`M ${CENTER} ${topY}`, `L ${leftX} ${bottomY}`, `L ${rightX} ${bottomY}`, 'Z'].join(
        ' ',
    );
});
</script>

<style scoped>
.wind-compact {
    --size: 44px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.92);
}

.wind-svg {
    width: var(--size);
    height: var(--size);
    display: block;
    flex: 0 0 auto;
}

.ring {
    fill: none;
}

.ring-main {
    stroke: rgba(120, 232, 255, 0.34);
    stroke-width: 1.4;
}

.label {
    fill: rgba(255, 255, 255, 0.7);
    font-size: 7px;
    font-weight: 600;
    text-anchor: middle;
    dominant-baseline: middle;
    letter-spacing: 0.08em;
}

.label-n {
    fill: #5fe3ff;
}

.wind-triangle {
    fill: #5fe3ff;
    opacity: 0.95;
    transition: d 240ms ease;
}

.center-dot {
    fill: #d8fbff;
    opacity: 0.9;
}

.wind-meta {
    display: flex;
    flex-direction: column;
    line-height: 1.05;
    min-width: 0;
}

.wind-dir {
    font-size: 12px;
    font-weight: 700;
    color: #ffffff;
}

.wind-speed {
    font-size: 11px;
    color: #5fe3ff;
    white-space: nowrap;
}
</style>

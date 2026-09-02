<template>
    <section
        class="water-depth-plot"
        :style="{
            '--depth-plot-axis-x': `${depthAxisX}px`,
            '--water-deep-stop': `${deepStopPercent}%`,
        }"
    >
        <div class="water-depth-plot__inner">
            <div class="water-depth-plot__water-surface" :style="{ top: `${surfaceTopPercent}%` }">
                <div class="water-depth-plot__water-wave">
                    <SurfaceWaves />
                </div>
            </div>

            <div class="water-depth-plot__plot" :style="{ minHeight }">
                <div class="water-depth-plot__axis" />

                <div
                    v-for="row in positionedRows"
                    :key="row.key"
                    class="water-depth-plot__row"
                    :style="{ top: row.top }"
                >
                    <div class="water-depth-plot__label">
                        <slot name="label" :row="row">
                            {{ row.label }}
                        </slot>
                    </div>

                    <div v-if="$slots.value" class="water-depth-plot__value">
                        <slot name="value" :row="row" />
                    </div>
                </div>

                <slot name="overlay" :surface-top-percent="surfaceTopPercent" />
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SurfaceWaves from './SurfaceWaves.vue';

export type DepthPlotRow = {
    key?: string | number;
    label: string;
    depth: number;
    value?: number;
    [key: string]: unknown;
};

const props = withDefaults(
    defineProps<{
        rows: DepthPlotRow[];
        marginTop?: number;
        marginBottom?: number;
        depthAxisX?: number;
        minHeight?: string;
        deepStopDepth?: number;
    }>(),
    {
        marginTop: 5,
        marginBottom: 5,
        depthAxisX: 132,
        minHeight: '90rem',
        deepStopDepth: 20,
    },
);

const minDepth = computed(() => {
    if (props.rows.length === 0) {
        return 0;
    }

    return Math.min(...props.rows.map((row) => row.depth));
});

const maxDepth = computed(() => {
    if (props.rows.length === 0) {
        return 0;
    }

    return Math.max(...props.rows.map((row) => row.depth));
});

const minDepthWithMargin = computed(() => minDepth.value - props.marginTop);
const maxDepthWithMargin = computed(() => maxDepth.value + props.marginBottom);

const depthRangeWithMargin = computed(() => {
    return Math.max(1, maxDepthWithMargin.value - minDepthWithMargin.value);
});

const surfaceTopPercent = computed(() => {
    return ((0 - minDepthWithMargin.value) / depthRangeWithMargin.value) * 100;
});

const deepStopPercent = computed(() => {
    const ratio = (props.deepStopDepth - minDepthWithMargin.value) / depthRangeWithMargin.value;

    return Math.min(100, Math.max(0, ratio * 100));
});

const positionedRows = computed(() => {
    return props.rows.map((row, index) => {
        const ratio = (row.depth - minDepthWithMargin.value) / depthRangeWithMargin.value;

        return {
            ...row,
            key: row.key ?? row.label ?? index,
            top: `${ratio * 100}%`,
        };
    });
});
</script>

<style scoped>
.water-depth-plot {
    padding: 24px 20px;
}

.water-depth-plot__inner {
    position: relative;
    overflow: hidden;
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 28px;
    background:
        linear-gradient(180deg, rgb(255 255 255 / 8%) 0%, rgb(255 255 255 / 4%) 100%),
        linear-gradient(180deg, rgb(0 34 40 / 92%) 0%, rgb(0 22 26 / 98%) 100%);
    backdrop-filter: blur(10px);
}

.water-depth-plot__water-surface {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
        180deg,
        rgb(120 220 255 / 30%) 0%,
        hsla(194, 74%, 25%, 0.22) var(--water-deep-stop),
        hsla(201, 86%, 5%, 0.22) 100%
    );
    pointer-events: none;
}

.water-depth-plot__water-wave {
    position: absolute;
    top: -36px;
    left: 0;
    width: 200%;
    height: 36px;
    color: rgb(120 220 255 / 30%);
    opacity: 0.95;
    filter: drop-shadow(0 -1px 0 rgb(255 255 255 / 14%));
    animation: water-depth-plot-wave 9s linear infinite;
}

.water-depth-plot__plot {
    position: relative;
    padding: 28px;
    z-index: 1;
}

.water-depth-plot__axis {
    position: absolute;
    top: 20px;
    bottom: 20px;
    left: var(--depth-plot-axis-x);
    width: 6px;
    border-radius: 999px;
    background: rgb(0 0 0 / 80%);
    box-shadow:
        0 0 0 1px rgb(255 255 255 / 6%),
        0 0 20px rgb(0 0 0 / 20%);
}

.water-depth-plot__row {
    display: flex;
    align-items: center;
    position: absolute;
    left: 0;
    right: 0;
    transform: translateY(-50%);
    min-height: 24px;
}

.water-depth-plot__label {
    width: var(--depth-plot-axis-x);
    padding: 0 1rem;
    color: rgb(255 255 255 / 88%);
    font-size: 1.5rem;
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.01em;
    text-align: right;
}

.water-depth-plot__value {
    margin-left: 5rem;
    display: flex;
    align-items: center;
    min-width: 0;
}

@keyframes water-depth-plot-wave {
    from {
        transform: translateX(0);
    }

    to {
        transform: translateX(-50%);
    }
}

@media (max-width: 700px) {
    .water-depth-plot {
        padding: 16px;
    }

    .water-depth-plot__plot {
        min-height: 520px !important;
        padding: 24px 20px;
    }

    .water-depth-plot__axis {
        left: 104px;
    }

    .water-depth-plot__label {
        width: 72px;
        font-size: 1.15rem;
    }

    .water-depth-plot__value {
        margin-left: 3rem;
    }

    .water-depth-plot__water-wave {
        top: -26px;
        height: 42px;
    }
}
</style>

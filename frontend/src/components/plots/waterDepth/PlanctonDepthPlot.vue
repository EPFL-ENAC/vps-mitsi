<template>
    <WaterDepthShell
        :rows="rows"
        :margin-top="marginTop"
        :margin-bottom="marginBottom"
        :depth-axis-x="depthAxisX"
    >
        <template #overlay>
            <div class="plankton" :style="{ top: `${planctonTopPercent}%` }">
                <ImageSwarm
                    src="/zooplankton.svg"
                    :count="30"
                    :spread-x="250"
                    :spread-y="planctonSpreadY"
                    distribution="ellipse"
                    :rotation-range="20"
                />
            </div>
        </template>
    </WaterDepthShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import WaterDepthShell from './utils/WaterDepthShell.vue';
import ImageSwarm from './utils/ImageSwarm.vue';
import { clamp } from 'src/utils/math.js';

const props = withDefaults(
    defineProps<{
        planctonDepth: number;
        maxPlotDepth: number;
        marginTop?: number;
        marginBottom?: number;
        depthAxisX?: number;
        minDisplayedDepth?: number;
        maxDisplayedDepth?: number;
    }>(),
    {
        minDisplayedDepth: 2,
        maxDisplayedDepth: 60,
        marginTop: 10,
        marginBottom: 5,
        depthAxisX: 132,
    },
);

const rows = computed(() => {
    const depthFactors = [0, 0.25, 0.5, 0.75, 1];

    return depthFactors.map((factor) => {
        const depth = props.maxPlotDepth * factor;

        return {
            key: depth,
            label: `${depth.toFixed(0)} m`,
            depth,
        };
    });
});

const totalRange = computed(() => props.maxPlotDepth + props.marginTop + props.marginBottom);

const clampedDepth = computed(() =>
    clamp(
        props.planctonDepth,
        props.minDisplayedDepth,
        props.maxDisplayedDepth ?? props.maxPlotDepth,
    ),
);

const planctonTopPercent = computed(() => {
    const totalDepth = clampedDepth.value + props.marginTop;
    return (totalDepth / totalRange.value) * 100;
});

const planctonSpreadY = computed(() => {
    return clampedDepth.value * 4;
});
</script>

<style scoped>
.plankton {
    position: absolute;
    left: 50%;
    filter: drop-shadow(0 0 4px rgb(255 255 255 / 20%));
}
</style>

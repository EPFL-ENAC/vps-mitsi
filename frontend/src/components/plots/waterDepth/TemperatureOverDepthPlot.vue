<template>
    <WatherDepthShell
        :rows="rows"
        :margin-top="marginTop"
        :margin-bottom="marginBottom"
        :depth-axis-x="depthAxisX"
    >
        <template #value="{ row }">
            <div v-if="row.value !== undefined" class="temperature-plot__value">
                <TemperatureThermometer
                    :value="row.value"
                    :font-scale="0"
                    :size="64"
                    :min-value="props.colorMapTemperatureStart"
                    :max-value="props.colorMapTemperatureEnd"
                    :color-map="props.colorMap"
                    unit="°C"
                />
                {{ formatTemperature(row.value) }}
            </div>
        </template>
    </WatherDepthShell>
</template>

<script setup lang="ts">
import { ColorMap } from 'src/utils/colors';
import WatherDepthShell from './utils/WaterDepthShell.vue';
import TemperatureThermometer from 'src/components/dials/TemperatureThermometer.vue';

export type TemperatureRow = {
    label: string;
    value: number;
    depth: number;
};

const props = withDefaults(
    defineProps<{
        rows: TemperatureRow[];
        colorMapTemperatureStart?: number;
        colorMapTemperatureEnd?: number;
        colorMap?: ColorMap;
        marginTop?: number;
        marginBottom?: number;
        depthAxisX?: number;
    }>(),
    {
        colorMapTemperatureStart: 0,
        colorMapTemperatureEnd: 25,
        colorMap: () => ColorMap.stylizedHeatHardStops(),
        marginTop: 5,
        marginBottom: 5,
        depthAxisX: 132,
    },
);

function formatTemperature(value: number): string {
    return `${value.toFixed(1)}°C`;
}
</script>

<style scoped>
.temperature-plot__value {
    display: flex;
    align-items: center;
    font-size: 1.9rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.01em;
    gap: 0.5rem;
}

@media (max-width: 700px) {
    .temperature-plot__value {
        font-size: 1.35rem;
    }
}
</style>

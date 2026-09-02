<template>
    <WaterDepthShell
        :rows="rows"
        :margin-top="marginTop"
        :margin-bottom="marginBottom"
        :depth-axis-x="depthAxisX"
    >
        <template #value="{ row }">
            <div v-if="row.value !== undefined" class="chlorophyll-plot__value">
                <div class="chlorophyll-plot__value-number">
                    {{ formatChlorophyll(row.value) }}
                </div>

                <ChlorophyllDots
                    :value="row.value"
                    :min="props.valueStart"
                    :max="props.valueEnd"
                    :dot-count="18"
                />
            </div>
        </template>
    </WaterDepthShell>
</template>

<script setup lang="ts">
import WaterDepthShell from './utils/WaterDepthShell.vue';
import ChlorophyllDots from './utils/ChlorophyllDots.vue';

export type ChlorophyllRow = {
    label: string;
    value: number;
    depth: number;
};

const props = withDefaults(
    defineProps<{
        rows: ChlorophyllRow[];
        valueStart?: number;
        valueEnd?: number;
        marginTop?: number;
        marginBottom?: number;
        depthAxisX?: number;
        unit?: string;
    }>(),
    {
        valueStart: 0,
        valueEnd: 25,
        marginTop: 10,
        marginBottom: 5,
        depthAxisX: 132,
        unit: 'mg/m³',
    },
);

function formatChlorophyll(value: number): string {
    return `${value.toFixed(1)} ${props.unit}`;
}
</script>

<style scoped>
.chlorophyll-plot__value {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.01em;
}

.chlorophyll-plot__value-number {
    min-width: 5.5rem;
    color: rgb(235 255 240 / 95%);
    white-space: nowrap;
}

@media (max-width: 700px) {
    .chlorophyll-plot__value {
        gap: 0.75rem;
        font-size: 1rem;
    }

    .chlorophyll-plot__value-number {
        min-width: 6.5rem;
    }
}
</style>

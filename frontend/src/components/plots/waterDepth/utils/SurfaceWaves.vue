<template>
    <svg class="water-wave" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
        <path :d="pathData" />
    </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
    crest?: number;
    trough?: number;
    baseline?: number;
}

const props = withDefaults(defineProps<Props>(), {
    crest: 25,
    trough: 25,
    baseline: 80,
});

const pathData = computed(() => {
    const y = props.baseline;
    const crestY = y - props.crest;
    const troughY = y + props.trough;

    return `
        M0,${y}
        C100,${crestY} 200,${crestY} 300,${y}
        C400,${troughY} 500,${troughY} 600,${y}
        C700,${crestY} 800,${crestY} 900,${y}
        C1000,${troughY} 1100,${troughY} 1200,${y}
        L1200,120
        L0,120
        Z
    `.trim();
});
</script>

<style scoped>
.water-wave {
    display: block;
    width: 100%;
    height: 100%;
}

.water-wave path {
    fill: currentColor;
}
</style>

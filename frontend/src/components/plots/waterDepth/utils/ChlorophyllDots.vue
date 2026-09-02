<template>
    <div
        class="chlorophyll-dots"
        :aria-label="`Chlorophyll intensity: ${activeDots} of ${dotCount}`"
    >
        <img
            v-for="index in dotCount"
            :key="index"
            class="chlorophyll-dots__dot"
            :src="index <= activeDots ? '/phytoplancton.png' : '/phytoplancton_disabled.png'"
            :class="{ 'chlorophyll-dots__dot--active': index <= activeDots }"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
    defineProps<{
        value: number;
        min?: number;
        max?: number;
        dotCount?: number;
    }>(),
    {
        min: 0,
        max: 25,
        dotCount: 25,
    },
);

const normalized = computed(() => {
    const range = props.max - props.min;

    if (range <= 0) {
        return 0;
    }

    const t = (props.value - props.min) / range;
    return Math.max(0, Math.min(1, t));
});

const activeDots = computed(() => {
    return Math.round(normalized.value * props.dotCount);
});
</script>

<style scoped>
.chlorophyll-dots {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
}

.chlorophyll-dots__dot {
    width: 2rem;
    height: 2rem;
    object-fit: contain;
    transition:
        transform 180ms ease,
        opacity 180ms ease;
    opacity: 0.6;
}
.chlorophyll-dots__dot--active {
    opacity: 1;
    transform: scale(1.05);
}

/* 
.chlorophyll-dots__dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 999px;
    background: rgb(120 150 120 / 20%);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 8%);
    transition:
        background-color 180ms ease,
        box-shadow 180ms ease,
        transform 180ms ease,
        opacity 180ms ease;
    opacity: 0.45;
}

.chlorophyll-dots__dot--active {
    background: radial-gradient(
        circle at 35% 35%,
        rgb(208 255 190) 0%,
        rgb(110 220 105) 45%,
        rgb(42 160 78) 100%
    );
    box-shadow:
        0 0 10px rgb(90 220 120 / 35%),
        inset 0 0 0 1px rgb(255 255 255 / 18%);
    opacity: 1;
    transform: scale(1.05);
} */
</style>

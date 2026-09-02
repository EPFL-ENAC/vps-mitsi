<template>
    <header :style="{ '--title-scale': titleScale }">
        <div class="eyebrow" :class="props.eyebrowClass">
            {{ props.eyebrow }}
        </div>
        <h1 class="hero-title">
            <slot />
        </h1>
        <p class="hero-subtitle text-grey-5">
            <slot name="subtitle" />
        </p>
    </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
    defineProps<{
        eyebrow: string;
        eyebrowClass?: string;
        level: 1 | 2;
    }>(),
    {
        eyebrowClass: 'text-primary',
    },
);

const titleScale = computed(() => (props.level === 1 ? 1 : 0.8));
</script>

<style scoped>
.eyebrow {
    margin-bottom: 18px;
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: 0.08em;
}

.hero-title {
    margin: 0;
    max-width: 1200px;
    font-size: calc(var(--title-scale, 1) * clamp(3rem, 7vw, 5.4rem));
    line-height: 1;
    font-weight: 800;
    letter-spacing: -0.04em;
}

.hero-subtitle {
    max-width: 660px;
    margin: 26px 0 52px;
    font-size: 1.45rem;
    line-height: 1.35;
    font-weight: 400;
}

@media (max-width: 640px) {
    .hero-subtitle {
        margin: 20px 0 36px;
        font-size: 1.1rem;
    }
}
</style>

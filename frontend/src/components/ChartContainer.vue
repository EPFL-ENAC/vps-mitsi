<template>
    <section
        class="chart-stage"
        :class="{ 'chart-stage--borderless': props.borderless }"
        :style="props.style"
    >
        <div class="chart-stage__glow" />

        <div class="chart-card">
            <slot />

            <div v-if="props.isLoading" class="chart-card__loader">
                {{ props.loadingText }}
            </div>

            <div
                v-if="props.legendItems && props.legendItems.length > 0"
                class="chart-card__legend"
            >
                <div
                    v-for="track in props.legendItems"
                    :key="track.title"
                    class="chart-card__legend-item"
                >
                    <span
                        class="chart-card__legend-dot"
                        :style="{ backgroundColor: track.color }"
                    />
                    <span>{{ track.title }}</span>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
interface LegendItem {
    title: string;
    color: string;
}

const props = defineProps<{
    legendItems?: LegendItem[];
    borderless?: boolean;
    isLoading?: boolean;
    loadingText?: string;
    style?: Record<string, string>;
}>();
</script>

<style scoped>
.chart-stage {
    position: relative;
    margin-top: 8px;
}

.chart-stage__glow {
    position: absolute;
    inset: -24px -8px auto -8px;
    height: 240px;
    background: radial-gradient(
        ellipse at center,
        rgba(18, 201, 220, 0.18) 0%,
        rgba(18, 201, 220, 0.08) 42%,
        transparent 72%
    );
    filter: blur(26px);
    pointer-events: none;
}

.chart-card {
    position: relative;
    border-radius: 24px;
    padding: 28px 24px 22px;
    background:
        linear-gradient(180deg, rgba(72, 175, 186, 0.26), transparent 34%),
        linear-gradient(135deg, rgba(16, 58, 66, 0.95), rgba(7, 21, 29, 0.98));
    border: 1px solid rgba(120, 214, 224, 0.2);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.08),
        0 18px 46px rgba(0, 0, 0, 0.28);
}

.chart-stage--borderless {
    margin-top: 0;
}

.chart-stage--borderless .chart-stage__glow {
    display: none;
}

.chart-stage--borderless .chart-card {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
}

.chart-card__loader {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 24px;
    border-radius: inherit;
    background: rgba(0, 0, 0, 0.8);
    color: rgba(255, 255, 255, 0.72);
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.4;
    text-align: center;
    pointer-events: none;
}

.chart-card__legend {
    margin-top: 18px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 18px 28px;
}

.chart-card__legend-item {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: rgba(255, 255, 255, 0.94);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.01em;
}

.chart-card__legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.18);
}

@media (max-width: 900px) {
    .chart-card {
        padding: 18px 14px 16px;
        border-radius: 20px;
    }

    .chart-stage--borderless .chart-card {
        padding: 0;
        border-radius: 0;
    }

    .chart-card__legend {
        justify-content: flex-start;
    }
}
</style>

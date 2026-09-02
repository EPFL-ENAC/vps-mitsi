<template>
    <PageHeader :eyebrow="t('tempGameEyebrow')" eyebrow-class="text-negative" :level="1">
        <template #default>
            {{ t('tempGameTitle') }}
        </template>

        <template #subtitle> {{ t('tempGameSubtitle') }} </template>
    </PageHeader>

    <ChartContainer
        :is-loading="isLoading"
        :loading-text="t('tempGameLoading')"
        :style="{
            '--plot-margin-left': `${plotMargins.left}px`,
            '--plot-margin-right': `${plotMargins.right}px`,
        }"
    >
        <div ref="heatmapContainer" class="heatmap-stage">
            <TemperatureOverDepthHeatmap
                v-if="shouldRenderLoadedHeatmap"
                :heatmap="heatmap"
                :width="heatmapWidth"
                :height="heatmapHeight"
                :color-bar-width="null"
                x-label=""
                y-label=""
                z-label="Temp."
                :focus-window-center="currentTimestamp"
                :focus-window-width="focusWindowWidth"
                :plot-margins="plotMargins"
                @processing-change="heatmapProcessing = $event"
            />
        </div>

        <div v-if="!isLoading" class="timeline-panel">
            <TimestampSlider
                v-model="currentTimestamp"
                :start-timestamp="startTimestamp * 1000"
                :end-timestamp="endTimestamp * 1000"
                :dynamic-background="'seasons'"
                :show-ticks="false"
            />
        </div>
    </ChartContainer>

    <template v-if="!isLoading">
        <ChartContainer>
            <div class="profile-kicker">{{ t('tempGameProfileKicker') }}</div>

            <div class="profile-grid">
                <div
                    v-for="item in temperatureAtReferenceDepths"
                    :key="item.depth"
                    class="profile-item"
                >
                    <div class="profile-depth">{{ item.depth }}m</div>

                    <div class="profile-value">
                        <span class="profile-number">
                            {{ item.value == null ? '\u2014' : item.value.toFixed(1) }}
                        </span>
                        <span v-if="item.value != null" class="profile-unit"> °c </span>
                    </div>
                </div>
            </div>
        </ChartContainer>

        <PlotAppendix :measured-at="lastMeasurement" />

        <QuestionCardsRow :items="questions" kickerClass="text-negative" />
    </template>
</template>

<script setup lang="ts">
import {
    computed,
    defineAsyncComponent,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    useTemplateRef,
    watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from 'src/components/PageHeader.vue';
import QuestionCardsRow from 'src/components/QuestionCardsRow.vue';
import TimestampSlider from 'src/components/TimestampSlider.vue';
import PlotAppendix from 'src/components/plots/PlotAppendix.vue';
import ChartContainer from 'src/components/ChartContainer.vue';
import type { DepthHeatmap } from 'src/utils/depthHeatmap';
import { useLakeStore } from 'src/stores/lexplore';

const { t } = useI18n();
const lakeStore = useLakeStore();
const TemperatureOverDepthHeatmap = defineAsyncComponent(
    () => import('src/components/plots/TemperatureOverDepthHeatmap.vue'),
);

const heatmap = computed<DepthHeatmap | null>(() => {
    return (lakeStore.data?.temperatureOverDepth ?? null) as DepthHeatmap | null;
});

const lastMeasurement = computed(() => {
    if (!heatmap.value) {
        return null;
    }

    const timestamps = heatmap.value.x;
    if (timestamps.length === 0) {
        return null;
    }

    return timestamps[timestamps.length - 1]!;
});

const heatmapContainer = useTemplateRef<HTMLElement>('heatmapContainer');
const heatmapContainerWidth = ref(0);
const canRenderHeatmap = ref(false);
const heatmapDataLayoutReady = ref(false);
const heatmapProcessing = ref(true);
const sliderIndex = ref(0);

const plotMargins = {
    top: 4,
    right: 0,
    bottom: 8,
    left: 32,
};

const heatmapHeight = 480;

const referenceDepths = [0.25, 24, 50, 75, 85];

function updateHeatmapContainerWidth(): void {
    const container = heatmapContainer.value;
    if (!container) {
        heatmapContainerWidth.value = 0;
        return;
    }

    const computedStyle = getComputedStyle(container);
    const horizontalPadding =
        parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
    heatmapContainerWidth.value = Math.max(0, container.clientWidth - horizontalPadding);
}

const heatmapWidth = computed(() => heatmapContainerWidth.value);
const shouldRenderHeatmap = computed(() => {
    return canRenderHeatmap.value && heatmapWidth.value > plotMargins.left + plotMargins.right;
});
const shouldRenderLoadedHeatmap = computed(
    () => heatmap.value != null && heatmapDataLayoutReady.value && shouldRenderHeatmap.value,
);
const isLoading = computed(
    () => !heatmap.value || !shouldRenderLoadedHeatmap.value || heatmapProcessing.value,
);

watch(
    () => heatmap.value != null,
    async (hasHeatmap) => {
        heatmapDataLayoutReady.value = false;

        if (!hasHeatmap) {
            return;
        }

        await nextTick();
        updateHeatmapContainerWidth();
        heatmapDataLayoutReady.value = true;
    },
    { immediate: true, flush: 'post' },
);

watch(
    () => heatmap.value?.x.length ?? 0,
    (length) => {
        if (length <= 0) {
            sliderIndex.value = 0;
            return;
        }

        sliderIndex.value = Math.min(Math.max(sliderIndex.value, 0), length - 1);

        if (sliderIndex.value === 0) {
            sliderIndex.value = Math.round((length - 1) * 0.78);
        }
    },
    { immediate: true },
);

const startTimestamp = computed(() => (heatmap.value ? Math.min(...heatmap.value.x) : 0));
const endTimestamp = computed(() => {
    return heatmap.value ? Math.max(...heatmap.value.x) : 0;
});
const currentTimestamp = ref(Date.now());
let heatmapContainerObserver: ResizeObserver | null = null;

function observeHeatmapContainer(container: HTMLElement | null): void {
    heatmapContainerObserver?.disconnect();
    heatmapContainerObserver = null;

    if (!container) {
        heatmapContainerWidth.value = 0;
        return;
    }

    updateHeatmapContainerWidth();
    heatmapContainerObserver = new ResizeObserver(() => {
        updateHeatmapContainerWidth();
    });
    heatmapContainerObserver.observe(container);
}

onMounted(async () => {
    currentTimestamp.value = (startTimestamp.value + endTimestamp.value) / 2;

    await nextTick();
    observeHeatmapContainer(heatmapContainer.value);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            updateHeatmapContainerWidth();
            canRenderHeatmap.value = true;
        });
    });
});

onBeforeUnmount(() => {
    heatmapContainerObserver?.disconnect();
    heatmapContainerObserver = null;
});

watch(
    () => heatmapContainer.value,
    (container) => {
        observeHeatmapContainer(container);
    },
    { flush: 'post' },
);

const focusWindowWidth = computed(() => {
    return 24 * 60 * 60; // 24h in s

    /* const xValues = heatmap.value?.x ?? [];

    if (xValues.length < 2) {
        return 1;
    }

    let totalStep = 0;

    for (let i = 1; i < xValues.length; i += 1) {
        totalStep += Math.abs(xValues[i]! - xValues[i - 1]!);
    }

    const averageStep = totalStep / (xValues.length - 1);

    return averageStep * 500; */
});

const temperatureAtReferenceDepths = computed(() => {
    const map = heatmap.value;

    if (!map || map.x.length === 0) {
        return referenceDepths.map((depth) => ({
            depth,
            value: null as number | null,
        }));
    }

    const slice = heatmap.value.slice({
        xStart: currentTimestamp.value - focusWindowWidth.value / 2,
        xEnd: currentTimestamp.value + focusWindowWidth.value / 2,
    });

    if (slice.x.length === 0) {
        return referenceDepths.map((depth) => ({
            depth,
            value: null as number | null,
        }));
    }

    const values = referenceDepths.map((depth) => ({
        depth,
        value: slice.averageOverTimeAtDepth(depth),
    }));

    return values;
});

const questions = computed(() => [
    {
        id: '01',
        kicker: `${t('question')} #1`,
        title: t('tempGameQ1'),
    },
    {
        id: '02',
        kicker: `${t('question')} #2`,
        title: t('tempGameQ2'),
    },
]);
</script>

<style scoped>
.heatmap-stage {
    position: relative;
    display: block;
    width: 100%;
    min-height: 480px;
}

.timeline-panel {
    position: relative;
    padding-top: 0.5rem;
    margin-left: var(--plot-margin-left, 64px);
    margin-right: var(--plot-margin-right, 12px);
}

.profile-kicker {
    color: #ff6d4a;
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 14px;
}

.profile-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 16px;
}

.profile-item {
    min-width: 0;
}

.profile-depth {
    margin-bottom: 4px;
    color: rgba(197, 223, 229, 0.72);
    font-size: 1rem;
    font-weight: 700;
}

.profile-value {
    display: flex;
    align-items: baseline;
    gap: 6px;
}

.profile-number {
    font-size: 2.5rem;
    line-height: 1;
    font-weight: 800;
}

.profile-unit {
    color: #ff6d4a;
    font-size: 16px;
    font-weight: 700;
    text-transform: lowercase;
}

@media (max-width: 900px) {
    .profile-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 720px) {
    .timeline-panel {
        margin-left: 48px;
    }

    .heatmap-hitbox {
        left: 48px;
    }

    .profile-grid {
        grid-template-columns: 1fr;
    }

    .profile-number {
        font-size: 24px;
    }
}
</style>

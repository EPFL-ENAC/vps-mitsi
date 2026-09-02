<template>
    <q-page class="leman-page text-white">
        <div class="page-shell">
            <PageHeader :eyebrow="t('zooDepthEyebrow')" :level="1">
                <template #default>
                    {{ t('zooDepthTitle') }}
                </template>

                <template #subtitle>
                    {{ t('zooDepthSubtitle') }}
                </template>
            </PageHeader>

            <!-- <ZooplanktonDepthPlot
                :levels="levels"
                :organisms="organisms"
                :icon-src="zooplanktonIcon"
                :max-depth="100"
            /> -->

            <h3>Shallow</h3>
            <DepthHeatmapPlot v-if="shallow" :heatmap="shallow" />

            <h3>Deep</h3>
            <DepthHeatmapPlot v-if="deep" :heatmap="deep" />

            <h3>Processed</h3>
            <pre>
const shallowSliced = heatmapShallow.data.slice({ yEnd: 24.45 }); // Data returns null deeper that this
const deepSliced = heatmapDeep.data.slice({ yStart: 31.08, yEnd: 90.08 }); // Artifacts start there

const bridgeY = [25.08, 26.08, 27.08, 28.08, 29.08, 30.08];

const shallowInterpolated = shallowSliced.toInterpolated(deepSliced.x);
const shallowZScore = shallowInterpolated.zScore();
const deepZScore = deepSliced
    .replaceDepthRangeByLerp(48.08, 51.08)
    .replaceDepthRangeByLerp(53.08, 60.08)
    .zScore();

const appended = shallowZScore.appendBelow(deepZScore, bridgeY);

return appended.smoothMovingAverage({ windowX: 31, windowY: 31 });
            </pre>
            <DepthHeatmapPlot
                v-if="zooplanktonDepthStore.processedBackscatterHeatmap"
                :heatmap="zooplanktonDepthStore.processedBackscatterHeatmap"
            />

            <h3>Processed (Highlight Column Maxima)</h3>
            <DepthHeatmapPlot
                v-if="zooplanktonDepthStore.processedBackscatterHeatmap"
                :heatmap="zooplanktonDepthStore.processedBackscatterHeatmap"
                :highlight-column-maxima="true"
                :column-maxima-constraint="columnMaximaConstraint"
            />

            <QuestionCardsRow :items="questionCards" :columns="1" />
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from 'src/components/PageHeader.vue';
import QuestionCardsRow from 'src/components/QuestionCardsRow.vue';
import DepthHeatmapPlot from 'src/components/plots/DepthHeatmapPlot.vue';
// import ZooplanktonDepthPlot from 'src/components/live/ZooplanktonDepthPlot.vue';
// import zooplanktonIcon from 'src/assets/zooplankton.png';
import { useZooplanctonDepthStore } from 'src/stores/lexplore';
import type { DepthHeatmap } from 'src/utils/depthHeatmap';
import { remap } from 'src/utils/math';
import { daySine } from 'src/utils/datetime';

const { t } = useI18n();
const zooplanktonDepthStore = useZooplanctonDepthStore();

const questionCards = computed(() => [
    {
        id: '01',
        kicker: `${t('question')} #1`,
        title: t('zooDepthQ1'),
    },
]);

const shallow = computed<DepthHeatmap | null>(
    () => zooplanktonDepthStore.heatmapShallow.data as DepthHeatmap | null,
);
const deep = computed<DepthHeatmap | null>(
    () => zooplanktonDepthStore.heatmapDeep.data as DepthHeatmap | null,
);

function columnMaximaConstraint(timestamp: number): { startY: number; endY: number } {
    const remapedSine = remap(daySine(timestamp * 1000), -1, 1, 80, 0);

    return {
        startY: remapedSine - 40,
        endY: remapedSine + 40,
    };
}
</script>

<style scoped></style>

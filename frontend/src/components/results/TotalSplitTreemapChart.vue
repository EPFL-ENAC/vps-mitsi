<template>
    <div>
        <div class="text-subtitle1 text-weight-bold text-grey-8 q-mb-xs">
            {{ t('resultsChartSplitTitle') }}
            <ComputationResultDisplay
                :disable-tooltip="disableTooltip"
                class="q-ml-sm"
                :computation="splitChartStatus"
                :missing-label="disableTooltip ? '' : t('resultsUnavailable')"
                hide-value
                :partial-flag-label="t('resultsPartial')"
            />
        </div>
        <v-chart v-if="hasData" class="split-treemap" :option="chartOption" autoresize />
        <div v-else class="text-grey-6 text-center q-py-md">{{ t('mainNotApplicable') }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { TreemapChart, type TreemapSeriesOption } from 'echarts/charts';
import {
    AriaComponent,
    TooltipComponent,
    type AriaComponentOption,
    type TooltipComponentOption,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { BLUE_SCALE, RED_SCALE } from 'src/utils/charts';
import { formatKg } from 'src/utils/format';
import { ComputationResult } from 'src/utils/computation';
import ComputationResultDisplay from 'src/components/ComputationResultDisplay.vue';

echarts.use([TreemapChart, TooltipComponent, AriaComponent, CanvasRenderer]);

type ECOption = echarts.ComposeOption<
    TreemapSeriesOption | TooltipComponentOption | AriaComponentOption
>;

const props = withDefaults(
    defineProps<{
        disableTooltip?: boolean;
        embodied: ComputationResult<number, unknown>;
        operational: ComputationResult<number, unknown>;
        labels: { embodied: string; operational: string };
        colorBlind?: boolean;
    }>(),
    { colorBlind: false },
);

const { t } = useI18n();

// The purpose of this strange line is to capture the "partiality" of the 2 computations.
// We discard the actual result (with .map(() => undefined)) because we only care about the "success" | "partial" | "failure" status of the computations, as it is only used in the ComputationResultDisplay.
const splitChartStatus = computed(() =>
    ComputationResult.sum([props.embodied, props.operational]).map(() => undefined),
);

/** Boldest blue for embodied, boldest red for operational. */
const EMBODIED_COLOR = BLUE_SCALE[0];
const OPERATIONAL_COLOR = RED_SCALE[0];

/** Failed sources are omitted; available sources keep their value and colour. */
const data = computed(() =>
    [
        { computation: props.embodied, name: props.labels.embodied, color: EMBODIED_COLOR },
        {
            computation: props.operational,
            name: props.labels.operational,
            color: OPERATIONAL_COLOR,
        },
    ].flatMap(({ computation, name, color }) =>
        computation.success === 'failure'
            ? []
            : [{ name, value: computation.result, itemStyle: { color } }],
    ),
);

/** Check if we have active data items summing up to > 0. */
const hasData = computed(() => {
    const total = data.value.reduce((acc, slice) => acc + slice.value, 0);
    return data.value.length > 0 && total > 0;
});

const chartOption = computed<ECOption>(() => {
    const denom = data.value.reduce((total, slice) => total + slice.value, 0) || 1;
    return {
        aria: { enabled: props.colorBlind, decal: { show: props.colorBlind } },
        tooltip: {
            trigger: 'item',
            formatter: (p) => {
                const item = Array.isArray(p) ? p[0] : p;
                if (!item) return '';
                const value = Number(item.value);
                return `${item.name}<br/>${formatKg(value)} (${((value / denom) * 100).toFixed(1)}${t('resultsColPercent')})`;
            },
        },
        series: [
            {
                type: 'treemap',
                data: data.value,
                roam: false,
                nodeClick: false,
                breadcrumb: { show: false },
                upperLabel: { show: false },
                label: {
                    show: true,
                    position: 'insideTopLeft',
                    color: '#141920',
                    fontSize: 16,
                    fontWeight: 'bold',
                    lineHeight: 22,
                    overflow: 'truncate',
                    // Name, blank line, then the value and its share.
                    formatter: (p) =>
                        `${p.name}\n\n${formatKg(Number(p.value))} (${((Number(p.value) / denom) * 100).toFixed(1)}${t('resultsColPercent')})`,
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 2,
                    gapWidth: 2,
                },
            },
        ],
    };
});
</script>

<style scoped>
.split-treemap {
    width: 100%;
    height: 300px;
}
</style>

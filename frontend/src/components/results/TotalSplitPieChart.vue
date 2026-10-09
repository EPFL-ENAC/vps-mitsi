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
        <v-chart v-if="data.length" class="split-pie" :option="chartOption" autoresize />
        <div v-else class="text-grey-6 text-center q-py-md">{{ t('mainNotApplicable') }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { PieChart, type PieSeriesOption } from 'echarts/charts';
import {
    TooltipComponent,
    LegendComponent,
    type TooltipComponentOption,
    type LegendComponentOption,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { OKABEITO } from 'src/utils/charts';
import { formatKg } from 'src/utils/format';
import { ComputationResult } from 'src/utils/computation';
import ComputationResultDisplay from 'src/components/ComputationResultDisplay.vue';

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

type ECOption = echarts.ComposeOption<
    PieSeriesOption | TooltipComponentOption | LegendComponentOption
>;

const props = defineProps<{
    disableTooltip?: boolean;
    embodied: ComputationResult<number, unknown>;
    operational: ComputationResult<number, unknown>;
    labels: { embodied: string; operational: string };
}>();

const { t } = useI18n();

const splitChartStatus = computed(() => {
    const { embodied, operational } = props;
    return embodied.success === 'success' && operational.success === 'success'
        ? ComputationResult.success(undefined)
        : ComputationResult.partial(
              undefined,
              [...embodied.inputErrors, ...operational.inputErrors],
              [...embodied.ignoredInputs, ...operational.ignoredInputs],
          );
});

/** Failed sources are omitted; available sources keep their value and colour. */
const data = computed(() =>
    [
        { computation: props.embodied, name: props.labels.embodied, color: OKABEITO[0] },
        { computation: props.operational, name: props.labels.operational, color: OKABEITO[1] },
    ].flatMap(({ computation, name, color }) =>
        computation.success === 'failure'
            ? []
            : [{ name, value: computation.result, itemStyle: { color } }],
    ),
);

const chartOption = computed<ECOption>(() => {
    const denom = data.value.reduce((total, slice) => total + slice.value, 0) || 1;
    return {
        tooltip: {
            trigger: 'item',
            formatter: (p) => {
                const item = Array.isArray(p) ? p[0] : p;
                if (!item) return '';
                const value = Number(item.value);
                return `${item.name}<br/>${formatKg(value)} (${((value / denom) * 100).toFixed(1)}${t('resultsColPercent')})`;
            },
        },
        legend: { bottom: 0 },
        series: [
            {
                type: 'pie',
                color: [...OKABEITO],
                data: data.value,
                radius: ['40%', '70%'],
                label: { formatter: '{b}' },
            },
        ],
    };
});
</script>

<style scoped>
.split-pie {
    width: 100%;
    height: 300px;
}
</style>

<template>
    <v-chart v-if="props.total !== null" class="split-pie" :option="chartOption" autoresize />
    <div v-else class="text-grey-6 split-null">{{ t('mainNotApplicable') }}</div>
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
import { OKABEITO, toSplitPieData } from 'src/utils/charts';
import { formatKg } from 'src/utils/format';

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

type ECOption = echarts.ComposeOption<
    PieSeriesOption | TooltipComponentOption | LegendComponentOption
>;

const props = withDefaults(
    defineProps<{
        embodied: number;
        operational: number | null;
        total: number | null;
        labels: { embodied: string; operational: string; underlying?: string };
        /** v2 (lead decision): underlying services excluded in v1 — pass only when enabled. */
        underlying?: number;
    }>(),
    {},
);

const { t } = useI18n();

const chartOption = computed<ECOption>(() => {
    const data = toSplitPieData(props.embodied, props.operational, props.labels, props.underlying);
    // Wedges sum to 100% over the shown contributions (underlying omitted in v1).
    const denom = props.embodied + (props.operational ?? 0) + (props.underlying ?? 0) || 1;
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
                data,
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
.split-null {
    padding: 12px 0;
    text-align: center;
}
</style>

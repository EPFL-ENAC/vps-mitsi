<template>
    <v-chart v-if="hasData" class="embodied-treemap" :option="chartOption" autoresize />
    <div v-else class="text-grey-6 treemap-null">{{ t('mainNotApplicable') }}</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { TreemapChart, type TreemapSeriesOption } from 'echarts/charts';
import { TooltipComponent, type TooltipComponentOption } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { toCategoryTreemapData, toElementTreemapData, type EmbodiedGroup } from 'src/utils/charts';
import { formatKg } from 'src/utils/format';

echarts.use([TreemapChart, TooltipComponent, CanvasRenderer]);

type ECOption = echarts.ComposeOption<TreemapSeriesOption | TooltipComponentOption>;

const props = withDefaults(
    defineProps<{
        groups: EmbodiedGroup[];
        grandTotal: number;
        variant?: 'element' | 'category';
    }>(),
    { variant: 'category' },
);

const { t } = useI18n();

/** Pre-computed data items for the treemap. */
const chartData = computed(() =>
    props.variant === 'category'
        ? toCategoryTreemapData(props.groups)
        : toElementTreemapData(props.groups),
);

/** Determines whether the chart should render or show an empty fallback. */
const hasData = computed(() => props.grandTotal > 0 && chartData.value.length > 0);

/** Reactive ECharts option configuration. */
const chartOption = computed<ECOption>(() => ({
    tooltip: {
        trigger: 'item',
        formatter: (p) => {
            const item = Array.isArray(p) ? p[0] : p;
            if (!item) return '';
            const value = Number(item.value);
            const pct = props.grandTotal > 0 ? (value / props.grandTotal) * 100 : 0;
            return `${item.name}<br/>${formatKg(value)} (${pct.toFixed(1)}${t('resultsColPercent')})`;
        },
    },
    series: [
        {
            type: 'treemap',
            data: chartData.value,
            roam: true,
            nodeClick: 'zoomToNode',
            breadcrumb: { show: true },
            upperLabel: { show: props.variant === 'category', height: 24, formatter: '{b}' },
            label: { show: true, formatter: '{b}' },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 2,
                gapWidth: 2,
            },
        },
    ],
}));
</script>

<style scoped>
.embodied-treemap {
    width: 100%;
    height: 340px;
}
.treemap-null {
    padding: 16px 0;
    text-align: center;
}
</style>

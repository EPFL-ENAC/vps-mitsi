<template>
    <v-chart v-if="hasData" class="embodied-treemap" :option="chartOption" autoresize />
    <div v-else class="text-grey-6 text-center q-py-md">{{ t('mainNotApplicable') }}</div>
</template>

<script setup lang="ts">
import type { EmbodiedGroup, EmbodiedRow } from 'src/stores/surveyResults';

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { TreemapChart, type TreemapSeriesOption } from 'echarts/charts';
import { TooltipComponent, type TooltipComponentOption } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { palette } from 'src/utils/charts';
import { formatKg } from 'src/utils/format';

echarts.use([TreemapChart, TooltipComponent, CanvasRenderer]);

type ECOption = echarts.ComposeOption<TreemapSeriesOption | TooltipComponentOption>;

const props = withDefaults(
    defineProps<{
        groups: EmbodiedGroup[];
        grandTotal: number | null;
        variant?: 'element' | 'category';
    }>(),
    { variant: 'category' },
);

const { t } = useI18n();

/** Flat treemap (by element): each tile gets its category's colour — identical
 *  colours on both charts, as in the Excel reference. Skips excluded rows
 *  (the store's second-hand flag) and zero totals (0-size tiles). */
function toElementTreemapData(groups: EmbodiedGroup[]): NonNullable<TreemapSeriesOption['data']> {
    return groups.flatMap((g, categoryIdx) => {
        const categoryColor = palette(categoryIdx);
        return g.rows
            .filter(
                (r): r is EmbodiedRow & { co2RowTotal: number } =>
                    !r.excluded && r.co2RowTotal !== null && r.co2RowTotal > 0,
            )
            .map((r) => ({
                name: r.name,
                value: r.co2RowTotal,
                itemStyle: { color: categoryColor },
            }));
    });
}

/** Nested treemap (by category): parent + children share the  `categoryColor`, separated by clear borders.
 *  Categories with no accounted children are omitted. */
function toCategoryTreemapData(groups: EmbodiedGroup[]): NonNullable<TreemapSeriesOption['data']> {
    return groups
        .flatMap((g, i) => {
            const total = g.categoryTotal.result;
            if (total === null) return [];
            const categoryColor = palette(i);
            return [
                {
                    name: g.category,
                    value: total,
                    itemStyle: { color: categoryColor },
                    children: g.rows
                        .filter(
                            (r): r is EmbodiedRow & { co2RowTotal: number } =>
                                !r.excluded && r.co2RowTotal !== null && r.co2RowTotal > 0,
                        )
                        .map((r) => ({
                            name: r.name,
                            value: r.co2RowTotal,
                            itemStyle: { color: categoryColor },
                        })),
                },
            ];
        })
        .filter((g) => (g.children?.length ?? 0) > 0);
}

/** Pre-computed data items for the treemap. */
const chartData = computed(() =>
    props.variant === 'category'
        ? toCategoryTreemapData(props.groups)
        : toElementTreemapData(props.groups),
);

/** Determines whether the chart should render or show an empty fallback. */
const hasData = computed(
    () => props.grandTotal !== null && props.grandTotal > 0 && chartData.value.length > 0,
);

/** Reactive ECharts option configuration. */
const chartOption = computed<ECOption>(() => ({
    tooltip: {
        trigger: 'item',
        formatter: (p) => {
            const item = Array.isArray(p) ? p[0] : p;
            if (!item) return '';
            const value = Number(item.value);
            const pct =
                props.grandTotal !== null && props.grandTotal > 0
                    ? (value / props.grandTotal) * 100
                    : 0;
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
</style>

<template>
    <div v-if="hasData">
        <!-- Legend row -->
        <ul class="embodied-legend">
            <li v-for="entry in legend" :key="entry.name" class="embodied-legend__item">
                <span class="embodied-legend__swatch" :style="{ backgroundColor: entry.color }" />
                {{ entry.name }}
            </li>
        </ul>
        <v-chart class="embodied-treemap" :option="chartOption" autoresize />
    </div>
    <div v-else class="text-grey-6 text-center q-py-md">{{ t('mainNotApplicable') }}</div>
</template>

<script setup lang="ts">
import type { EmbodiedGroup } from 'src/stores/surveyResults';

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { TreemapChart, type TreemapSeriesOption } from 'echarts/charts';
import type { CallbackDataParams } from 'echarts/types/dist/shared';
import {
    AriaComponent,
    TooltipComponent,
    type AriaComponentOption,
    type TooltipComponentOption,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { BLUE_SCALE } from 'src/utils/charts';
import { formatKg } from 'src/utils/format';

echarts.use([TreemapChart, TooltipComponent, AriaComponent, CanvasRenderer]);

type ECOption = echarts.ComposeOption<
    TreemapSeriesOption | TooltipComponentOption | AriaComponentOption
>;

const props = withDefaults(
    defineProps<{
        groups: EmbodiedGroup[];
        grandTotal: number | null;
        variant?: 'element' | 'category';
        colorBlind?: boolean;
    }>(),
    { variant: 'category', colorBlind: false },
);

const { t } = useI18n();

function getCategoryColor(index: number): string {
    return BLUE_SCALE[index % BLUE_SCALE.length] ?? BLUE_SCALE[0];
}

/** Flat treemap (by element) */
function toElementTreemapData(groups: EmbodiedGroup[]): NonNullable<TreemapSeriesOption['data']> {
    return groups.flatMap((g, categoryIdx) => {
        const categoryColor = getCategoryColor(categoryIdx);
        const categoryLabel = t('inventoryCategory_' + g.category);

        return g.rows.flatMap((row) => {
            const value = row.rowEmbodiedEmissionsKg.result;
            return row.excluded || value === null || !(value > 0)
                ? []
                : [
                      {
                          name: row.name,
                          categoryLabel,
                          value,
                          itemStyle: { color: categoryColor },
                      },
                  ];
        });
    });
}

/** Nested treemap (by category) */
function toCategoryTreemapData(groups: EmbodiedGroup[]): NonNullable<TreemapSeriesOption['data']> {
    return groups
        .flatMap((g, i) => {
            const total = g.totalEmbodiedEmissionsKg.result;
            if (total === null) return [];
            const categoryColor = getCategoryColor(i);
            const categoryLabel = t('inventoryCategory_' + g.category);

            return [
                {
                    name: categoryLabel,
                    value: total,
                    itemStyle: { color: categoryColor },
                    children: g.rows.flatMap((row) => {
                        const value = row.rowEmbodiedEmissionsKg.result;
                        return row.excluded || value === null || !(value > 0)
                            ? []
                            : [
                                  {
                                      name: row.name,
                                      categoryLabel,
                                      value,
                                      itemStyle: { color: categoryColor },
                                  },
                              ];
                    }),
                },
            ];
        })
        .filter((g) => (g.children?.length ?? 0) > 0);
}

/** Legend items matching categories and colors */
const legend = computed(() =>
    props.groups
        .map((g, i) => ({
            name: t('inventoryCategory_' + g.category),
            color: getCategoryColor(i),
            hasRows: g.rows.some(
                (r) =>
                    !r.excluded &&
                    r.rowEmbodiedEmissionsKg.result !== null &&
                    r.rowEmbodiedEmissionsKg.result > 0,
            ),
        }))
        .filter((item) => item.hasRows),
);

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
    aria: { enabled: props.colorBlind, decal: { show: props.colorBlind } },
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
            label: {
                show: true,
                position: 'insideTopLeft',
                color: '#141920',
                fontSize: 13,
                fontWeight: 'bold',
                lineHeight: 18,
                formatter: (p: CallbackDataParams) => {
                    const data = p.data as { categoryLabel?: string };
                    const val = formatKg(Number(p.value));
                    return data.categoryLabel
                        ? `${data.categoryLabel}\n\n${p.name}\n${val}`
                        : `${p.name}\n${val}`;
                },
            },
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
.embodied-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    margin: 0 0 12px;
    padding: 0;
    list-style: none;
}

.embodied-legend__item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: #334155;
}

.embodied-legend__swatch {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.embodied-treemap {
    width: 100%;
    height: 340px;
}
</style>

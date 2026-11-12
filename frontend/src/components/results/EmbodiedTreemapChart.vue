<template>
    <div v-if="hasData">
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
import { getCategoryColor } from 'src/utils/charts';
import { formatCategoryName, formatKg } from 'src/utils/format';
import { useUserPreferencesStore } from 'src/stores/userPreferences';

echarts.use([TreemapChart, TooltipComponent, AriaComponent, CanvasRenderer]);

type ECOption = echarts.ComposeOption<
    TreemapSeriesOption | TooltipComponentOption | AriaComponentOption
>;

const props = withDefaults(
    defineProps<{
        groups: EmbodiedGroup[];
        grandTotal: number | null;
        variant?: 'element' | 'category';
    }>(),
    { variant: 'category' },
);

const { t } = useI18n();
const userPrefs = useUserPreferencesStore();

/** Custom categories display the user-typed name, standard ones their translation. */
function categoryLabel(group: EmbodiedGroup): string {
    return formatCategoryName(group.category, group.categoryName, t);
}

/** Flat treemap (by element) */
function toElementTreemapData(groups: EmbodiedGroup[]): NonNullable<TreemapSeriesOption['data']> {
    return groups.flatMap((g, categoryIdx) => {
        const categoryColor = getCategoryColor(categoryIdx);
        const groupLabel = categoryLabel(g);

        return g.rows.flatMap((row) => {
            const value = row.rowEmbodiedEmissionsKg.result;
            return row.excluded || value === null || !(value > 0)
                ? []
                : [
                      {
                          name: row.name,
                          categoryLabel: groupLabel,
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
            const groupLabel = categoryLabel(g);

            return [
                {
                    name: groupLabel,
                    value: total,
                    itemStyle: { color: categoryColor },
                    children: g.rows.flatMap((row) => {
                        const value = row.rowEmbodiedEmissionsKg.result;
                        return row.excluded || value === null || !(value > 0)
                            ? []
                            : [
                                  {
                                      name: row.name,
                                      categoryLabel: groupLabel,
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
    aria: { enabled: userPrefs.colorBlind, decal: { show: userPrefs.colorBlind } },
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
            top: 4,
            left: -5,
            right: 0,
            bottom: 35,
            data: chartData.value,
            roam: true,
            nodeClick: 'zoomToNode',
            breadcrumb: { show: true },
            label: {
                show: true,
                position: 'insideTopLeft',
                color: '#ffffff',
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
.embodied-treemap {
    width: 100%;
    height: 340px;
}
</style>

<template>
    <div v-if="hasData">
        <v-chart class="datacenter-treemap" :option="chartOption" autoresize />
        <ul class="datacenter-captions">
            <li v-for="band in bands" :key="band.name" class="datacenter-captions__item">
                <div class="datacenter-captions__name">{{ band.name }}</div>
                <div class="datacenter-captions__value">{{ formatKg(band.value) }}</div>
            </li>
        </ul>
    </div>
    <div v-else class="text-grey-6 text-center q-py-md">{{ t('mainNotApplicable') }}</div>
</template>

<script setup lang="ts">
import type { DatacenterOperationalResult } from 'src/models/Datacenter/computations';

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
import { RED_SCALE } from 'src/utils/charts';
import { formatDatacenterName, formatKg } from 'src/utils/format';
import { useUserPreferencesStore } from 'src/stores/userPreferences';

echarts.use([TreemapChart, TooltipComponent, AriaComponent, CanvasRenderer]);

type ECOption = echarts.ComposeOption<
    TreemapSeriesOption | TooltipComponentOption | AriaComponentOption
>;

const props = withDefaults(
    defineProps<{
        rows: DatacenterOperationalResult[];
        total: number | null;
        metric?: 'period' | 'lifespan';
    }>(),
    { metric: 'lifespan' },
);

const { t } = useI18n();
const userPrefs = useUserPreferencesStore();

/**
 * Boldest red for the biggest emitter, fading as opacity down to a 0.20
 * for the smallest. Opacity is spread over number of datacenters, so
 * the shades stay distinct when there are more than RED_SCALE has steps.
 */
function bandColor(rank: number, totalCount: number): string {
    const baseColor = RED_SCALE[0]; // #D25F5F — the scale's boldest red
    if (totalCount <= 1) return baseColor;
    const opacity = 1 - (rank / totalCount) * 0.8;
    return `rgba(210, 95, 95, ${opacity.toFixed(2)})`;
}

/**
 * ECharts sizes a treemap by value, so equal-width bands need one series. */
function bandBounds(index: number, count: number): { left: string; width: string } {
    const slice = 100 / count;
    return { left: `${index * slice}%`, width: `${slice}%` };
}

/** Datacenters sorted by emission contribution descending. */
const bands = computed(() =>
    props.rows
        .map((row) => ({
            name: formatDatacenterName(row.datacenter),
            value: row[props.metric === 'period' ? 'co2Period' : 'co2Lifespan'],
        }))
        .filter((band): band is { name: string; value: number } => band.value > 0)
        .sort((a, b) => b.value - a.value),
);

/** Share of the operational total, as a one-decimal percentage label. */
function shareOf(value: number): string {
    const share = props.total !== null && props.total > 0 ? (value / props.total) * 100 : 0;
    return `${share.toFixed(1)}${t('resultsColPercent')}`;
}

/** Determines if chart should render or show an empty fallback. */
const hasData = computed(() => props.total !== null && props.total > 0 && bands.value.length > 0);

const chartOption = computed<ECOption>(() => ({
    aria: { enabled: userPrefs.colorBlind, decal: { show: userPrefs.colorBlind } },
    tooltip: {
        trigger: 'item',
        formatter: (p) => {
            const item = Array.isArray(p) ? p[0] : p;
            if (!item) return '';
            const value = Number(item.value);
            return `${item.name}<br/>${formatKg(value)} (${shareOf(value)})`;
        },
    },
    series: bands.value.map((band, rank) => ({
        type: 'treemap',
        data: [
            {
                name: band.name,
                value: band.value,
                itemStyle: { color: bandColor(rank, bands.value.length) },
            },
        ],
        ...bandBounds(rank, bands.value.length),
        top: 0,
        bottom: 0,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        upperLabel: { show: false },
        label: {
            show: true,
            position: 'insideBottomLeft',
            color: '#141920',
            fontSize: 18,
            fontWeight: 'bold',
            overflow: 'truncate',
            formatter: (p) => shareOf(Number(p.value)),
        },
        itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
            gapWidth: 2,
        },
    })),
}));
</script>

<style scoped>
.datacenter-treemap {
    width: 100%;
    height: 200px;
}

.datacenter-captions {
    display: flex;
    /* Matches the chart's 2px tile gutter, captions sit under their band. */
    gap: 2px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
}

.datacenter-captions__item {
    /* Bands are equal width, so captions are too. */
    min-width: 0;
    flex: 1 1 0;
    overflow: hidden;
}

.datacenter-captions__name {
    font-size: 0.85rem;
    color: rgba(0, 0, 0, 0.7);
}

.datacenter-captions__value {
    font-weight: 700;
    color: #141920;
}
</style>

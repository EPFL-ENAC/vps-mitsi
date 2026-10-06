<template>
    <v-chart v-if="slices.length" class="datacenter-pie" :option="chartOption" autoresize />
    <div v-else class="text-grey-6 text-center q-py-md">{{ t('mainNotApplicable') }}</div>
</template>

<script setup lang="ts">
import type { DatacenterOperationalResult } from 'src/stores/surveyResults';

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
import { formatDatacenterName, formatKg } from 'src/utils/format';

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

type ECOption = echarts.ComposeOption<
    PieSeriesOption | TooltipComponentOption | LegendComponentOption
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

const slices = computed(() =>
    props.rows
        .map((r) => ({
            name: formatDatacenterName(r.datacenter),
            value: r[props.metric === 'period' ? 'co2Period' : 'co2Lifespan'],
        }))
        .filter((d): d is { name: string; value: number } => d.value !== null && d.value > 0),
);

const chartOption = computed<ECOption>(() => ({
    tooltip: {
        trigger: 'item',
        formatter: (p) => {
            const item = Array.isArray(p) ? p[0] : p;
            if (!item) return '';
            const value = Number(item.value);
            const pct = props.total !== null && props.total > 0 ? (value / props.total) * 100 : 0;
            return `${item.name}<br/>${formatKg(value)} (${pct.toFixed(1)}${t('resultsColPercent')})`;
        },
    },
    legend: { bottom: 0 },
    series: [
        {
            type: 'pie',
            color: [...OKABEITO],
            data: slices.value,
            radius: ['40%', '70%'],
            label: { formatter: '{b}' },
        },
    ],
}));
</script>

<style scoped>
.datacenter-pie {
    width: 100%;
    height: 300px;
}
</style>

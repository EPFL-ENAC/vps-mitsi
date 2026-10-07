<template>
    <v-chart v-if="props.total !== null" class="split-pie" :option="chartOption" autoresize />
    <div v-else class="text-grey-6 text-center q-py-md">{{ t('mainNotApplicable') }}</div>
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

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

type ECOption = echarts.ComposeOption<
    PieSeriesOption | TooltipComponentOption | LegendComponentOption
>;

const props = withDefaults(
    defineProps<{
        embodied: number | null;
        operational: number | null;
        total: number | null;
        labels: { embodied: string; operational: string; underlying?: string };
        /** v2 (lead decision): underlying services excluded in v1 — pass only when enabled. */
        underlying?: number;
    }>(),
    {},
);

const { t } = useI18n();

/** Split pie: exactly two wedges in v1 (Embodied vs Operational). The optional
 *  underlying wedge appears only when supplied (v2, lead decision). */
const data = computed(() => {
    if (props.embodied === null) return [];
    const wedges = [
        { name: props.labels.embodied, value: props.embodied },
        { name: props.labels.operational, value: props.operational ?? 0 },
    ];
    // v2: underlying-services wedge — only present when its contribution is supplied.
    if (props.underlying !== undefined) {
        wedges.push({
            name: props.labels.underlying ?? 'Underlying services',
            value: props.underlying,
        });
    }
    return wedges;
});

const chartOption = computed<ECOption>(() => {
    if (props.embodied === null) return {};
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

<template>
    <div class="depth-heatmap-view">
        <canvas ref="plotCanvas" />
        <canvas ref="colorBarCanvas" />
    </div>
</template>

<script setup lang="ts">
import { ColorMap } from 'src/utils/colors';
import type { DepthHeatmap } from 'src/utils/depthHeatmap';
import { formatNumber } from 'src/utils/format';
import { isCloseEnough, lerp } from 'src/utils/math';
import { onMounted, ref, watch } from 'vue';

interface Props {
    heatmap: DepthHeatmap | null;
    width?: number;
    height?: number;
    colorBarWidth?: number;
    plotMargins?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    precision?: number;
    xLabel?: string;
    yLabel?: string;
    zLabel?: string;
    highlightColumnMaxima?: boolean;
    colorMap?: ColorMap;
    columnMaximaConstraint?: ((timestamp: number) => { startY: number; endY: number }) | undefined;
}

const props = withDefaults(defineProps<Props>(), {
    width: 760,
    height: 420,
    colorBarWidth: 90,
    plotMargins: () => ({
        top: 16,
        right: 12,
        bottom: 52,
        left: 64,
    }),
    precision: 2,
    xLabel: 'X',
    yLabel: 'Y',
    zLabel: 'Z',
    highlightColumnMaxima: false,
    colorMap: () => ColorMap.viridis(),
});

const plotCanvas = ref<HTMLCanvasElement | null>(null);
const colorBarCanvas = ref<HTMLCanvasElement | null>(null);

const barMargins = {
    top: 16,
    right: 40,
    bottom: 52,
    left: 18,
};

function resizeCanvas(
    canvas: HTMLCanvasElement,
    cssWidth: number,
    cssHeight: number,
): CanvasRenderingContext2D | null {
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return ctx;
}

function tickStep(length: number, maxLabels = 8): number {
    return Math.max(1, Math.ceil(length / maxLabels));
}

function drawEmptyState(): void {
    const canvas = plotCanvas.value;

    if (!canvas) {
        return;
    }

    const ctx = resizeCanvas(canvas, props.width, props.height);

    if (!ctx) {
        return;
    }

    ctx.clearRect(0, 0, props.width, props.height);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No heatmap data', props.width / 2, props.height / 2);
}

function drawHeatmap(): void {
    const heatmap = props.heatmap;

    if (!heatmap || heatmap.x.length === 0 || heatmap.y.length === 0) {
        drawEmptyState();
        return;
    }

    const extent = heatmap.zValuesMinMax();

    if (!extent) {
        drawEmptyState();
        return;
    }

    const canvas = plotCanvas.value;

    if (!canvas) {
        return;
    }

    const ctx = resizeCanvas(canvas, props.width, props.height);

    if (!ctx) {
        return;
    }

    const plotLeft = props.plotMargins.left;
    const plotTop = props.plotMargins.top;
    const plotWidth = props.width - props.plotMargins.left - props.plotMargins.right;
    const plotHeight = props.height - props.plotMargins.top - props.plotMargins.bottom;

    ctx.clearRect(0, 0, props.width, props.height);

    const cellWidth = plotWidth / heatmap.x.length;
    const cellHeight = plotHeight / heatmap.y.length;
    const columnMaxima = props.highlightColumnMaxima
        ? heatmap.maxZValuePlot(props.columnMaximaConstraint)
        : null;

    for (let x = 0; x < heatmap.x.length; x += 1) {
        for (let y = 0; y < heatmap.y.length; y += 1) {
            const value = heatmap.z.at(x, y);

            if (value == null) {
                continue;
            }

            const left = plotLeft + x * cellWidth;
            const top = plotTop + y * cellHeight;

            ctx.fillStyle = props.colorMap.toCss((value - extent.min) / (extent.max - extent.min));
            ctx.fillRect(left, top, Math.ceil(cellWidth) + 1, Math.ceil(cellHeight) + 1);
        }
    }

    if (columnMaxima) {
        ctx.beginPath();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;

        for (let x = 0; x < heatmap.x.length; x += 1) {
            const xValue = heatmap.x[x]!;
            const maxima = columnMaxima[xValue]!;
            const yIndex = heatmap.y.findIndex((y) => isCloseEnough(y, maxima.y));
            const left = plotLeft + x * cellWidth;
            const top = plotTop + yIndex * cellHeight;

            ctx.lineTo(left + cellWidth / 2, top + cellHeight / 2);
        }

        ctx.stroke();
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = '13px "Google Sans Flex", sans-serif';

    const xStep = tickStep(heatmap.x.length, 8);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'white';

    const dateFormat = new Intl.DateTimeFormat('fr-ch', {
        day: '2-digit',
        month: 'short',
    });
    const timeFormat = new Intl.DateTimeFormat('fr-ch', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    for (let x = 0; x < heatmap.x.length; x += xStep) {
        const centerX = plotLeft + (x + 0.5) * cellWidth;
        const date = new Date(heatmap.x[x]! * 1000);
        const labelDate = dateFormat.format(date);
        const labelTime = timeFormat.format(date);

        ctx.fillText(labelDate, centerX, plotTop + plotHeight + 0);
        ctx.fillText(labelTime, centerX, plotTop + plotHeight + 14);
    }

    const yStep = tickStep(heatmap.y.length, 8);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let y = 0; y < heatmap.y.length; y += yStep) {
        const centerY = plotTop + (y + 0.5) * cellHeight;
        const label = formatNumber(heatmap.y[y]);

        ctx.fillText(label, plotLeft - 8, centerY);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '13px "Google Sans Flex", sans-serif';
    ctx.fillText(props.xLabel, plotLeft + plotWidth / 2, props.height - 6);

    ctx.save();
    ctx.translate(16, plotTop + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(props.yLabel, 0, 0);
    ctx.restore();
}

function drawColorBar(): void {
    const extent = props.heatmap?.zValuesMinMax();
    const canvas = colorBarCanvas.value;

    if (!canvas || !extent) {
        return;
    }

    const ctx = resizeCanvas(canvas, props.colorBarWidth, props.height);

    if (!ctx) {
        return;
    }

    ctx.clearRect(0, 0, props.colorBarWidth, props.height);

    if (!extent) {
        return;
    }

    const barX = barMargins.left;
    const barY = barMargins.top;
    const barWidth = 20;
    const barHeight = props.height - barMargins.top - barMargins.bottom;

    for (let i = 0; i < barHeight; i += 1) {
        const t = 1 - i / Math.max(1, barHeight - 1);

        ctx.fillStyle = props.colorMap.toCss(t);
        ctx.fillRect(barX, barY + i, barWidth, 1);
    }

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    const tickCount = 5;
    ctx.fillStyle = 'white';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < tickCount; i += 1) {
        const t = i / (tickCount - 1);
        const y = barY + t * barHeight;
        const value = lerp(extent.max, extent.min, t);

        ctx.beginPath();
        ctx.moveTo(barX + barWidth, y);
        ctx.lineTo(barX + barWidth + 6, y);
        ctx.stroke();

        ctx.fillText(formatNumber(value), barX + barWidth + 10, y);
    }

    ctx.save();
    ctx.translate(barX + barWidth / 2, 4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '13px sans-serif';
    ctx.fillText(props.zLabel, 0, 0);
    ctx.restore();
}

function drawAll(): void {
    drawHeatmap();
    drawColorBar();
}

onMounted(() => {
    drawAll();
});

watch(
    () => [
        props.heatmap,
        props.width,
        props.height,
        props.colorBarWidth,
        props.plotMargins,
        props.precision,
        props.xLabel,
        props.yLabel,
        props.zLabel,
    ],
    () => {
        drawAll();
    },
    { immediate: true },
);
</script>

<style scoped>
.depth-heatmap-view {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

canvas {
    display: block;
}
</style>

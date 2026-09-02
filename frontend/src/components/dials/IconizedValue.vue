<template>
    <div class="iconized-value" :style="cssVars" role="img" :aria-label="ariaLabel">
        <div class="iconized-value__underlay" aria-hidden="true">
            <slot />
        </div>

        <div class="iconized-value__content">
            <span class="iconized-value__value">{{ displayValue }}</span>
            <span v-if="unit" class="iconized-value__unit">{{ unit }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatNumber } from 'src/utils/format';

interface Props {
    value?: number | undefined;
    unit?: string;
    valueFontSize?: string;
    unitFontSize?: string;
    contentOffsetLeft?: string;
    fallback?: string;
    label?: string;
    fadeStartPercent?: number;
    fadeEndPercent?: number;
    fadeToOpacity?: number;
    forceHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
    unit: '',
    valueFontSize: '8rem',
    unitFontSize: '3rem',
    contentOffsetLeft: '4rem',
    fallback: '—',
    label: 'Value',
    fadeStartPercent: 10,
    fadeEndPercent: 40,
    fadeToOpacity: 0,
});

const { locale } = useI18n();

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

const normalizedFadeStartPercent = computed(() => {
    return clamp(props.fadeStartPercent, 0, 100);
});

const normalizedFadeEndPercent = computed(() => {
    return clamp(props.fadeEndPercent, normalizedFadeStartPercent.value, 100);
});

const normalizedFadeToOpacity = computed(() => {
    return clamp(props.fadeToOpacity, 0, 1);
});

const displayValue = computed(() => {
    if (props.value == null || Number.isNaN(props.value)) {
        return props.fallback;
    }

    return formatNumber(props.value, locale.value);
});

const ariaLabel = computed(() => {
    const valueText =
        props.value == null || Number.isNaN(props.value)
            ? props.fallback
            : `${displayValue.value} ${props.unit}`.trim();

    return `${props.label} ${valueText}`.trim();
});

const cssVars = computed(() => ({
    '--value-font-size': props.valueFontSize,
    '--unit-font-size': props.unitFontSize,
    '--content-offset-left': props.contentOffsetLeft,
    '--fade-start': `${normalizedFadeStartPercent.value}%`,
    '--fade-end': `${normalizedFadeEndPercent.value}%`,
    '--fade-end-alpha': `${normalizedFadeToOpacity.value}`,
    '--force-height': props.forceHeight ? `${props.forceHeight}px` : 'auto',
}));
</script>

<style scoped lang="scss">
.iconized-value {
    --value-font-size: 6rem;
    --unit-font-size: 2rem;
    --content-offset-left: 3rem;
    --fade-start: 0%;
    --fade-end: 100%;
    --fade-end-alpha: 0;

    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: 3.5rem;
    color: white;
    min-height: var(--force-height, auto);
}

.iconized-value__underlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    pointer-events: none;
    color: #5fe3ff;
    opacity: 0.95;

    -webkit-mask-image: linear-gradient(
        90deg,
        rgba(0, 0, 0, 1) 0%,
        rgba(0, 0, 0, 1) var(--fade-start),
        rgba(0, 0, 0, var(--fade-end-alpha)) var(--fade-end)
    );
    mask-image: linear-gradient(
        90deg,
        rgba(0, 0, 0, 1) 0%,
        rgba(0, 0, 0, 1) var(--fade-start),
        rgba(0, 0, 0, var(--fade-end-alpha)) var(--fade-end)
    );

    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
}

.iconized-value__underlay :deep(svg) {
    display: block;
    overflow: visible;
}

.iconized-value__content {
    position: relative;
    z-index: 1;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0.2rem;
    margin-left: var(--content-offset-left);
}

.iconized-value__value {
    color: #fff;
    font-size: var(--value-font-size);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.02em;
    white-space: nowrap;
}

.iconized-value__unit {
    color: #5fe3ff;
    font-size: var(--unit-font-size);
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.08em;
    white-space: nowrap;
}
</style>

<template>
    <div class="wrapper">
        <div class="dot-container">
            <div class="dot"></div>
            <div class="live">LIVE</div>
        </div>
        <div class="texts">
            <h1>{{ t('lemanLive') }}</h1>
            <div class="last-measurement">{{ t('lastMeasurement', { time: formattedTime }) }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { formatTime } from 'src/utils/format';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale, t } = useI18n();

const props = defineProps<{
    lastMeasurementTime?: number | undefined;
}>();

const formattedTime = computed(() => {
    if (!props.lastMeasurementTime) {
        return 'N/A';
    }

    return formatTime(props.lastMeasurementTime, locale.value);
});
</script>

<style scoped>
.wrapper {
    display: flex;
    align-items: center;
    gap: 2rem;
}

h1 {
    margin: 0 0 1rem 0;
    font-size: 4rem;
    line-height: 1;
    font-weight: bold;
}

.last-measurement {
    font-size: 2.5rem;
}

.dot-container {
    isolation: isolate;
    position: relative;
    width: 14rem;
    aspect-ratio: 1;

    color: white;
    font-weight: bold;
    font-size: 3rem;

    display: flex;
    justify-content: center;
    align-items: center;
}

.dot {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: red;

    z-index: -1;

    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
    100% {
        opacity: 1;
    }
}
</style>

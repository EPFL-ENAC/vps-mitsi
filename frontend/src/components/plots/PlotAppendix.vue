<template>
    <p class="plot-meta" v-if="props.measuredAt">
        {{ t('plotMeasuredOn') }} {{ formatDate(new Date(props.measuredAt * 1000), locale) }} ·
        <strong>{{ t('plotLocation') }}</strong>
    </p>
</template>

<script setup lang="ts">
import { formatDate } from 'src/utils/format';
import { useI18n } from 'vue-i18n';

const { locale, t } = useI18n();

const props = withDefaults(
    defineProps<{
        measuredAt: number | undefined | null;
        location?: string;
    }>(),
    {
        location: '',
    },
);
</script>

<style scoped>
.plot-meta {
    margin-top: 2rem;
    font-size: 1rem;
    color: rgb(255 255 255 / 56%);
}
</style>

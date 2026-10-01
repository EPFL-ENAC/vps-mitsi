<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
    title: string;
    titleTooltip?: string;
    purpose?: 'calculation' | 'report';
    defaultOpened?: boolean;
}>();

defineSlots<{
    default(): unknown;
}>();

const { t } = useI18n();
</script>

<template>
    <q-card flat bordered class="assessment-section q-mb-md">
        <q-expansion-item :default-opened="defaultOpened">
            <template #header>
                <q-item-section class="assessment-section__title">
                    <q-item-label>
                        {{ title }}
                        <q-tooltip v-if="titleTooltip">{{ titleTooltip }}</q-tooltip>
                    </q-item-label>
                </q-item-section>
                <q-item-section v-if="purpose" side>
                    <span
                        class="assessment-section__badge"
                        :class="`assessment-section__badge--${purpose}`"
                    >
                        {{ t(`assessmentSection.${purpose}.label`) }}
                        <q-tooltip>{{ t(`assessmentSection.${purpose}.tooltip`) }}</q-tooltip>
                    </span>
                </q-item-section>
            </template>
            <q-separator />
            <q-card-section class="q-pa-md">
                <slot />
            </q-card-section>
        </q-expansion-item>
    </q-card>
</template>

<style scoped>
.assessment-section__title {
    font-weight: 600;
}

.assessment-section__badge {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    white-space: nowrap;
}

.assessment-section__badge--calculation {
    background: #fff0f1;
    color: #c1001a;
}

.assessment-section__badge--report {
    background: #eff2f6;
    color: #48525f;
}
</style>

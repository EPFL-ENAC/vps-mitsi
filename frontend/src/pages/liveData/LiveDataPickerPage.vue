<template>
    <PageHeader :eyebrow="t('livePickerEyebrow')" :level="1">
        <template #default>
            {{ t('livePickerTitle') }}
        </template>

        <template #subtitle>
            {{ t('livePickerSubtitle') }}
        </template>
    </PageHeader>

    <CardsNavMenu :items="liveDataNavGroups" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import PageHeader from 'src/components/PageHeader.vue';
import CardsNavMenu from 'src/components/navigation/CardsNavMenu.vue';
import { liveDataNavGroups } from './liveDataNavGroups';

const { t } = useI18n();
</script>

<style scoped>
.back-btn {
    margin-bottom: 2rem;
    border: 1px solid rgb(255 255 255 / 16%);
    background: rgb(255 255 255 / 6%);
}
</style>

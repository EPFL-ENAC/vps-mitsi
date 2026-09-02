<template>
    <PageHeader :eyebrow="t('changesPickerEyebrow')" eyebrow-class="text-warning" :level="1">
        <template #default>
            {{ t('changesPickerTitle') }}
        </template>

        <template #subtitle> {{ t('changesPickerSubtitle') }} </template>
    </PageHeader>

    <CardsNavMenu :items="changesNavGroups" :show-id-in-kicker="false" :media-width="128" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import CardsNavMenu from 'src/components/navigation/CardsNavMenu.vue';
import PageHeader from 'src/components/PageHeader.vue';
import { changesNavGroups } from './changesNavGroups';

const { t } = useI18n();
</script>

<style scoped>
.back-btn {
    margin-bottom: 2rem;
    border: 1px solid rgb(255 255 255 / 16%);
    background: rgb(255 255 255 / 6%);
}
</style>

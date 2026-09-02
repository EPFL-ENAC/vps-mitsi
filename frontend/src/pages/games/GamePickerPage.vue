<template>
    <PageHeader :eyebrow="t('gamePickerEyebrow')" eyebrow-class="text-negative" :level="1">
        <template #default>
            {{ t('gamePickerTitle') }}
        </template>

        <template #subtitle>
            {{ t('gamePickerSubtitle') }}
        </template>
    </PageHeader>

    <CardsNavMenu :items="gamesNavGroups" :show-id-in-kicker="false" :media-width="128" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import CardsNavMenu from 'src/components/navigation/CardsNavMenu.vue';
import PageHeader from 'src/components/PageHeader.vue';
import { gamesNavGroups } from './gamesNavGroups';

const { t } = useI18n();
</script>

<style scoped>
.back-btn {
    margin-bottom: 2rem;
    border: 1px solid rgb(255 255 255 / 16%);
    background: rgb(255 255 255 / 6%);
}
</style>

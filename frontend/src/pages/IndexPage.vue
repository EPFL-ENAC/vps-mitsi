<template>
    <PageHeader :eyebrow="t('homeEyebrow')" :level="2">
        <template #default>
            {{ t('homeTitle') }}
        </template>

        <template #subtitle>
            {{ t('homeSubtitle') }}
        </template>
    </PageHeader>

    <CardsNavMenu :items="items" />

    <QrCode />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from 'src/components/PageHeader.vue';
import QrCode from 'src/components/QrCode.vue';
import CardsNavMenu from 'src/components/navigation/CardsNavMenu.vue';
import type { NavMenuItem } from 'src/navigation/navMenuItem';

const { t } = useI18n();

const items = computed<NavMenuItem[]>(() => [
    {
        id: '01',
        shortLabel: t('homeLiveLabel'),
        label: t('homeLiveTitle'),
        title: t('homeLiveTitle'),
        subtitle: t('homeLiveSubtitle'),
        icon: 'waves',
        href: '/liveData',
        color: 'primary',
        textClass: 'text-primary',
    },
    {
        id: '02',
        shortLabel: t('homeDiscoveryLabel'),
        label: t('homeDiscoveryTitle'),
        title: t('homeDiscoveryTitle'),
        subtitle: t('homeDiscoverySubtitle'),
        icon: 'show_chart',
        href: '/changes',
        color: 'warning',
        textClass: 'text-warning',
    },
    {
        id: '03',
        shortLabel: t('homeGamesLabel'),
        label: t('homeGamesTitle'),
        title: t('homeGamesTitle'),
        subtitle: t('homeGamesSubtitle'),
        icon: 'explore',
        href: '/games',
        color: 'negative',
        textClass: 'text-negative',
    },
]);
</script>

<style scoped></style>

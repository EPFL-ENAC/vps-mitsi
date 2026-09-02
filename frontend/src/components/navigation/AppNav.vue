<template>
    <div class="app-nav">
        <q-btn
            :flat="'/' !== activeHref"
            rounded
            no-caps
            size="xl"
            icon="home"
            :label="t('backToHome')"
            class="back-btn"
            :color="'/' === activeHref ? activeColor : undefined"
            text-color="white"
            :class="['live-parentMenu', { active: '/' === activeHref }]"
            :to="'/'"
        />

        <q-btn
            v-if="parentMenu"
            :flat="parentMenu.href !== activeHref"
            rounded
            no-caps
            size="xl"
            :icon="parentMenu.icon"
            :label="t(parentMenu.label)"
            class="back-btn"
            :color="parentMenu.href === activeHref ? activeColor : undefined"
            text-color="white"
            :class="['live-parentMenu', { active: parentMenu.href === activeHref }]"
            :to="parentMenu.href"
        />

        <div
            class="live-tabs"
            v-if="tabs && tabs.length > 0 && tabs.some((tab) => tab.href === activeHref)"
        >
            <q-btn
                v-for="tab in tabs"
                :key="tab.href"
                rounded
                no-caps
                size="xl"
                :unelevated="tab.href === activeHref"
                :flat="tab.href !== activeHref"
                :icon="tab.icon"
                :label="t(tab.label)"
                :color="tab.href === activeHref ? activeColor : undefined"
                text-color="white"
                :class="['live-tab', { active: tab.href === activeHref }]"
                :to="tab.href"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import type { NavMenuItem } from 'src/navigation/navMenuItem';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { t } = useI18n();
const route = useRoute();

const activeColor = 'primary';
const parentMenu = computed(() => route.meta.parentMenu as NavMenuItem | undefined);
const tabs = computed(() => route.meta.tabs as NavMenuItem[] | undefined);

const activeHref = computed(() => route.path);
</script>

<style scoped>
.app-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: stretch;
}

.back-btn,
.live-tabs {
    border: 1px solid rgb(255 255 255 / 12%);
    background: rgb(255 255 255 / 8%);
}

.live-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.125rem;
    border-radius: 999px;
}

.live-tab {
    min-height: 42px;
    border-radius: 999px;
}

.live-tab:not(.active) {
    background: transparent;
}

@media (max-width: 900px) {
    .live-tabs {
        width: 100%;
        border-radius: 24px;
    }
}
</style>

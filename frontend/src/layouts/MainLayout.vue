<template>
    <q-layout view="hHh LpR lFf">
        <q-header elevated class="bg-white text-dark">
            <q-toolbar>
                <q-btn
                    flat
                    dense
                    round
                    icon="menu"
                    aria-label="Menu"
                    @click="leftDrawerOpen = !leftDrawerOpen"
                />
                <q-toolbar-title class="text-weight-medium">MITSI</q-toolbar-title>
                <q-space />
                <span class="text-caption text-grey-7 q-mr-sm">
                    IT service carbon impact assessment
                </span>
            </q-toolbar>
        </q-header>

        <q-drawer v-model="leftDrawerOpen" show-if-above :width="280" bordered>
            <q-list padding>
                <q-item clickable v-ripple to="/" exact>
                    <q-item-section avatar>
                        <q-icon name="home" />
                    </q-item-section>
                    <q-item-section>{{ blocks.welcome.label }}</q-item-section>
                </q-item>

                <q-separator spaced />

                <q-item
                    v-for="(block, key) in assessmentBlocks"
                    :key="key"
                    clickable
                    v-ripple
                    :to="block.to"
                >
                    <q-item-section avatar>
                        <q-icon :name="block.icon" />
                    </q-item-section>
                    <q-item-section>{{ block.label }}</q-item-section>
                    <q-item-section side>
                        <span
                            class="completion-dot"
                            :class="`completion-dot--${block.status}`"
                            :title="completionLabel(block.status)"
                        />
                    </q-item-section>
                </q-item>
            </q-list>
        </q-drawer>

        <q-page-container>
            <router-view />
        </q-page-container>

        <q-footer bordered class="bg-white text-dark">
            <q-toolbar class="q-px-md">
                <span class="text-caption text-grey-7">{{ savedText }}</span>
                <span v-if="exportedText" class="text-caption text-grey-6 q-ml-sm">
                    · {{ exportedText }}
                </span>
                <q-space />
                <span class="text-caption text-grey-8">Total: {{ totalLifespanText }}</span>
                <q-space />
                <span class="text-caption text-grey-7">
                    Per functional unit: {{ perFunctionalUnitText }}
                </span>
            </q-toolbar>
        </q-footer>
    </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import type { BlockKey, BlockStatus } from 'src/models/mitsi';
import { useMitsiStore } from 'src/stores/mitsi';

interface BlockDef {
    label: string;
    to: string;
    icon: string;
    status: BlockStatus;
}

const leftDrawerOpen = ref(false);
const mitsi = useMitsiStore();

const blocks = computed<Record<'welcome', { label: string }>>(() => ({
    welcome: { label: 'Welcome' },
}));

const assessmentBlocks = computed<Record<BlockKey, BlockDef>>(() => {
    const status = mitsi.blockStatus;
    return {
        scope: {
            label: 'Scope of the assessment',
            to: '/scope',
            icon: 'scope',
            status: status.scope,
        },
        inventory: {
            label: 'Hardware inventory',
            to: '/inventory',
            icon: 'dns',
            status: status.inventory,
        },
        energy: {
            label: 'Energy consumption',
            to: '/energy',
            icon: 'bolt',
            status: status.energy,
        },
        results: {
            label: 'Results',
            to: '/results',
            icon: 'insights',
            status: status.results,
        },
    };
});

function completionLabel(status: BlockStatus): string {
    switch (status) {
        case 'complete':
            return 'Complete';
        case 'partial':
            return 'In progress';
        default:
            return 'Not started';
    }
}

/** Total over the lifespan in tonnes of CO2-eq, or a dash until the scope is valid. */
const totalLifespanText = computed<string>(() =>
    mitsi.isScopeValid ? `${(mitsi.totalLifespan / 1000).toFixed(2)} tCO₂e` : '—',
);

/** Per-functional-unit emissions in grams of CO2-eq, or a dash when not computable. */
const perFunctionalUnitText = computed<string>(() => {
    const v = mitsi.perFunctionalUnit;
    return v !== null ? `${(v * 1000).toFixed(2)} gCO₂e` : '—';
});

const savedText = computed<string>(() =>
    mitsi.savedAt ? `Saved ${formatTimeAgo(mitsi.savedAt)}` : 'Draft saved in this browser',
);
const exportedText = computed<string | null>(() =>
    mitsi.exportedAt ? `Exported ${formatTimeAgo(mitsi.exportedAt)}` : null,
);

function formatTimeAgo(ts: number): string {
    const diffSec = Math.round((Date.now() - ts) / 1000);
    if (diffSec < 60) return 'just now';
    const mins = Math.round(diffSec / 60);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} h ago`;
    return `${Math.round(hrs / 24)} d ago`;
}
</script>

<style scoped>
.completion-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid #c2cbd6;
}

.completion-dot--partial {
    border-color: #8a5a00;
    background: linear-gradient(90deg, #8a5a00 50%, transparent 50%);
}

.completion-dot--complete {
    border-color: #0b7a55;
    background: #0b7a55;
}
</style>

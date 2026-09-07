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
                <span class="text-caption text-grey-7">Draft saved in this browser</span>
                <q-space />
                <span class="text-caption text-grey-8">Total: — tCO₂e</span>
                <q-space />
                <span class="text-caption text-grey-7">Per functional unit: — gCO₂e</span>
            </q-toolbar>
        </q-footer>
    </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

type BlockStatus = 'complete' | 'partial' | 'not_started';
type BlockKey = 'scope' | 'inventory' | 'energy' | 'results';

interface BlockDef {
    label: string;
    to: string;
    icon: string;
    status: BlockStatus;
}

const leftDrawerOpen = ref(false);

const blocks = computed<Record<'welcome', { label: string }>>(() => ({
    welcome: { label: 'Welcome' },
}));

// NOTE: completion states are placeholders for the foundation.
// They will be derived from the assessment store once the blocks are built.
const assessmentBlocks = computed<Record<BlockKey, BlockDef>>(() => ({
    scope: {
        label: 'Scope of the assessment',
        to: '/scope',
        icon: 'scope',
        status: 'not_started',
    },
    inventory: {
        label: 'Hardware inventory',
        to: '/inventory',
        icon: 'dns',
        status: 'not_started',
    },
    energy: {
        label: 'Energy consumption',
        to: '/energy',
        icon: 'bolt',
        status: 'not_started',
    },
    results: {
        label: 'Results',
        to: '/results',
        icon: 'insights',
        status: 'not_started',
    },
}));

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

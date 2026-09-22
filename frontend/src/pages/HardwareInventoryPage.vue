<template>
    <div class="q-pa-md inventory-page">
        <!-- Title + hint -->
        <div class="q-mb-md">
            <div class="text-h4">{{ $t('inventoryPageTitle') }}</div>
            <p class="text-grey-7 q-mb-none" style="max-width: 880px">
                {{ $t('inventoryPageHint') }}
            </p>
        </div>

        <!-- Scope gating hint -->
        <q-banner v-if="!mitsi.isScopeValid" inline-actions class="bg-warning text-white q-mb-md">
            {{ $t('inventoryNoScopeHint') }}
        </q-banner>

        <!-- Toolbar (one line): mode toggle left, Add row rightmost -->
        <div class="row items-center q-gutter-x-md q-mb-sm inventory-toolbar">
            <q-btn-toggle v-model="mode" toggle-color="primary" :options="modeOptions" />
            <q-btn
                unelevated
                color="primary"
                :label="$t('inventoryAddRow')"
                @click="mitsi.addHardwareItem()"
            />
        </div>

        <!-- Stats line -->
        <div class="row items-center q-col-gutter-md q-mb-sm">
            <div class="text-body1 text-weight-medium">
                {{
                    $t('inventoryStats', {
                        rows: rowsCount,
                        elements: elementsCount,
                        total: formatKg(mitsi.totalEmbodied),
                    })
                }}
            </div>
            <div class="text-grey-7 inventory-mode-hint">
                {{ $t('inventoryModeHint') }}
            </div>
        </div>

        <!-- Warning bar -->
        <q-banner
            v-if="mitsi.missingMandatoryHardware > 0"
            inline-actions
            class="bg-warning text-white q-mb-md"
        >
            {{ $t('inventoryWarningBar', { n: mitsi.missingMandatoryHardware }) }}
        </q-banner>

        <!-- No datacenters hint -->
        <q-banner
            v-if="mitsi.scope.datacenters.length === 0"
            inline-actions
            class="bg-grey-3 text-grey-8 q-mb-md"
        >
            {{ $t('inventoryNoDatacentersHint') }}
        </q-banner>

        <!-- Inventory table -->
        <HardwareInventoryTable :mode="mode" />

        <!-- Footer -->
        <div class="row items-center q-mt-md inventory-footer">
            <div class="text-body1">
                {{ $t('inventoryFooter', { n: mitsi.secondHandExcludedCount }) }}
            </div>
            <div class="text-body1 text-weight-medium" style="margin-left: auto">
                {{ formatKg(mitsi.totalEmbodied) }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import HardwareInventoryTable from 'src/components/inventory/HardwareInventoryTable.vue';
import type { VisibilityMode } from 'src/models/inventory-columns';
import { formatKg } from 'src/utils/format';
import { useMitsiStore } from 'src/stores/mitsi';

const { t } = useI18n();
const mitsi = useMitsiStore();

// ── Local UI state (never persisted) ─────────────────────────────────────────
const mode = ref<VisibilityMode>('normal');
const modeOptions = [
    { label: t('inventoryModeSimple'), value: 'simple' },
    { label: t('inventoryModeNormal'), value: 'normal' },
    { label: t('inventoryModeAdvanced'), value: 'advanced' },
];

// ── Stats line (display-only) ────────────────────────────────────────────────
const rowsCount = computed<number>(() => mitsi.hardware.length);
const elementsCount = computed<number>(() =>
    mitsi.hardware.reduce((sum, h) => sum + (h.quantity || 0), 0),
);
</script>

<style scoped>
.inventory-toolbar {
    flex-wrap: nowrap;
}

.inventory-mode-hint {
    font-size: 13px;
}

.inventory-footer {
    border-top: 1px solid #e6e9ef;
    padding-top: 12px;
}
</style>

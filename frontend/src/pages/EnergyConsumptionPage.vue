<template>
    <div class="q-pa-md">
        <div class="text-h4 q-mb-sm">{{ $t('energyPageTitle') }}</div>
        <p class="text-grey-7 q-mb-md">{{ $t('energyPageHint') }}</p>
        <!-- Scope gating hint -->
        <q-banner v-if="!mitsi.isScopeValid" inline-actions class="bg-warning text-white q-mb-md">
            {{ $t('energyNoScopeHint') }}
        </q-banner>

        <!-- Usage monitoring period -->
        <q-card flat bordered class="energy-zone q-mb-md">
            <q-expansion-item default-opened>
                <template #header>
                    <q-item-section class="energy-zone-title">
                        <q-item-label>{{ $t('energyMonitorTitle') }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <span class="energy-badge energy-badge--calc"
                            >∑<q-tooltip>{{ $t('scopeBadgeCalcTooltip') }}</q-tooltip></span
                        >
                    </q-item-section>
                </template>

                <q-separator />

                <q-card-section>
                    <EnergyMonitoringPeriodForm />
                </q-card-section>
            </q-expansion-item>
        </q-card>

        <q-banner
            v-if="!mitsi.scope.datacenters.length"
            inline-actions
            class="bg-info text-white q-mb-md"
        >
            {{ $t('energyNoDatacentersHint') }}
        </q-banner>

        <!-- Datacenters' information -->
        <q-card flat bordered class="energy-zone q-mb-md">
            <q-expansion-item default-opened>
                <template #header>
                    <q-item-section class="energy-zone-title">
                        <q-item-label>
                            {{ $t('energyDcTitle') }}
                            <q-tooltip>
                                {{ $t('energyDcColumnsTooltip') }}
                            </q-tooltip>
                        </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <span class="energy-badge energy-badge--calc">
                            ∑
                            <q-tooltip>{{ $t('scopeBadgeCalcTooltip') }}</q-tooltip>
                        </span>
                    </q-item-section>
                </template>

                <q-separator />

                <q-card-section>
                    <EnergyDatacentersTable />
                </q-card-section>
            </q-expansion-item>
        </q-card>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import EnergyMonitoringPeriodForm from 'src/components/energy/EnergyMonitoringPeriodForm.vue';
import EnergyDatacentersTable from 'src/components/energy/EnergyDatacentersTable.vue';
import { useMitsiStore } from 'src/stores/mitsi';

const mitsi = useMitsiStore();

// Gap-fill safety net; intentionally deleted records are re-created on revisit —
// energy records follow datacenters (spec auto-fill).
onMounted(() => mitsi.ensureEnergyRows());
</script>

<style scoped>
.energy-zone-title {
    font-weight: 600;
}
.energy-badge {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
}
.energy-badge--calc {
    background: #fff0f1;
    color: #c1001a;
    font-weight: 600;
}
</style>

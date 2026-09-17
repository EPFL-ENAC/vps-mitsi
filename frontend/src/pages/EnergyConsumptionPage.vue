<template>
    <div class="q-pa-md">
        <div class="text-h4 q-mb-sm">{{ $t('energyPageTitle') }}</div>
        <p class="text-grey-7 q-mb-md">{{ $t('energyPageHint') }}</p>

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
                    <div class="row items-center q-col-gutter-x-sm q-py-xs">
                        <div class="col-2">
                            <div class="energy-th">{{ $t('energyMonitorUnitLabel') }}</div>
                        </div>
                        <div class="col-2">
                            <div class="energy-th">{{ $t('energyMonitorValueLabel') }}</div>
                        </div>
                        <div class="col-8">
                            <div class="energy-th">{{ $t('energyMonitorCommentLabel') }}</div>
                        </div>
                    </div>
                    <div class="row items-center q-col-gutter-x-sm q-py-xs">
                        <div class="col-2">
                            <q-select
                                class="full-width"
                                :model-value="mitsi.monitoringPeriod.unit"
                                @update:model-value="
                                    (v) =>
                                        (mitsi.monitoringPeriod.unit = String(
                                            v ?? '',
                                        ) as MonitoringUnit)
                                "
                                :options="monitoringUnitOptions"
                                emit-value
                                map-options
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-2">
                            <q-input
                                type="number"
                                class="full-width"
                                :model-value="mitsi.monitoringPeriod.value"
                                @update:model-value="
                                    (v) => (mitsi.monitoringPeriod.value = toNum(v))
                                "
                                :rules="[positiveNumber(t('energyMonitorValueLabel'))]"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-8">
                            <q-input
                                class="full-width"
                                :model-value="mitsi.monitoringPeriod.comment"
                                @update:model-value="
                                    (v) => (mitsi.monitoringPeriod.comment = String(v ?? ''))
                                "
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                    </div>
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
                        <q-item-label
                            >{{ $t('energyDcTitle')
                            }}<q-tooltip>{{
                                $t('energyDcColumnsTooltip')
                            }}</q-tooltip></q-item-label
                        >
                    </q-item-section>
                    <q-item-section side>
                        <span class="energy-badge energy-badge--calc"
                            >∑<q-tooltip>{{ $t('scopeBadgeCalcTooltip') }}</q-tooltip></span
                        >
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section>
                    <div class="row items-center q-col-gutter-x-sm q-py-xs">
                        <div class="col-1">
                            <div class="energy-th">{{ $t('energyDcColName') }}</div>
                        </div>
                        <div class="col-1">
                            <div class="energy-th">{{ $t('energyDcColNameComment') }}</div>
                        </div>
                        <div class="col-1">
                            <div class="energy-th">{{ $t('energyDcColLocation') }}</div>
                        </div>
                        <div class="col-1">
                            <div class="energy-th">{{ $t('energyDcColLocationComment') }}</div>
                        </div>
                        <div class="col-1">
                            <div class="energy-th">{{ $t('energyDcColIntensity') }}</div>
                        </div>
                        <div class="col-1">
                            <div class="energy-th">{{ $t('energyDcColIntensityComment') }}</div>
                        </div>
                        <div class="col-1">
                            <div class="energy-th">{{ $t('energyDcColPue') }}</div>
                        </div>
                        <div class="col-1">
                            <div class="energy-th">{{ $t('energyDcColPueComment') }}</div>
                        </div>
                        <div class="col-1">
                            <div class="energy-th">{{ $t('energyDcColKwh') }}</div>
                        </div>
                        <div class="col-2">
                            <div class="energy-th">{{ $t('energyDcColKwhComment') }}</div>
                        </div>
                        <div class="col-1" />
                    </div>
                    <div
                        v-for="e in mitsi.energy"
                        :key="e.datacenterId"
                        class="row items-center q-col-gutter-x-sm q-py-xs"
                    >
                        <div class="col-1">
                            <div class="text-grey-8 ellipsis">{{ dcLabel(e.datacenterId) }}</div>
                        </div>
                        <div class="col-1">
                            <q-input
                                class="full-width"
                                :model-value="e.comment"
                                @update:model-value="(v) => (e.comment = String(v ?? ''))"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-1">
                            <q-input
                                class="full-width"
                                :model-value="e.location"
                                @update:model-value="(v) => (e.location = String(v ?? ''))"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-1">
                            <q-input
                                class="full-width"
                                :model-value="e.locationComment"
                                @update:model-value="(v) => (e.locationComment = String(v ?? ''))"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-1">
                            <q-input
                                type="number"
                                class="full-width"
                                :model-value="e.carbonIntensity"
                                @update:model-value="(v) => (e.carbonIntensity = toNum(v))"
                                :rules="[positiveNumber(t('energyDcColIntensity'))]"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-1">
                            <q-input
                                class="full-width"
                                :model-value="e.carbonIntensityComment"
                                @update:model-value="
                                    (v) => (e.carbonIntensityComment = String(v ?? ''))
                                "
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-1">
                            <q-input
                                type="number"
                                class="full-width"
                                :model-value="e.pue"
                                @update:model-value="(v) => (e.pue = pueNum(v))"
                                :rules="[optionalNumber(t('energyDcColPue'))]"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-1">
                            <q-input
                                class="full-width"
                                :model-value="e.pueComment"
                                @update:model-value="(v) => (e.pueComment = String(v ?? ''))"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-1">
                            <q-input
                                type="number"
                                class="full-width"
                                :model-value="e.energyConsumption"
                                @update:model-value="(v) => (e.energyConsumption = toNum(v))"
                                :rules="[nonNegativeNumber(t('energyDcColKwh'))]"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-2">
                            <q-input
                                class="full-width"
                                :model-value="e.energyComment"
                                @update:model-value="(v) => (e.energyComment = String(v ?? ''))"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-1 text-right">
                            <q-btn
                                flat
                                dense
                                icon="delete"
                                :aria-label="$t('energyDcDeleteRow')"
                                @click="deleteEnergyRow(e)"
                            />
                        </div>
                    </div>
                </q-card-section>
            </q-expansion-item>
        </q-card>
    </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useMitsiStore } from 'src/stores/mitsi';
import { nonNegativeNumber, optionalNumber, positiveNumber } from 'src/models/validation';
import { MonitoringUnitSchema } from 'src/models/schema';
import type { DatacenterEnergy, MonitoringUnit } from 'src/models/mitsi';

const mitsi = useMitsiStore();
const { t } = useI18n();
const $q = useQuasar();

/** The page is display + input only: rows for each datacenter are gap-filled
 *  (blank row when none). Referential integrity is owned by the store's data
 *  boundary (parseState → sanitizeReferences) — the page never deletes or
 *  filters orphan rows. */
onMounted(() => mitsi.ensureEnergyRows());
watch(
    () => mitsi.scope.datacenters.length,
    (newCount, oldCount) => {
        // Gap-fill only — never removes rows on datacenter deletion.
        if (newCount > oldCount) mitsi.ensureEnergyRows();
    },
);

const monitoringUnitOptions = MonitoringUnitSchema.options.map((unit) => ({
    label: t(`energyMonitorUnit${unit.charAt(0).toUpperCase()}${unit.slice(1)}`),
    value: unit,
}));

// ── Display-only helpers (never written back to the store) ──────────────────
function toNum(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

/** PUE is optional: an empty field is stored as `undefined`, not 0. */
function pueNum(v: unknown): number | undefined {
    if (v === '' || v === null || v === undefined) return undefined;
    return toNum(v);
}

function dcLabel(datacenterId: string): string {
    return mitsi.scope.datacenters.find((dc) => dc.id === datacenterId)?.name || datacenterId;
}

function deleteEnergyRow(row: DatacenterEnergy): void {
    $q.dialog({
        title: t('energyDeleteRowConfirmTitle'),
        message: t('energyDeleteRowConfirmMessage', { name: dcLabel(row.datacenterId) }),
        cancel: true,
        persistent: true,
    }).onOk(() => {
        const i = mitsi.energy.findIndex((e) => e.datacenterId === row.datacenterId);
        if (i !== -1) mitsi.energy.splice(i, 1);
    });
}
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
.energy-th {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgba(0, 0, 0, 0.6);
}
</style>

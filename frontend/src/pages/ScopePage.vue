<template>
    <div class="q-pa-md scope-page">
        <div class="text-h4 q-mb-sm">{{ $t('scopePageTitle') }}</div>
        <p class="text-grey-7">
            {{ $t('scopePageHint') }}
        </p>

        <q-banner v-if="!mitsi.isScopeValid" inline-actions class="bg-warning text-white q-mb-md">
            {{ $t('scopeBlockFirstHint') }}
        </q-banner>

        <!-- General (report-only) -->
        <q-card flat bordered class="scope-zone q-mb-md">
            <q-expansion-item default-opened>
                <template #header>
                    <q-item-section class="scope-zone-title">
                        <q-item-label>{{ $t('scopeGeneralTitle') }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <span class="scope-badge scope-badge--report"
                            >{{ $t('scopeReportOnly')
                            }}<q-tooltip>{{ $t('scopeBadgeReportTooltip') }}</q-tooltip></span
                        >
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section>
                    <div class="row q-col-gutter-md">
                        <div class="col-12 col-md-4">
                            <q-input
                                v-model="mitsi.scope.organizationName"
                                :label="$t('scopeOrganizationLabel')"
                                :rules="[required(t('scopeOrganizationLabel'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-12 col-md-4">
                            <q-input
                                v-model="mitsi.scope.assessors"
                                :label="$t('scopeAssessorsLabel')"
                                :rules="[required(t('scopeAssessorsLabel'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-12 col-md-4">
                            <q-input
                                v-model="mitsi.scope.serviceName"
                                :label="$t('scopeServiceNameLabel')"
                                :rules="[required(t('scopeServiceNameLabel'))]"
                                dense
                                outlined
                            >
                                <q-tooltip>{{ $t('scopeServiceNameTooltip') }}</q-tooltip>
                            </q-input>
                        </div>
                    </div>
                </q-card-section>
            </q-expansion-item>
        </q-card>

        <!-- Function (used in calculation) -->
        <q-card flat bordered class="scope-zone q-mb-md">
            <q-expansion-item :default-opened="!mitsi.isScopeValid">
                <template #header>
                    <q-item-section class="scope-zone-title">
                        <q-item-label>{{ $t('scopeFunctionTitle') }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <span class="scope-badge scope-badge--calc"
                            >∑ {{ $t('scopeUsedInCalculation')
                            }}<q-tooltip>{{ $t('scopeBadgeCalcTooltip') }}</q-tooltip></span
                        >
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section>
                    <div class="row q-col-gutter-md">
                        <div class="col-12">
                            <q-input
                                type="textarea"
                                v-model="mitsi.scope.function"
                                :label="$t('scopeFunctionLabel')"
                                :rules="[required(t('scopeFunctionLabel'))]"
                                outlined
                            >
                                <q-tooltip>{{ $t('scopeFunctionTooltip') }}</q-tooltip>
                            </q-input>
                        </div>

                        <div class="col-12">
                            <div class="text-subtitle2 q-mb-xs">
                                {{ $t('scopeFunctionalUnitLabel') }}
                            </div>
                            <div class="scope-fu row items-center q-gutter-sm flex-nowrap">
                                <span>{{ $t('scopeFuBefore') }}</span>
                                <q-input
                                    type="number"
                                    class="scope-fu-input"
                                    v-model.number="mitsi.scope.functionalUnit.usageDuration"
                                    :rules="[positiveNumber(t('scopeFuDuration'))]"
                                    dense
                                    outlined
                                    hide-bottom-space
                                >
                                    <q-tooltip>{{ $t('scopeFuDurationTooltip') }}</q-tooltip>
                                </q-input>
                                <q-select
                                    class="scope-fu-select"
                                    :model-value="mitsi.scope.functionalUnit.timeUnit"
                                    @update:model-value="
                                        (v) => (mitsi.scope.functionalUnit.timeUnit = v)
                                    "
                                    :options="timeUnitOptions"
                                    emit-value
                                    map-options
                                    dense
                                    outlined
                                >
                                    <q-tooltip anchor="top middle" self="top middle">{{
                                        $t('scopeFuTimeUnitTooltip')
                                    }}</q-tooltip>
                                </q-select>
                                <span>{{ $t('scopeFuMiddle') }}</span>
                                <q-input
                                    type="number"
                                    class="scope-fu-input"
                                    v-model.number="mitsi.scope.functionalUnit.resourceCount"
                                    :rules="[positiveInteger(t('scopeFuResourceCount'))]"
                                    dense
                                    outlined
                                    hide-bottom-space
                                >
                                    <q-tooltip>{{ $t('scopeFuResourceCountTooltip') }}</q-tooltip>
                                </q-input>
                                <q-select
                                    class="scope-fu-select scope-fu-select--grow"
                                    :model-value="mitsi.scope.functionalUnit.resourceType"
                                    @update:model-value="
                                        (v) => {
                                            mitsi.scope.functionalUnit.resourceType = String(
                                                v ?? '',
                                            );
                                        }
                                    "
                                    :options="resourceTypeOptions"
                                    emit-value
                                    map-options
                                    dense
                                    outlined
                                >
                                    <q-tooltip anchor="center right" self="center left">{{
                                        $t('scopeFuResourceTypeTooltip')
                                    }}</q-tooltip>
                                </q-select>
                            </div>
                        </div>
                    </div>
                </q-card-section>
            </q-expansion-item>
        </q-card>

        <!-- Boundaries — datacenters -->
        <q-card flat bordered class="scope-zone q-mb-md">
            <q-expansion-item default-opened>
                <template #header>
                    <q-item-section class="scope-zone-title">
                        <q-item-label
                            >{{ $t('scopeBoundariesDcTitle')
                            }}<q-tooltip>{{ $t('scopeDcColumnsTooltip') }}</q-tooltip></q-item-label
                        >
                    </q-item-section>
                    <q-item-section side>
                        <span class="scope-badge scope-badge--report"
                            >{{ $t('scopeReportOnly')
                            }}<q-tooltip>{{ $t('scopeBadgeReportTooltip') }}</q-tooltip></span
                        >
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section>
                    <q-btn
                        flat
                        color="primary"
                        class="q-mb-sm"
                        :label="$t('scopeDcAdd')"
                        @click="addDatacenter"
                    />
                    <div class="row items-center q-col-gutter-x-sm q-py-xs">
                        <div class="col-3">
                            <div class="scope-th">{{ $t('scopeDcColAbbreviation') }}</div>
                        </div>
                        <div class="col-3">
                            <div class="scope-th">{{ $t('scopeDcColName') }}</div>
                        </div>
                        <div class="col-3">
                            <div class="scope-th">{{ $t('scopeDcColComment') }}</div>
                        </div>
                        <div class="col-2">
                            <div class="scope-th text-right">{{ $t('scopeDcColUsedBy') }}</div>
                        </div>
                        <div class="col-1" />
                    </div>
                    <div
                        v-for="dc in mitsi.scope.datacenters"
                        :key="dc.id"
                        class="row items-center q-col-gutter-x-sm q-py-xs"
                    >
                        <div class="col-3">
                            <q-input
                                class="full-width"
                                v-model="dc.abbreviation"
                                :rules="[required(t('scopeDcColAbbreviation'))]"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-3">
                            <q-input
                                class="full-width"
                                v-model="dc.name"
                                :rules="[required(t('scopeDcColName'))]"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-3">
                            <q-input
                                class="full-width"
                                v-model="dc.comment"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </div>
                        <div class="col-2 text-right text-grey-7">
                            {{ usedByCell(dc) }}
                        </div>
                        <div class="col-1 text-right">
                            <q-btn
                                flat
                                dense
                                icon="delete"
                                :aria-label="$t('scopeDcDelete')"
                                @click="removeDatacenter(dc)"
                            />
                        </div>
                    </div>
                </q-card-section>
            </q-expansion-item>
        </q-card>

        <!-- Boundaries — included & excluded -->
        <q-card flat bordered class="scope-zone q-mb-md">
            <q-expansion-item>
                <template #header>
                    <q-item-section class="scope-zone-title">
                        <q-item-label
                            >{{ $t('scopeBoundariesInclExclTitle')
                            }}<q-tooltip>{{
                                $t('scopeBndColumnsTooltip')
                            }}</q-tooltip></q-item-label
                        >
                    </q-item-section>
                    <q-item-section side>
                        <span class="scope-badge scope-badge--report"
                            >{{ $t('scopeReportOnly')
                            }}<q-tooltip>{{ $t('scopeBadgeReportTooltip') }}</q-tooltip></span
                        >
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section>
                    <div class="text-subtitle1 q-mb-xs">{{ $t('scopeBndIncludedTitle') }}</div>
                    <q-btn
                        flat
                        color="primary"
                        dense
                        class="q-mb-sm"
                        :label="$t('scopeBndAdd')"
                        @click="addItem('included')"
                    />
                    <div
                        v-for="item in mitsi.scope.includedItems"
                        :key="item.id"
                        class="row items-start q-col-gutter-sm q-mb-sm"
                    >
                        <div class="col-3">
                            <q-input
                                v-model="item.type"
                                :placeholder="$t('scopeBndColType')"
                                :rules="[required(t('scopeBndColType'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-3">
                            <q-input
                                v-model="item.purpose"
                                :placeholder="$t('scopeBndColPurpose')"
                                :rules="[required(t('scopeBndColPurpose'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-5">
                            <q-input
                                v-model="item.reason"
                                :placeholder="$t('scopeBndColReasonInclusion')"
                                :rules="[required(t('scopeBndColReasonInclusion'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-1 text-right">
                            <q-btn
                                flat
                                dense
                                icon="delete"
                                :aria-label="$t('scopeBndDelete')"
                                @click="removeItem('included', item.id)"
                            />
                        </div>
                    </div>

                    <q-separator spaced />

                    <div class="text-subtitle1 q-mb-xs">{{ $t('scopeBndExcludedTitle') }}</div>
                    <q-btn
                        flat
                        color="primary"
                        dense
                        class="q-mb-sm"
                        :label="$t('scopeBndAdd')"
                        @click="addItem('excluded')"
                    />
                    <div
                        v-for="item in mitsi.scope.excludedItems"
                        :key="item.id"
                        class="row items-start q-col-gutter-sm q-mb-sm"
                    >
                        <div class="col-3">
                            <q-input
                                v-model="item.type"
                                :placeholder="$t('scopeBndColType')"
                                :rules="[required(t('scopeBndColType'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-3">
                            <q-input
                                v-model="item.purpose"
                                :placeholder="$t('scopeBndColPurpose')"
                                :rules="[required(t('scopeBndColPurpose'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-5">
                            <q-input
                                v-model="item.reason"
                                :placeholder="$t('scopeBndColReasonExclusion')"
                                :rules="[required(t('scopeBndColReasonExclusion'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-1 text-right">
                            <q-btn
                                flat
                                dense
                                icon="delete"
                                :aria-label="$t('scopeBndDelete')"
                                @click="removeItem('excluded', item.id)"
                            />
                        </div>
                    </div>
                </q-card-section>
            </q-expansion-item>
        </q-card>

        <!-- Lifespan -->
        <q-card flat bordered class="scope-zone q-mb-md">
            <q-expansion-item default-opened>
                <template #header>
                    <q-item-section class="scope-zone-title">
                        <q-item-label>{{ $t('scopeLifespanTitle') }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <span class="scope-badge scope-badge--calc"
                            >∑<q-tooltip>{{ $t('scopeBadgeCalcTooltip') }}</q-tooltip></span
                        >
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section>
                    <q-input
                        type="number"
                        class="scope-lifespan"
                        v-model.number="mitsi.scope.lifespanYears"
                        :label="$t('scopeLifespanLabel')"
                        :suffix="$t('scopeLifespanYears')"
                        :rules="[positiveNumber(t('scopeLifespanLabel'))]"
                        dense
                        outlined
                    />
                </q-card-section>
            </q-expansion-item>
        </q-card>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';

import type { Datacenter } from 'src/models/mitsi';
import { useMitsiStore } from 'src/stores/mitsi';
import { positiveInteger, positiveNumber, required } from 'src/models/validation';
import { TimeUnitSchema } from 'src/models/schema';
import { normalizeKey } from 'src/utils/format';

const { t } = useI18n();
const $q = useQuasar();
const mitsi = useMitsiStore();

const timeUnitOptions = computed(() =>
    TimeUnitSchema.options.map((unit) => ({
        label: t('scopeTimeUnit_' + normalizeKey(unit)),
        value: unit,
    })),
);

const resourceTypeOptions = computed(() => [
    { label: t('scopeResourceTypeCpu'), value: 'CPU' },
    { label: t('scopeResourceTypeGpu'), value: 'GPU' },
]);

function addDatacenter(): void {
    mitsi.scope.datacenters.push({
        id: crypto.randomUUID(),
        abbreviation: '',
        name: '',
        comment: '',
    });
}

function usedByCell(dc: Datacenter): string {
    const guard = mitsi.deleteDatacenterGuard(dc.id);
    if (!guard) return t('scopeDcUsedByNone');
    return t('scopeDcUsedByCounts', {
        inv: t('scopeDcInvRows', guard.hardwareRowCount),
        eng: t('scopeDcEngRecords', guard.energyRecordCount),
    });
}

function removeDatacenter(dc: Datacenter): void {
    const guard = mitsi.deleteDatacenterGuard(dc.id);
    const name = dc.abbreviation || dc.name || t('scopeDcColAbbreviation');
    if (guard) {
        $q.dialog({
            title: t('scopeDcDeleteBlockedTitle'),
            message: t('scopeDcDeleteBlocked', {
                name,
                inv: t('scopeDcInvRows', guard.hardwareRowCount),
                eng: t('scopeDcEngRecords', guard.energyRecordCount),
            }),
            ok: true,
        });
        return;
    }
    $q.dialog({
        title: t('scopeDcDeleteConfirmTitle'),
        message: t('scopeDcDeleteConfirmMessage', { name }),
        cancel: true,
        persistent: true,
    }).onOk(() => {
        const i = mitsi.scope.datacenters.findIndex((d) => d.id === dc.id);
        if (i >= 0) mitsi.scope.datacenters.splice(i, 1);
    });
}

//maybe to change, add function in store not here if we even use store so why just dont put it all there to centrelize
function addItem(which: 'included' | 'excluded'): void {
    const item = { id: crypto.randomUUID(), type: '', purpose: '', reason: '' };
    if (which === 'included') mitsi.scope.includedItems.push(item);
    else mitsi.scope.excludedItems.push(item);
}

function removeItem(which: 'included' | 'excluded', id: string): void {
    const list = which === 'included' ? mitsi.scope.includedItems : mitsi.scope.excludedItems;
    const i = list.findIndex((it) => it.id === id);
    if (i >= 0) list.splice(i, 1);
}
</script>

<style scoped>
.scope-zone-title {
    font-weight: 600;
}

.scope-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 999px;
    white-space: nowrap;
    margin-right: 8px;
}

.scope-badge--calc {
    background: #fff0f1;
    color: #c1001a;
    font-weight: 600;
}

.scope-badge--report {
    background: #eff2f6;
    color: #48525f;
}

.scope-fu-input {
    width: 90px;
}

.scope-fu-select {
    width: 120px;
    min-width: 110px;
}

.scope-fu-select--grow {
    width: 160px;
    min-width: 140px;
}

.scope-lifespan {
    max-width: 220px;
}

.scope-th {
    font-size: 12px;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #78828f;
    font-weight: 600;
}
</style>

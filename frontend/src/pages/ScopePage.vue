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
                        <span class="scope-badge scope-badge--report">{{
                            $t('scopeReportOnly')
                        }}</span>
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section>
                    <div class="row q-col-gutter-md">
                        <div class="col-12 col-md-4">
                            <q-input
                                :model-value="mitsi.scope.organizationName"
                                @update:model-value="
                                    (v) => (mitsi.scope.organizationName = String(v ?? ''))
                                "
                                :label="$t('scopeOrganizationLabel')"
                                :rules="[required(t('scopeOrganizationLabel'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-12 col-md-4">
                            <q-input
                                :model-value="mitsi.scope.assessors"
                                @update:model-value="
                                    (v) => (mitsi.scope.assessors = String(v ?? ''))
                                "
                                :label="$t('scopeAssessorsLabel')"
                                :rules="[required(t('scopeAssessorsLabel'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-12 col-md-4">
                            <q-input
                                :model-value="mitsi.scope.serviceName"
                                @update:model-value="
                                    (v) => (mitsi.scope.serviceName = String(v ?? ''))
                                "
                                :label="$t('scopeServiceNameLabel')"
                                :hint="$t('scopeServiceNameHint')"
                                :rules="[required(t('scopeServiceNameLabel'))]"
                                dense
                                outlined
                            />
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
                            >∑ {{ $t('scopeUsedInCalculation') }}</span
                        >
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section>
                    <div class="row q-col-gutter-md">
                        <div class="col-12">
                            <q-input
                                type="textarea"
                                :model-value="mitsi.scope.function"
                                @update:model-value="
                                    (v) => (mitsi.scope.function = String(v ?? ''))
                                "
                                :label="$t('scopeFunctionLabel')"
                                :hint="$t('scopeFunctionHint')"
                                :rules="[required(t('scopeFunctionLabel'))]"
                                outlined
                            />
                        </div>

                        <div class="col-12">
                            <div class="text-subtitle2 q-mb-xs">
                                {{ $t('scopeFunctionalUnitLabel') }}
                            </div>
                            <div class="scope-fu row items-center q-gutter-sm flex-wrap">
                                <span>{{ $t('scopeFuBefore') }}</span>
                                <q-input
                                    type="number"
                                    class="scope-fu-input"
                                    :model-value="mitsi.scope.functionalUnit.usageDuration"
                                    @update:model-value="
                                        (v) => (mitsi.scope.functionalUnit.usageDuration = toNum(v))
                                    "
                                    :rules="[positiveNumber(t('scopeFuDuration'))]"
                                    dense
                                    outlined
                                />
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
                                />
                                <span>{{ $t('scopeFuMiddle') }}</span>
                                <q-input
                                    type="number"
                                    class="scope-fu-input"
                                    :model-value="mitsi.scope.functionalUnit.resourceCount"
                                    @update:model-value="
                                        (v) => (mitsi.scope.functionalUnit.resourceCount = toNum(v))
                                    "
                                    :rules="[positiveInteger(t('scopeFuResourceCount'))]"
                                    dense
                                    outlined
                                />
                                <q-select
                                    class="scope-fu-select scope-fu-select--grow"
                                    :model-value="mitsi.scope.functionalUnit.resourceType"
                                    @update:model-value="
                                        (v) =>
                                            (mitsi.scope.functionalUnit.resourceType = String(
                                                v ?? '',
                                            ))
                                    "
                                    :options="resourceTypeOptions"
                                    :placeholder="$t('scopeResourceTypePlaceholder')"
                                    use-input
                                    input-debounce="0"
                                    new-value-mode="add"
                                    dense
                                    outlined
                                />
                            </div>
                        </div>

                        <div class="col-12 col-md-4">
                            <q-input
                                type="number"
                                :model-value="mitsi.scope.resourcesInService"
                                @update:model-value="
                                    (v) => (mitsi.scope.resourcesInService = toNum(v))
                                "
                                :label="$t('scopeResourcesInServiceLabel')"
                                :hint="$t('scopeResourcesInServiceHint')"
                                :rules="[nonNegativeNumber(t('scopeResourcesInServiceLabel'))]"
                                dense
                                outlined
                            />
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
                        <q-item-label>{{ $t('scopeBoundariesDcTitle') }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <span class="scope-badge scope-badge--report">{{
                            $t('scopeReportOnly')
                        }}</span>
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
                    <div v-if="mitsi.scope.datacenters.length" class="scope-table">
                        <div class="scope-table__row scope-table__row--head">
                            <div class="scope-table__cell col-3">
                                {{ $t('scopeDcColAbbreviation') }}
                            </div>
                            <div class="scope-table__cell col-3">{{ $t('scopeDcColName') }}</div>
                            <div class="scope-table__cell col-3">{{ $t('scopeDcColComment') }}</div>
                            <div class="scope-table__cell col-2 text-right">
                                {{ $t('scopeDcColUsedBy') }}
                            </div>
                            <div class="scope-table__cell col-1" />
                        </div>
                        <div
                            v-for="dc in mitsi.scope.datacenters"
                            :key="dc.id"
                            class="scope-table__row"
                        >
                            <div class="scope-table__cell col-3">
                                <q-input
                                    :model-value="dc.abbreviation"
                                    @update:model-value="(v) => (dc.abbreviation = String(v ?? ''))"
                                    :rules="[required(t('scopeDcColAbbreviation'))]"
                                    dense
                                    outlined
                                />
                            </div>
                            <div class="scope-table__cell col-3">
                                <q-input
                                    :model-value="dc.name"
                                    @update:model-value="(v) => (dc.name = String(v ?? ''))"
                                    :rules="[required(t('scopeDcColName'))]"
                                    dense
                                    outlined
                                />
                            </div>
                            <div class="scope-table__cell col-3">
                                <q-input
                                    :model-value="dc.comment"
                                    @update:model-value="(v) => (dc.comment = String(v ?? ''))"
                                    dense
                                    outlined
                                />
                            </div>
                            <div class="scope-table__cell col-2 text-right text-grey-7">
                                {{ usedByCell(dc) }}
                            </div>
                            <div class="scope-table__cell col-1 text-right">
                                <q-btn
                                    flat
                                    dense
                                    icon="delete"
                                    :aria-label="$t('scopeDcDelete')"
                                    @click="removeDatacenter(dc)"
                                />
                            </div>
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
                        <q-item-label>{{ $t('scopeBoundariesInclExclTitle') }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <span class="scope-badge scope-badge--report">{{
                            $t('scopeReportOnly')
                        }}</span>
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
                                :model-value="item.type"
                                @update:model-value="(v) => (item.type = String(v ?? ''))"
                                :placeholder="$t('scopeBndColType')"
                                :rules="[required(t('scopeBndColType'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-3">
                            <q-input
                                :model-value="item.purpose"
                                @update:model-value="(v) => (item.purpose = String(v ?? ''))"
                                :placeholder="$t('scopeBndColPurpose')"
                                :rules="[required(t('scopeBndColPurpose'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-5">
                            <q-input
                                :model-value="item.reason"
                                @update:model-value="(v) => (item.reason = String(v ?? ''))"
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
                                :model-value="item.type"
                                @update:model-value="(v) => (item.type = String(v ?? ''))"
                                :placeholder="$t('scopeBndColType')"
                                :rules="[required(t('scopeBndColType'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-3">
                            <q-input
                                :model-value="item.purpose"
                                @update:model-value="(v) => (item.purpose = String(v ?? ''))"
                                :placeholder="$t('scopeBndColPurpose')"
                                :rules="[required(t('scopeBndColPurpose'))]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-5">
                            <q-input
                                :model-value="item.reason"
                                @update:model-value="(v) => (item.reason = String(v ?? ''))"
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
                        <span class="scope-badge scope-badge--calc">∑</span>
                    </q-item-section>
                </template>
                <q-separator />
                <q-card-section>
                    <q-input
                        type="number"
                        class="scope-lifespan"
                        :model-value="mitsi.scope.lifespanYears"
                        @update:model-value="(v) => (mitsi.scope.lifespanYears = toNum(v))"
                        :label="$t('scopeLifespanLabel')"
                        :hint="$t('scopeLifespanHint')"
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
import {
    nonNegativeNumber,
    positiveInteger,
    positiveNumber,
    required,
} from 'src/models/validation';
import { TimeUnitSchema } from 'src/models/schema';

const { t } = useI18n();
const $q = useQuasar();
const mitsi = useMitsiStore();

function toNum(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

const timeUnitOptions = computed(() =>
    TimeUnitSchema.options.map((unit) => ({
        label: t(`scopeTimeUnit${unit.charAt(0).toUpperCase()}${unit.slice(1)}`),
        value: unit,
    })),
);

const resourceTypeOptions = computed<string[]>(() => {
    const v = mitsi.scope.functionalUnit.resourceType;
    return v ? [v] : [];
});

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
.scope-page {
    max-width: 1180px;
    margin: 0 auto;
}

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

.scope-table__row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    border-bottom: 1px solid #e6e9ef;
}

.scope-table__row--head {
    color: #78828f;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.scope-table__cell {
    flex: 0 0 auto;
}
</style>

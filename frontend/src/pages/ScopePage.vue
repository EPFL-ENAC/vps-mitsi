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
                                :rules="[toValidationRule(ScopeSchema.shape.organizationName)]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-12 col-md-4">
                            <q-input
                                v-model="mitsi.scope.assessors"
                                :label="$t('scopeAssessorsLabel')"
                                :rules="[toValidationRule(ScopeSchema.shape.assessors)]"
                                dense
                                outlined
                            />
                        </div>
                        <div class="col-12 col-md-4">
                            <q-input
                                v-model="mitsi.scope.serviceName"
                                :label="$t('scopeServiceNameLabel')"
                                :rules="[toValidationRule(ScopeSchema.shape.serviceName)]"
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
                                :rules="[toValidationRule(ScopeSchema.shape.function)]"
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
                                    :rules="[
                                        toValidationRule(FunctionalUnitSchema.shape.usageDuration),
                                    ]"
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
                                    :rules="[toValidationRule(FunctionalUnitSchema.shape.timeUnit)]"
                                    emit-value
                                    map-options
                                    dense
                                    hide-bottom-space
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
                                    :rules="[
                                        toValidationRule(FunctionalUnitSchema.shape.resourceCount),
                                    ]"
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
                    <ScopeDatacentersTable />
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
                    <ScopeBoundaryItemsTable kind="included" />

                    <q-separator spaced />

                    <div class="text-subtitle1 q-mb-xs">{{ $t('scopeBndExcludedTitle') }}</div>
                    <ScopeBoundaryItemsTable kind="excluded" />
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
                        :rules="[toValidationRule(ScopeSchema.shape.lifespanYears)]"
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

import ScopeDatacentersTable from 'src/components/scope/ScopeDatacentersTable.vue';
import ScopeBoundaryItemsTable from 'src/components/scope/ScopeBoundaryItemsTable.vue';
import { useMitsiStore } from 'src/stores/mitsi';
import { useValidation } from 'src/composables/useValidation';
import { FunctionalUnitSchema, ScopeSchema, TimeUnitSchema } from 'src/models/schema';
import { normalizeKey } from 'src/utils/format';

const { t } = useI18n();
const mitsi = useMitsiStore();
const { toValidationRule } = useValidation();

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
</style>

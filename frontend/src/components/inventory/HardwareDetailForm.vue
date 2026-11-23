<template>
    <q-card-section class="col scroll q-pa-md bg-grey-1">
        <!-- 1. General -->
        <q-card flat bordered class="q-mb-md bg-white rounded-borders">
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('inventoryGroups.general') }}
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            :readonly="readonly"
                            :row-id="row.id"
                            field="category"
                            :label="$t('inventoryColumns.category')"
                            :display-value="formatCategoryName(row.category, row.categoryOther, t)"
                        >
                            <ZodValidatedTextInput
                                v-if="row.category === 'other'"
                                v-model="row.categoryOther"
                                :schema="HardwareItemSchema.shape.categoryOther"
                                :label="$t('inventoryColumns.categoryOther')"
                                :data-row-id="row.id"
                                data-field="categoryOther"
                                outlined
                                dense
                            >
                                <template #prepend>
                                    <q-btn
                                        flat
                                        round
                                        dense
                                        size="sm"
                                        icon="arrow_back"
                                        :aria-label="$t('commonBack')"
                                        @click="resetCustomCategory"
                                    >
                                        <q-tooltip>{{ $t('commonBack') }}</q-tooltip>
                                    </q-btn>
                                </template>
                            </ZodValidatedTextInput>
                            <ZodValidatedSelect
                                v-else
                                v-model="row.category"
                                :schema="HardwareItemSchema.shape.category"
                                :options="categoryOptions"
                                :label="$t('inventoryColumns.category')"
                                :data-row-id="row.id"
                                data-field="category"
                                emit-value
                                map-options
                                outlined
                                dense
                            />
                        </DetailField>
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.name"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="name"
                            :label="$t('inventoryColumns.name')"
                            :schema="HardwareItemSchema.shape.name"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.rackUnit"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="rackUnit"
                            :label="$t('inventoryColumns.rackUnit')"
                            :schema="HardwareItemSchema.shape.rackUnit"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.quantity"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="quantity"
                            :label="$t('inventoryColumns.quantity')"
                            :schema="HardwareItemSchema.shape.quantity"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.description"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="description"
                            :label="$t('inventoryColumns.description')"
                            :schema="HardwareItemSchema.shape.description"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.datacenterId"
                            kind="select"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="datacenterId"
                            :label="$t('inventoryColumns.datacenterId')"
                            :schema="HardwareItemSchema.shape.datacenterId"
                            :options="datacenterOptions"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            :readonly="readonly"
                            :row-id="row.id"
                            field="isSecondHand"
                            :label="$t('inventoryColumns.isSecondHand')"
                        >
                            <template #readonly>
                                <div class="text-body2 text-dark">
                                    <q-badge
                                        :color="row.isSecondHand ? 'primary' : 'grey-3'"
                                        :text-color="row.isSecondHand ? 'white' : 'grey-8'"
                                        class="text-weight-medium rounded-borders"
                                    >
                                        {{ row.isSecondHand ? $t('commonYes') : $t('commonNo') }}
                                    </q-badge>
                                </div>
                            </template>
                            <q-toggle
                                v-model="row.isSecondHand"
                                :label="$t('inventoryColumns.isSecondHand')"
                                :data-row-id="row.id"
                                data-field="isSecondHand"
                            />
                        </DetailField>
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- 2. Impact -->
        <q-card flat bordered class="q-mb-md bg-white rounded-borders">
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('inventoryGroups.impact') }}
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.impactManufacturing"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="impactManufacturing"
                            :label="$t('inventoryColumns.impactManufacturing')"
                            :schema="HardwareItemSchema.shape.impactManufacturing"
                            format-thousands
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.impactManufacturingDistributionEol"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="impactManufacturingDistributionEol"
                            :label="$t('inventoryColumns.impactManufacturingDistributionEol')"
                            :schema="HardwareItemSchema.shape.impactManufacturingDistributionEol"
                            format-thousands
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.resilioDbHash"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="resilioDbHash"
                            :label="$t('inventoryColumns.resilioDbHash')"
                            :schema="HardwareItemSchema.shape.resilioDbHash"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <div
                            :class="readonly ? 'q-py-xs' : 'q-pt-xs'"
                            :data-row-id="readonly ? row.id : undefined"
                            :data-field="readonly ? 'subtotal' : undefined"
                        >
                            <div class="text-caption text-grey-7" :class="{ 'q-mb-xs': readonly }">
                                {{ $t('inventoryColumns.subtotal') }}
                            </div>
                            <div
                                class="text-body2 text-weight-bold"
                                :class="readonly ? 'text-dark' : 'q-mt-xs'"
                            >
                                <ComputationResultDisplay
                                    :computation="surveyResults.hardwareRowEmbodiedEmissionsKg(row)"
                                    :format-value="formatKg"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- 3. CPU -->
        <q-card flat bordered class="q-mb-md bg-white rounded-borders">
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('inventoryGroups.cpu') }}
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.cpuName"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="cpuName"
                            :label="$t('inventoryColumns.cpuName')"
                            :schema="HardwareItemSchema.shape.cpuName"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.cpuQuantity"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="cpuQuantity"
                            :label="$t('inventoryColumns.cpuQuantity')"
                            :schema="HardwareItemSchema.shape.cpuQuantity"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.cpuLithography"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="cpuLithography"
                            :label="$t('inventoryColumns.cpuLithography')"
                            :schema="HardwareItemSchema.shape.cpuLithography"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.cpuDieSize"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="cpuDieSize"
                            :label="$t('inventoryColumns.cpuDieSize')"
                            :schema="HardwareItemSchema.shape.cpuDieSize"
                            format-thousands
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.cpuCores"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="cpuCores"
                            :label="$t('inventoryColumns.cpuCores')"
                            :schema="HardwareItemSchema.shape.cpuCores"
                        />
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- 4. Memory -->
        <q-card flat bordered class="q-mb-md bg-white rounded-borders">
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('inventoryGroups.memory') }}
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.memoryQuantity"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="memoryQuantity"
                            :label="$t('inventoryColumns.memoryQuantity')"
                            :schema="HardwareItemSchema.shape.memoryQuantity"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.memorySizeGb"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="memorySizeGb"
                            :label="$t('inventoryColumns.memorySizeGb')"
                            :schema="HardwareItemSchema.shape.memorySizeGb"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <div
                            :class="readonly ? 'q-py-xs' : 'q-pt-xs'"
                            :data-row-id="readonly ? row.id : undefined"
                            :data-field="readonly ? 'memoryTotalGb' : undefined"
                        >
                            <div class="text-caption text-grey-7" :class="{ 'q-mb-xs': readonly }">
                                {{ $t('inventoryColumns.memoryTotalGb') }}
                            </div>
                            <div
                                class="text-body2 text-weight-bold"
                                :class="readonly ? 'text-dark' : 'q-mt-xs'"
                            >
                                <ComputationResultDisplay
                                    :computation="surveyResults.hardwareMemoryPerUnitGb(row)"
                                    :format-value="formatGb"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- 5. Storage -->
        <q-card flat bordered class="q-mb-md bg-white rounded-borders">
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('inventoryGroups.storage') }}
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.storageType"
                            kind="select"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="storageType"
                            :label="$t('inventoryColumns.storageType')"
                            :schema="HardwareItemSchema.shape.storageType"
                            :options="storageTypeOptions"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.storageQuantity"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="storageQuantity"
                            :label="$t('inventoryColumns.storageQuantity')"
                            :schema="HardwareItemSchema.shape.storageQuantity"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.storageSize"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="storageSize"
                            :label="$t('inventoryColumns.storageSize')"
                            :schema="HardwareItemSchema.shape.storageSize"
                            format-thousands
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <div
                            :class="readonly ? 'q-py-xs' : 'q-pt-xs'"
                            :data-row-id="readonly ? row.id : undefined"
                            :data-field="readonly ? 'storageTotal' : undefined"
                        >
                            <div class="text-caption text-grey-7" :class="{ 'q-mb-xs': readonly }">
                                {{ $t('inventoryColumns.storageTotal') }}
                            </div>
                            <div
                                class="text-body2 text-weight-bold"
                                :class="readonly ? 'text-dark' : 'q-mt-xs'"
                            >
                                <ComputationResultDisplay
                                    :computation="surveyResults.hardwareStorageCapacityPerUnit(row)"
                                    :format-value="formatGb"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.storageTechnology"
                            kind="select"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="storageTechnology"
                            :label="$t('inventoryColumns.storageTechnology')"
                            :schema="HardwareItemSchema.shape.storageTechnology"
                            :options="storageTechnologyOptions"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.storageCasing"
                            kind="select"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="storageCasing"
                            :label="$t('inventoryColumns.storageCasing')"
                            :schema="HardwareItemSchema.shape.storageCasing"
                            :options="storageCasingOptions"
                        />
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- 6. GPU -->
        <q-card flat bordered class="q-mb-md bg-white rounded-borders">
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('inventoryGroups.gpu') }}
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.gpuName"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="gpuName"
                            :label="$t('inventoryColumns.gpuName')"
                            :schema="HardwareItemSchema.shape.gpuName"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.gpuQuantity"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="gpuQuantity"
                            :label="$t('inventoryColumns.gpuQuantity')"
                            :schema="HardwareItemSchema.shape.gpuQuantity"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.gpuLithography"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="gpuLithography"
                            :label="$t('inventoryColumns.gpuLithography')"
                            :schema="HardwareItemSchema.shape.gpuLithography"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.gpuDieSize"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="gpuDieSize"
                            :label="$t('inventoryColumns.gpuDieSize')"
                            :schema="HardwareItemSchema.shape.gpuDieSize"
                            format-thousands
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.gpuMemory"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="gpuMemory"
                            :label="$t('inventoryColumns.gpuMemory')"
                            :schema="HardwareItemSchema.shape.gpuMemory"
                        />
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- 7. Network -->
        <q-card flat bordered class="bg-white rounded-borders">
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('inventoryGroups.network') }}
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.networkPorts"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="networkPorts"
                            :label="$t('inventoryColumns.networkPorts')"
                            :schema="HardwareItemSchema.shape.networkPorts"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.psuQuantity"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="psuQuantity"
                            :label="$t('inventoryColumns.psuQuantity')"
                            :schema="HardwareItemSchema.shape.psuQuantity"
                        />
                    </div>

                    <div class="col-12 col-sm-6 col-md-4">
                        <DetailField
                            v-model="row.psuPower"
                            kind="number"
                            :readonly="readonly"
                            :row-id="row.id"
                            field="psuPower"
                            :label="$t('inventoryColumns.psuPower')"
                            :schema="HardwareItemSchema.shape.psuPower"
                            format-thousands
                        />
                    </div>
                </div>
            </q-card-section>
        </q-card>
    </q-card-section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import DetailField from 'src/components/inputs/DetailField.vue';
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import ZodValidatedSelect from 'src/components/inputs/ZodValidatedSelect.vue';
import ComputationResultDisplay from 'src/components/ComputationResultDisplay.vue';

import {
    type HardwareItem,
    HardwareCategorySchema,
    HardwareItemSchema,
    StorageCasingSchema,
    StorageTechnologySchema,
    StorageTypeSchema,
} from 'src/models/HardwareItem/schema';
import { useSurveyDataStore } from 'src/stores/surveyData';
import { useSurveyResultsStore } from 'src/stores/surveyResults';
import {
    formatCategoryName,
    formatDatacenterName,
    formatGb,
    formatKg,
    normalizeKey,
} from 'src/utils/format';

const row = defineModel<HardwareItem>('row', { required: true });

defineProps<{
    readonly: boolean;
}>();

const { t } = useI18n();
const surveyData = useSurveyDataStore();
const surveyResults = useSurveyResultsStore();

function enumOptions(values: readonly string[], keyPrefix: string) {
    return values.map((value) => ({ label: t(keyPrefix + normalizeKey(value)), value }));
}

const datacenterOptions = computed(() =>
    surveyData.datacenters.map((dc) => ({
        label: formatDatacenterName(dc),
        value: dc.id,
    })),
);

const categoryOptions = computed(() => [
    ...enumOptions(
        HardwareCategorySchema.options.filter((c) => c !== 'other'),
        'inventoryCategory_',
    ),
    { label: `+ ${t('inventoryCategoryAddOther')}`, value: 'other' },
]);

const storageTypeOptions = computed(() =>
    enumOptions(StorageTypeSchema.options, 'inventoryStorageType_'),
);
const storageTechnologyOptions = computed(() =>
    enumOptions(StorageTechnologySchema.options, 'inventoryStorageTechnology_'),
);
const storageCasingOptions = computed(() =>
    enumOptions(StorageCasingSchema.options, 'inventoryStorageCasing_'),
);

function resetCustomCategory(): void {
    row.value.category = 'server';
    row.value.categoryOther = '';
}
</script>

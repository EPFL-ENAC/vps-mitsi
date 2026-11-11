<template>
    <q-card-section class="col scroll q-pa-md bg-grey-1">
        <q-card
            v-for="group in GROUPS"
            :key="group"
            flat
            bordered
            class="q-mb-md bg-white rounded-borders"
        >
            <q-card-section class="q-pb-sm">
                <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t(`inventoryGroups.${group}`) }}
                </div>
            </q-card-section>

            <q-card-section class="q-pt-none">
                <div class="row q-col-gutter-md">
                    <div
                        v-for="field in fieldsFor(group)"
                        :key="field.field"
                        class="col-12 col-sm-6 col-md-4"
                    >
                        <!-- A. READ-ONLY MODE (Selectable & copyable text) -->
                        <div
                            v-if="readonly"
                            class="q-py-xs"
                            :data-row-id="row.id"
                            :data-field="field.field"
                        >
                            <div class="text-caption text-grey-7 q-mb-xs">
                                {{ $t(`inventoryColumns.${field.field}`) }}
                            </div>

                            <!-- Calculations readonly (subtotal in kg, capacities in GB) -->
                            <div
                                v-if="field.kind === 'derived'"
                                class="text-body2 text-weight-bold text-dark"
                            >
                                <ComputationResultDisplay
                                    v-if="field.derived"
                                    :computation="field.derived(row)"
                                    :format-value="field.formatValue!"
                                />
                            </div>

                            <!-- Switch readonly (Badge) -->
                            <div v-else-if="field.kind === 'toggle'" class="text-body2 text-dark">
                                <q-badge
                                    :color="row.isSecondHand ? 'primary' : 'grey-3'"
                                    :text-color="row.isSecondHand ? 'white' : 'grey-8'"
                                    class="text-weight-medium rounded-borders"
                                >
                                    {{ row.isSecondHand ? $t('commonYes') : $t('commonNo') }}
                                </q-badge>
                            </div>

                            <!-- Text / Numbers / Selection -->
                            <div v-else class="text-body2 text-dark text-weight-medium">
                                {{ formatReadonlyValue(field) }}
                            </div>
                        </div>

                        <!-- B. EDIT MODE (Interactive validated inputs) -->
                        <template v-else>
                            <!-- Calculs (Subtotal, Memory Total, Storage Total) -->
                            <div v-if="field.kind === 'derived'" class="q-pt-xs">
                                <div class="text-caption text-grey-7">
                                    {{ $t(`inventoryColumns.${field.field}`) }}
                                </div>
                                <div class="text-body2 text-weight-bold q-mt-xs">
                                    <ComputationResultDisplay
                                        v-if="field.derived"
                                        :computation="field.derived(row)"
                                        :format-value="field.formatValue!"
                                    />
                                </div>
                            </div>

                            <!-- Toggle (2nd hand) -->
                            <q-toggle
                                v-else-if="field.kind === 'toggle'"
                                v-model="row.isSecondHand"
                                :label="$t(`inventoryColumns.${field.field}`)"
                                :data-row-id="row.id"
                                :data-field="field.field"
                            />

                            <!-- Datacenter select -->
                            <ZodValidatedSelect
                                v-else-if="field.kind === 'datacenter'"
                                v-model="(row as Record<string, any>)[field.field]"
                                :schema="field.schema!"
                                :options="datacenterOptions"
                                :label="$t(`inventoryColumns.${field.field}`)"
                                :data-row-id="row.id"
                                :data-field="field.field"
                                emit-value
                                map-options
                                outlined
                                dense
                            />

                            <!-- Enum select (the category cell swaps in place for a custom name) -->
                            <ZodValidatedTextInput
                                v-if="field.field === 'category' && row.category === 'other'"
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
                                v-else-if="field.kind === 'enum'"
                                v-model="(row as Record<string, any>)[field.field]"
                                :schema="field.schema!"
                                :options="
                                    field.field === 'category'
                                        ? categoryOptions
                                        : (field.options ?? [])
                                "
                                :label="$t(`inventoryColumns.${field.field}`)"
                                :data-row-id="row.id"
                                :data-field="field.field"
                                emit-value
                                map-options
                                outlined
                                dense
                            />

                            <!-- Text -->
                            <ZodValidatedTextInput
                                v-else-if="field.kind === 'text'"
                                v-model="(row as Record<string, any>)[field.field]"
                                :schema="field.schema!"
                                :label="$t(`inventoryColumns.${field.field}`)"
                                :data-row-id="row.id"
                                :data-field="field.field"
                                outlined
                                dense
                            />

                            <!-- Number -->
                            <ZodValidatedNumberInput
                                v-else-if="field.kind === 'number'"
                                v-model="(row as Record<string, any>)[field.field]"
                                :schema="field.schema!"
                                :label="$t(`inventoryColumns.${field.field}`)"
                                :data-row-id="row.id"
                                :data-field="field.field"
                                outlined
                                dense
                            />
                        </template>
                    </div>
                </div>
            </q-card-section>
        </q-card>
    </q-card-section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { z } from 'zod';

import ZodValidatedNumberInput from 'src/components/inputs/ZodValidatedNumberInput.vue';
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
import type { ComputationResult } from 'src/utils/computation';
import {
    formatCategoryName,
    formatDatacenterName,
    formatGb,
    formatKg,
    normalizeKey,
} from 'src/utils/format';

const GROUPS = ['general', 'impact', 'cpu', 'memory', 'storage', 'gpu', 'network'] as const;
type GroupKey = (typeof GROUPS)[number];

type FieldKind = 'enum' | 'datacenter' | 'text' | 'number' | 'toggle' | 'derived';
type InventoryField = keyof HardwareItem | 'subtotal' | 'memoryTotalGb' | 'storageTotal';

interface FormFieldSpec {
    field: InventoryField;
    group: GroupKey;
    kind: FieldKind;
    schema?: z.ZodType;
    options?: { label: string; value: string }[];
    derived?: (row: HardwareItem) => ComputationResult<number>;
    formatValue?: (val: number) => string;
}

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

const datacenterOptions = computed<{ label: string; value: string }[]>(() =>
    surveyData.datacenters.map((dc) => ({
        label: formatDatacenterName(dc),
        value: dc.id,
    })),
);

/** Standard categories plus the "+ Add other" entry that swaps the cell for a free-text input. */
const categoryOptions = computed<{ label: string; value: string }[]>(() => [
    ...enumOptions(
        HardwareCategorySchema.options.filter((c) => c !== 'other'),
        'inventoryCategory_',
    ),
    { label: `+ ${t('inventoryCategoryAddOther')}`, value: 'other' },
]);

/** Leave the custom category and return to the standard select in the same grid cell. */
function resetCustomCategory(): void {
    row.value.category = 'server';
    row.value.categoryOther = '';
}

/** Read value readonly */
function formatReadonlyValue(field: FormFieldSpec): string {
    if (field.kind === 'derived') return '—';
    if (field.field === 'category') {
        return formatCategoryName(row.value.category, row.value.categoryOther, t);
    }
    const val = row.value[field.field as keyof HardwareItem];
    if (val === null || val === undefined || val === '') return '—';

    if (field.kind === 'datacenter') {
        const dc = surveyData.datacenters.find((d) => d.id === val);
        return dc ? formatDatacenterName(dc) : String(val);
    }
    if (field.kind === 'enum') {
        const option = field.options?.find((opt) => opt.value === val);
        return option ? option.label : String(val);
    }
    return String(val);
}

const fields = computed<FormFieldSpec[]>(() => {
    const shape = HardwareItemSchema.shape;
    return [
        // General
        {
            field: 'category',
            group: 'general',
            kind: 'enum',
            schema: shape.category,
            // The select options are built in categoryOptions (standard values + "+ Add other").
        },
        { field: 'name', group: 'general', kind: 'text', schema: shape.name },
        { field: 'rackUnit', group: 'general', kind: 'number', schema: shape.rackUnit },
        { field: 'quantity', group: 'general', kind: 'number', schema: shape.quantity },
        { field: 'description', group: 'general', kind: 'text', schema: shape.description },
        { field: 'datacenterId', group: 'general', kind: 'datacenter', schema: shape.datacenterId },
        { field: 'isSecondHand', group: 'general', kind: 'toggle', schema: shape.isSecondHand },

        // Impact
        {
            field: 'impactManufacturing',
            group: 'impact',
            kind: 'number',
            schema: shape.impactManufacturing,
        },
        {
            field: 'impactManufacturingDistributionEol',
            group: 'impact',
            kind: 'number',
            schema: shape.impactManufacturingDistributionEol,
        },
        { field: 'resilioDbHash', group: 'impact', kind: 'text', schema: shape.resilioDbHash },
        {
            field: 'subtotal',
            group: 'impact',
            kind: 'derived',
            derived: surveyResults.hardwareRowEmbodiedEmissionsKg,
            formatValue: formatKg,
        },

        // CPU
        { field: 'cpuName', group: 'cpu', kind: 'text', schema: shape.cpuName },
        { field: 'cpuQuantity', group: 'cpu', kind: 'number', schema: shape.cpuQuantity },
        { field: 'cpuLithography', group: 'cpu', kind: 'number', schema: shape.cpuLithography },
        { field: 'cpuDieSize', group: 'cpu', kind: 'number', schema: shape.cpuDieSize },
        { field: 'cpuCores', group: 'cpu', kind: 'number', schema: shape.cpuCores },

        // Memory
        { field: 'memoryQuantity', group: 'memory', kind: 'number', schema: shape.memoryQuantity },
        { field: 'memorySizeGb', group: 'memory', kind: 'number', schema: shape.memorySizeGb },
        {
            field: 'memoryTotalGb',
            group: 'memory',
            kind: 'derived',
            derived: surveyResults.hardwareMemoryPerUnitGb,
            formatValue: formatGb,
        },

        // Storage
        {
            field: 'storageType',
            group: 'storage',
            kind: 'enum',
            schema: shape.storageType,
            options: enumOptions(StorageTypeSchema.options, 'inventoryStorageType_'),
        },
        {
            field: 'storageQuantity',
            group: 'storage',
            kind: 'number',
            schema: shape.storageQuantity,
        },
        { field: 'storageSize', group: 'storage', kind: 'number', schema: shape.storageSize },
        {
            field: 'storageTotal',
            group: 'storage',
            kind: 'derived',
            derived: surveyResults.hardwareStorageCapacityPerUnit,
            formatValue: formatGb,
        },
        {
            field: 'storageTechnology',
            group: 'storage',
            kind: 'enum',
            schema: shape.storageTechnology,
            options: enumOptions(StorageTechnologySchema.options, 'inventoryStorageTechnology_'),
        },
        {
            field: 'storageCasing',
            group: 'storage',
            kind: 'enum',
            schema: shape.storageCasing,
            options: enumOptions(StorageCasingSchema.options, 'inventoryStorageCasing_'),
        },

        // GPU
        { field: 'gpuName', group: 'gpu', kind: 'text', schema: shape.gpuName },
        { field: 'gpuQuantity', group: 'gpu', kind: 'number', schema: shape.gpuQuantity },
        { field: 'gpuLithography', group: 'gpu', kind: 'number', schema: shape.gpuLithography },
        { field: 'gpuDieSize', group: 'gpu', kind: 'number', schema: shape.gpuDieSize },
        { field: 'gpuMemory', group: 'gpu', kind: 'number', schema: shape.gpuMemory },

        // Network
        { field: 'networkPorts', group: 'network', kind: 'number', schema: shape.networkPorts },
        { field: 'psuQuantity', group: 'network', kind: 'number', schema: shape.psuQuantity },
        { field: 'psuPower', group: 'network', kind: 'number', schema: shape.psuPower },
    ];
});

function fieldsFor(group: GroupKey): FormFieldSpec[] {
    return fields.value.filter((f) => f.group === group);
}
</script>

<template>
    <q-table
        :rows="mitsi.hardware"
        :columns="visibleColumns"
        :table-colspan="visibleColumns.length + 1"
        row-key="id"
        flat
        bordered
        dense
        :pagination="{ rowsPerPage: 0 }"
        :rows-per-page-options="[0]"
        hide-bottom
        class="inventory-table"
    >
        <!--
            Header row 1: group sub-headers. We don't bind props here since there itsn't one group per column
        -->
        <template v-slot:header="props">
            <q-tr class="inventory-group-row">
                <q-th
                    v-for="grp in groupRows"
                    :key="grp.name"
                    :colspan="grp.span"
                    class="inventory-group-th text-left"
                >
                    {{ grp.label }}
                </q-th>
                <q-th auto-width class="inventory-group-th" />
            </q-tr>

            <!-- Header row 2: per-column headers (props.cols exists here). -->
            <q-tr :props="props">
                <q-th
                    v-for="col in props.cols"
                    :key="col.name"
                    :props="props"
                    :data-kind="col.kind"
                >
                    <span class="inventory-th-label">{{ col.label }}</span>
                    <span v-if="col.calc" class="inventory-calc-badge">∑</span>
                </q-th>
                <q-th auto-width />
            </q-tr>
        </template>

        <template v-slot:body="props">
            <q-tr :props="props" :class="{ 'inventory-row--excluded': isNotCounted(props.row) }">
                <q-td
                    v-for="col in props.cols"
                    :key="col.name"
                    :props="props"
                    :data-kind="col.kind"
                >
                    <!-- Second-hand not-counted impact -->
                    <template v-if="col.name === 'impactManufacturingDistributionEol'">
                        <template v-if="isNotCounted(props.row)">
                            <span class="inventory-strike">{{
                                formatKg(props.row.impactManufacturingDistributionEol)
                            }}</span>
                            <span class="inventory-dim">({{ $t('inventoryNotCounted') }})</span>
                        </template>
                        <ZodValidatedNumberInput
                            v-else-if="col.zod"
                            v-model="props.row.impactManufacturingDistributionEol"
                            :schema="col.zod"
                            dense
                            outlined
                            hide-bottom-space
                        />
                    </template>

                    <!-- Subtotal -->
                    <template v-else-if="col.name === 'subtotal'">
                        <template v-if="isNotCounted(props.row)">
                            <span class="inventory-dim">{{ $t('inventoryNotCounted') }}</span>
                        </template>
                        <span v-else>{{ formatKg(col.derived ? col.derived(props.row) : 0) }}</span>
                    </template>

                    <!-- Datacenter select (store-driven options, value = id) -->
                    <template v-else-if="col.kind === 'datacenter'">
                        <q-select
                            :model-value="props.row.datacenterId"
                            @update:model-value="(v) => (props.row.datacenterId = String(v ?? ''))"
                            :options="col.options"
                            emit-value
                            map-options
                            :rules="[toValidationRule(col.zod)]"
                            dense
                            outlined
                            hide-bottom-space
                        />
                    </template>

                    <!-- Schema enum select (translated options) -->
                    <template v-else-if="col.kind === 'enum'">
                        <q-select
                            :model-value="props.row[col.field]"
                            @update:model-value="(v) => (props.row[col.field] = v)"
                            :options="col.options"
                            emit-value
                            map-options
                            :rules="[toValidationRule(col.zod)]"
                            dense
                            outlined
                            hide-bottom-space
                        />
                    </template>

                    <!-- Toggle (2nd hand) — a real switch, not an input -->
                    <template v-else-if="col.kind === 'toggle'">
                        <q-toggle
                            :model-value="props.row[col.field]"
                            @update:model-value="(v) => (props.row[col.field] = !!v)"
                        />
                    </template>

                    <!-- Number -->
                    <template v-else-if="col.kind === 'number' && col.zod">
                        <ZodValidatedNumberInput
                            v-model="props.row[col.field]"
                            :schema="col.zod"
                            dense
                            outlined
                            hide-bottom-space
                        />
                    </template>

                    <!-- Free text -->
                    <template v-else-if="col.kind === 'text' && col.zod">
                        <ZodValidatedTextInput
                            v-model="props.row[col.field]"
                            :schema="col.zod"
                            dense
                            outlined
                            hide-bottom-space
                        />
                    </template>

                    <!-- Other derived cells (memoryTotalGb / storageTotal) -->
                    <template v-else-if="col.kind === 'derived'">
                        <span>{{ formatKg(col.derived ? col.derived(props.row) : 0) }}</span>
                    </template>
                </q-td>
                <q-td auto-width class="text-right">
                    <q-btn
                        flat
                        dense
                        icon="delete"
                        :aria-label="$t('inventoryDeleteRow')"
                        @click="confirmDeleteRow(props.row)"
                    />
                </q-td>
            </q-tr>
        </template>
    </q-table>
</template>

<script setup lang="ts">
import ZodValidatedNumberInput from 'src/components/inputs/ZodValidatedNumberInput.vue';
import ZodValidatedTextInput from 'src/components/inputs/ZodValidatedTextInput.vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar, type QTableColumn } from 'quasar';
import type { z } from 'zod';

import type { HardwareItem } from 'src/models/mitsi';
import type { VisibilityMode } from 'src/models/inventory-columns';
import { formatDatacenterName, formatKg, normalizeKey } from 'src/utils/format';
import { rowSubtotal } from 'src/utils/math';
import {
    HardwareCategorySchema,
    HardwareItemSchema,
    StorageCasingSchema,
    StorageTechnologySchema,
    StorageTypeSchema,
} from 'src/models/schema';
import { useMitsiStore } from 'src/stores/mitsi';
import { useValidation } from 'src/composables/useValidation';

const GROUPS = ['general', 'impact', 'cpu', 'memory', 'storage', 'gpu', 'network'] as const;
type GroupKey = (typeof GROUPS)[number];

interface InventoryColumn extends QTableColumn<HardwareItem, keyof HardwareItem | 'subtotal'> {
    field: keyof HardwareItem | 'subtotal';
    group: GroupKey;
    mode: VisibilityMode;
    kind: 'enum' | 'datacenter' | 'text' | 'number' | 'toggle' | 'derived';
    /** Field feeds the calculation → show the ∑ badge. */
    calc?: boolean;
    zod: z.ZodType | undefined;
    options?: { label: string; value: string }[];
    /** Quasar sets col.value in body slots, so use a separate name for the calculation. */
    derived?: (row: HardwareItem) => number;
    sort?: (a: unknown, b: unknown, rowA: HardwareItem, rowB: HardwareItem) => number;
}

const props = defineProps<{
    mode: VisibilityMode;
}>();

const { t } = useI18n();
const $q = useQuasar();
const mitsi = useMitsiStore();
const { toValidationRule } = useValidation();

/** Columns are cumulative: advanced ⊇ normal ⊇ simple. */
const MODE_RANK: Record<VisibilityMode, number> = { simple: 0, normal: 1, advanced: 2 };

// ── Display-only helpers (never written back to the store) ──────────────────
/** True when a row's impact must be struck through (second-hand, not accounted). */
function isNotCounted(row: HardwareItem): boolean {
    return mitsi.isSecondHandExcluded(row);
}

// Options for the datacenter select come from the store's datacenters.
const datacenterOptions = computed<{ label: string; value: string }[]>(() =>
    mitsi.datacenters.map((dc) => ({
        label: formatDatacenterName(dc),
        value: dc.id,
    })),
);

const columns = computed<InventoryColumn[]>(() => [
    // ── General ──────────────────────────────────────────────────────────
    {
        name: 'category',
        field: 'category',
        label: t('inventoryColumns.category'),
        group: 'general',
        mode: 'simple',
        kind: 'enum',
        sortable: true,
        zod: HardwareItemSchema.shape.category,
        options: HardwareCategorySchema.options.map((value) => ({
            label: t('inventoryCategory_' + normalizeKey(value)),
            value,
        })),
    },
    {
        name: 'name',
        field: 'name',
        label: t('inventoryColumns.name'),
        group: 'general',
        mode: 'simple',
        kind: 'text',
        sortable: true,
        zod: HardwareItemSchema.shape.name,
    },
    {
        name: 'rackUnit',
        field: 'rackUnit',
        label: t('inventoryColumns.rackUnit'),
        group: 'general',
        mode: 'advanced',
        kind: 'number',
        zod: HardwareItemSchema.shape.rackUnit,
    },
    {
        name: 'quantity',
        field: 'quantity',
        label: t('inventoryColumns.quantity'),
        group: 'general',
        mode: 'simple',
        kind: 'number',
        calc: true,
        sortable: true,
        zod: HardwareItemSchema.shape.quantity,
    },
    {
        name: 'description',
        field: 'description',
        label: t('inventoryColumns.description'),
        group: 'general',
        mode: 'normal',
        kind: 'text',
        zod: HardwareItemSchema.shape.description,
    },
    {
        name: 'datacenterId',
        field: 'datacenterId',
        label: t('inventoryColumns.datacenterId'),
        group: 'general',
        mode: 'simple',
        kind: 'datacenter',
        zod: HardwareItemSchema.shape.datacenterId,
        options: datacenterOptions.value,
    },
    {
        name: 'isSecondHand',
        field: 'isSecondHand',
        label: t('inventoryColumns.isSecondHand'),
        group: 'general',
        mode: 'simple',
        kind: 'toggle',
        calc: true,
        zod: HardwareItemSchema.shape.isSecondHand,
    },

    // ── Impact (∑) ───────────────────────────────────────────────────────
    {
        name: 'impactManufacturing',
        field: 'impactManufacturing',
        label: t('inventoryColumns.impactManufacturing'),
        group: 'impact',
        mode: 'normal',
        kind: 'number',
        sortable: true,
        zod: HardwareItemSchema.shape.impactManufacturing,
    },
    {
        name: 'impactManufacturingDistributionEol',
        field: 'impactManufacturingDistributionEol',
        label: t('inventoryColumns.impactManufacturingDistributionEol'),
        group: 'impact',
        mode: 'simple',
        kind: 'number',
        calc: true,
        sortable: true,
        zod: HardwareItemSchema.shape.impactManufacturingDistributionEol,
    },
    {
        name: 'resilioDbHash',
        field: 'resilioDbHash',
        label: t('inventoryColumns.resilioDbHash'),
        group: 'impact',
        mode: 'normal',
        kind: 'text',
        zod: HardwareItemSchema.shape.resilioDbHash,
    },
    {
        name: 'subtotal',
        field: 'subtotal',
        label: t('inventoryColumns.subtotal'),
        group: 'impact',
        mode: 'simple',
        kind: 'derived',
        calc: true,
        sortable: true,
        zod: undefined,
        derived: rowSubtotal,
        sort: (_a, _b, rowA, rowB) => rowSubtotal(rowA) - rowSubtotal(rowB),
    },

    // ── CPU ──────────────────────────────────────────────────────────────
    {
        name: 'cpuName',
        field: 'cpuName',
        label: t('inventoryColumns.cpuName'),
        group: 'cpu',
        mode: 'normal',
        kind: 'text',
        zod: HardwareItemSchema.shape.cpuName,
    },
    {
        name: 'cpuQuantity',
        field: 'cpuQuantity',
        label: t('inventoryColumns.cpuQuantity'),
        group: 'cpu',
        mode: 'simple',
        kind: 'number',
        zod: HardwareItemSchema.shape.cpuQuantity,
    },
    {
        name: 'cpuLithography',
        field: 'cpuLithography',
        label: t('inventoryColumns.cpuLithography'),
        group: 'cpu',
        mode: 'advanced',
        kind: 'number',
        zod: HardwareItemSchema.shape.cpuLithography,
    },
    {
        name: 'cpuDieSize',
        field: 'cpuDieSize',
        label: t('inventoryColumns.cpuDieSize'),
        group: 'cpu',
        mode: 'advanced',
        kind: 'number',
        zod: HardwareItemSchema.shape.cpuDieSize,
    },
    {
        name: 'cpuCores',
        field: 'cpuCores',
        label: t('inventoryColumns.cpuCores'),
        group: 'cpu',
        mode: 'advanced',
        kind: 'number',
        zod: HardwareItemSchema.shape.cpuCores,
    },

    // ── Memory ───────────────────────────────────────────────────────────
    {
        name: 'memoryQuantity',
        field: 'memoryQuantity',
        label: t('inventoryColumns.memoryQuantity'),
        group: 'memory',
        mode: 'simple',
        kind: 'number',
        zod: HardwareItemSchema.shape.memoryQuantity,
    },
    {
        name: 'memorySizeGb',
        field: 'memorySizeGb',
        label: t('inventoryColumns.memorySizeGb'),
        group: 'memory',
        mode: 'simple',
        kind: 'number',
        zod: HardwareItemSchema.shape.memorySizeGb,
    },
    {
        name: 'memoryTotalGb',
        field: 'memoryTotalGb',
        label: t('inventoryColumns.memoryTotalGb'),
        group: 'memory',
        mode: 'advanced',
        kind: 'derived',
        zod: undefined,
        derived: (row) => (row.memoryQuantity || 0) * (row.memorySizeGb || 0),
    },

    // ── Storage ──────────────────────────────────────────────────────────
    {
        name: 'storageType',
        field: 'storageType',
        label: t('inventoryColumns.storageType'),
        group: 'storage',
        mode: 'advanced',
        kind: 'enum',
        zod: HardwareItemSchema.shape.storageType,
        options: StorageTypeSchema.options.map((value) => ({
            label: t('inventoryStorageType_' + normalizeKey(value)),
            value,
        })),
    },
    {
        name: 'storageQuantity',
        field: 'storageQuantity',
        label: t('inventoryColumns.storageQuantity'),
        group: 'storage',
        mode: 'simple',
        kind: 'number',
        zod: HardwareItemSchema.shape.storageQuantity,
    },
    {
        name: 'storageSize',
        field: 'storageSize',
        label: t('inventoryColumns.storageSize'),
        group: 'storage',
        mode: 'simple',
        kind: 'number',
        zod: HardwareItemSchema.shape.storageSize,
    },
    {
        name: 'storageTotal',
        field: 'storageTotal',
        label: t('inventoryColumns.storageTotal'),
        group: 'storage',
        mode: 'advanced',
        kind: 'derived',
        zod: undefined,
        derived: (row) => (row.storageQuantity || 0) * (row.storageSize || 0),
    },
    {
        name: 'storageTechnology',
        field: 'storageTechnology',
        label: t('inventoryColumns.storageTechnology'),
        group: 'storage',
        mode: 'advanced',
        kind: 'enum',
        zod: HardwareItemSchema.shape.storageTechnology,
        options: StorageTechnologySchema.options.map((value) => ({
            label: t('inventoryStorageTechnology_' + normalizeKey(value)),
            value,
        })),
    },
    {
        name: 'storageCasing',
        field: 'storageCasing',
        label: t('inventoryColumns.storageCasing'),
        group: 'storage',
        mode: 'advanced',
        kind: 'enum',
        zod: HardwareItemSchema.shape.storageCasing,
        options: StorageCasingSchema.options.map((value) => ({
            label: t('inventoryStorageCasing_' + normalizeKey(value)),
            value,
        })),
    },

    // ── GPU ──────────────────────────────────────────────────────────────
    {
        name: 'gpuName',
        field: 'gpuName',
        label: t('inventoryColumns.gpuName'),
        group: 'gpu',
        mode: 'normal',
        kind: 'text',
        zod: HardwareItemSchema.shape.gpuName,
    },
    {
        name: 'gpuQuantity',
        field: 'gpuQuantity',
        label: t('inventoryColumns.gpuQuantity'),
        group: 'gpu',
        mode: 'simple',
        kind: 'number',
        zod: HardwareItemSchema.shape.gpuQuantity,
    },
    {
        name: 'gpuLithography',
        field: 'gpuLithography',
        label: t('inventoryColumns.gpuLithography'),
        group: 'gpu',
        mode: 'advanced',
        kind: 'number',
        zod: HardwareItemSchema.shape.gpuLithography,
    },
    {
        name: 'gpuDieSize',
        field: 'gpuDieSize',
        label: t('inventoryColumns.gpuDieSize'),
        group: 'gpu',
        mode: 'advanced',
        kind: 'number',
        zod: HardwareItemSchema.shape.gpuDieSize,
    },
    {
        name: 'gpuMemory',
        field: 'gpuMemory',
        label: t('inventoryColumns.gpuMemory'),
        group: 'gpu',
        mode: 'normal',
        kind: 'number',
        zod: HardwareItemSchema.shape.gpuMemory,
    },

    // ── Network & PSU ────────────────────────────────────────────────────
    {
        name: 'networkPorts',
        field: 'networkPorts',
        label: t('inventoryColumns.networkPorts'),
        group: 'network',
        mode: 'normal',
        kind: 'number',
        zod: HardwareItemSchema.shape.networkPorts,
    },
    {
        name: 'psuQuantity',
        field: 'psuQuantity',
        label: t('inventoryColumns.psuQuantity'),
        group: 'network',
        mode: 'advanced',
        kind: 'number',
        zod: HardwareItemSchema.shape.psuQuantity,
    },
    {
        name: 'psuPower',
        field: 'psuPower',
        label: t('inventoryColumns.psuPower'),
        group: 'network',
        mode: 'advanced',
        kind: 'number',
        zod: HardwareItemSchema.shape.psuPower,
    },
]);

const visibleColumns = computed(() =>
    columns.value.filter((column) => MODE_RANK[column.mode] <= MODE_RANK[props.mode]),
);

/** Group sub-headers, spans matched to the columns rendered in this mode. */
const groupRows = computed(() =>
    GROUPS.map((name) => ({
        name,
        label: t(`inventoryGroups.${name}`),
        span: visibleColumns.value.filter((column) => column.group === name).length,
    })).filter((group) => group.span > 0),
);

function rowName(row: HardwareItem): string {
    return row.name.trim() || t('inventoryColumns.name');
}

function confirmDeleteRow(row: HardwareItem): void {
    $q.dialog({
        title: t('inventoryDeleteConfirmTitle'),
        message: t('inventoryDeleteConfirmMessage', { name: rowName(row) }),
        cancel: true,
        persistent: true,
    }).onOk(() => {
        const i = mitsi.hardware.findIndex((h) => h.id === row.id);
        if (i >= 0) mitsi.hardware.splice(i, 1);
    });
}
</script>

<style scoped lang="scss">
@use 'src/css/table-cells';

.inventory-table {
    @include table-cells.cells;
}

.inventory-group-row .q-th {
    background: #f2f4f8;
}

.inventory-group-th {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #48525f;
    border-bottom: 1px solid #e6e9ef;
}

.inventory-th-label {
    white-space: nowrap;
}

.inventory-calc-badge {
    display: inline-block;
    margin-left: 4px;
    font-size: 10px;
    line-height: 1;
    padding: 2px 5px;
    border-radius: 999px;
    background: #fff0f1;
    color: #c1001a;
    font-weight: 700;
}

.inventory-strike {
    text-decoration: line-through;
    color: #78828f;
}

.inventory-dim {
    color: #78828f;
    font-style: italic;
}

.inventory-row--excluded .q-td {
    background: #faf8f8;
}
</style>

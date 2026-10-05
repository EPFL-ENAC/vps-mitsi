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
            <q-tr
                :props="props"
                :class="{ 'inventory-row--excluded': mitsi.isSecondHandExcluded(props.row) }"
            >
                <q-td
                    v-for="col in props.cols"
                    :key="col.name"
                    :props="props"
                    :data-kind="col.kind"
                >
                    <!-- Second-hand not-counted impact -->
                    <template v-if="col.name === 'impactManufacturingDistributionEol'">
                        <template v-if="mitsi.isSecondHandExcluded(props.row)">
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
                        <template v-if="mitsi.isSecondHandExcluded(props.row)">
                            <span class="inventory-dim">{{ $t('inventoryNotCounted') }}</span>
                        </template>
                        <span v-else>{{ formatKg(col.derived ? col.derived(props.row) : 0) }}</span>
                    </template>

                    <!-- Datacenter select (store-driven options, value = id) -->
                    <template v-else-if="col.kind === 'datacenter'">
                        <q-select
                            v-model="props.row.datacenterId"
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
                            v-model="props.row[col.field]"
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
                        <q-toggle v-model="props.row[col.field]" />
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

import type { HardwareItem, VisibilityMode } from 'src/models/mitsi';
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

// Options for the datacenter select come from the store's datacenters.
const datacenterOptions = computed<{ label: string; value: string }[]>(() =>
    mitsi.datacenters.map((dc) => ({
        label: formatDatacenterName(dc),
        value: dc.id,
    })),
);

type ColumnSpec = Omit<InventoryColumn, 'name' | 'label' | 'field' | 'zod'> & {
    field: keyof HardwareItem;
    /** Derived schema fields opt out of validation; they are never edited. */
    zod?: undefined;
};

/** Schema columns share their name, translation key and canonical field schema. */
function column(spec: ColumnSpec): InventoryColumn {
    return {
        name: spec.field,
        label: t(`inventoryColumns.${spec.field}`),
        zod: HardwareItemSchema.shape[spec.field],
        ...spec,
    };
}

function enumOptions(values: readonly string[], keyPrefix: string) {
    return values.map((value) => ({ label: t(keyPrefix + normalizeKey(value)), value }));
}

const columns = computed<InventoryColumn[]>(() => [
    column({
        field: 'category',
        group: 'general',
        mode: 'simple',
        kind: 'enum',
        sortable: true,
        options: enumOptions(HardwareCategorySchema.options, 'inventoryCategory_'),
    }),
    column({ field: 'name', group: 'general', mode: 'simple', kind: 'text', sortable: true }),
    column({ field: 'rackUnit', group: 'general', mode: 'advanced', kind: 'number' }),
    column({
        field: 'quantity',
        group: 'general',
        mode: 'simple',
        kind: 'number',
        calc: true,
        sortable: true,
    }),
    column({ field: 'description', group: 'general', mode: 'normal', kind: 'text' }),
    column({
        field: 'datacenterId',
        group: 'general',
        mode: 'simple',
        kind: 'datacenter',
        options: datacenterOptions.value,
    }),
    column({ field: 'isSecondHand', group: 'general', mode: 'simple', kind: 'toggle', calc: true }),

    column({
        field: 'impactManufacturing',
        group: 'impact',
        mode: 'normal',
        kind: 'number',
        sortable: true,
    }),
    column({
        field: 'impactManufacturingDistributionEol',
        group: 'impact',
        mode: 'simple',
        kind: 'number',
        calc: true,
        sortable: true,
    }),
    column({ field: 'resilioDbHash', group: 'impact', mode: 'normal', kind: 'text' }),
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

    column({ field: 'cpuName', group: 'cpu', mode: 'normal', kind: 'text' }),
    column({ field: 'cpuQuantity', group: 'cpu', mode: 'simple', kind: 'number' }),
    column({ field: 'cpuLithography', group: 'cpu', mode: 'advanced', kind: 'number' }),
    column({ field: 'cpuDieSize', group: 'cpu', mode: 'advanced', kind: 'number' }),
    column({ field: 'cpuCores', group: 'cpu', mode: 'advanced', kind: 'number' }),

    column({ field: 'memoryQuantity', group: 'memory', mode: 'simple', kind: 'number' }),
    column({ field: 'memorySizeGb', group: 'memory', mode: 'simple', kind: 'number' }),
    column({
        field: 'memoryTotalGb',
        group: 'memory',
        mode: 'advanced',
        kind: 'derived',
        zod: undefined,
        derived: (row) => (row.memoryQuantity || 0) * (row.memorySizeGb || 0),
    }),

    column({
        field: 'storageType',
        group: 'storage',
        mode: 'advanced',
        kind: 'enum',
        options: enumOptions(StorageTypeSchema.options, 'inventoryStorageType_'),
    }),
    column({ field: 'storageQuantity', group: 'storage', mode: 'simple', kind: 'number' }),
    column({ field: 'storageSize', group: 'storage', mode: 'simple', kind: 'number' }),
    column({
        field: 'storageTotal',
        group: 'storage',
        mode: 'advanced',
        kind: 'derived',
        zod: undefined,
        derived: (row) => (row.storageQuantity || 0) * (row.storageSize || 0),
    }),
    column({
        field: 'storageTechnology',
        group: 'storage',
        mode: 'advanced',
        kind: 'enum',
        options: enumOptions(StorageTechnologySchema.options, 'inventoryStorageTechnology_'),
    }),
    column({
        field: 'storageCasing',
        group: 'storage',
        mode: 'advanced',
        kind: 'enum',
        options: enumOptions(StorageCasingSchema.options, 'inventoryStorageCasing_'),
    }),

    column({ field: 'gpuName', group: 'gpu', mode: 'normal', kind: 'text' }),
    column({ field: 'gpuQuantity', group: 'gpu', mode: 'simple', kind: 'number' }),
    column({ field: 'gpuLithography', group: 'gpu', mode: 'advanced', kind: 'number' }),
    column({ field: 'gpuDieSize', group: 'gpu', mode: 'advanced', kind: 'number' }),
    column({ field: 'gpuMemory', group: 'gpu', mode: 'normal', kind: 'number' }),

    column({ field: 'networkPorts', group: 'network', mode: 'normal', kind: 'number' }),
    column({ field: 'psuQuantity', group: 'network', mode: 'advanced', kind: 'number' }),
    column({ field: 'psuPower', group: 'network', mode: 'advanced', kind: 'number' }),
]);

const visibleColumns = computed(() =>
    columns.value.filter((col) => MODE_RANK[col.mode] <= MODE_RANK[props.mode]),
);

/** Group sub-headers, spans matched to the columns rendered in this mode. */
const groupRows = computed(() =>
    GROUPS.map((name) => ({
        name,
        label: t(`inventoryGroups.${name}`),
        span: visibleColumns.value.filter((col) => col.group === name).length,
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

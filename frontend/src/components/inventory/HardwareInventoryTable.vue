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
                    :key="grp.label"
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
                    :style="col.headerStyle"
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
                    :class="col.align === 'right' ? 'text-right' : 'text-left'"
                    :style="col.style"
                >
                    <!-- Second-hand not-counted impact -->
                    <template v-if="col.name === 'impactManufacturingDistributionEol'">
                        <template v-if="isNotCounted(props.row)">
                            <span class="inventory-strike">{{
                                formatKg(props.row.impactManufacturingDistributionEol)
                            }}</span>
                            <span class="inventory-dim">({{ $t('inventoryNotCounted') }})</span>
                        </template>
                        <q-input
                            v-else
                            type="number"
                            v-model.number="props.row.impactManufacturingDistributionEol"
                            :rules="[toValidationRule(col.zod)]"
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
                    <template v-else-if="col.kind === 'number'">
                        <q-input
                            type="number"
                            v-model.number="props.row[col.field]"
                            :rules="[toValidationRule(col.zod)]"
                            dense
                            outlined
                            hide-bottom-space
                        />
                    </template>

                    <!-- Free text -->
                    <template v-else-if="col.kind === 'text'">
                        <q-input
                            v-model="props.row[col.field]"
                            :rules="[toValidationRule(col.zod)]"
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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';

import type { HardwareItem } from 'src/models/mitsi';
import {
    buildInventoryColumns,
    type InventoryColumn,
    type VisibilityMode,
} from 'src/models/inventory-columns';
import { formatKg } from 'src/utils/format';
import { useMitsiStore } from 'src/stores/mitsi';
import { useValidation } from 'src/composables/useValidation';

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

// ── Columns from the registry (single source of truth) ──────────────────────
// Full registry: every non-hidden column, whatever the active mode. Cumulative
// (rank-based) visibility is applied below so Advanced keeps the simpler modes.
const built = computed(() => buildInventoryColumns(t, props.mode));

// Options for the datacenter select come from the store's datacenters.
const datacenterOptions = computed<{ label: string; value: string }[]>(() =>
    mitsi.scope.datacenters.map((dc) => ({
        label:
            dc.abbreviation && dc.name
                ? `${dc.abbreviation} — ${dc.name}`
                : dc.abbreviation || dc.name || dc.id,
        value: dc.id,
    })),
);

const visibleColumns = computed<InventoryColumn[]>(() =>
    built.value.columns
        .filter((c) => MODE_RANK[c.mode] <= MODE_RANK[props.mode])
        .map((c) => (c.kind === 'datacenter' ? { ...c, options: datacenterOptions.value } : c)),
);

/** Group sub-headers, spans matched 1:1 to the columns rendered this mode. */
const groupRows = computed<{ label: string; span: number }[]>(() => {
    const rows: { label: string; span: number }[] = [];
    for (const g of built.value.groups) {
        const span = visibleColumns.value.filter((c) => c.group === g.name).length;
        if (span > 0) rows.push({ label: g.label, span });
    }
    return rows;
});

function rowName(row: HardwareItem): string {
    return row.name.trim() || t('inventoryColName');
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

<style scoped>
.inventory-table {
    width: 100%;
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

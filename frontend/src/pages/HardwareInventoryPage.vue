<template>
    <div class="q-pa-md inventory-page">
        <!-- Title + hint -->
        <div class="q-mb-md">
            <div class="text-h4">{{ $t('inventoryPageTitle') }}</div>
            <p class="text-grey-7 q-mb-none" style="max-width: 880px">
                {{ $t('inventoryPageHint') }}
            </p>
        </div>

        <!-- Toolbar (one line): mode toggle left, Add row rightmost -->
        <div class="row items-center q-gutter-x-md q-mb-sm inventory-toolbar">
            <q-btn-toggle v-model="mode" toggle-color="primary" :options="modeOptions" />
            <q-btn unelevated color="primary" :label="$t('inventoryAddRow')" @click="addRow" />
        </div>

        <!-- Stats line -->
        <div class="row items-center q-col-gutter-md q-mb-sm">
            <div class="text-body1 text-weight-medium">
                {{
                    $t('inventoryStats', {
                        rows: rowsCount,
                        elements: elementsCount,
                        total: formatKg(mitsi.totalEmbodied),
                    })
                }}
            </div>
            <div class="text-grey-7 inventory-mode-hint">
                {{ $t('inventoryModeHint') }}
            </div>
        </div>

        <!-- Warning bar -->
        <q-banner
            v-if="mitsi.missingMandatoryHardware > 0"
            inline-actions
            class="bg-warning text-white q-mb-md"
        >
            {{ $t('inventoryWarningBar', { n: mitsi.missingMandatoryHardware }) }}
        </q-banner>

        <!-- No datacenters hint -->
        <q-banner
            v-if="mitsi.scope.datacenters.length === 0"
            inline-actions
            class="bg-grey-3 text-grey-8 q-mb-md"
        >
            {{ $t('inventoryNoDatacentersHint') }}
        </q-banner>

        <!-- Inventory table -->
        <q-table
            :rows="mitsi.hardware"
            :columns="visibleColumns"
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
                Header row 1: group sub-headers. Plain <q-tr> WITHOUT :props —
                binding :props to q-th makes Quasar read the undefined prop.cols
                and crash the whole page. Colspans are recomputed from the
                columns actually visible in the active mode.
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
                    <q-th v-if="actionsVisible" colspan="1" class="inventory-group-th" />
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
                </q-tr>
            </template>

            <template v-slot:body="props">
                <q-tr
                    :props="props"
                    :class="{ 'inventory-row--excluded': isNotCounted(props.row) }"
                >
                    <q-td
                        v-for="col in props.cols"
                        :key="col.name"
                        :props="props"
                        :class="col.align === 'right' ? 'text-right' : 'text-left'"
                        :style="col.style"
                    >
                        <!-- Actions (delete) -->
                        <template v-if="col.name === 'actions'">
                            <q-btn
                                flat
                                dense
                                icon="delete"
                                :aria-label="$t('inventoryDeleteRow')"
                                @click="confirmDeleteRow(props.row)"
                            />
                        </template>

                        <!-- Second-hand not-counted impact -->
                        <template v-else-if="col.name === 'impactManufacturingDistributionEol'">
                            <template v-if="isNotCounted(props.row)">
                                <span class="inventory-strike">{{
                                    formatKg(props.row.impactManufacturingDistributionEol)
                                }}</span>
                                <span class="inventory-dim">({{ $t('inventoryNotCounted') }})</span>
                            </template>
                            <q-input
                                v-else
                                type="number"
                                :model-value="props.row.impactManufacturingDistributionEol"
                                @update:model-value="
                                    (v) => (props.row.impactManufacturingDistributionEol = toNum(v))
                                "
                                :rules="col.rules"
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
                            <span v-else>{{
                                formatKg(col.derived ? col.derived(props.row) : 0)
                            }}</span>
                        </template>

                        <!-- Datacenter select (store-driven options, value = id) -->
                        <template v-else-if="col.kind === 'datacenter'">
                            <q-select
                                :model-value="props.row.datacenterId"
                                @update:model-value="
                                    (v) => (props.row.datacenterId = String(v ?? ''))
                                "
                                :options="col.options"
                                emit-value
                                map-options
                                :rules="col.rules"
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
                                :rules="col.rules"
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
                                :model-value="props.row[col.field]"
                                @update:model-value="(v) => (props.row[col.field] = toNum(v))"
                                :rules="col.rules"
                                dense
                                outlined
                                hide-bottom-space
                            />
                        </template>

                        <!-- Free text -->
                        <template v-else-if="col.kind === 'text'">
                            <q-input
                                :model-value="props.row[col.field]"
                                @update:model-value="
                                    (v) => (props.row[col.field] = String(v ?? ''))
                                "
                                :rules="col.rules"
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
                </q-tr>
            </template>
        </q-table>

        <!-- Footer -->
        <div class="row items-center q-mt-md inventory-footer">
            <div class="text-body1">
                {{ $t('inventoryFooter', { n: mitsi.secondHandExcludedCount }) }}
            </div>
            <div class="text-body1 text-weight-medium" style="margin-left: auto">
                {{ formatKg(mitsi.totalEmbodied) }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';

import type { HardwareItem } from 'src/models/mitsi';
import { newHardwareItem } from 'src/models/mitsi';
import {
    buildInventoryColumns,
    type InventoryColumn,
    type VisibilityMode,
} from 'src/models/inventory-columns';
import type { SchemaOption } from 'src/utils/options';
import { useMitsiStore } from 'src/stores/mitsi';

const { t } = useI18n();
const $q = useQuasar();
const mitsi = useMitsiStore();

// ── Local UI state (never persisted) ─────────────────────────────────────────
const mode = ref<VisibilityMode>('normal');
const modeOptions = [
    { label: t('inventoryModeSimple'), value: 'simple' },
    { label: t('inventoryModeNormal'), value: 'normal' },
    { label: t('inventoryModeAdvanced'), value: 'advanced' },
];

/** Columns are cumulative: advanced ⊇ normal ⊇ simple. */
const MODE_RANK: Record<VisibilityMode, number> = { simple: 0, normal: 1, advanced: 2 };

// ── Display-only helpers (never written back to the store) ──────────────────
function toNum(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function formatKg(n: number): string {
    const parts = n.toFixed(2).split('.');
    const int = parts[0] ?? '0';
    const dec = parts[1] ?? '00';
    return `${int.replace(/\B(?=(?:\d{3})+(?!\d))/g, ' ')}.${dec}`;
}

/** True when a row's impact must be struck through (second-hand, not accounted). */
function isNotCounted(row: HardwareItem): boolean {
    return mitsi.isSecondHandExcluded(row);
}

// ── Columns from the registry (single source of truth) ──────────────────────
// Full registry: every non-hidden column, whatever the active mode. Cumulative
// (rank-based) visibility is applied below so Advanced keeps the simpler modes.
const built = computed(() => buildInventoryColumns(t, mode.value, mitsi.rowSubtotal));

// Options for the datacenter select come from the store's datacenters.
const datacenterOptions = computed<SchemaOption[]>(() =>
    mitsi.scope.datacenters.map((dc) => ({
        label:
            dc.abbreviation && dc.name
                ? `${dc.abbreviation} — ${dc.name}`
                : dc.abbreviation || dc.name || dc.id,
        value: dc.id,
    })),
);

/** Page-only delete column — `group: null` keeps it out of every group span. */
interface ActionsColumn {
    name: string;
    field: string;
    label: string;
    group: null;
    mode: VisibilityMode;
    kind: 'derived';
    align: 'right';
    rules: never[];
}
const actionsColumn: ActionsColumn = {
    name: 'actions',
    field: 'actions',
    label: '',
    group: null,
    mode: 'simple',
    kind: 'derived',
    align: 'right',
    rules: [],
};

const visibleColumns = computed<(InventoryColumn | ActionsColumn)[]>(() => [
    ...built.value.columns
        .filter((c) => MODE_RANK[c.mode] <= MODE_RANK[mode.value])
        .map((c) => (c.kind === 'datacenter' ? { ...c, options: datacenterOptions.value } : c)),
    actionsColumn,
]);

const actionsVisible = computed<boolean>(() => true);

/** Group sub-headers, spans matched 1:1 to the columns rendered this mode. */
const groupRows = computed<{ label: string; span: number }[]>(() => {
    const rows: { label: string; span: number }[] = [];
    for (const g of built.value.groups) {
        const span = visibleColumns.value.filter((c) => c.group === g.name).length;
        if (span > 0) rows.push({ label: g.label, span });
    }
    return rows;
});

// ── Stats line (display-only) ────────────────────────────────────────────────
const rowsCount = computed<number>(() => mitsi.hardware.length);
const elementsCount = computed<number>(() =>
    mitsi.hardware.reduce((sum, h) => sum + (h.quantity || 0), 0),
);

// ── Row actions ──────────────────────────────────────────────────────────────
function addRow(): void {
    mitsi.hardware.push(newHardwareItem());
}

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
.inventory-toolbar {
    flex-wrap: nowrap;
}

.inventory-table {
    width: 100%;
}

.inventory-mode-hint {
    font-size: 13px;
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

.inventory-footer {
    border-top: 1px solid #e6e9ef;
    padding-top: 12px;
}
</style>

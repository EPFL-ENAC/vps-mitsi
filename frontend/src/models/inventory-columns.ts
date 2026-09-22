/**
 * MITSI — hardware inventory column registry (single source of columns)
 *
 * One registry entry per `HardwareItemSchema` field plus the three derived
 * display columns (`memoryTotalGb`, `storageTotal`, `subtotal` — the first two
 * are also schema fields but are computed, never written to the store) so that
 * `buildInventoryColumns` is the only place that decides which columns exist,
 * what mode they belong to, and what validation rules they carry.
 *
 * The page renders whatever this module returns; it holds no column list of
 * its own.
 */
import {
    HardwareCategorySchema,
    HardwareItemSchema,
    StorageCasingSchema,
    StorageTechnologySchema,
    StorageTypeSchema,
    type HardwareItem,
} from 'src/models/schema';
import type { ValidationRule } from 'src/models/validation';
import { nonNegativeNumber, optionalNumber, required } from 'src/models/validation';
import { normalizeKey, rowSubtotal } from 'src/utils/format';

/** A single `{ label, value }` choice for a schema-driven select. */
export interface SchemaOption {
    label: string;
    value: string;
}

// ── Public types ─────────────────────────────────────────────────────────────

export type VisibilityMode = 'simple' | 'normal' | 'advanced';
export type InventoryColumnKind =
    | 'enum'
    | 'datacenter'
    | 'text'
    | 'number'
    | 'toggle'
    | 'derived'
    | 'hidden';

export interface InventoryColumn {
    name: string;
    field: string;
    label: string;
    group: GroupKey;
    /** Which visibility mode the column appears in. */
    mode: VisibilityMode;
    kind: InventoryColumnKind;
    align: 'left' | 'right';
    /** Field feeds the calculation → show the ∑ badge. */
    calc?: boolean;
    sortable?: boolean;
    /** Quasar `:rules` — derived in-file from kind + mode. */
    rules: ValidationRule[];
    /** Options for enum selects (category + storage selects). */
    options?: SchemaOption[];
    /** Display value for derived columns (never written to the store).
     *  Renamed from `value`: Quasar's q-table body slot sets `col.value` to the
     *  row's field value for every column in `props.cols`, shadowing any custom
     *  function — so the render fn lives under a non-clashing name. */
    derived?: (row: HardwareItem) => number;
    /** Custom sort (used for derived columns with no stored field value). */
    sort?: (a: unknown, b: unknown, rowA: HardwareItem, rowB: HardwareItem) => number;
    /** Inline style for the body cell (`min-width` pins column width across modes). */
    style: string;
    /** Inline style for the header cell — same min-width as the body cell so the
     *  label stays directly above its input on every mode switch. */
    headerStyle: string;
}

export interface InventoryGroup {
    name: GroupKey;
    label: string;
    count: number;
}

/** The seven column groups, in display order. */
export type GroupKey = 'general' | 'impact' | 'cpu' | 'memory' | 'storage' | 'gpu' | 'network';

const GROUP_ORDER: GroupKey[] = ['general', 'impact', 'cpu', 'memory', 'storage', 'gpu', 'network'];

const GROUP_LABEL_KEYS: Record<GroupKey, string> = {
    general: 'inventoryGroupGeneral',
    impact: 'inventoryGroupImpact',
    cpu: 'inventoryGroupCpu',
    memory: 'inventoryGroupMemory',
    storage: 'inventoryGroupStorage',
    gpu: 'inventoryGroupGpu',
    network: 'inventoryGroupNetworkPsu',
};

// ── Display-only derived values (never written to the store) ─────────────────

function memoryTotal(row: HardwareItem): number {
    return (row.memoryQuantity || 0) * (row.memorySizeGb || 0);
}

function storageTotal(row: HardwareItem): number {
    return (row.storageQuantity || 0) * (row.storageSize || 0);
}

// ── Rule derivation (in-file) ────────────────────────────────────────────────

/** number + simple → nonNegativeNumber; number + normal/advanced → optionalNumber. */
function numRules(mode: VisibilityMode, label: string): ValidationRule[] {
    return mode === 'simple' ? [nonNegativeNumber(label)] : [optionalNumber(label)];
}

/** text + simple → required; otherwise no rule. */
function textRules(mode: VisibilityMode, label: string): ValidationRule[] {
    return mode === 'simple' ? [required(label)] : [];
}

const NO_RULES: ValidationRule[] = [];

/**
 * Per-kind minimum column width (px). Pinning min-width on both the header
 * (headerStyle) and the body cell (style) keeps each column's width stable as
 * the visible column set changes between modes — otherwise q-table's
 * auto-layout redistributes widths and a header label drifts off its input.
 */
const KIND_MIN_WIDTH: Record<InventoryColumnKind, string> = {
    number: '110px',
    text: '140px',
    enum: '130px',
    datacenter: '150px',
    toggle: '80px',
    derived: '110px',
    hidden: '0px', // never rendered (id column)
};

// ── Registry builders ────────────────────────────────────────────────────────

interface EnumOptionSets {
    category: SchemaOption[];
    type: SchemaOption[];
    tech: SchemaOption[];
    casing: SchemaOption[];
}

interface Spec {
    field: string;
    labelKey: string;
    mode: VisibilityMode;
    kind: InventoryColumnKind;
    group: GroupKey;
    align?: 'left' | 'right';
    calc?: boolean;
    sortable?: boolean;
    enum?: 'category' | 'type' | 'tech' | 'casing' | 'datacenter';
    derived?: 'memoryTotal' | 'storageTotal' | 'subtotal';
}

/**
 * Builds the full registry (every schema field + the three derived columns).
 * `id` gets a `hidden` entry purely so the schema-drift guard below sees every
 * `HardwareItemSchema.shape` key represented.
 */
function makeColumns(t: (key: string) => string, opts: EnumOptionSets): InventoryColumn[] {
    const specs: Spec[] = [
        // ── General ──────────────────────────────────────────────────────────
        { field: 'id', labelKey: '', mode: 'advanced', kind: 'hidden', group: 'general' },
        {
            field: 'category',
            labelKey: 'inventoryColCategory',
            mode: 'simple',
            kind: 'enum',
            group: 'general',
            enum: 'category',
            sortable: true,
        },
        {
            field: 'name',
            labelKey: 'inventoryColName',
            mode: 'simple',
            kind: 'text',
            group: 'general',
            sortable: true,
        },
        {
            field: 'rackUnit',
            labelKey: 'inventoryColRackUnit',
            mode: 'advanced',
            kind: 'number',
            group: 'general',
            align: 'right',
        },
        {
            field: 'quantity',
            labelKey: 'inventoryColQuantity',
            mode: 'simple',
            kind: 'number',
            group: 'general',
            align: 'right',
            calc: true,
            sortable: true,
        },
        {
            field: 'description',
            labelKey: 'inventoryColDescription',
            mode: 'normal',
            kind: 'text',
            group: 'general',
        },
        {
            field: 'datacenterId',
            labelKey: 'inventoryColDatacenter',
            mode: 'simple',
            kind: 'datacenter',
            group: 'general',
            enum: 'datacenter',
        },
        {
            field: 'isSecondHand',
            labelKey: 'inventoryColIsSecondHand',
            mode: 'simple',
            kind: 'toggle',
            group: 'general',
            calc: true,
        },

        // ── Impact (∑) ───────────────────────────────────────────────────────
        {
            field: 'impactManufacturing',
            labelKey: 'inventoryColImpactManufacturing',
            mode: 'normal',
            kind: 'number',
            group: 'impact',
            align: 'right',
            sortable: true,
        },
        {
            field: 'impactManufacturingDistributionEol',
            labelKey: 'inventoryColImpactMde',
            mode: 'simple',
            kind: 'number',
            group: 'impact',
            align: 'right',
            calc: true,
            sortable: true,
        },
        {
            field: 'resilioDbHash',
            labelKey: 'inventoryColResilioDbHash',
            mode: 'normal',
            kind: 'text',
            group: 'impact',
        },
        {
            field: 'subtotal',
            labelKey: 'inventoryColSubtotal',
            mode: 'simple',
            kind: 'derived',
            group: 'impact',
            align: 'right',
            calc: true,
            sortable: true,
            derived: 'subtotal',
        },

        // ── CPU ──────────────────────────────────────────────────────────────
        {
            field: 'cpuName',
            labelKey: 'inventoryColCpuName',
            mode: 'normal',
            kind: 'text',
            group: 'cpu',
        },
        {
            field: 'cpuQuantity',
            labelKey: 'inventoryColCpuQuantity',
            mode: 'simple',
            kind: 'number',
            group: 'cpu',
            align: 'right',
        },
        {
            field: 'cpuLithography',
            labelKey: 'inventoryColCpuLithography',
            mode: 'advanced',
            kind: 'number',
            group: 'cpu',
            align: 'right',
        },
        {
            field: 'cpuDieSize',
            labelKey: 'inventoryColCpuDieSize',
            mode: 'advanced',
            kind: 'number',
            group: 'cpu',
            align: 'right',
        },
        {
            field: 'cpuCores',
            labelKey: 'inventoryColCpuCores',
            mode: 'advanced',
            kind: 'number',
            group: 'cpu',
            align: 'right',
        },

        // ── Memory ───────────────────────────────────────────────────────────
        {
            field: 'memoryQuantity',
            labelKey: 'inventoryColMemoryQuantity',
            mode: 'simple',
            kind: 'number',
            group: 'memory',
            align: 'right',
        },
        {
            field: 'memorySizeGb',
            labelKey: 'inventoryColMemorySizeGb',
            mode: 'simple',
            kind: 'number',
            group: 'memory',
            align: 'right',
        },
        {
            field: 'memoryTotalGb',
            labelKey: 'inventoryColMemoryTotal',
            mode: 'advanced',
            kind: 'derived',
            group: 'memory',
            align: 'right',
            derived: 'memoryTotal',
        },

        // ── Storage ──────────────────────────────────────────────────────────
        {
            field: 'storageType',
            labelKey: 'inventoryColStorageType',
            mode: 'advanced',
            kind: 'enum',
            group: 'storage',
            enum: 'type',
        },
        {
            field: 'storageQuantity',
            labelKey: 'inventoryColStorageQuantity',
            mode: 'simple',
            kind: 'number',
            group: 'storage',
            align: 'right',
        },
        {
            field: 'storageSize',
            labelKey: 'inventoryColStorageSize',
            mode: 'simple',
            kind: 'number',
            group: 'storage',
            align: 'right',
        },
        {
            field: 'storageTotal',
            labelKey: 'inventoryColStorageTotal',
            mode: 'advanced',
            kind: 'derived',
            group: 'storage',
            align: 'right',
            derived: 'storageTotal',
        },
        {
            field: 'storageTechnology',
            labelKey: 'inventoryColStorageTechnology',
            mode: 'advanced',
            kind: 'enum',
            group: 'storage',
            enum: 'tech',
        },
        {
            field: 'storageCasing',
            labelKey: 'inventoryColStorageCasing',
            mode: 'advanced',
            kind: 'enum',
            group: 'storage',
            enum: 'casing',
        },

        // ── GPU ──────────────────────────────────────────────────────────────
        {
            field: 'gpuName',
            labelKey: 'inventoryColGpuName',
            mode: 'normal',
            kind: 'text',
            group: 'gpu',
        },
        {
            field: 'gpuQuantity',
            labelKey: 'inventoryColGpuQuantity',
            mode: 'simple',
            kind: 'number',
            group: 'gpu',
            align: 'right',
        },
        {
            field: 'gpuLithography',
            labelKey: 'inventoryColGpuLithography',
            mode: 'advanced',
            kind: 'number',
            group: 'gpu',
            align: 'right',
        },
        {
            field: 'gpuDieSize',
            labelKey: 'inventoryColGpuDieSize',
            mode: 'advanced',
            kind: 'number',
            group: 'gpu',
            align: 'right',
        },
        {
            field: 'gpuMemory',
            labelKey: 'inventoryColGpuMemory',
            mode: 'normal',
            kind: 'number',
            group: 'gpu',
            align: 'right',
        },

        // ── Network & PSU ────────────────────────────────────────────────────
        {
            field: 'networkPorts',
            labelKey: 'inventoryColNetworkPorts',
            mode: 'normal',
            kind: 'number',
            group: 'network',
            align: 'right',
        },
        {
            field: 'psuQuantity',
            labelKey: 'inventoryColPsuQuantity',
            mode: 'advanced',
            kind: 'number',
            group: 'network',
            align: 'right',
        },
        {
            field: 'psuPower',
            labelKey: 'inventoryColPsuPower',
            mode: 'advanced',
            kind: 'number',
            group: 'network',
            align: 'right',
        },
    ];

    const enumOptions: Record<Exclude<Spec['enum'], 'datacenter' | undefined>, SchemaOption[]> = {
        category: opts.category,
        type: opts.type,
        tech: opts.tech,
        casing: opts.casing,
    };
    const derivedValues: Record<
        'memoryTotal' | 'storageTotal' | 'subtotal',
        (r: HardwareItem) => number
    > = {
        memoryTotal,
        storageTotal,
        subtotal: rowSubtotal,
    };

    return specs.map((s) => {
        const label = s.labelKey ? t(s.labelKey) : '';
        const rules =
            s.kind === 'number'
                ? numRules(s.mode, label)
                : s.kind === 'text'
                  ? textRules(s.mode, label)
                  : NO_RULES;
        const minWidth = KIND_MIN_WIDTH[s.kind];
        const column: InventoryColumn = {
            name: s.field,
            field: s.field,
            label,
            group: s.group,
            mode: s.mode,
            kind: s.kind,
            align: s.align ?? 'left',
            rules,
            style: `min-width: ${minWidth}`,
            headerStyle: `min-width: ${minWidth}`,
        };
        if (s.calc) column.calc = true;
        if (s.sortable) column.sortable = true;
        if (s.enum === 'datacenter') {
            column.kind = 'datacenter';
            column.options = [];
        } else if (s.enum) {
            column.options = enumOptions[s.enum];
        }
        if (s.derived) {
            column.derived = derivedValues[s.derived];
            if (s.derived === 'subtotal') {
                column.sort = (_a, _b, rowA, rowB) => rowSubtotal(rowA) - rowSubtotal(rowB);
            }
        }
        return column;
    });
}

/**
 * Schema-drift guard: every field in `HardwareItemSchema.shape` must have a
 * registry entry, otherwise we log a warning so a new schema field is never
 * silently dropped from the table.
 */
function warnOnMissingSchemaFields(registry: InventoryColumn[]): void {
    const byName = new Set(registry.map((c) => c.name));
    for (const key of Object.keys(HardwareItemSchema.shape)) {
        if (!byName.has(key)) {
            console.warn(`[inventory-columns] Schema field "${key}" has no column registry entry.`);
        }
    }
}

/**
 * Builds the FULL column registry (every schema field + the three derived
 * columns). The `mode` argument is intentionally not used to filter here:
 * cumulative (rank-based) visibility is the page's job, so it receives every
 * non-hidden column and decides which to render for the active mode.
 * Options for the schema-driven selects are resolved here with the shared
 * `normalizeKey` one-liner, so the returned columns are render-ready.
 */
export function buildInventoryColumns(
    t: (key: string) => string,
    mode: VisibilityMode,
): { groups: InventoryGroup[]; columns: InventoryColumn[] } {
    void mode; // visibility filtering is applied by the page (rank-based).
    const options: EnumOptionSets = {
        category: HardwareCategorySchema.options.map((v) => ({
            label: t('inventoryCategory_' + normalizeKey(v)),
            value: v,
        })),
        type: StorageTypeSchema.options.map((v) => ({
            label: t('inventoryStorageType_' + normalizeKey(v)),
            value: v,
        })),
        tech: StorageTechnologySchema.options.map((v) => ({
            label: t('inventoryStorageTechnology_' + normalizeKey(v)),
            value: v,
        })),
        casing: StorageCasingSchema.options.map((v) => ({
            label: t('inventoryStorageCasing_' + normalizeKey(v)),
            value: v,
        })),
    };
    const all = makeColumns(t, options);
    warnOnMissingSchemaFields(all);

    const visible = all.filter((c) => c.kind !== 'hidden');
    const groups = collectGroups(visible, t);
    return { groups, columns: visible };
}

/** Builds the group sub-headers (colspan per group), in display order. */
function collectGroups(columns: InventoryColumn[], t: (key: string) => string): InventoryGroup[] {
    const out: InventoryGroup[] = [];
    const countByGroup = new Map<GroupKey, number>();
    for (const c of columns) countByGroup.set(c.group, (countByGroup.get(c.group) ?? 0) + 1);
    for (const key of GROUP_ORDER) {
        const count = countByGroup.get(key);
        if (count) out.push({ name: key, label: t(GROUP_LABEL_KEYS[key]), count });
    }
    return out;
}

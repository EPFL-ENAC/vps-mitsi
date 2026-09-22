/**
 * MITSI — Zod data model
 *
 * Single source of truth for the structure of the whole assessment. Every
 * field carries a `.default(...)` so parsing incomplete JSON always yields a
 * valid state (this is also what `emptyMitsiState()` relies on). The schema
 * refuses persisted states written by a newer version of the app, so old data
 * is always comparable with the current computation.
 */
import { z } from 'zod';

/** Bumped whenever the persisted/exported JSON shape changes. */
// v3: locationComment added (optional; spec: Location has its own comment).
export const MITSI_SCHEMA_VERSION = 3;

/** Empty FORM values ('' | null | undefined) fall back to the schema default:
 *  a cleared input must never break the whole persisted state on save + reload. */
const emptyToUndefined = (v: unknown) =>
    v === '' || v === null || v === undefined ? undefined : v;

/** Numeric drafts: '' → default (never rejects the whole state). */
const num = (d: number) => z.preprocess(emptyToUndefined, z.number().default(d));
/** Optional numerics: '' → absent (PUE empty → store applies factor 1). */
const numOpt = () => z.preprocess(emptyToUndefined, z.number().optional());

// ─── Shared enums ────────────────────────────────────────────────────────────

/** Drop-down time unit used to build the functional unit sentence. */
export const TimeUnitSchema = z.enum(['second', 'minute', 'hour', 'day', 'week', 'month', 'year']);

export const HardwareCategorySchema = z.enum([
    'server',
    'compute_server',
    'storage_bay',
    'network_device',
    'spare_part',
]);

export const StorageTypeSchema = z.enum(['HDD', 'SSD']);
export const StorageTechnologySchema = z.enum(['SLC', 'MLC', 'TLC', 'QLC']);
export const StorageCasingSchema = z.enum(['M2', '2.5 inch']);
export const MonitoringUnitSchema = z.enum(['day', 'week', 'month', 'year']);

// ─── Scope of the assessment ────────────────────────────────────────────────

/** The functional unit is built as a fill-in-the-blank sentence. */
export const FunctionalUnitSchema = z.object({
    timeUnit: TimeUnitSchema.default('hour'),
    usageDuration: num(1),
    resourceCount: num(1),
    resourceType: z.string().default(''),
});

/** A datacenter used as a boundary of the IT service (referenced by other zones). */
export const DatacenterSchema = z.object({
    // UI must generate a uuid when creating a row; '' is only a parse fallback.
    id: z.string().default(''),
    abbreviation: z.string().default(''),
    name: z.string().default(''),
    comment: z.string().default(''),
});

/** A line in the "included in the IT service" or "excluded from the IT service" tables. */
export const BoundaryItemSchema = z.object({
    // UI must generate a uuid when creating a row; '' is only a parse fallback.
    id: z.string().default(''),
    type: z.string().default(''),
    purpose: z.string().default(''),
    reason: z.string().default(''),
});

/** Everything captured in the "Scope of the assessment" block. */
export const ScopeSchema = z.object({
    organizationName: z.string().default(''),
    /** Report-only; does not gate scope validity. */
    assessors: z.string().default(''),
    serviceName: z.string().default(''),
    function: z.string().default(''),
    // factory (not object) — each parse gets a fresh instance.
    functionalUnit: FunctionalUnitSchema.default(() => FunctionalUnitSchema.parse({})),
    datacenters: z.array(DatacenterSchema).default([]),
    includedItems: z.array(BoundaryItemSchema).default([]),
    excludedItems: z.array(BoundaryItemSchema).default([]),
    /** Assessment lifespan, in years. */
    lifespanYears: num(1),
});

// ─── Embodied emissions — hardware inventory ─────────────────────────────────

/** One row of the hardware inventory table. */
export const HardwareItemSchema = z.object({
    // UI must generate a uuid when creating a row; '' is only a parse fallback.
    id: z.string().default(''),

    // General (editing mode: simple / normal / advanced)
    category: HardwareCategorySchema.default('server'),
    name: z.string().default(''),
    rackUnit: z.number().optional(),
    quantity: num(0),
    description: z.string().optional(),
    datacenterId: z.string().default(''),
    isSecondHand: z.boolean().default(false),

    // Embodied impact (used for the computation)
    impactManufacturing: numOpt(),
    /** Manufacturing + distribution + EOL impact of one unit (kg CO₂-eq per IT element); multiplied by quantity for the total. */
    impactManufacturingDistributionEol: num(0),
    resilioDbHash: z.string().optional(),

    // CPU
    cpuName: z.string().optional(),
    cpuQuantity: num(0),
    cpuLithography: z.number().optional(),
    cpuDieSize: z.number().optional(),
    cpuCores: z.number().optional(),

    // Memory
    memoryQuantity: num(0),
    memorySizeGb: num(0),
    // computed in store (quantity × size); not authoritative in exported JSON.
    memoryTotalGb: z.number().optional(),

    // Storage
    storageType: StorageTypeSchema.optional(),
    storageQuantity: num(0),
    storageSize: num(0),
    // computed in store (quantity × size); not authoritative in exported JSON.
    storageTotal: z.number().optional(),
    storageTechnology: StorageTechnologySchema.optional(),
    storageCasing: StorageCasingSchema.optional(),

    // GPU
    gpuName: z.string().optional(),
    gpuQuantity: num(0),
    gpuLithography: z.number().optional(),
    gpuDieSize: z.number().optional(),
    gpuMemory: z.number().optional(),

    // Network & PSU
    networkPorts: z.number().optional(),
    psuQuantity: z.number().optional(),
    psuPower: z.number().optional(),
});

// ─── Operational emissions — energy consumption ──────────────────────────────

/** The usage monitoring period (how long measured consumption covers). */
export const MonitoringPeriodSchema = z.object({
    unit: MonitoringUnitSchema.default('day'),
    value: num(1),
    comment: z.string().default(''),
});

/** Per-datacenter energy record used for the operational emissions computation. */
export const DatacenterEnergySchema = z.object({
    datacenterId: z.string().default(''),
    comment: z.string().default(''),
    /** Location of datacenter*/
    location: z.string().default(''),
    locationComment: z.string().optional(),
    /** Carbon intensity of the grid mix (gCO₂/kWh). */
    carbonIntensity: num(0),
    carbonIntensityComment: z.string().optional(),
    /** Optional; the report must note whether PUE was included. */
    pue: numOpt(),
    pueComment: z.string().optional(),
    /** Grid electricity consumed (kWh over the monitoring period). */
    energyConsumption: num(0),
    energyComment: z.string().optional(),
});

// ─── Strict field rules (form validation) ────────────────────────────────────
// Draft ≠ completion: persisted parsing stays tolerant (every field defaults),
// but the FORM must be strict. `formRules` maps each validated field to the
// rule the UI enforces via useValidation().toValidationRule. The completeness
// schemas below reuse the same strict feel so the store's block status agrees
// with what the forms demand.

/** Strict per-field rules used to drive Quasar form validation. */
export const formRules = {
    // integers (0 allowed)
    quantity: z.number().int().min(0),
    gpuQty: z.number().int().min(0),
    cpuQty: z.number().int().min(0),
    memoryQty: z.number().int().min(0),
    memorySize: z.number().int().min(0),
    storageQuantity: z.number().int().min(0),
    storageSize: z.number().int().min(0),
    // non-negative numbers
    impactManufacturingDistributionEol: z.number().min(0),
    impactManufacturing: z.number().min(0),
    energyConsumption: z.number().min(0),
    // optional numeric — empty input is valid (PUE optional)
    pue: z.number().min(0).optional(),
    // durations / counts (report counts may be zero)
    lifespanYears: z.number().min(0),
    usageDuration: z.number().min(0),
    resourceCount: z.number().int().min(1),
    // strictly positive
    carbonIntensity: z.number().positive(),
    monitoringPeriodValue: z.number().min(1),
    // required strings
    name: z.string().min(1),
    organizationName: z.string().min(1),
    assessors: z.string().min(1),
    serviceName: z.string().min(1),
    function: z.string().min(1),
    category: HardwareCategorySchema, // enum select must hold an exact value
    datacenterId: z.string().min(1), // mandatory datacenter reference
    abbr: z.string().min(1),
    dcName: z.string().min(1),
    type: z.string().min(1),
    purpose: z.string().min(1),
    reason: z.string().min(1),
    comment: z.string().min(1),
} as const satisfies Record<string, z.ZodType>;

/** Scope completeness (must mirror the old isScopeValid predicate). */
export const scopeCompletenessSchema = z.object({
    organizationName: z.string().min(1),
    serviceName: z.string().min(1),
    function: z.string().min(1),
    lifespanYears: z.number().min(1),
    datacenters: z.array(z.unknown()).min(1),
});

/** Hardware-row completeness (must mirror the old hardwareRowValid predicate). */
export const hardwareRowCompletenessSchema = z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    quantity: z.number().min(1),
    datacenterId: z.string().min(1),
    impactManufacturingDistributionEol: z.number().min(0),
});

/** Energy-row completeness (must mirror the old energyRowValid predicate). */
export const energyRowCompletenessSchema = z.object({
    datacenterId: z.string().min(1),
    carbonIntensity: z.number().positive(),
    energyConsumption: z.number().min(0),
});

// ─── Underlying services ─────────────────────────────────────────────────────

export const UnderlyingServiceSchema = z.object({
    // UI must generate a uuid when creating a row; '' is only a parse fallback.
    id: z.string().default(''),
    name: z.string().default(''),
    usageDescription: z.string().default(''),
    /** Estimated emissions (kg CO₂-eq). */
    co2EstimateKg: num(0),
});

// ─── Whole assessment ────────────────────────────────────────────────────────

/** The single source of truth for the whole assessment state. */
export const MitsiStateSchema = z
    .object({
        schemaVersion: z
            .number()
            .int()
            .finite()
            .max(MITSI_SCHEMA_VERSION)
            .default(MITSI_SCHEMA_VERSION),
        // factory (not object) — each parse gets a fresh instance.
        scope: ScopeSchema.default(() => ScopeSchema.parse({})),
        hardware: z.array(HardwareItemSchema).default([]),
        monitoringPeriod: MonitoringPeriodSchema.default(() => MonitoringPeriodSchema.parse({})),
        energy: z.array(DatacenterEnergySchema).default([]),
        /** Whether embodied emissions of second-hand hardware are accounted for. */
        includeSecondHandEmbodied: z.boolean().default(false),
        /** Whether underlying-service emissions are added to the total. */
        includeUnderlyingServices: z.boolean().default(false),
        underlyingServices: z.array(UnderlyingServiceSchema).default([]),
    })
    // Referential integrity at the data boundary: the schema validates each
    // record's shape, but a hand-edited/foreign file may reference datacenters
    // the same file does not define. The UI can never create such rows
    // (deleteDatacenterGuard blocks deletion while referenced), so drop orphan
    // rows once here — everything downstream sees a consistent state.
    .transform((state) => {
        const dcIds = new Set(state.scope.datacenters.map((dc) => dc.id));
        return {
            ...state,
            hardware: state.hardware.filter((h) => dcIds.has(h.datacenterId)),
            energy: state.energy.filter((e) => dcIds.has(e.datacenterId)),
        };
    });

// ─── Derived types (same names as before so no other file changes) ──────────

export type TimeUnit = z.infer<typeof TimeUnitSchema>;
export type HardwareCategory = z.infer<typeof HardwareCategorySchema>;
export type StorageType = z.infer<typeof StorageTypeSchema>;
export type StorageTechnology = z.infer<typeof StorageTechnologySchema>;
export type StorageCasing = z.infer<typeof StorageCasingSchema>;
export type MonitoringUnit = z.infer<typeof MonitoringUnitSchema>;
export type FunctionalUnit = z.infer<typeof FunctionalUnitSchema>;
export type Datacenter = z.infer<typeof DatacenterSchema>;
export type BoundaryItem = z.infer<typeof BoundaryItemSchema>;
export type Scope = z.infer<typeof ScopeSchema>;
export type HardwareItem = z.infer<typeof HardwareItemSchema>;
export type MonitoringPeriod = z.infer<typeof MonitoringPeriodSchema>;
export type DatacenterEnergy = z.infer<typeof DatacenterEnergySchema>;
export type UnderlyingService = z.infer<typeof UnderlyingServiceSchema>;
export type MitsiState = z.infer<typeof MitsiStateSchema>;

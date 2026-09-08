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
export const MITSI_SCHEMA_VERSION = 1;

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
    usageDuration: z.number().default(1),
    resourceCount: z.number().default(1),
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
    /** Total resources in the service (e.g. all H100 GPUs). */
    resourcesInService: z.number().default(0),
    datacenters: z.array(DatacenterSchema).default([]),
    includedItems: z.array(BoundaryItemSchema).default([]),
    excludedItems: z.array(BoundaryItemSchema).default([]),
    /** Assessment lifespan, in years. */
    lifespanYears: z.number().default(1),
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
    quantity: z.number().default(0),
    description: z.string().optional(),
    datacenterId: z.string().default(''),
    isSecondHand: z.boolean().default(false),

    // Embodied impact (used for the computation)
    impactManufacturing: z.number().optional(),
    /** Manufacturing + distribution + EOL impact of one unit (kg CO₂-eq per IT element); multiplied by quantity for the total. */
    impactManufacturingDistributionEol: z.number().default(0),
    resilioDbHash: z.string().optional(),

    // CPU
    cpuName: z.string().optional(),
    cpuQuantity: z.number().default(0),
    cpuLithography: z.number().optional(),
    cpuDieSize: z.number().optional(),
    cpuCores: z.number().optional(),

    // Memory
    memoryQuantity: z.number().default(0),
    memorySizeGb: z.number().default(0),
    // computed in store (quantity × size); not authoritative in exported JSON.
    memoryTotalGb: z.number().optional(),

    // Storage
    storageType: StorageTypeSchema.optional(),
    storageQuantity: z.number().default(0),
    storageSize: z.number().default(0),
    // computed in store (quantity × size); not authoritative in exported JSON.
    storageTotal: z.number().optional(),
    storageTechnology: StorageTechnologySchema.optional(),
    storageCasing: StorageCasingSchema.optional(),

    // GPU
    gpuName: z.string().optional(),
    gpuQuantity: z.number().default(0),
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
    value: z.number().default(1),
    comment: z.string().default(''),
});

/** Per-datacenter energy record used for the operational emissions computation. */
export const DatacenterEnergySchema = z.object({
    datacenterId: z.string().default(''),
    location: z.string().default(''),
    comment: z.string().default(''),
    /** Carbon intensity of the grid mix (gCO₂/kWh). */
    carbonIntensity: z.number().default(0),
    carbonIntensityComment: z.string().optional(),
    /** Optional; the report must note whether PUE was included. */
    pue: z.number().optional(),
    pueComment: z.string().optional(),
    /** Grid electricity consumed (kWh over the monitoring period). */
    energyConsumption: z.number().default(0),
    energyComment: z.string().optional(),
});

// ─── Underlying services ─────────────────────────────────────────────────────

export const UnderlyingServiceSchema = z.object({
    // UI must generate a uuid when creating a row; '' is only a parse fallback.
    id: z.string().default(''),
    name: z.string().default(''),
    usageDescription: z.string().default(''),
    /** Estimated emissions (kg CO₂-eq). */
    co2EstimateKg: z.number().default(0),
});

// ─── Whole assessment ────────────────────────────────────────────────────────

/** The single source of truth for the whole assessment state. */
export const MitsiStateSchema = z.object({
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

/**
 * MITSI — Zod data model
 *
 * Canonical schemas define validation once. Derived draft schemas add defaults
 * and accept their exact placeholders so unfinished assessments can round-trip.
 * Defaults belong only to draft creation and persistence, never validation.
 */
import { z } from 'zod';

/** Bumped whenever the persisted/exported JSON shape changes. */
// v3: locationComment added (optional; spec: Location has its own comment).
export const MITSI_SCHEMA_VERSION = 3;

/** Quasar clears numeric inputs to an empty string or null. */
const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

/** Accept a declared placeholder in drafts without relaxing other constraints. */
function draftField<S extends z.ZodType, D extends z.output<S> & (string | number | boolean)>(
    schema: S,
    defaultValue: D,
) {
    return schema.or(z.literal(defaultValue)).default(defaultValue);
}

function draftNumber<S extends z.ZodNumber>(schema: S, defaultValue: z.output<S> & number) {
    return z.preprocess(emptyToUndefined, draftField(schema, defaultValue));
}

/** Empty optional numbers are absent, including during whole-row validation. */
function optionalNumber(schema = z.number()) {
    return z.preprocess(emptyToUndefined, schema.optional());
}

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
    timeUnit: TimeUnitSchema,
    usageDuration: z.number().min(0),
    resourceCount: z.number().int().min(1),
    resourceType: z.string(),
});

/** A datacenter used as a boundary of the IT service (referenced by other zones). */
export const DatacenterSchema = z.object({
    // UI must generate a uuid when creating a row; '' is only a parse fallback.
    id: z.string(),
    abbreviation: z.string().min(1),
    name: z.string().min(1),
    comment: z.string(),
});

/** A line in the "included in the IT service" or "excluded from the IT service" tables. */
export const BoundaryItemSchema = z.object({
    // UI must generate a uuid when creating a row; '' is only a parse fallback.
    id: z.string(),
    type: z.string().min(1),
    purpose: z.string().min(1),
    reason: z.string().min(1),
});

/** Everything captured in the "Scope of the assessment" block. */
export const ScopeSchema = z.object({
    organizationName: z.string().min(1),
    assessors: z.string().min(1),
    serviceName: z.string().min(1),
    function: z.string().min(1),
    functionalUnit: FunctionalUnitSchema,
    datacenters: z.array(DatacenterSchema).min(1),
    includedItems: z.array(BoundaryItemSchema),
    excludedItems: z.array(BoundaryItemSchema),
    /** Assessment lifespan, in years. */
    lifespanYears: z.number().min(1),
});

// ─── Embodied emissions — hardware inventory ─────────────────────────────────

/** One row of the hardware inventory table. */
export const HardwareItemSchema = z.object({
    // UI must generate a uuid when creating a row; '' is only a parse fallback.
    id: z.string(),

    // General (editing mode: simple / normal / advanced)
    category: HardwareCategorySchema,
    name: z.string().min(1),
    rackUnit: optionalNumber(),
    quantity: z.number().int().min(1),
    description: z.string().optional(),
    datacenterId: z.string().min(1),
    isSecondHand: z.boolean(),

    // Embodied impact (used for the computation)
    impactManufacturing: z.number().min(0),
    /** Manufacturing + distribution + EOL impact of one unit (kg CO₂-eq per IT element); multiplied by quantity for the total. */
    impactManufacturingDistributionEol: z.number().min(0),
    resilioDbHash: z.string().optional(),

    // CPU
    cpuName: z.string().optional(),
    cpuQuantity: z.number().int().min(0),
    cpuLithography: optionalNumber(),
    cpuDieSize: optionalNumber(),
    cpuCores: optionalNumber(),

    // Memory
    memoryQuantity: z.number().int().min(0),
    memorySizeGb: z.number().int().min(0),
    // computed in store (quantity × size); not authoritative in exported JSON.
    memoryTotalGb: optionalNumber(),

    // Storage
    storageType: StorageTypeSchema.optional(),
    storageQuantity: z.number().int().min(0),
    storageSize: z.number().int().min(0),
    // computed in store (quantity × size); not authoritative in exported JSON.
    storageTotal: optionalNumber(),
    storageTechnology: StorageTechnologySchema.optional(),
    storageCasing: StorageCasingSchema.optional(),

    // GPU
    gpuName: z.string().optional(),
    gpuQuantity: z.number().int().min(0),
    gpuLithography: optionalNumber(),
    gpuDieSize: optionalNumber(),
    gpuMemory: optionalNumber(),

    // Network & PSU
    networkPorts: optionalNumber(),
    psuQuantity: optionalNumber(),
    psuPower: optionalNumber(),
});

// ─── Operational emissions — energy consumption ──────────────────────────────

/** The usage monitoring period (how long measured consumption covers). */
export const MonitoringPeriodSchema = z.object({
    unit: MonitoringUnitSchema,
    value: z.number().min(1),
    comment: z.string(),
});

/** Per-datacenter energy record used for the operational emissions computation. */
export const DatacenterEnergySchema = z.object({
    datacenterId: z.string().min(1),
    comment: z.string(),
    /** Location of datacenter*/
    location: z.string(),
    locationComment: z.string().optional(),
    /** Carbon intensity of the grid mix (gCO₂/kWh). */
    carbonIntensity: z.number().positive(),
    carbonIntensityComment: z.string().optional(),
    /** Optional; the report must note whether PUE was included. */
    pue: optionalNumber(z.number().min(0)),
    pueComment: z.string().optional(),
    /** Grid electricity consumed (kWh over the monitoring period). */
    energyConsumption: z.number().min(0),
    energyComment: z.string().optional(),
});

// ─── Underlying services ─────────────────────────────────────────────────────

export const UnderlyingServiceSchema = z.object({
    // UI must generate a uuid when creating a row; '' is only a parse fallback.
    id: z.string(),
    name: z.string(),
    usageDescription: z.string(),
    /** Estimated emissions (kg CO₂-eq). */
    co2EstimateKg: z.number(),
});

// ─── Whole assessment ────────────────────────────────────────────────────────

/** Canonical whole-assessment validation; no default values or data filtering. */
export const MitsiStateSchema = z.object({
    schemaVersion: z.number().int().finite().max(MITSI_SCHEMA_VERSION),
    scope: ScopeSchema,
    hardware: z.array(HardwareItemSchema),
    monitoringPeriod: MonitoringPeriodSchema,
    energy: z.array(DatacenterEnergySchema),
    /** Whether embodied emissions of second-hand hardware are accounted for. */
    includeSecondHandEmbodied: z.boolean(),
    /** Whether underlying-service emissions are added to the total. */
    includeUnderlyingServices: z.boolean(),
    underlyingServices: z.array(UnderlyingServiceSchema),
});

// ─── Draft creation and persistence ─────────────────────────────────────────
// Reuse canonical fields, adding only defaults and permitted placeholders.
// Nested objects use their draft variants; each parse creates fresh defaults.

export const FunctionalUnitDraftSchema = FunctionalUnitSchema.extend({
    timeUnit: draftField(FunctionalUnitSchema.shape.timeUnit, 'hour'),
    usageDuration: draftNumber(FunctionalUnitSchema.shape.usageDuration, 1),
    resourceCount: draftNumber(FunctionalUnitSchema.shape.resourceCount, 1),
    resourceType: draftField(FunctionalUnitSchema.shape.resourceType, ''),
});

export const DatacenterDraftSchema = DatacenterSchema.extend({
    id: draftField(DatacenterSchema.shape.id, ''),
    abbreviation: draftField(DatacenterSchema.shape.abbreviation, ''),
    name: draftField(DatacenterSchema.shape.name, ''),
    comment: draftField(DatacenterSchema.shape.comment, ''),
});

export const BoundaryItemDraftSchema = BoundaryItemSchema.extend({
    id: draftField(BoundaryItemSchema.shape.id, ''),
    type: draftField(BoundaryItemSchema.shape.type, ''),
    purpose: draftField(BoundaryItemSchema.shape.purpose, ''),
    reason: draftField(BoundaryItemSchema.shape.reason, ''),
});

export const ScopeDraftSchema = ScopeSchema.extend({
    organizationName: draftField(ScopeSchema.shape.organizationName, ''),
    assessors: draftField(ScopeSchema.shape.assessors, ''),
    serviceName: draftField(ScopeSchema.shape.serviceName, ''),
    function: draftField(ScopeSchema.shape.function, ''),
    functionalUnit: FunctionalUnitDraftSchema.default(() => FunctionalUnitDraftSchema.parse({})),
    // The empty array is the draft placeholder for the required datacenter list.
    datacenters: z.array(DatacenterDraftSchema).default(() => []),
    includedItems: z.array(BoundaryItemDraftSchema).default(() => []),
    excludedItems: z.array(BoundaryItemDraftSchema).default(() => []),
    lifespanYears: draftNumber(ScopeSchema.shape.lifespanYears, 1),
});

export const HardwareItemDraftSchema = HardwareItemSchema.extend({
    id: draftField(HardwareItemSchema.shape.id, ''),
    category: draftField(HardwareItemSchema.shape.category, 'server'),
    name: draftField(HardwareItemSchema.shape.name, ''),
    quantity: draftNumber(HardwareItemSchema.shape.quantity, 0),
    datacenterId: draftField(HardwareItemSchema.shape.datacenterId, ''),
    isSecondHand: draftField(HardwareItemSchema.shape.isSecondHand, false),
    impactManufacturing: optionalNumber(HardwareItemSchema.shape.impactManufacturing),
    impactManufacturingDistributionEol: draftNumber(
        HardwareItemSchema.shape.impactManufacturingDistributionEol,
        0,
    ),
    cpuQuantity: draftNumber(HardwareItemSchema.shape.cpuQuantity, 0),
    memoryQuantity: draftNumber(HardwareItemSchema.shape.memoryQuantity, 0),
    memorySizeGb: draftNumber(HardwareItemSchema.shape.memorySizeGb, 0),
    storageQuantity: draftNumber(HardwareItemSchema.shape.storageQuantity, 0),
    storageSize: draftNumber(HardwareItemSchema.shape.storageSize, 0),
    gpuQuantity: draftNumber(HardwareItemSchema.shape.gpuQuantity, 0),
});

export const MonitoringPeriodDraftSchema = MonitoringPeriodSchema.extend({
    unit: draftField(MonitoringPeriodSchema.shape.unit, 'day'),
    value: draftNumber(MonitoringPeriodSchema.shape.value, 1),
    comment: draftField(MonitoringPeriodSchema.shape.comment, ''),
});

export const DatacenterEnergyDraftSchema = DatacenterEnergySchema.extend({
    datacenterId: draftField(DatacenterEnergySchema.shape.datacenterId, ''),
    comment: draftField(DatacenterEnergySchema.shape.comment, ''),
    location: draftField(DatacenterEnergySchema.shape.location, ''),
    carbonIntensity: draftNumber(DatacenterEnergySchema.shape.carbonIntensity, 0),
    energyConsumption: draftNumber(DatacenterEnergySchema.shape.energyConsumption, 0),
});

export const UnderlyingServiceDraftSchema = UnderlyingServiceSchema.extend({
    id: draftField(UnderlyingServiceSchema.shape.id, ''),
    name: draftField(UnderlyingServiceSchema.shape.name, ''),
    usageDescription: draftField(UnderlyingServiceSchema.shape.usageDescription, ''),
    co2EstimateKg: draftNumber(UnderlyingServiceSchema.shape.co2EstimateKg, 0),
});

/** Persistable drafts may be incomplete, but supplied values must obey their rules. */
export const MitsiStateDraftSchema = MitsiStateSchema.extend({
    schemaVersion: draftField(MitsiStateSchema.shape.schemaVersion, MITSI_SCHEMA_VERSION),
    scope: ScopeDraftSchema.default(() => ScopeDraftSchema.parse({})),
    hardware: z.array(HardwareItemDraftSchema).default(() => []),
    monitoringPeriod: MonitoringPeriodDraftSchema.default(() =>
        MonitoringPeriodDraftSchema.parse({}),
    ),
    energy: z.array(DatacenterEnergyDraftSchema).default(() => []),
    includeSecondHandEmbodied: draftField(MitsiStateSchema.shape.includeSecondHandEmbodied, false),
    includeUnderlyingServices: draftField(MitsiStateSchema.shape.includeUnderlyingServices, false),
    underlyingServices: z.array(UnderlyingServiceDraftSchema).default(() => []),
});

// ─── Application types (editable drafts) ──────────

export type TimeUnit = z.infer<typeof TimeUnitSchema>;
export type HardwareCategory = z.infer<typeof HardwareCategorySchema>;
export type StorageType = z.infer<typeof StorageTypeSchema>;
export type StorageTechnology = z.infer<typeof StorageTechnologySchema>;
export type StorageCasing = z.infer<typeof StorageCasingSchema>;
export type MonitoringUnit = z.infer<typeof MonitoringUnitSchema>;
export type FunctionalUnit = z.infer<typeof FunctionalUnitDraftSchema>;
export type Datacenter = z.infer<typeof DatacenterDraftSchema>;
export type BoundaryItem = z.infer<typeof BoundaryItemDraftSchema>;
export type Scope = z.infer<typeof ScopeDraftSchema>;
export type HardwareItem = z.infer<typeof HardwareItemDraftSchema>;
export type MonitoringPeriod = z.infer<typeof MonitoringPeriodDraftSchema>;
export type DatacenterEnergy = z.infer<typeof DatacenterEnergyDraftSchema>;
export type UnderlyingService = z.infer<typeof UnderlyingServiceDraftSchema>;
export type MitsiState = z.infer<typeof MitsiStateDraftSchema>;

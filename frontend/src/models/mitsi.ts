/**
 * MITSI — data model
 *
 * Entities follow the "Specification for MITSI web application_2026_08" and the
 * interface draft designs. This file is the single source of truth for the
 * structure of the whole assessment. It also defines the versioned JSON
 * import/export schema.
 */

/** Bumped whenever the persisted/exported JSON shape changes. */
export const MITSI_SCHEMA_VERSION = 1;

/** Storage key used for client-side (Quasar LocalStorage) persistence. */
export const MITSI_STORAGE_KEY = 'mitsi-assessment';

// ─── Scope of the assessment ────────────────────────────────────────────────

/** Drop-down time unit used to build the functional unit sentence. */
export type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

/** The functional unit is built as a fill-in-the-blank sentence. */
export interface FunctionalUnit {
    timeUnit: TimeUnit;
    usageDuration: number;
    resourceCount: number;
    resourceType: string;
}

/** A datacenter used as a boundary of the IT service (referenced by other zones). */
export interface Datacenter {
    id: string;
    abbreviation: string;
    name: string;
    comment: string;
}

/** A line in the "included in the IT service" or "excluded from the IT service" tables. */
export interface BoundaryItem {
    id: string;
    type: string;
    purpose: string;
    reason: string;
}

/** Everything captured in the "Scope of the assessment" block. */
export interface Scope {
    organizationName: string;
    assessors: string;
    serviceName: string;
    function: string;
    functionalUnit: FunctionalUnit;
    /** Total resources in the service (e.g. all H100 GPUs). */
    resourcesInService: number;
    datacenters: Datacenter[];
    includedItems: BoundaryItem[];
    excludedItems: BoundaryItem[];
    lifespanYears: number;
}

// ─── Embodied emissions — hardware inventory ─────────────────────────────────

export type HardwareCategory =
    | 'server'
    | 'compute_server'
    | 'storage_bay'
    | 'network_device'
    | 'spare_part';

export type StorageType = 'HDD' | 'SSD';
export type StorageTechnology = 'SLC' | 'MLC' | 'TLC' | 'QLC';
export type StorageCasing = 'M2' | '2.5 inch';

/** One row of the hardware inventory table. */
export interface HardwareItem {
    id: string;

    // General (editing mode: simple / normal / advanced)
    category: HardwareCategory;
    name: string;
    rackUnit?: number;
    quantity: number;
    description?: string;
    datacenterId: string;
    isSecondHand: boolean;

    // Embodied impact (used for the computation)
    impactManufacturing?: number;
    /** Mandatory — this is the value multiplied by quantity for the total. */
    impactManufacturingDistributionEol: number;
    resilioDbHash?: string;

    // CPU
    cpuName?: string;
    cpuQuantity: number;
    cpuLithography?: number;
    cpuDieSize?: number;
    cpuCores?: number;

    // Memory
    memoryQuantity: number;
    memorySizeGb: number;
    /** Computed from quantity × size. */
    memoryTotalGb: number;

    // Storage
    storageType?: StorageType;
    storageQuantity: number;
    storageSize?: number;
    /** Computed from quantity × size. */
    storageTotal?: number;
    storageTechnology?: StorageTechnology;
    storageCasing?: StorageCasing;

    // GPU
    gpuName?: string;
    gpuQuantity: number;
    gpuLithography?: number;
    gpuDieSize?: number;
    gpuMemory?: number;

    // Network & PSU
    networkPorts?: number;
    psuQuantity?: number;
    psuPower?: number;
}

// ─── Operational emissions — energy consumption ──────────────────────────────

export type MonitoringUnit = 'day' | 'week' | 'month' | 'year';

/** The usage monitoring period (how long measured consumption covers). */
export interface MonitoringPeriod {
    unit: MonitoringUnit;
    value: number;
    comment: string;
}

/** Per-datacenter energy record used for the operational emissions computation. */
export interface DatacenterEnergy {
    datacenterId: string;
    location: string;
    comment: string;
    carbonIntensity: number;
    carbonIntensityComment?: string;
    /** Optional; the report must note whether PUE was included. */
    pue?: number;
    pueComment?: string;
    energyConsumption: number;
    energyComment?: string;
}

// ─── Underlying services ─────────────────────────────────────────────────────

export interface UnderlyingService {
    id: string;
    name: string;
    usageDescription: string;
    co2EstimateKg: number;
}

// ─── Whole assessment ────────────────────────────────────────────────────────

/** The single source of truth for the whole assessment state. */
export interface MitsiState {
    schemaVersion: number;
    scope: Scope;
    hardware: HardwareItem[];
    monitoringPeriod: MonitoringPeriod;
    energy: DatacenterEnergy[];
    /** Whether embodied emissions of second-hand hardware are accounted for. */
    includeSecondHandEmbodied: boolean;
    includeUnderlyingServices: boolean;
    underlyingServices: UnderlyingService[];
}

/** Creates a blank (empty) assessment state. */
export function emptyMitsiState(): MitsiState {
    return {
        schemaVersion: MITSI_SCHEMA_VERSION,
        scope: {
            organizationName: '',
            assessors: '',
            serviceName: '',
            function: '',
            functionalUnit: {
                timeUnit: 'hour',
                usageDuration: 1,
                resourceCount: 1,
                resourceType: '',
            },
            resourcesInService: 0,
            datacenters: [],
            includedItems: [],
            excludedItems: [],
            lifespanYears: 1,
        },
        hardware: [],
        monitoringPeriod: {
            unit: 'day',
            value: 1,
            comment: '',
        },
        energy: [],
        includeSecondHandEmbodied: false,
        includeUnderlyingServices: false,
        underlyingServices: [],
    };
}

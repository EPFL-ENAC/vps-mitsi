import type {
    HardwareImpactMeasurements,
    HardwareMemoryMeasurements,
    HardwareStorageMeasurements,
    HardwareCpuFleetMeasurements,
    HardwareGpuFleetMeasurements,
} from 'src/models/HardwareItem/schema';

/** Embodied emissions (kg CO₂-eq): number of items × impact of one item. */
export function rowSubtotal(row: HardwareImpactMeasurements): number {
    return row.quantity * row.impactManufacturingDistributionEol;
}

export function memoryTotal(row: HardwareMemoryMeasurements): number {
    return row.memoryQuantity * row.memorySizeGb;
}

export function storageTotal(row: HardwareStorageMeasurements): number {
    return row.storageQuantity * row.storageSize;
}

export function cpuFleetTotal(row: HardwareCpuFleetMeasurements): number {
    return row.quantity * row.cpuQuantity;
}

export function gpuFleetTotal(row: HardwareGpuFleetMeasurements): number {
    return row.quantity * row.gpuQuantity;
}

import { z } from 'zod';
import { draftField, draftNumber, optionalNumber } from 'src/models/shared/schema';

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

export type HardwareCategory = z.infer<typeof HardwareCategorySchema>;

export type StorageType = z.infer<typeof StorageTypeSchema>;

export type StorageTechnology = z.infer<typeof StorageTechnologySchema>;

export type StorageCasing = z.infer<typeof StorageCasingSchema>;

export type HardwareItem = z.infer<typeof HardwareItemDraftSchema>;

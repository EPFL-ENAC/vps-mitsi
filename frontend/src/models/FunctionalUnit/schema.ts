import { z } from 'zod';
import { TimeUnitSchema } from 'src/models/TimeUnit/schema';
import { draftField, draftNumber, optionalNumber } from 'src/models/shared/schema';

export const ResourceTypeSchema = z.enum(['CPU', 'GPU', 'Disk', 'RAM', 'Other']);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

/** The functional unit is built as a fill-in-the-blank sentence. */
export const BaseFunctionalUnitSchema = z.object({
    timeUnit: TimeUnitSchema,
    usageDuration: z.number().positive(),
    resourceCount: z.number().int().min(1),
    resourceType: ResourceTypeSchema,
    /** Custom resource name when resourceType is 'Other'. */
    resourceTypeOther: z.string().optional(),
    /** Total fleet active in service stated manually for 'Other'. */
    manualFleetCount: optionalNumber(z.number().int().positive()),
});

export const FunctionalUnitDraftSchema = BaseFunctionalUnitSchema.extend({
    timeUnit: draftField(BaseFunctionalUnitSchema.shape.timeUnit, 'hour'),
    usageDuration: draftNumber(BaseFunctionalUnitSchema.shape.usageDuration),
    resourceCount: draftNumber(BaseFunctionalUnitSchema.shape.resourceCount),
    resourceType: ResourceTypeSchema.or(z.literal('')).default(''),
    resourceTypeOther: draftField(BaseFunctionalUnitSchema.shape.resourceTypeOther, ''),
    manualFleetCount: draftNumber(z.number().int().positive()),
});

/**
 * Fully validated functional unit, custom resource 'Other' requires both a
 * name and a fleet count
 */
export const FunctionalUnitSchema = BaseFunctionalUnitSchema.refine(
    (fu) =>
        fu.resourceType !== ResourceTypeSchema.enum.Other ||
        (Boolean(fu.resourceTypeOther?.trim()) && fu.manualFleetCount != null),
);

export type FunctionalUnit = z.infer<typeof FunctionalUnitDraftSchema>;

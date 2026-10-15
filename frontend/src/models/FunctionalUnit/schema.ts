import { z } from 'zod';
import { TimeUnitSchema } from 'src/models/TimeUnit/schema';
import { draftField, draftNumber } from 'src/models/shared/schema';

export const ResourceTypeSchema = z.enum(['CPU', 'GPU']);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

/** The functional unit is built as a fill-in-the-blank sentence. */
export const FunctionalUnitSchema = z.object({
    timeUnit: TimeUnitSchema,
    usageDuration: z.number().positive(),
    resourceCount: z.number().int().min(1),
    resourceType: ResourceTypeSchema,
});

export const FunctionalUnitDraftSchema = FunctionalUnitSchema.extend({
    timeUnit: draftField(FunctionalUnitSchema.shape.timeUnit, 'hour'),
    usageDuration: draftNumber(FunctionalUnitSchema.shape.usageDuration),
    resourceCount: draftNumber(FunctionalUnitSchema.shape.resourceCount),
    resourceType: ResourceTypeSchema.or(z.literal('')).default(''),
});

export type FunctionalUnit = z.infer<typeof FunctionalUnitDraftSchema>;

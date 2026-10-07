import { z } from 'zod';
import { TimeUnitSchema } from 'src/models/TimeUnit/schema';
import { draftField, draftNumber } from 'src/models/shared/schema';

/** The functional unit is built as a fill-in-the-blank sentence. */
export const FunctionalUnitSchema = z.object({
    timeUnit: TimeUnitSchema,
    usageDuration: z.number().positive(),
    resourceCount: z.number().int().min(1),
    resourceType: z.string(),
});

export const FunctionalUnitDraftSchema = FunctionalUnitSchema.extend({
    timeUnit: draftField(FunctionalUnitSchema.shape.timeUnit, 'hour'),
    usageDuration: draftNumber(FunctionalUnitSchema.shape.usageDuration),
    resourceCount: draftNumber(FunctionalUnitSchema.shape.resourceCount),
    resourceType: draftField(FunctionalUnitSchema.shape.resourceType, ''),
});

export type FunctionalUnit = z.infer<typeof FunctionalUnitDraftSchema>;

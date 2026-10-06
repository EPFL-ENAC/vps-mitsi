import { z } from 'zod';
import { FunctionalUnitSchema, FunctionalUnitDraftSchema } from 'src/models/FunctionalUnit/schema';
import { draftField, draftNumber } from 'src/models/shared/schema';

/** A line in the "included in the IT service" or "excluded from the IT service" tables. */
export const BoundaryItemSchema = z.object({
    // UI must generate a uuid when creating a row; '' is only a parse fallback.
    id: z.string(),
    type: z.string().min(1),
    purpose: z.string().min(1),
    reason: z.string().min(1),
});

export const BoundaryItemDraftSchema = BoundaryItemSchema.extend({
    id: draftField(BoundaryItemSchema.shape.id, ''),
    type: draftField(BoundaryItemSchema.shape.type, ''),
    purpose: draftField(BoundaryItemSchema.shape.purpose, ''),
    reason: draftField(BoundaryItemSchema.shape.reason, ''),
});

/** Everything captured in the "Scope of the assessment" block. */
export const ScopeSchema = z.object({
    organizationName: z.string().min(1),
    assessors: z.string().min(1),
    serviceName: z.string().min(1),
    function: z.string().min(1),
    functionalUnit: FunctionalUnitSchema,
    includedItems: z.array(BoundaryItemSchema),
    excludedItems: z.array(BoundaryItemSchema),
    /** Assessment lifespan, in years. */
    lifespanYears: z.number().min(1),
});

export const ScopeDraftSchema = ScopeSchema.extend({
    organizationName: draftField(ScopeSchema.shape.organizationName, ''),
    assessors: draftField(ScopeSchema.shape.assessors, ''),
    serviceName: draftField(ScopeSchema.shape.serviceName, ''),
    function: draftField(ScopeSchema.shape.function, ''),
    functionalUnit: FunctionalUnitDraftSchema.default(() => FunctionalUnitDraftSchema.parse({})),
    includedItems: z.array(BoundaryItemDraftSchema).default(() => []),
    excludedItems: z.array(BoundaryItemDraftSchema).default(() => []),
    lifespanYears: draftNumber(ScopeSchema.shape.lifespanYears, 1),
});

export type BoundaryItem = z.infer<typeof BoundaryItemDraftSchema>;

export type Scope = z.infer<typeof ScopeDraftSchema>;

import { z } from 'zod';
import { draftField, draftNumber } from 'src/models/shared/schema';

export const UnderlyingServiceSchema = z.object({
    // UI must generate a uuid when creating a row; '' is only a parse fallback.
    id: z.string(),
    name: z.string(),
    usageDescription: z.string(),
    /** Estimated emissions (kg CO₂-eq). */
    co2EstimateKg: z.number(),
});

export const UnderlyingServiceDraftSchema = UnderlyingServiceSchema.extend({
    id: draftField(UnderlyingServiceSchema.shape.id, ''),
    name: draftField(UnderlyingServiceSchema.shape.name, ''),
    usageDescription: draftField(UnderlyingServiceSchema.shape.usageDescription, ''),
    co2EstimateKg: draftNumber(UnderlyingServiceSchema.shape.co2EstimateKg),
});

export type UnderlyingService = z.infer<typeof UnderlyingServiceDraftSchema>;

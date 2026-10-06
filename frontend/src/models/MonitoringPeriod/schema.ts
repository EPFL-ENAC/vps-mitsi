import { z } from 'zod';
import { draftField, draftNumber } from 'src/models/shared/schema';

export const MonitoringUnitSchema = z.enum(['day', 'week', 'month', 'year']);

/** The usage monitoring period (how long measured consumption covers). */
export const MonitoringPeriodSchema = z.object({
    unit: MonitoringUnitSchema,
    value: z.number().min(1),
    comment: z.string(),
});

export const MonitoringPeriodDraftSchema = MonitoringPeriodSchema.extend({
    unit: draftField(MonitoringPeriodSchema.shape.unit, 'day'),
    value: draftNumber(MonitoringPeriodSchema.shape.value, 1),
    comment: draftField(MonitoringPeriodSchema.shape.comment, ''),
});

export type MonitoringUnit = z.infer<typeof MonitoringUnitSchema>;

export type MonitoringPeriod = z.infer<typeof MonitoringPeriodDraftSchema>;

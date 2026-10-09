import { z } from 'zod';

/** Drop-down time unit used to build the functional unit sentence. */
export const TimeUnitSchema = z.enum(['second', 'minute', 'hour', 'day', 'week', 'month', 'year']);

export type TimeUnit = z.infer<typeof TimeUnitSchema>;

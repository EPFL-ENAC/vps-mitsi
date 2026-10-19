import type { TimeUnit } from 'src/models/TimeUnit/schema';

/** Counts per year from the reference workbook (weeks deliberately use 52). */
const COUNTS_PER_YEAR: Record<TimeUnit, number> = {
    second: 31_536_000,
    minute: 525_600,
    hour: 8_760,
    day: 365,
    week: 52,
    month: 12,
    year: 1,
};

export function timeUnitsPerYear(unit: TimeUnit): number {
    return COUNTS_PER_YEAR[unit];
}

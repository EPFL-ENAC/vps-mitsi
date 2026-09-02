type SeasonPeriodType = 'spring' | 'summer' | 'autumn' | 'winter';

type Hemisphere = 'north' | 'south';

interface CyclePeriod<T> {
    name: T;
    start: number;
    end: number;
}

export type SeasonPeriod = CyclePeriod<SeasonPeriodType>;

const DAY_MS = 24 * 60 * 60 * 1000;

export function getSeasonPeriodsBetween(
    tsA: number,
    tsB: number,
    hemisphere: Hemisphere = 'north',
): SeasonPeriod[] {
    validateInputs(tsA, tsB, hemisphere);

    const start = Math.min(tsA, tsB);
    const end = Math.max(tsA, tsB);

    if (start === end) {
        return [];
    }

    const boundaries = getSeasonBoundaryTimestampsBetween(start, end, hemisphere);

    const periods: SeasonPeriod[] = [];

    let cursor = start;
    let current = getSeasonTypeAt(start, hemisphere);

    for (const boundary of boundaries) {
        if (boundary.timestamp <= cursor) {
            current = boundary.type;
            continue;
        }

        if (boundary.timestamp > end) {
            break;
        }

        periods.push({
            name: current,
            start: cursor,
            end: boundary.timestamp,
        });

        cursor = boundary.timestamp;
        current = boundary.type;
    }

    if (cursor < end) {
        periods.push({
            name: current,
            start: cursor,
            end,
        });
    }

    return periods.filter((period) => period.start < period.end);
}

function getSeasonBoundaryTimestampsBetween(
    start: number,
    end: number,
    hemisphere: Hemisphere,
): Array<{ timestamp: number; type: SeasonPeriodType }> {
    const startYear = new Date(start).getUTCFullYear() - 1;
    const endYear = new Date(end).getUTCFullYear() + 1;

    const results: Array<{ timestamp: number; type: SeasonPeriodType }> = [];

    for (let year = startYear; year <= endYear; year++) {
        results.push(...getSeasonBoundariesForYear(year, hemisphere));
    }

    results.sort((a, b) => a.timestamp - b.timestamp);

    return results.filter((boundary) => boundary.timestamp > start && boundary.timestamp < end);
}

function getSeasonTypeAt(timestamp: number, hemisphere: Hemisphere): SeasonPeriodType {
    const year = new Date(timestamp).getUTCFullYear();
    const candidates = [
        ...getSeasonBoundariesForYear(year - 1, hemisphere),
        ...getSeasonBoundariesForYear(year, hemisphere),
        ...getSeasonBoundariesForYear(year + 1, hemisphere),
    ].sort((a, b) => a.timestamp - b.timestamp);

    let current = inferSeasonAtYearStart(year, hemisphere);

    for (const boundary of candidates) {
        if (boundary.timestamp > timestamp) {
            break;
        }

        current = boundary.type;
    }

    return current;
}

function inferSeasonAtYearStart(year: number, hemisphere: Hemisphere): SeasonPeriodType {
    // On Jan 1:
    // north => winter
    // south => summer
    return hemisphere === 'north' ? 'winter' : 'summer';
}

function getSeasonBoundariesForYear(
    year: number,
    hemisphere: Hemisphere,
): Array<{ timestamp: number; type: SeasonPeriodType }> {
    if (hemisphere === 'north') {
        return [
            {
                timestamp: Date.UTC(year, 2, 1, 0, 0, 0, 0),
                type: 'spring',
            },
            {
                timestamp: Date.UTC(year, 5, 1, 0, 0, 0, 0),
                type: 'summer',
            },
            {
                timestamp: Date.UTC(year, 8, 1, 0, 0, 0, 0),
                type: 'autumn',
            },
            {
                timestamp: Date.UTC(year, 11, 1, 0, 0, 0, 0),
                type: 'winter',
            },
        ];
    }

    return [
        {
            timestamp: Date.UTC(year, 2, 1, 0, 0, 0, 0),
            type: 'autumn',
        },
        {
            timestamp: Date.UTC(year, 5, 1, 0, 0, 0, 0),
            type: 'winter',
        },
        {
            timestamp: Date.UTC(year, 8, 1, 0, 0, 0, 0),
            type: 'spring',
        },
        {
            timestamp: Date.UTC(year, 11, 1, 0, 0, 0, 0),
            type: 'summer',
        },
    ];
}

function validateInputs(tsA: number, tsB: number, hemisphere: Hemisphere): void {
    if (!Number.isFinite(tsA) || !Number.isFinite(tsB)) {
        throw new TypeError('Timestamps must be finite numbers (Unix ms).');
    }

    if (hemisphere !== 'north' && hemisphere !== 'south') {
        throw new RangeError('Hemisphere must be "north" or "south".');
    }
}

// Optional utility if you still want it elsewhere.
export function startOfUtcDay(timestamp: number): number {
    const d = new Date(timestamp);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Prevent TS/ESLint from flagging DAY_MS as unused if you remove helpers later.
void DAY_MS;

import { isLeapYear } from './datetime';
import { clamp, degToRad, radToDeg } from './math';

type DaynightCyclePeriodType = 'day' | 'night' | 'sunrise' | 'sunset';

interface CyclePeriod<T> {
    name: T;
    start: number;
    end: number;
}

export type DaynightCyclePeriod = CyclePeriod<DaynightCyclePeriodType>;

const DAY_MS = 24 * 60 * 60 * 1000;

type TransitionType = 'dawn' | 'sunrise' | 'sunset' | 'dusk';

interface Transition {
    timestamp: number;
    type: TransitionType;
}

export function getDaynightCyclePeriodsBetween(
    tsA: number,
    tsB: number,
    lat: number,
    lon: number,
): DaynightCyclePeriod[] {
    validateInputs(tsA, tsB, lat, lon);

    const start = Math.min(tsA, tsB);
    const end = Math.max(tsA, tsB);

    if (start === end) {
        return [];
    }

    const transitions = getTransitionsBetween(start, end, lat, lon);
    const periods: DaynightCyclePeriod[] = [];

    let cursor = start;
    let current = getPeriodTypeAt(start, lat, lon);

    for (const transition of transitions) {
        if (transition.timestamp <= cursor) {
            current = mapTransitionToNextPeriod(transition.type);
            continue;
        }

        if (transition.timestamp > end) {
            break;
        }

        periods.push({
            name: current,
            start: cursor,
            end: transition.timestamp,
        });

        cursor = transition.timestamp;
        current = mapTransitionToNextPeriod(transition.type);
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

function getTransitionsBetween(start: number, end: number, lat: number, lon: number): Transition[] {
    const results: Transition[] = [];

    let dayTs = startOfUtcDay(start) - DAY_MS;
    const lastDayTs = startOfUtcDay(end) + DAY_MS;

    for (; dayTs <= lastDayTs; dayTs += DAY_MS) {
        const date = new Date(dayTs);
        const { eqTimeMin, declRad } = solarPositionForUtcDate(date);

        const civil = solarEventMinutesUtc(lat, lon, declRad, eqTimeMin, -6);
        const official = solarEventMinutesUtc(lat, lon, declRad, eqTimeMin, -0.833);

        if (civil?.riseMin != null) {
            results.push({
                timestamp: dayTs + civil.riseMin * 60_000,
                type: 'dawn',
            });
        }

        if (official?.riseMin != null) {
            results.push({
                timestamp: dayTs + official.riseMin * 60_000,
                type: 'sunrise',
            });
        }

        if (official?.setMin != null) {
            results.push({
                timestamp: dayTs + official.setMin * 60_000,
                type: 'sunset',
            });
        }

        if (civil?.setMin != null) {
            results.push({
                timestamp: dayTs + civil.setMin * 60_000,
                type: 'dusk',
            });
        }
    }

    results.sort((a, b) => a.timestamp - b.timestamp);

    return results.filter(
        (transition) => transition.timestamp > start && transition.timestamp < end,
    );
}

function getPeriodTypeAt(timestamp: number, lat: number, lon: number): DaynightCyclePeriodType {
    const dayTs = startOfUtcDay(timestamp);
    const candidates: Transition[] = [];

    for (let offset = -DAY_MS; offset <= DAY_MS; offset += DAY_MS) {
        const ts = dayTs + offset;
        const date = new Date(ts);
        const { eqTimeMin, declRad } = solarPositionForUtcDate(date);

        const civil = solarEventMinutesUtc(lat, lon, declRad, eqTimeMin, -6);
        const official = solarEventMinutesUtc(lat, lon, declRad, eqTimeMin, -0.833);

        if (civil?.riseMin != null) {
            candidates.push({
                timestamp: ts + civil.riseMin * 60_000,
                type: 'dawn',
            });
        }

        if (official?.riseMin != null) {
            candidates.push({
                timestamp: ts + official.riseMin * 60_000,
                type: 'sunrise',
            });
        }

        if (official?.setMin != null) {
            candidates.push({
                timestamp: ts + official.setMin * 60_000,
                type: 'sunset',
            });
        }

        if (civil?.setMin != null) {
            candidates.push({
                timestamp: ts + civil.setMin * 60_000,
                type: 'dusk',
            });
        }
    }

    candidates.sort((a, b) => a.timestamp - b.timestamp);

    let current: DaynightCyclePeriodType = inferStablePeriodAt(timestamp, lat, lon);

    for (const transition of candidates) {
        if (transition.timestamp > timestamp) {
            break;
        }

        current = mapTransitionToNextPeriod(transition.type);
    }

    return current;
}

function inferStablePeriodAt(timestamp: number, lat: number, lon: number): DaynightCyclePeriodType {
    const altitudeDeg = solarAltitudeDegAt(timestamp, lat, lon);

    return altitudeDeg >= -0.833 ? 'day' : 'night';
}

function mapTransitionToNextPeriod(transition: TransitionType): DaynightCyclePeriodType {
    switch (transition) {
        case 'dawn':
            return 'sunrise';
        case 'sunrise':
            return 'day';
        case 'sunset':
            return 'sunset';
        case 'dusk':
            return 'night';
    }
}

function validateInputs(tsA: number, tsB: number, lat: number, lon: number): void {
    if (!Number.isFinite(tsA) || !Number.isFinite(tsB)) {
        throw new TypeError('Timestamps must be finite numbers (Unix ms).');
    }

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        throw new RangeError('Latitude must be between -90 and 90.');
    }

    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
        throw new RangeError('Longitude must be between -180 and 180.');
    }
}

function solarPositionForUtcDate(date: Date): {
    eqTimeMin: number;
    declRad: number;
} {
    const year = date.getUTCFullYear();
    const dayOfYear = getUtcDayOfYear(date);
    const daysInYear = isLeapYear(year) ? 366 : 365;

    const gamma = (2 * Math.PI * (dayOfYear - 1 + 0.5)) / daysInYear;

    const eqTimeMin =
        229.18 *
        (0.000075 +
            0.001868 * Math.cos(gamma) -
            0.032077 * Math.sin(gamma) -
            0.014615 * Math.cos(2 * gamma) -
            0.040849 * Math.sin(2 * gamma));

    const declRad =
        0.006918 -
        0.399912 * Math.cos(gamma) +
        0.070257 * Math.sin(gamma) -
        0.006758 * Math.cos(2 * gamma) +
        0.000907 * Math.sin(2 * gamma) -
        0.002697 * Math.cos(3 * gamma) +
        0.00148 * Math.sin(3 * gamma);

    return { eqTimeMin, declRad };
}

function solarEventMinutesUtc(
    latDeg: number,
    lonDeg: number,
    declRad: number,
    eqTimeMin: number,
    solarAltitudeDeg: number,
): { riseMin: number; setMin: number } | null {
    const latRad = degToRad(latDeg);
    const zenithRad = degToRad(90 - solarAltitudeDeg);

    const cosH =
        (Math.cos(zenithRad) - Math.sin(latRad) * Math.sin(declRad)) /
        (Math.cos(latRad) * Math.cos(declRad));

    if (cosH < -1 || cosH > 1) {
        return null;
    }

    const hourAngleRad = Math.acos(clamp(cosH, -1, 1));
    const hourAngleDeg = radToDeg(hourAngleRad);
    const solarNoonMin = 720 - 4 * lonDeg - eqTimeMin;

    return {
        riseMin: solarNoonMin - 4 * hourAngleDeg,
        setMin: solarNoonMin + 4 * hourAngleDeg,
    };
}

function solarAltitudeDegAt(timestamp: number, latDeg: number, lonDeg: number): number {
    const date = new Date(timestamp);
    const { eqTimeMin, declRad } = solarPositionForUtcDate(date);

    const utcMinutes =
        date.getUTCHours() * 60 +
        date.getUTCMinutes() +
        date.getUTCSeconds() / 60 +
        date.getUTCMilliseconds() / 60_000;

    const trueSolarTimeMin = modulo(utcMinutes + eqTimeMin + 4 * lonDeg, 1440);
    const hourAngleDeg =
        trueSolarTimeMin / 4 < 180 ? trueSolarTimeMin / 4 - 180 : trueSolarTimeMin / 4 - 540;

    const latRad = degToRad(latDeg);
    const hourAngleRad = degToRad(hourAngleDeg);

    const sinAltitude =
        Math.sin(latRad) * Math.sin(declRad) +
        Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleRad);

    return radToDeg(Math.asin(clamp(sinAltitude, -1, 1)));
}

function startOfUtcDay(timestamp: number): number {
    const d = new Date(timestamp);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function getUtcDayOfYear(date: Date): number {
    const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
    const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

    return Math.floor((today - startOfYear) / DAY_MS);
}

function modulo(value: number, mod: number): number {
    return ((value % mod) + mod) % mod;
}

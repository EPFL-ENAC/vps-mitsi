export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export function median(data: number[], alreadySorted: boolean = false): number {
    const sorted = alreadySorted ? data : [...data].sort((a, b) => a - b);

    const midPoint = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 1) {
        return sorted[midPoint]!;
    }

    return (sorted[midPoint]! + sorted[midPoint + 1]!) / 2;
}

export function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
    return (rad * 180) / Math.PI;
}

export function clamp(v: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, v));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function arrayClamp(v: number, arrayOrLength: any[] | number): number {
    const l = Array.isArray(arrayOrLength) ? arrayOrLength.length : arrayOrLength;
    if (v < 0) {
        v = l + v;
    }

    return clamp(v, 0, l - 1);
}

export function isCloseEnough(a: number, b: number): boolean {
    return Math.abs(a - b) <= Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b));
}

interface ValueIndex {
    value: number;
    index: number;
}

export function closestBelowSorted(data: number[], value: number): ValueIndex | null {
    let closest: ValueIndex | null = null;

    for (let i = 0; i < data.length; i++) {
        const currentValue = data[i]!;
        if (currentValue < value) {
            closest = { value: currentValue, index: i };
        } else {
            break;
        }
    }

    return closest;
}

export function closestAboveSorted(data: number[], value: number): ValueIndex | null {
    let closest: ValueIndex | null = null;

    for (let i = data.length - 1; i >= 0; i--) {
        const currentValue = data[i]!;
        if (currentValue > value) {
            closest = { value: currentValue, index: i };
        } else {
            break;
        }
    }

    return closest;
}

export function getInterpolationT(min: number, max: number, value: number): number {
    const floor = value - min;
    const range = max - min;

    if (range === 0) {
        return 0;
    }

    return floor / range;
}

export function randomGaussian(mean = 0, stdDev = 1) {
    let u = 0;
    let v = 0;

    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();

    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);

    return mean + z * stdDev;
}

export function randomBetween(min: number, max: number) {
    return min + Math.random() * (max - min);
}

export function remap(
    value: number,
    fromMin: number,
    fromMax: number,
    toMin: number,
    toMax: number,
): number {
    const t = getInterpolationT(fromMin, fromMax, value);
    return lerp(toMin, toMax, t);
}

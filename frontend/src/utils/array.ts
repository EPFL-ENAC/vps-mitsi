export function uniqueSorted(values: number[]): number[] {
    return [...new Set(values)].sort((a, b) => a - b);
}

export function arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

export function sortedArrayRange(
    array: number[],
    startValue: number,
    endValue: number,
): [number, number] {
    let startIndex = array.findIndex((value) => value >= startValue);
    let endIndex = array.findIndex((value) => value > endValue);
    if (startIndex === -1) {
        startIndex = array.length - 1;
    }
    if (endIndex === -1) {
        endIndex = array.length - 1;
    }
    return [startIndex, endIndex];
}

export function lastSmallerValueIndex(array: number[], value: number): number {
    let index = array.findIndex((v) => v >= value);
    if (index === -1) {
        index = array.length - 1;
    }
    return index - 1;
}

export function getFractionalIndex(
    array: number[],
    value: number,
): { lowerIndex: number; upperIndex: number; t: number } {
    const lowerIndex = lastSmallerValueIndex(array, value);
    const upperIndex = lowerIndex + 1;

    if (upperIndex >= array.length) {
        return { lowerIndex, upperIndex, t: 0 };
    }

    const lowerValue = array[lowerIndex]!;
    const upperValue = array[upperIndex]!;

    if (upperValue === lowerValue) {
        return { lowerIndex, upperIndex, t: 0 };
    }

    return { lowerIndex, upperIndex, t: (value - lowerValue) / (upperValue - lowerValue) };
}

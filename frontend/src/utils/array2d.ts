import { arrayClamp, clamp, lerp, median } from './math';

interface IndexedValue1D {
    index: number;
    value: number;
}

interface FillCandidate {
    value: number;
    confidence: number;
}

interface ValueWithIndex {
    value: number;
    xIndex: number;
    yIndex: number;
}

interface Slice2D {
    slice: Array2D;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

interface FlatFiniteNeighborIndexMaps {
    left: Int32Array;
    right: Int32Array;
    above: Int32Array;
    below: Int32Array;
}

export class Array2D {
    private data: number[][];

    constructor(data: number[][]) {
        this.data = data;
    }

    get width(): number {
        return this.data.length;
    }

    get height(): number {
        return this.data.length > 0 ? this.data[0]!.length : 0;
    }

    static zeros(width: number, height: number): Array2D {
        const data = Array.from({ length: width }, () => Array.from({ length: height }, () => 0));
        return new Array2D(data);
    }

    public getData(): number[][] {
        return this.data;
    }

    public copy(): Array2D {
        const newData = this.data.map((row) => [...row]);
        return new Array2D(newData);
    }

    setColumn(x: number, columnData: number[]): void {
        if (x < 0 || x >= this.width) {
            throw new Error(`x index ${x} is out of bounds.`);
        }
        if (columnData.length !== this.height) {
            throw new Error(
                `Column data length ${columnData.length} does not match Array2D height ${this.height}.`,
            );
        }

        this.data[x] = [...columnData];
    }

    at(x: number, y: number): number | undefined {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return undefined;
        }

        return this.data[x]?.[y];
    }

    static fromTransposed(data: number[][], flipY: boolean = false): Array2D {
        const transposedData =
            data[0]?.map((_, i) => {
                const row = data.map((row) => row[i]!);
                return flipY ? row.reverse() : row;
            }) ?? [];
        if (!transposedData) return new Array2D([]);

        return new Array2D(transposedData);
    }

    public transpose(): Array2D {
        if (this.width === 0 || this.height === 0) {
            return new Array2D([]);
        }

        const newData = Array.from({ length: this.height }, (_, x) =>
            Array.from({ length: this.width }, (_, y) => this.at(y, x)!),
        );

        return new Array2D(newData);
    }

    public min(): ValueWithIndex {
        let min: ValueWithIndex = {
            value: Infinity,
            xIndex: -1,
            yIndex: -1,
        };

        for (let x = 0; x < this.width; x += 1) {
            for (let y = 0; y < this.height; y += 1) {
                const value = this.at(x, y)!;

                if (Number.isFinite(value) && value < min.value) {
                    min = { value, xIndex: x, yIndex: y };
                }
            }
        }

        return min;
    }

    public max(): ValueWithIndex {
        let max: ValueWithIndex = {
            value: -Infinity,
            xIndex: -1,
            yIndex: -1,
        };

        for (let x = 0; x < this.width; x += 1) {
            for (let y = 0; y < this.height; y += 1) {
                const value = this.at(x, y)!;

                if (Number.isFinite(value) && value > max.value) {
                    max = { value, xIndex: x, yIndex: y };
                }
            }
        }

        return max;
    }

    public minMax(): { min: ValueWithIndex; max: ValueWithIndex } {
        let min: ValueWithIndex = {
            value: Infinity,
            xIndex: -1,
            yIndex: -1,
        };

        let max: ValueWithIndex = {
            value: -Infinity,
            xIndex: -1,
            yIndex: -1,
        };

        for (let x = 0; x < this.width; x += 1) {
            for (let y = 0; y < this.height; y += 1) {
                const value = this.at(x, y)!;

                if (!Number.isFinite(value)) {
                    continue;
                }

                if (value < min.value) {
                    min = { value, xIndex: x, yIndex: y };
                }

                if (value > max.value) {
                    max = { value, xIndex: x, yIndex: y };
                }
            }
        }

        return { min, max };
    }

    public mean(): number {
        const n = this.width * this.height;

        if (n === 0) {
            throw new Error('Cannot compute mean of an empty Array2D.');
        }

        let sum = 0;

        for (let x = 0; x < this.width; x += 1) {
            for (let y = 0; y < this.height; y += 1) {
                sum += this.at(x, y)!;
            }
        }

        return sum / n;
    }

    public maxAtX(
        x: number,
        columnSlice?: { startY: number; endY: number },
    ): { yIndex: number; value: number } {
        if (x < 0 || x >= this.width) {
            throw new Error(`x index ${x} is out of bounds.`);
        }

        let max = {
            value: -Infinity,
            yIndex: -1,
        };

        const startY = columnSlice ? clamp(columnSlice.startY, 0, this.height - 1) : 0;
        const endY = columnSlice ? clamp(columnSlice.endY, 0, this.height - 1) : this.height - 1;

        for (let y = startY; y <= endY; y += 1) {
            const value = this.at(x, y)!;

            if (Number.isFinite(value) && value > max.value) {
                max = { value, yIndex: y };
            }
        }

        return max;
    }

    public standardDeviation(sample = false): number {
        const n = this.width * this.height;

        if (n === 0) {
            throw new Error('Cannot compute standard deviation of an empty Array2D.');
        }

        if (sample && n < 2) {
            throw new Error('Cannot compute sample standard deviation with fewer than 2 values.');
        }

        const mean = this.mean();
        let varianceSum = 0;

        for (let x = 0; x < this.width; x += 1) {
            for (let y = 0; y < this.height; y += 1) {
                const diff = this.at(x, y)! - mean;
                varianceSum += diff * diff;
            }
        }

        const divisor = sample ? n - 1 : n;
        return Math.sqrt(varianceSum / divisor);
    }

    public zScore(sample = false): Array2D {
        const mean = this.mean();
        const std = this.standardDeviation(sample);

        if (std === 0) {
            return this.map(() => 0);
        }

        return this.map((value) => (value - mean) / std);
    }

    public map(func: (value: number, x: number, y: number) => number): Array2D {
        const newData = this.data.map((row, x) => row.map((value, y) => func(value, x, y)));

        return new Array2D(newData);
    }

    /**
     * Applies a 2D moving average filter to the data.
     */
    public smoothMovingAverage(windowSizeX: number, windowSizeY: number): Array2D {
        const radiusX = Math.floor(windowSizeX / 2);
        const radiusY = Math.floor(windowSizeY / 2);

        const newData = this.data.map((row, i) => {
            const startX = Math.max(0, i - radiusX);
            const endX = Math.min(this.width - 1, i + radiusX);
            const w = endX - startX + 1;

            return row.map((_, j) => {
                const startY = Math.max(0, j - radiusY);
                const endY = Math.min(this.height - 1, j + radiusY);
                const h = endY - startY + 1;

                let sum = 0;

                for (let xi = startX; xi <= endX; xi += 1) {
                    for (let yj = startY; yj <= endY; yj += 1) {
                        sum += this.at(xi, yj)!;
                    }
                }

                return sum / (w * h);
            });
        });

        return new Array2D(newData);
    }

    public slice2D(startX: number, endX: number, startY: number, endY: number): Slice2D {
        const clampedStartX = arrayClamp(startX, this.width + 1);
        const clampedEndX = arrayClamp(endX, this.width + 1);
        const clampedStartY = arrayClamp(startY, this.height + 1);
        const clampedEndY = arrayClamp(endY, this.height + 1);

        const minX = Math.min(clampedStartX, clampedEndX);
        const maxX = Math.max(clampedStartX, clampedEndX);
        const minY = Math.min(clampedStartY, clampedEndY);
        const maxY = Math.max(clampedStartY, clampedEndY);

        const newData = this.data.slice(minX, maxX).map((row) => row.slice(minY, maxY));

        return { slice: new Array2D(newData), minX, minY, maxX, maxY };
    }

    public peakInRange(
        startX: number,
        endX: number,
        startY: number,
        endY: number,
        topPercent?: number,
    ): ValueWithIndex | null {
        if (this.width === 0 || this.height === 0) {
            return null;
        }

        const { slice, minX, minY } = this.slice2D(startX, endX, startY, endY);
        const max = slice.max();

        if (topPercent === undefined || topPercent === 100) {
            return {
                value: max.value,
                xIndex: max.xIndex + minX,
                yIndex: max.yIndex + minY,
            };
        }

        const factor = clamp(topPercent, 0, 100) / 100;
        const threshold = max.value * factor;

        const topValues: number[] = [];
        let weightedX = 0;
        let weightedY = 0;
        let totalWeight = 0;

        for (let x = 0; x < slice.width; x += 1) {
            for (let y = 0; y < slice.height; y += 1) {
                const value = slice.at(x, y);

                if (value === undefined || value < threshold) {
                    continue;
                }

                topValues.push(value);

                const weight = value - threshold;

                if (weight > 0) {
                    weightedX += x * weight;
                    weightedY += y * weight;
                    totalWeight += weight;
                }
            }
        }

        if (topValues.length === 0) {
            return null;
        }

        if (totalWeight === 0) {
            return {
                value: median(topValues),
                xIndex: max.xIndex + minX,
                yIndex: max.yIndex + minY,
            };
        }

        return {
            value: median(topValues),
            xIndex: weightedX / totalWeight + minX,
            yIndex: weightedY / totalWeight + minY,
        };
    }

    public peakValueInRange(
        startX: number,
        endX: number,
        startY: number,
        endY: number,
        topPercent?: number,
    ): number | null {
        return this.peakInRange(startX, endX, startY, endY, topPercent)?.value ?? null;
    }

    public replaceYRangeByLerp(startY: number, endY: number): Array2D {
        const copy = this.copy();

        for (let x = 0; x < this.width; x += 1) {
            const startValue = copy.at(x, startY)!;
            const endValue = copy.at(x, endY)!;

            for (let y = startY; y <= endY; y += 1) {
                const t = (y - startY) / (endY - startY);
                const newValue = lerp(startValue, endValue, t);
                copy.data[x]![y] = newValue;
            }
        }

        return copy;
    }

    public getInterpolatedColumn(
        xInterpolationA: number,
        xInterpolationB: number,
        t: number,
        interpolationFunction: (min: number, max: number, t: number) => number = lerp,
    ): number[] {
        const interpolatedColumn: number[] = [];
        for (let y = 0; y < this.height; y++) {
            const valueA = this.at(xInterpolationA, y)!;
            const valueB = this.at(xInterpolationB, y)!;
            const newValue = interpolationFunction(valueA, valueB, t);
            if (newValue === 0) {
                // console.log({ xInterpolationA, xInterpolationB, y, height: this.height, t, valueA, valueB, newValue });
            }
            interpolatedColumn.push(newValue);
        }

        return interpolatedColumn;
    }

    private getClampedBounds(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
    ): {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    } {
        const clampedStartX = arrayClamp(startX, this.width);
        const clampedEndX = arrayClamp(endX, this.width);
        const clampedStartY = arrayClamp(startY, this.height);
        const clampedEndY = arrayClamp(endY, this.height);

        return {
            minX: Math.min(clampedStartX, clampedEndX),
            maxX: Math.max(clampedStartX, clampedEndX),
            minY: Math.min(clampedStartY, clampedEndY),
            maxY: Math.max(clampedStartY, clampedEndY),
        };
    }

    private flatIndex(x: number, y: number): number {
        return x * this.height + y;
    }

    private buildFlatFiniteNeighborIndexMaps(): FlatFiniteNeighborIndexMaps {
        return {
            left: this.buildFirstFiniteIndexOnLeftFlatMap(),
            right: this.buildFirstFiniteIndexOnRightFlatMap(),
            above: this.buildFirstFiniteIndexAboveFlatMap(),
            below: this.buildFirstFiniteIndexBelowFlatMap(),
        };
    }

    private buildFirstFiniteIndexOnLeftFlatMap(): Int32Array {
        const left = new Int32Array(this.width * this.height);
        left.fill(-1);

        const data = this.data;
        const height = this.height;

        for (let y = 0; y < height; y += 1) {
            let lastFiniteX = -1;

            for (let x = 0; x < this.width; x += 1) {
                left[x * height + y] = lastFiniteX;

                if (Number.isFinite(data[x]![y]!)) {
                    lastFiniteX = x;
                }
            }
        }

        return left;
    }

    private buildFirstFiniteIndexOnRightFlatMap(): Int32Array {
        const right = new Int32Array(this.width * this.height);
        right.fill(-1);

        const data = this.data;
        const height = this.height;

        for (let y = 0; y < height; y += 1) {
            let nextFiniteX = -1;

            for (let x = this.width - 1; x >= 0; x -= 1) {
                right[x * height + y] = nextFiniteX;

                if (Number.isFinite(data[x]![y]!)) {
                    nextFiniteX = x;
                }
            }
        }

        return right;
    }

    private buildFirstFiniteIndexAboveFlatMap(): Int32Array {
        const above = new Int32Array(this.width * this.height);
        above.fill(-1);

        const data = this.data;
        const height = this.height;

        for (let x = 0; x < this.width; x += 1) {
            let lastFiniteY = -1;
            const base = x * height;

            for (let y = 0; y < height; y += 1) {
                above[base + y] = lastFiniteY;

                if (Number.isFinite(data[x]![y]!)) {
                    lastFiniteY = y;
                }
            }
        }

        return above;
    }

    private buildFirstFiniteIndexBelowFlatMap(): Int32Array {
        const below = new Int32Array(this.width * this.height);
        below.fill(-1);

        const data = this.data;
        const height = this.height;

        for (let x = 0; x < this.width; x += 1) {
            let nextFiniteY = -1;
            const base = x * height;

            for (let y = height - 1; y >= 0; y -= 1) {
                below[base + y] = nextFiniteY;

                if (Number.isFinite(data[x]![y]!)) {
                    nextFiniteY = y;
                }
            }
        }

        return below;
    }

    private firstFiniteValueOnLeftFlat(
        x: number,
        y: number,
        maps: FlatFiniteNeighborIndexMaps,
        minX = 0,
    ): IndexedValue1D | null {
        const index = maps.left[this.flatIndex(x, y)]!;

        if (index < minX) {
            return null;
        }

        return {
            index,
            value: this.data[index]![y]!,
        };
    }

    private firstFiniteValueOnRightFlat(
        x: number,
        y: number,
        maps: FlatFiniteNeighborIndexMaps,
        maxX = this.width - 1,
    ): IndexedValue1D | null {
        const index = maps.right[this.flatIndex(x, y)]!;

        if (index === -1 || index > maxX) {
            return null;
        }

        return {
            index,
            value: this.data[index]![y]!,
        };
    }

    private firstFiniteValueAboveFlat(
        x: number,
        y: number,
        maps: FlatFiniteNeighborIndexMaps,
        minY = 0,
    ): IndexedValue1D | null {
        const index = maps.above[this.flatIndex(x, y)]!;

        if (index < minY) {
            return null;
        }

        return {
            index,
            value: this.data[x]![index]!,
        };
    }

    private firstFiniteValueBelowFlat(
        x: number,
        y: number,
        maps: FlatFiniteNeighborIndexMaps,
        maxY = this.height - 1,
    ): IndexedValue1D | null {
        const index = maps.below[this.flatIndex(x, y)]!;

        if (index === -1 || index > maxY) {
            return null;
        }

        return {
            index,
            value: this.data[x]![index]!,
        };
    }

    private getNaNFillCandidateAlongXFlat(
        x: number,
        y: number,
        minX: number,
        maxX: number,
        maxSpanX: number,
        extrapolateEdges: boolean,
        maps: FlatFiniteNeighborIndexMaps,
    ): FillCandidate | null {
        const left = this.firstFiniteValueOnLeftFlat(x, y, maps, minX);
        const right = this.firstFiniteValueOnRightFlat(x, y, maps, maxX);

        if (left && right) {
            const span = right.index - left.index;

            if (span > maxSpanX) {
                return null;
            }

            return {
                value: lerp(left.value, right.value, (x - left.index) / span),
                confidence: 1 / (1 + span * span),
            };
        }

        if (!extrapolateEdges) {
            return null;
        }

        if (left) {
            const dist = x - left.index;

            if (dist <= maxSpanX) {
                return {
                    value: left.value,
                    confidence: 0.25 / (1 + dist * dist),
                };
            }
        }

        if (right) {
            const dist = right.index - x;

            if (dist <= maxSpanX) {
                return {
                    value: right.value,
                    confidence: 0.25 / (1 + dist * dist),
                };
            }
        }

        return null;
    }

    private getNaNFillCandidateAlongYFlat(
        x: number,
        y: number,
        minY: number,
        maxY: number,
        maxSpanY: number,
        extrapolateEdges: boolean,
        maps: FlatFiniteNeighborIndexMaps,
    ): FillCandidate | null {
        const above = this.firstFiniteValueAboveFlat(x, y, maps, minY);
        const below = this.firstFiniteValueBelowFlat(x, y, maps, maxY);

        if (above && below) {
            const span = below.index - above.index;

            if (span > maxSpanY) {
                return null;
            }

            return {
                value: lerp(above.value, below.value, (y - above.index) / span),
                confidence: 1 / (1 + span * span),
            };
        }

        if (!extrapolateEdges) {
            return null;
        }

        if (above) {
            const dist = y - above.index;

            if (dist <= maxSpanY) {
                return {
                    value: above.value,
                    confidence: 0.25 / (1 + dist * dist),
                };
            }
        }

        if (below) {
            const dist = below.index - y;

            if (dist <= maxSpanY) {
                return {
                    value: below.value,
                    confidence: 0.25 / (1 + dist * dist),
                };
            }
        }

        return null;
    }

    public fillNaNAdaptive(
        startX: number = 0,
        startY: number = 0,
        endX: number = this.width - 1,
        endY: number = this.height - 1,
        params?: {
            maxSpanX?: number | undefined;
            maxSpanY?: number | undefined;
            preferY?: number | undefined;
            extrapolateEdges?: boolean | undefined;
        },
    ): Array2D {
        const copy = this.copy();
        console.time('buildFlatFiniteNeighborIndexMaps');
        const maps = this.buildFlatFiniteNeighborIndexMaps();
        console.timeEnd('buildFlatFiniteNeighborIndexMaps');
        const { minX, maxX, minY, maxY } = this.getClampedBounds(startX, startY, endX, endY);
        const source = this.data;
        const target = copy.data;

        const maxSpanX = params?.maxSpanX ?? Infinity;
        const maxSpanY = params?.maxSpanY ?? Infinity;
        const preferY = params?.preferY ?? 1.25;
        const extrapolateEdges = params?.extrapolateEdges ?? false;

        for (let x = minX; x <= maxX; x += 1) {
            for (let y = minY; y <= maxY; y += 1) {
                if (Number.isFinite(source[x]![y]!)) {
                    continue;
                }

                const candidateX = this.getNaNFillCandidateAlongXFlat(
                    x,
                    y,
                    minX,
                    maxX,
                    maxSpanX,
                    extrapolateEdges,
                    maps,
                );
                const candidateY = this.getNaNFillCandidateAlongYFlat(
                    x,
                    y,
                    minY,
                    maxY,
                    maxSpanY,
                    extrapolateEdges,
                    maps,
                );

                if (candidateX && candidateY) {
                    const confidenceX = candidateX.confidence;
                    const confidenceY = candidateY.confidence * preferY;
                    const totalConfidence = confidenceX + confidenceY;

                    target[x]![y] =
                        (candidateX.value * confidenceX + candidateY.value * confidenceY) /
                        totalConfidence;
                } else if (candidateY) {
                    target[x]![y] = candidateY.value;
                } else if (candidateX) {
                    target[x]![y] = candidateX.value;
                }
            }
        }

        return copy;
    }
}

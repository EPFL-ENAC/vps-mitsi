import {
    arraysEqual,
    getFractionalIndex,
    lastSmallerValueIndex,
    sortedArrayRange,
    uniqueSorted,
} from './array';
import { Array2D } from './array2d';
import { closestAboveSorted, closestBelowSorted, getInterpolationT, lerp } from './math';

export interface DepthHeatmapSliceParams {
    xStart?: number;
    xEnd?: number;
    yStart?: number;
    yEnd?: number;
}

export class DepthHeatmap {
    readonly x: number[];
    readonly y: number[];
    readonly z: Array2D;

    private _zValuesMinMaxCache: { min: number; max: number } | null = null;
    private _xCellEdgesCache: number[] | null = null;

    constructor(params?: { x?: number[]; y?: number[]; z?: number[][] | Array2D }) {
        this.x = [...(params?.x ?? [])];
        this.y = [...(params?.y ?? [])];

        if (params?.z instanceof Array2D) {
            this.z = params.z;
        } else {
            const zData = (params?.z ?? []).map((row) => [...row]);
            this.z = new Array2D(zData);
        }

        this.validate();
    }

    at(xValue: number | 'rightmost', yValue: number): number | null {
        const xIndex = xValue === 'rightmost' ? this.x.length - 1 : this.x.indexOf(xValue);
        const yIndex = this.y.indexOf(yValue);

        if (xIndex === -1 || yIndex === -1) {
            return null;
        }

        return this.z.at(xIndex, yIndex) ?? null;
    }

    slice(params: DepthHeatmapSliceParams): DepthHeatmap {
        const { minXIndex, maxXIndex, minYIndex, maxYIndex } =
            this.getIndexRangeFromValueRange(params);

        const slicedX = this.x.slice(minXIndex, maxXIndex + 1);
        const slicedY = this.y.slice(minYIndex, maxYIndex + 1);
        const slicedZ = this.z.slice2D(minXIndex, maxXIndex + 1, minYIndex, maxYIndex + 1).slice;

        return new DepthHeatmap({
            x: slicedX,
            y: slicedY,
            z: slicedZ,
        });
    }

    static fromArrays(x: number[], y: number[], z: number[][]): DepthHeatmap {
        return new DepthHeatmap({ x, y, z });
    }

    static fromPoints(points: Array<{ x: number; y: number; z: number }>): DepthHeatmap {
        if (points.length === 0) {
            return new DepthHeatmap();
        }

        const xValues = uniqueSorted(points.map((p) => p.x));
        const yValues = uniqueSorted(points.map((p) => p.y));

        const xIndex = new Map<number, number>(xValues.map((value, i) => [value, i]));
        const yIndex = new Map<number, number>(yValues.map((value, i) => [value, i]));

        const z: Array<Array<number | undefined>> = Array.from({ length: xValues.length }, () =>
            Array<number | undefined>(yValues.length).fill(undefined),
        );

        for (const point of points) {
            const i = xIndex.get(point.x);
            const j = yIndex.get(point.y);

            if (i == null || j == null) {
                throw new Error('Failed to index point.');
            }

            if (z[i]?.[j] !== undefined) {
                throw new Error(`Duplicate point detected for x=${point.x}, y=${point.y}.`);
            }

            z[i]![j] = point.z;
        }

        const completeZ = z.map((row, i) =>
            row.map((value, j) => {
                if (value === undefined) {
                    throw new Error(
                        `Missing point in rectangular grid at x=${xValues[i]}, y=${yValues[j]}.`,
                    );
                }

                return value;
            }),
        );

        return new DepthHeatmap({
            x: xValues,
            y: yValues,
            z: completeZ,
        });
    }

    size(): number {
        return this.x.length * this.y.length;
    }

    zValuesMinMax(): { min: number; max: number } | null {
        if (this._zValuesMinMaxCache == null) {
            const minmax = this.z.minMax();
            if (!Number.isFinite(minmax.min.value) || !Number.isFinite(minmax.max.value)) {
                this._zValuesMinMaxCache = null;
            }
            this._zValuesMinMaxCache = { min: minmax.min.value, max: minmax.max.value };
        }

        return this._zValuesMinMaxCache;
    }

    xCellEdges(): number[] {
        if (this._xCellEdgesCache == null) {
            this._xCellEdgesCache = DepthHeatmap.cellEdges(this.x);
        }

        return this._xCellEdgesCache;
    }

    xValueToContinuousIndex(value: number): number {
        const edges = this.xCellEdges();

        if (edges.length < 2) {
            return 0;
        }

        const valuesLength = edges.length - 1;
        const first = edges[0]!;
        const last = edges[edges.length - 1]!;
        const ascending = last >= first;

        if (ascending) {
            if (value <= first) {
                return 0;
            }

            if (value >= last) {
                return valuesLength;
            }

            let lo = 0;
            let hi = valuesLength - 1;

            while (lo <= hi) {
                const mid = Math.floor((lo + hi) / 2);
                const start = edges[mid]!;
                const end = edges[mid + 1]!;

                if (value < start) {
                    hi = mid - 1;
                } else if (value > end) {
                    lo = mid + 1;
                } else {
                    const span = Math.max(1e-12, end - start);
                    return mid + (value - start) / span;
                }
            }
        } else {
            if (value >= first) {
                return 0;
            }

            if (value <= last) {
                return valuesLength;
            }

            let lo = 0;
            let hi = valuesLength - 1;

            while (lo <= hi) {
                const mid = Math.floor((lo + hi) / 2);
                const start = edges[mid]!;
                const end = edges[mid + 1]!;

                if (value > start) {
                    hi = mid - 1;
                } else if (value < end) {
                    lo = mid + 1;
                } else {
                    const span = Math.max(1e-12, start - end);
                    return mid + (start - value) / span;
                }
            }
        }

        return valuesLength;
    }

    zScore(sample = false): DepthHeatmap {
        return new DepthHeatmap({
            x: this.x,
            y: this.y,
            z: this.z.zScore(sample),
        });
    }

    appendBelow(other: DepthHeatmap, bridgeY: number[] = []): DepthHeatmap {
        if (!arraysEqual(this.x, other.x)) {
            throw new Error('Cannot append heatmaps: x values do not match exactly.');
        }

        if (this.y.length === 0 || other.y.length === 0) {
            throw new Error(
                'Cannot append heatmaps: both heatmaps must have at least one y value.',
            );
        }

        const leftEndY = this.y[this.y.length - 1]!;
        const rightStartY = other.y[0]!;

        if (!(leftEndY < rightStartY)) {
            throw new Error(
                'Cannot append heatmaps: other must start after this heatmap along the y axis.',
            );
        }

        const sortedMiddleY = DepthHeatmap.validateBridgeY(bridgeY, leftEndY, rightStartY);

        const thisData = this.z.getData();
        const otherData = other.z.getData();

        const newY = [...this.y, ...sortedMiddleY, ...other.y];

        const newZ = this.x.map((_, i) => {
            const topZ = thisData[i]!;
            const bottomZ = otherData[i]!;
            const z0 = topZ[topZ.length - 1]!;
            const z1 = bottomZ[0]!;

            const middleZ = sortedMiddleY.map((yValue) => {
                const t = (yValue - leftEndY) / (rightStartY - leftEndY);
                return lerp(z0, z1, t);
            });

            return [...topZ, ...middleZ, ...bottomZ];
        });

        return new DepthHeatmap({
            x: this.x,
            y: newY,
            z: newZ,
        });
    }

    smoothMovingAverage(params?: { windowX?: number; windowY?: number }): DepthHeatmap {
        const windowX = params?.windowX ?? 3;
        const windowY = params?.windowY ?? 3;

        return new DepthHeatmap({
            x: this.x,
            y: this.y,
            z: this.z.smoothMovingAverage(windowX, windowY),
        });
    }

    peakValueInRange(
        startXValue: number,
        endXValue: number,
        startY: number,
        endY: number,
        topPercent?: number,
    ): number | null {
        if (this.x.length === 0 || this.y.length === 0) {
            return null;
        }

        const { minXIndex, maxXIndex, minYIndex, maxYIndex } = this.getIndexRangeFromValueRange({
            xStart: startXValue,
            xEnd: endXValue,
            yStart: startY,
            yEnd: endY,
        });

        if (minXIndex === maxXIndex || minYIndex === maxYIndex) {
            return null;
        }

        return this.z.peakValueInRange(
            minXIndex,
            maxXIndex - 1,
            minYIndex,
            maxYIndex - 1,
            topPercent,
        );
    }

    toPoints(): Array<{ x: number; y: number; z: number }> {
        const points: Array<{ x: number; y: number; z: number }> = [];
        const data = this.z.getData();

        for (let i = 0; i < this.x.length; i += 1) {
            for (let j = 0; j < this.y.length; j += 1) {
                points.push({
                    x: this.x[i]!,
                    y: this.y[j]!,
                    z: data[i]![j]!,
                });
            }
        }

        return points;
    }

    public replaceDepthRangeByLerp(startDepth: number, endDepth: number): DepthHeatmap {
        const startY = startDepth;
        const endY = endDepth;

        const newZ = this.z.replaceYRangeByLerp(
            this.y.findIndex((y) => y >= startY),
            this.y.findIndex((y) => y >= endY),
        );

        return new DepthHeatmap({
            x: this.x,
            y: this.y,
            z: newZ,
        });
    }

    public maxZValuePlot(
        columnSlice:
            | ((timestamp: number) => { startY: number; endY: number })
            | undefined = undefined,
    ): Record<number, { y: number; z: number }> {
        const maxValues: Record<number, { y: number; z: number }> = {};

        for (let i = 0; i < this.x.length; i++) {
            let indexSlice = undefined;
            if (columnSlice) {
                const valueSlice = columnSlice(this.x[i]!);
                indexSlice = {
                    startY: lastSmallerValueIndex(this.y, valueSlice.startY),
                    endY: lastSmallerValueIndex(this.y, valueSlice.endY) + 1,
                };
            }

            const { yIndex, value } = this.z.maxAtX(i, indexSlice);
            maxValues[this.x[i]!] = {
                y: this.y[yIndex]!,
                z: value,
            };
        }

        return maxValues;
    }

    public columnMaximaAtTimestamp(
        timestamp: number,
        columnSlice?: { startY: number; endY: number },
    ): { y: number; z: number } | null {
        const {
            lowerIndex: xLowerIndex,
            upperIndex: xUpperIndex,
            t,
        } = getFractionalIndex(this.x, timestamp);

        if (xLowerIndex === -1) {
            return null;
        }

        const fakeColumn = this.z.getInterpolatedColumn(xLowerIndex, xUpperIndex, t);
        let maxZ = -Infinity;
        let maxY = this.y[0]!;
        for (let j = 0; j < this.y.length; j++) {
            const yValue = this.y[j]!;
            if (columnSlice) {
                if (yValue < columnSlice.startY || yValue > columnSlice.endY) {
                    continue;
                }
            }

            const zValue = fakeColumn[j]!;
            if (zValue > maxZ) {
                maxZ = zValue;
                maxY = yValue;
            }
        }

        return { y: maxY, z: maxZ };
    }

    toInterpolated(
        newXAxis: number[],
        interpolationFunction: (min: number, max: number, t: number) => number = lerp,
    ): DepthHeatmap {
        const newZ = Array2D.zeros(newXAxis.length, this.y.length);

        for (let i = 0; i < newXAxis.length; i++) {
            const newX = newXAxis[i]!;

            const closestBelow = closestBelowSorted(this.x, newX) ?? {
                value: this.x[0]!,
                index: 0,
            };
            const closestAbove = closestAboveSorted(this.x, newX) ?? {
                value: this.x[this.x.length - 1]!,
                index: this.x.length - 1,
            };
            const tx = getInterpolationT(closestBelow.value, closestAbove.value, newX);

            if (tx < 0 || tx > 1) {
                throw new Error(`Unexpected interpolation t value ${tx} for newX=${newX}.`);
            }

            const newColumn = this.z.getInterpolatedColumn(
                closestBelow.index,
                closestAbove.index,
                tx,
                interpolationFunction,
            );

            newZ.setColumn(i, newColumn);
        }

        return new DepthHeatmap({
            x: newXAxis,
            y: this.y,
            z: newZ,
        });
    }

    averageOverDepthAtTimestamp(timestamp: number): number | null {
        const xIndex = this.x.indexOf(timestamp);

        if (xIndex === -1) {
            return null;
        }

        const column = this.z.getData()[xIndex]!;
        const validValues = column.filter((value) => Number.isFinite(value));

        if (validValues.length === 0) {
            return null;
        }

        const sum = validValues.reduce((acc, value) => acc + value, 0);
        return sum / validValues.length;
    }

    averageOverTimeAtDepth(depth: number): number | null {
        const yIndex = this.y.indexOf(depth);

        if (yIndex === -1) {
            return null;
        }

        const data = this.z.getData();
        const validValues = data
            .map((row) => row[yIndex]!)
            .filter((value) => Number.isFinite(value));

        if (validValues.length === 0) {
            return null;
        }

        const sum = validValues.reduce((acc, value) => acc + value, 0);
        return sum / validValues.length;
    }

    private static validateBridgeY(
        bridgeY: number[],
        leftEndY: number,
        rightStartY: number,
    ): number[] {
        const sortedBridgeY = [...bridgeY].sort((a, b) => a - b);

        for (let i = 0; i < sortedBridgeY.length; i += 1) {
            const value = sortedBridgeY[i]!;

            if (!Number.isFinite(value)) {
                throw new Error(`bridgeY[${i}] must be a finite number.`);
            }

            if (!(value > leftEndY && value < rightStartY)) {
                throw new Error(
                    `bridgeY value ${value} must be strictly between ${leftEndY} and ${rightStartY}.`,
                );
            }

            if (i > 0 && sortedBridgeY[i - 1] === value) {
                throw new Error('bridgeY must not contain duplicates.');
            }
        }

        return sortedBridgeY;
    }

    private static cellEdges(values: number[]): number[] {
        if (values.length === 0) {
            return [];
        }

        if (values.length === 1) {
            return [values[0]! - 0.5, values[0]! + 0.5];
        }

        const edges: number[] = new Array(values.length + 1);

        edges[0] = values[0]! - (values[1]! - values[0]!) / 2;

        for (let i = 1; i < values.length; i += 1) {
            edges[i] = (values[i - 1]! + values[i]!) / 2;
        }

        edges[values.length] =
            values[values.length - 1]! +
            (values[values.length - 1]! - values[values.length - 2]!) / 2;

        return edges;
    }

    private validate(): void {
        for (let i = 0; i < this.x.length; i += 1) {
            if (!Number.isFinite(this.x[i])) {
                throw new Error(`x[${i}] must be a finite number.`);
            }
        }

        for (let j = 0; j < this.y.length; j += 1) {
            if (!Number.isFinite(this.y[j])) {
                throw new Error(`y[${j}] must be a finite number.`);
            }
        }

        if (this.z.width !== this.x.length) {
            throw new Error('z must have exactly one row per x value: z.width === x.length.');
        }

        if (this.z.width > 0 && this.z.height !== this.y.length) {
            throw new Error('z must have exactly one column per y value: z.height === y.length.');
        }

        const data = this.z.getData();

        for (let i = 0; i < data.length; i += 1) {
            const row = data[i]!;

            if (row.length !== this.y.length) {
                throw new Error(`z[${i}] must have length ${this.y.length} to match y.`);
            }
        }
    }

    private getIndexRangeFromValueRange(params?: DepthHeatmapSliceParams): {
        minXIndex: number;
        maxXIndex: number;
        minYIndex: number;
        maxYIndex: number;
    } {
        const xStartValue = params?.xStart ?? this.x[0] ?? 0;
        const xEndValue = params?.xEnd ?? this.x[this.x.length - 1] ?? 0;
        const yStartValue = params?.yStart ?? this.y[0] ?? 0;
        const yEndValue = params?.yEnd ?? this.y[this.y.length - 1] ?? 0;

        console.log('getIndexRangeFromValueRange', params, {
            xStartValue,
            xEndValue,
            yStartValue,
            yEndValue,
        });

        const [minXIndex, maxXIndex] = sortedArrayRange(this.x, xStartValue, xEndValue);
        const [minYIndex, maxYIndex] = sortedArrayRange(this.y, yStartValue, yEndValue);

        return { minXIndex, maxXIndex, minYIndex, maxYIndex };
    }

    public fillNaNAdaptive(
        params?: DepthHeatmapSliceParams & {
            maxSpanX?: number;
            maxSpanY?: number;
            preferY?: number;
            extrapolateEdges?: boolean;
        },
    ): DepthHeatmap {
        const { minXIndex, maxXIndex, minYIndex, maxYIndex } =
            this.getIndexRangeFromValueRange(params);

        return new DepthHeatmap({
            x: this.x,
            y: this.y,
            z: this.z.fillNaNAdaptive(minXIndex, minYIndex, maxXIndex, maxYIndex, {
                maxSpanX: params?.maxSpanX,
                maxSpanY: params?.maxSpanY,
                preferY: params?.preferY,
                extrapolateEdges: params?.extrapolateEdges,
            }),
        });
    }
}

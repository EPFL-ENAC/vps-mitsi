export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;

export interface TrackPoint {
    timestamp: number;
    value: number;
}

export interface TimelineDomain {
    start: number;
    end: number;
}

export interface TimelineTick {
    timestamp: number;
    label: string;
    secondaryLabel?: string | undefined;
    isDayStart: boolean;
}

export type SeriesType = 'bar' | 'line' | 'wind' | 'number';

export interface SeriesProperties {
    id: string;
    title?: string | undefined;
    type: SeriesType;
    data: TrackPoint[];
    color?: string;
    stepMs?: number;
}

export interface TrackProperties {
    title: string;
    series: Series[];
}

export class Range {
    public constructor(
        public min: number,
        public max: number,
    ) {
        if (max < min) {
            throw new Error('Range max must be greater than or equal to min');
        }
    }

    get length(): number {
        return this.max - this.min;
    }

    normalizedValue(value: number): number {
        if (this.length === 0) {
            return 0;
        }

        return (value - this.min) / this.length;
    }

    includeValue(value: number): Range {
        return new Range(Math.min(this.min, value), Math.max(this.max, value));
    }

    toPadded(pad: number): Range {
        if (pad < 0) {
            throw new Error('pad must be greater than or equal to 0');
        }

        return new Range(this.min - pad, this.max + pad);
    }

    toPaddedRatio(ratio: number, minPad = 0): Range {
        if (ratio < 0) {
            throw new Error('ratio must be greater than or equal to 0');
        }

        if (minPad < 0) {
            throw new Error('minPad must be greater than or equal to 0');
        }

        const pad = Math.max(this.length * ratio, minPad);

        return new Range(this.min - pad, this.max + pad);
    }

    toPretty(minResolution: number | undefined = undefined): Range {
        let resolution = minResolution;

        if (resolution === undefined) {
            const rawRange = this.length;

            if (rawRange <= 1) {
                resolution = 0.1;
            } else if (rawRange <= 5) {
                resolution = 1;
            } else if (rawRange <= 20) {
                resolution = 5;
            } else if (rawRange <= 100) {
                resolution = 10;
            } else if (rawRange <= 500) {
                resolution = 50;
            } else if (rawRange <= 2000) {
                resolution = 100;
            } else {
                resolution = 500;
            }
        }

        const minPretty = Math.floor(this.min / resolution) * resolution;
        const maxPretty = Math.ceil(this.max / resolution) * resolution;

        return new Range(minPretty, maxPretty);
    }

    static maxRangeFromRanges(ranges: Range[], fallback: Range = new Range(0, 1)): Range {
        if (ranges.length === 0) {
            return fallback;
        }

        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;

        for (const range of ranges) {
            min = Math.min(min, range.min);
            max = Math.max(max, range.max);
        }

        if (!Number.isFinite(min) || !Number.isFinite(max)) {
            return fallback;
        }

        return new Range(min, max);
    }
}

export class Series {
    private _id: string;
    private _title?: string | undefined;
    private _type: SeriesType;
    private _data: TrackPoint[];
    private _color: string;
    private _stepMs: number;

    constructor(props: SeriesProperties) {
        this._id = props.id;
        this._title = props.title;
        this._type = props.type;
        this._color = props.color ?? 'cyan';
        this._data = [...props.data].sort((a, b) => a.timestamp - b.timestamp);
        this._stepMs = props.stepMs ?? HOUR_MS;
    }

    get id(): string {
        return this._id;
    }

    get title(): string | undefined {
        return this._title;
    }

    get type(): SeriesType {
        return this._type;
    }

    get data(): TrackPoint[] {
        return this._data;
    }

    get color(): string {
        return this._color;
    }

    get stepMs(): number {
        return this._stepMs;
    }

    getTimeRange(): Range {
        if (this._data.length === 0) {
            return new Range(0, 0);
        }

        return new Range(this._data[0]!.timestamp, this._data[this._data.length - 1]!.timestamp);
    }

    getPlotTimeRange(): Range {
        const raw = this.getTimeRange();

        if (this._data.length === 0) {
            return raw;
        }

        if (this._type !== 'bar') {
            return raw;
        }

        return new Range(raw.min, raw.max + this._stepMs);
    }

    getValueRange(): Range {
        if (this._data.length === 0) {
            return new Range(0, 0);
        }

        const values = this._data.map((point) => point.value);

        return new Range(Math.min(...values), Math.max(...values));
    }

    slidingWindowOutlierRemoval(
        windowSizeSamples: number,
        distanceFromAverageThreshold: number,
        replaceBy: 'average' | 'drop' = 'average',
    ): Series {
        if (windowSizeSamples <= 0 || !Number.isInteger(windowSizeSamples)) {
            throw new Error('samples must be a positive integer');
        }

        if (distanceFromAverageThreshold < 0) {
            throw new Error('distanceFromAverageThreshold must be greater than or equal to 0');
        }

        if (this._data.length === 0) {
            return new Series({
                id: this._id,
                title: this._title,
                type: this._type,
                data: [],
                color: this._color,
                stepMs: this._stepMs,
            });
        }

        const halfWindow = Math.floor(windowSizeSamples / 2);
        const nextData: TrackPoint[] = [];

        for (let i = 0; i < this._data.length; i += 1) {
            const windowStart = Math.max(0, i - halfWindow);
            const windowEnd = Math.min(this._data.length - 1, i + halfWindow);

            const windowValues: number[] = [];

            for (let j = windowStart; j <= windowEnd; j += 1) {
                if (j === i) {
                    continue;
                }

                windowValues.push(this._data[j]!.value);
            }

            if (windowValues.length === 0) {
                nextData.push({ ...this._data[i]! });
                continue;
            }

            const average =
                windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length;

            const point = this._data[i]!;
            const distance = Math.abs(point.value - average);

            if (distance > distanceFromAverageThreshold) {
                if (replaceBy === 'average') {
                    nextData.push({
                        timestamp: point.timestamp,
                        value: average,
                    });
                }
            } else {
                nextData.push({ ...point });
            }
        }

        return new Series({
            id: this._id,
            title: this._title,
            type: this._type,
            data: nextData,
            color: this._color,
            stepMs: this._stepMs,
        });
    }

    static buckets(
        props: Omit<SeriesProperties, 'data' | 'stepMs'>,
        rawData: TrackPoint[],
        bucketDurationMs: number,
    ): Series {
        if (bucketDurationMs <= 0) {
            throw new Error('bucketDurationMs must be greater than 0');
        }

        if (rawData.length === 0) {
            return new Series({
                ...props,
                data: [],
                stepMs: bucketDurationMs,
            });
        }

        const sortedData = [...rawData].sort((a, b) => a.timestamp - b.timestamp);
        const startTime = sortedData[0]!.timestamp;

        const buckets: Map<number, { sum: number; count: number }> = new Map();

        for (const point of sortedData) {
            const bucketIndex = Math.floor((point.timestamp - startTime) / bucketDurationMs);
            const bucketStart = startTime + bucketIndex * bucketDurationMs;

            if (!buckets.has(bucketStart)) {
                buckets.set(bucketStart, { sum: 0, count: 0 });
            }

            const bucket = buckets.get(bucketStart)!;
            bucket.sum += point.value;
            bucket.count += 1;
        }

        const bucketedData: TrackPoint[] = Array.from(buckets.entries()).map(
            ([timestamp, { sum, count }]) => ({
                timestamp,
                value: sum / count,
            }),
        );

        return new Series({
            ...props,
            data: bucketedData,
            stepMs: bucketDurationMs,
        });
    }
}

export class Track {
    private _title: string;
    private _series: Series[];

    constructor(props: TrackProperties) {
        this._title = props.title;
        this._series = [...props.series];
    }

    get title(): string {
        return this._title;
    }

    get series(): Series[] {
        return this._series;
    }

    getTimeRange(): Range {
        return Range.maxRangeFromRanges(
            this._series.map((series) => series.getTimeRange()),
            new Range(0, 0),
        );
    }

    getPlotTimeRange(): Range {
        return Range.maxRangeFromRanges(
            this._series.map((series) => series.getPlotTimeRange()),
            new Range(0, 0),
        );
    }

    getValueRange(): Range {
        return Range.maxRangeFromRanges(
            this._series.map((series) => series.getValueRange()),
            new Range(0, 0),
        );
    }

    getDisplayValueRange(minResolution: number | undefined = undefined): Range {
        let range = this.getValueRange();

        const hasBarSeries = this._series.some((series) => series.type === 'bar');
        const hasLineSeries = this._series.some((series) => series.type === 'line');

        if (hasBarSeries) {
            range = range.includeValue(0);
        }

        if (hasLineSeries) {
            range = range.toPaddedRatio(0.08, 1);
        }

        return range.toPretty(minResolution);
    }
}

export class Timeline {
    private _tracks: Track[];

    constructor(tracks: Track[]) {
        this._tracks = [...tracks];
    }

    get tracks(): Track[] {
        return this._tracks;
    }

    getTimeRange(): Range {
        return Range.maxRangeFromRanges(
            this._tracks.map((track) => track.getTimeRange()),
            new Range(0, 0),
        );
    }

    getPlotTimeRange(): Range {
        return Range.maxRangeFromRanges(
            this._tracks.map((track) => track.getPlotTimeRange()),
            new Range(0, 0),
        );
    }

    getTicks(tickEveryMinutes = 4 * 60, locale?: string): TimelineTick[] {
        const timeRange = this.getPlotTimeRange();
        const stepMinutes = Math.max(1, tickEveryMinutes);

        const timeFormatter = new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        });

        const dateFormatter = new Intl.DateTimeFormat(locale, {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
        });

        const ticks: TimelineTick[] = [];
        const start = new Date(timeRange.min);

        const midnight = new Date(start);
        midnight.setHours(0, 0, 0, 0);

        const minutesSinceMidnight =
            start.getHours() * 60 +
            start.getMinutes() +
            start.getSeconds() / 60 +
            start.getMilliseconds() / 60000;

        const firstTickMinutes = Math.ceil(minutesSinceMidnight / stepMinutes) * stepMinutes;

        const tick = new Date(midnight);
        tick.setMinutes(firstTickMinutes, 0, 0);

        for (; tick.getTime() <= timeRange.max; tick.setMinutes(tick.getMinutes() + stepMinutes)) {
            const isDayStart = tick.getHours() === 0 && tick.getMinutes() === 0;

            ticks.push({
                timestamp: tick.getTime(),
                label: timeFormatter.format(tick),
                secondaryLabel: isDayStart ? dateFormatter.format(tick) : undefined,
                isDayStart,
            });
        }

        return ticks;
    }
}

import { clamp, lerp } from './math';

export function interpolateColor(
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number },
    t: number,
): string {
    const r = Math.round(lerp(a.r, b.r, t));
    const g = Math.round(lerp(a.g, b.g, t));
    const bValue = Math.round(lerp(a.b, b.b, t));

    return `rgb(${r}, ${g}, ${bValue})`;
}

export function viridis(t: number): string {
    const stops = [
        { t: 0.0, r: 68, g: 1, b: 84 },
        { t: 0.25, r: 59, g: 82, b: 139 },
        { t: 0.5, r: 33, g: 145, b: 140 },
        { t: 0.75, r: 94, g: 201, b: 98 },
        { t: 1.0, r: 253, g: 231, b: 37 },
    ];

    const clamped = clamp(t, 0, 1);

    for (let i = 0; i < stops.length - 1; i += 1) {
        const left = stops[i]!;
        const right = stops[i + 1]!;

        if (clamped >= left.t && clamped <= right.t) {
            const localT = (clamped - left.t) / (right.t - left.t);
            return interpolateColor(left, right, localT);
        }
    }

    return interpolateColor(stops[0]!, stops[stops.length - 1]!, clamped);
}

export type Rgb = readonly [r: number, g: number, b: number];
export type Rgba = readonly [r: number, g: number, b: number, a: number];

export type ColorStop = {
    t: number;
    color: Rgb | Rgba;
};

type NormalizedColorStop = {
    t: number;
    color: Rgba;
};

export class ColorMap {
    private readonly stops: readonly NormalizedColorStop[];

    public constructor(stops: readonly ColorStop[]) {
        if (stops.length === 0) {
            throw new Error('ColorMap requires at least one color stop');
        }

        this.stops = [...stops]
            .map((stop) => ({
                t: clamp(stop.t, 0, 1),
                color: ColorMap.toRgba(stop.color),
            }))
            .sort((a, b) => a.t - b.t);
    }

    public sample(t: number): Rgba {
        const clamped = clamp(t, 0, 1);
        const first = this.stops[0]!;
        const last = this.stops[this.stops.length - 1]!;

        if (this.stops.length === 1 || clamped <= first.t) {
            return first.color;
        }

        if (clamped >= last.t) {
            return last.color;
        }

        for (let i = 0; i < this.stops.length - 1; i += 1) {
            const left = this.stops[i]!;
            const right = this.stops[i + 1]!;

            if (clamped >= left.t && clamped <= right.t) {
                if (left.t === right.t) {
                    return right.color;
                }

                const localT = (clamped - left.t) / (right.t - left.t);

                return [
                    Math.round(lerp(left.color[0], right.color[0], localT)),
                    Math.round(lerp(left.color[1], right.color[1], localT)),
                    Math.round(lerp(left.color[2], right.color[2], localT)),
                    Math.round(lerp(left.color[3], right.color[3], localT)),
                ];
            }
        }

        return last.color;
    }

    public toCss(t: number): string {
        const [r, g, b, a] = this.sample(t);

        if (a === 255) {
            return `rgb(${r}, ${g}, ${b})`;
        }

        const alpha = Number((a / 255).toFixed(3));
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    public toCssGradient(): string {
        const stopsCss = this.stops
            .map((stop) => {
                const color = `rgba(${stop.color[0]}, ${stop.color[1]}, ${stop.color[2]}, ${(
                    stop.color[3] / 255
                ).toFixed(3)})`;
                const position = `${Math.round(stop.t * 100)}%`;

                return `${color} ${position}`;
            })
            .join(', ');

        return `linear-gradient(to right, ${stopsCss})`;
    }

    public buildPalette(size: number): Uint8ClampedArray {
        if (!Number.isInteger(size) || size <= 0) {
            throw new Error('Palette size must be a positive integer');
        }

        const palette = new Uint8ClampedArray(size * 4);

        for (let i = 0; i < size; i += 1) {
            const t = size === 1 ? 0 : i / (size - 1);
            const [r, g, b, a] = this.sample(t);
            const offset = i * 4;

            palette[offset + 0] = r;
            palette[offset + 1] = g;
            palette[offset + 2] = b;
            palette[offset + 3] = a;
        }

        return palette;
    }

    public static viridis(): ColorMap {
        return new ColorMap([
            { t: 0.0, color: [68, 1, 84] },
            { t: 0.25, color: [59, 82, 139] },
            { t: 0.5, color: [33, 145, 140] },
            { t: 0.75, color: [94, 201, 98] },
            { t: 1.0, color: [253, 231, 37] },
        ]);
    }

    public static heat(): ColorMap {
        return new ColorMap([
            { t: 0.0, color: [0, 0, 20] },
            { t: 0.12, color: [0, 16, 92] },
            { t: 0.28, color: [31, 47, 209] },
            { t: 0.45, color: [29, 162, 255] },
            { t: 0.6, color: [31, 212, 110] },
            { t: 0.74, color: [231, 231, 26] },
            { t: 0.86, color: [255, 152, 0] },
            { t: 0.94, color: [255, 50, 0] },
            { t: 1.0, color: [214, 0, 0] },
        ]);
    }

    public static stylizedHeat(): ColorMap {
        return new ColorMap([
            // { t: 0.0, color: [0, 169, 185] },
            // { t: 0.5, color: [0, 169, 185] },
            { t: 0.0, color: [95, 227, 255] },
            { t: 0.5, color: [95, 227, 255] },
            { t: 0.8, color: [242, 192, 55] },
            { t: 1.0, color: [255, 109, 74] },
        ]);
    }

    public static stylizedHeatHardStops(): ColorMap {
        return new ColorMap([
            // { t: 0.0, color: [0, 169, 185] },
            // { t: 0.5, color: [0, 169, 185] },
            { t: 0.0, color: [95, 227, 255] },
            { t: 0.5, color: [95, 227, 255] },
            { t: 0.5001, color: [242, 192, 55] },
            { t: 0.8, color: [242, 192, 55] },
            { t: 0.8001, color: [255, 109, 74] },
            { t: 1.0, color: [255, 109, 74] },
        ]);
    }

    private static toRgba(color: Rgb | Rgba): Rgba {
        if (color.length === 4) {
            return color;
        }

        return [color[0], color[1], color[2], 255];
    }
}

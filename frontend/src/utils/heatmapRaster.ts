import { ColorMap } from './colors';

type HeatmapLike = {
    x: readonly number[];
    y: readonly number[];
    z: {
        at(x: number, y: number): number | null | undefined;
    };
};

export class HeatmapRaster {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private imageData: ImageData | null = null;
    private lastCacheKey: string | null = null;
    private readonly palette: Uint8ClampedArray;

    public constructor(colorMap: ColorMap = ColorMap.heat(), paletteSize = 256) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Could not create 2D context for HeatmapRaster');
        }

        this.canvas = canvas;
        this.ctx = ctx;
        this.palette = colorMap.buildPalette(paletteSize);
    }

    public invalidate(): void {
        this.lastCacheKey = null;
    }

    public render(heatmap: HeatmapLike, min: number, max: number, cacheKey?: string): void {
        const width = heatmap.x.length;
        const height = heatmap.y.length;

        if (width === 0 || height === 0) {
            this.resize(0, 0);
            this.lastCacheKey = cacheKey ?? null;
            return;
        }

        const resolvedCacheKey = cacheKey ?? `${width}:${height}:${min}:${max}`;

        if (this.lastCacheKey === resolvedCacheKey) {
            return;
        }

        this.resize(width, height);

        if (!this.imageData) {
            this.imageData = this.ctx.createImageData(width, height);
        }

        const data = this.imageData.data;
        const palette = this.palette;
        const paletteSteps = palette.length / 4 - 1;
        const range = max - min;

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const value = heatmap.z.at(x, y);
                const pixelIndex = (y * width + x) * 4;

                if (value == null || Number.isNaN(value)) {
                    data[pixelIndex + 0] = 0;
                    data[pixelIndex + 1] = 0;
                    data[pixelIndex + 2] = 0;
                    data[pixelIndex + 3] = 0;
                    continue;
                }

                const t = range === 0 ? 0.5 : Math.max(0, Math.min(1, (value - min) / range));

                const paletteIndex = Math.round(t * paletteSteps) * 4;

                data[pixelIndex + 0] = palette[paletteIndex + 0]!;
                data[pixelIndex + 1] = palette[paletteIndex + 1]!;
                data[pixelIndex + 2] = palette[paletteIndex + 2]!;
                data[pixelIndex + 3] = palette[paletteIndex + 3]!;
            }
        }

        this.ctx.putImageData(this.imageData, 0, 0);
        this.lastCacheKey = resolvedCacheKey;
    }

    public draw(
        ctx: CanvasRenderingContext2D,
        left: number,
        top: number,
        width: number,
        height: number,
    ): void {
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            return;
        }

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.canvas, left, top, width, height);
        ctx.restore();
    }

    public get sourceCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    private resize(width: number, height: number): void {
        if (this.canvas.width === width && this.canvas.height === height) {
            return;
        }

        this.canvas.width = width;
        this.canvas.height = height;
        this.imageData = width > 0 && height > 0 ? this.ctx.createImageData(width, height) : null;
    }
}

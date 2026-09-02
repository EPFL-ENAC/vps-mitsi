export interface Band {
    start: number;
    end: number;
    colors: string[];
    icon?: string | undefined;
}

export type BackgroundStyle = {
    backgroundImage: string;
    backgroundPosition: string;
    backgroundRepeat: string;
    backgroundSize: string;
};

export type ToCssOptions = {
    direction?: string;
    iconSizePx?: number;
    minEdgeClearancePct?: number;
};

export class BackgroundBuilder {
    private bands: Band[] = [];

    addBand(bands: Band | Band[]): this {
        const toAdd = Array.isArray(bands) ? bands : [bands];

        for (const band of toAdd) {
            if (!Number.isFinite(band.start) || !Number.isFinite(band.end)) {
                throw new Error('band start/end must be finite numbers');
            }

            if (band.end <= band.start) {
                throw new Error('band end must be greater than band start');
            }

            if (!Array.isArray(band.colors) || band.colors.length === 0) {
                throw new Error('band colors must contain at least one color');
            }
        }

        this.bands.push(...toAdd);
        this.bands.sort((a, b) => a.start - b.start);
        return this;
    }

    toBands(): Band[] {
        return this.getSortedBands();
    }

    toCSS(startX: number, endX: number, options: ToCssOptions = {}): BackgroundStyle {
        if (!Number.isFinite(startX) || !Number.isFinite(endX)) {
            throw new Error('startX and endX must be finite numbers');
        }

        if (endX <= startX) {
            throw new Error('endX must be greater than startX');
        }

        const { direction = 'to right', iconSizePx, minEdgeClearancePct = 0 } = options;

        const bands = this.clipBands(this.getSortedBands(), startX, endX);

        if (bands.length === 0) {
            return {
                backgroundImage: 'none',
                backgroundPosition: '0 0',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '100% 100%',
            };
        }

        const gradientStops: string[] = [];

        for (const band of bands) {
            gradientStops.push(...this.toGradientStopsForBand(band, startX, endX));
        }

        const visibleIconBands = bands.filter(
            (band) =>
                band.icon &&
                this.shouldRenderIcon(
                    (band.start + band.end) / 2,
                    startX,
                    endX,
                    minEdgeClearancePct,
                ),
        );

        const images = [
            ...visibleIconBands.map((band) => band.icon!),
            `linear-gradient(${direction}, ${gradientStops.join(', ')})`,
        ];

        const positions = [
            ...visibleIconBands.map(
                (band) => `${this.formatPercent((band.start + band.end) / 2, startX, endX)} 50%`,
            ),
            '0 0',
        ];

        const repeats = [...visibleIconBands.map(() => 'no-repeat'), 'no-repeat'];

        const sizes = [
            ...visibleIconBands.map(() =>
                iconSizePx != null ? `${iconSizePx}px ${iconSizePx}px` : 'auto',
            ),
            '100% 100%',
        ];

        return {
            backgroundImage: images.join(', '),
            backgroundPosition: positions.join(', '),
            backgroundRepeat: repeats.join(', '),
            backgroundSize: sizes.join(', '),
        };
    }

    private toGradientStopsForBand(band: Band, startX: number, endX: number): string[] {
        const { start, end, colors } = band;

        if (colors.length === 1) {
            const mid = (start + end) / 2;
            return [`${colors[0]} ${this.formatPercent(mid, startX, endX)}`];
        }

        if (colors.length === 2) {
            return [
                `${colors[0]} ${this.formatPercent(start, startX, endX)}`,
                `${colors[1]} ${this.formatPercent(end, startX, endX)}`,
            ];
        }

        const result: string[] = [];
        const steps = colors.length - 1;

        for (let i = 0; i < colors.length; i++) {
            const t = i / steps;
            const x = start + (end - start) * t;
            result.push(`${colors[i]} ${this.formatPercent(x, startX, endX)}`);
        }

        return result;
    }

    private shouldRenderIcon(
        x: number,
        startX: number,
        endX: number,
        minEdgeClearancePct = 0,
    ): boolean {
        const pct = ((x - startX) / (endX - startX)) * 100;
        return pct >= minEdgeClearancePct && pct <= 100 - minEdgeClearancePct;
    }

    private getSortedBands(): Band[] {
        return [...this.bands].sort((a, b) => a.start - b.start);
    }

    private clipBands(bands: Band[], startX: number, endX: number): Band[] {
        const clipped: Band[] = [];

        for (const band of bands) {
            const start = Math.max(band.start, startX);
            const end = Math.min(band.end, endX);

            if (end <= start) {
                continue;
            }

            clipped.push({
                ...band,
                start,
                end,
            });
        }

        return clipped;
    }

    private formatPercent(value: number, startX: number, endX: number): string {
        const pct = ((value - startX) / (endX - startX)) * 100;
        return `${Number(pct.toFixed(4))}%`;
    }
}

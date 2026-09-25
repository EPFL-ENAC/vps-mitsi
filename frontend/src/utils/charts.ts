/**
 * Okabe–Ito colour palette, optimized for accessibility across all types of colour blindness.
 * Colours are never used in isolation: every tile and wedge is always paired with
 * a visible text label and an informative tooltip.
 */
export const OKABEITO = [
    '#0072B2',
    '#D55E00',
    '#009E73',
    '#CC79A7',
    '#E69F00',
    '#56B4E9',
    '#F0E442',
    '#8B8B8B',
] as const;

/**
 * Safely resolves a palette colour using cyclic indexing
 */
function palette(index: number): string {
    return OKABEITO[index % OKABEITO.length] ?? '#0072B2';
}

/** One hardware row's embodied contribution; excluded rows (e.g. second-hand) are skipped. */
export interface EmbodiedRow {
    name: string;
    co2RowTotal: number;
    excluded: boolean;
}

/** One embodied category group containing accounted rows and its category total. */
export interface EmbodiedGroup {
    category: string;
    categoryTotal: number;
    rows: EmbodiedRow[];
}

/** A single ECharts datum node for treemaps or pie charts. */
export interface ChartDatum {
    name: string;
    value: number;
    itemStyle?: { color: string };
    children?: ChartDatum[];
}

/**
 * Flat treemap builder (by element): creates a single-level list of tiles across all categories.
 * Each element receives the colour of its parent category (`categoryIdx`) to ensure full
 * visual colour consistency with the categorical treemap and Excel reference charts.
 * Excluded rows and zero-value items are filtered out.
 */
export function toElementTreemapData(groups: EmbodiedGroup[]): ChartDatum[] {
    return groups.flatMap((g, categoryIdx) => {
        const categoryColor = palette(categoryIdx);
        return g.rows
            .filter((r) => !r.excluded && r.co2RowTotal > 0)
            .map((r) => ({
                name: r.name,
                value: r.co2RowTotal,
                itemStyle: { color: categoryColor },
            }));
    });
}

/**
 * Nested treemap builder (by category): generates a two-tier hierarchy with parent category tiles
 * containing their accounted child elements.
 * Both parent and child tiles share the identical `categoryColor`, separated by clear borders.
 * Categories with no accounted child rows are omitted.
 */
export function toCategoryTreemapData(groups: EmbodiedGroup[]): ChartDatum[] {
    return groups
        .map((g, i) => {
            const categoryColor = palette(i);
            return {
                name: g.category,
                value: g.categoryTotal,
                itemStyle: { color: categoryColor },
                children: g.rows
                    .filter((r) => !r.excluded && r.co2RowTotal > 0)
                    .map((r) => ({
                        name: r.name,
                        value: r.co2RowTotal,
                        itemStyle: { color: categoryColor },
                    })),
            };
        })
        .filter((g) => (g.children?.length ?? 0) > 0);
}

/**
 * Datacenter pie slices builder: produces one wedge per datacenter with an available estimate.
 * Null or non-positive values are filtered out.
 * Slices are coloured dynamically by the pie series using the global `OKABEITO` palette.
 */
export function toDatacenterPieData(
    rows: { datacenterId: string; co2Period: number | null; co2Lifespan: number | null }[],
    labelFor: (id: string) => string,
    metric: 'period' | 'lifespan',
): ChartDatum[] {
    return rows
        .map((r) => ({
            name: labelFor(r.datacenterId),
            value: r[metric === 'period' ? 'co2Period' : 'co2Lifespan'],
        }))
        .filter((d): d is ChartDatum => d.value !== null && d.value > 0);
}

/**
 * Split pie builder: embodied vs operational contributions (exactly two wedges in v1).
 * Both wedges are kept in the data array to preserve consistent legend structure even when zero.
 * The optional `underlying` parameter is reserved for v2 functionality.
 */
export function toSplitPieData(
    embodied: number,
    operational: number | null,
    labels: { embodied: string; operational: string; underlying?: string },
    underlying?: number,
): ChartDatum[] {
    const data: ChartDatum[] = [
        { name: labels.embodied, value: embodied },
        { name: labels.operational, value: operational ?? 0 },
    ];
    // v2: underlying-services wedge — only present when its contribution is supplied.
    if (underlying !== undefined) {
        data.push({ name: labels.underlying ?? 'Underlying services', value: underlying });
    }
    return data;
}

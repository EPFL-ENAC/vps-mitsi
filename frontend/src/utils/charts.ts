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
export function palette(index: number): string {
    return OKABEITO[index % OKABEITO.length] ?? '#0072B2';
}

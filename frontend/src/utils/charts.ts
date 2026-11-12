/**
 * Blue color scale used for category and element visualization.
 * Ordered from darkest to lightest.
 */
export const BLUE_SCALE = [
    '#5687C4', // Blue 500 (Storage)
    '#7FA9DD', // Blue 400 (Spare part)
    '#A9C8EC', // Blue 300 (Compute server)
    '#CFE0F5', // Blue 200 (Server)
    '#EAF2FB', // Blue 100 (Network switch)
] as const;

/**
 * Generates distinguishable corporate blue/slate shades for 50+ categories.
 * Stays strictly within the blue spectrum (hue 198-232) and maintains safe text contrast.
 */
export function getCategoryColor(index: number): string {
    if (index < BLUE_SCALE.length - 1) {
        return BLUE_SCALE[index] ?? BLUE_SCALE[0];
    }
    // Modulate hue within the safe blue-indigo range (198 to 232 degrees)
    const baseHue = 198 + ((index * 17) % 35);
    // Cycle lightness between 38% and 62% in non-adjacent steps
    const light = 38 + ((index * 13) % 25);
    // Cycle saturation between 45% and 75%
    const sat = 45 + ((index * 11) % 31);

    return `hsl(${baseHue}, ${sat}%, ${light}%)`;
}

/**
 * Red color scale used for threshold and critical emission indicators.
 * Ordered from darkest to lightest.
 */
export const RED_SCALE = [
    '#D25F5F', // Red 500
    '#E68585', // Red 400
    '#F1AEAE', // Red 300
    '#F8D2D2', // Red 200
    '#FCECEC', // Red 100
] as const;

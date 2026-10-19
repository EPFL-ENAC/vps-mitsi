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

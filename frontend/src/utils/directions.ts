type Direction = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

/**
 * Converts degrees (0-360) to a cardinal direction string.
 * @param degrees - The angle in degrees
 * @returns The corresponding direction name
 */
export function getCardinalDirection(degrees: number): Direction {
    const directions: Direction[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

    // Normalize degrees to be within 0-359 using the modulo operator
    // The extra (+ 360) handles negative degree inputs
    const normalizedDegrees = ((degrees % 360) + 360) % 360;

    // Each direction takes up a 45-degree arc.
    // We divide by 45 and round to find the closest index.
    // We use % 8 to wrap the 360/45 = 8 (which is North) back to index 0.
    const index = Math.round(normalizedDegrees / 45) % 8;

    return directions[index]!;
}

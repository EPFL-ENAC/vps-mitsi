/** kg CO₂-eq, space thousands separator, 2 decimals ("213 281.89"). */
export function formatKg(n: number): string {
    const parts = n.toFixed(2).split('.');
    const int = parts[0] ?? '0';
    const dec = parts[1] ?? '00';
    return `${int.replace(/\B(?=(?:\d{3})+(?!\d))/g, ' ')}.${dec}`;
}

/** Assembled functional-unit sentence ("Usage of 1 hour of the service with 1 GPU").
 *  t and the translated time-unit label are injected at call time. */
export function buildFunctionalUnitSentence(
    t: (key: string, params?: Record<string, unknown>) => string,
    fu: { usageDuration: number; resourceCount: number; resourceType: string },
    timeUnitLabel: string,
): string {
    return `${t('scopeFuBefore')} ${fu.usageDuration} ${timeUnitLabel} ${t('scopeFuMiddle')} ${fu.resourceCount} ${fu.resourceType}`;
}

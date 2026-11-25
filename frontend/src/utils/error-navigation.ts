export function buildFieldSelector(field: string, rowId?: string): string {
    const fieldSelector = `[data-field="${CSS.escape(field)}"]`;
    return rowId ? `[data-row-id="${CSS.escape(rowId)}"]${fieldSelector}` : fieldSelector;
}

/** Scrolls to the target field, pulses it until `animationend`, and focuses its control. */
export function focusAndPulseField(container: ParentNode, field: string, rowId?: string): boolean {
    const element = container.querySelector<HTMLElement>(buildFieldSelector(field, rowId));
    if (!element) return false;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('field-highlight-pulse');
    element.addEventListener(
        'animationend',
        () => element.classList.remove('field-highlight-pulse'),
        { once: true },
    );

    const control = element.querySelector<HTMLElement>('input, textarea, select');
    (control ?? element).focus({ preventScroll: true });
    return true;
}

/** Completion state of an assessment block shown in the nav rail / status bar. */
export type BlockStatus = 'complete' | 'partial' | 'not_started';

/** The four assessment blocks, in the order shown in the navigation rail. */
export type BlockKey = 'scope' | 'inventory' | 'energy' | 'results';

/** Hardware inventory column sets; each mode includes the previous one's columns. */
export type VisibilityMode = 'simple' | 'normal' | 'advanced';

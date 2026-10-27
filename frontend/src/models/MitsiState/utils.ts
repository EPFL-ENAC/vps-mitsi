import {
    type MitsiState,
    MitsiStateDraftSchema,
    MitsiStateSchema,
} from 'src/models/MitsiState/schema';

/** Loaded assessments must declare their version instead of receiving a creation default. */
export const PersistedAssessmentSchema = MitsiStateDraftSchema.extend({
    schemaVersion: MitsiStateSchema.shape.schemaVersion,
});

/** True when an assessment holds nothing worth warning about. */
export function isStateEmpty(state: MitsiState): boolean {
    return (
        state.scope.organizationName === '' &&
        state.scope.serviceName === '' &&
        state.scope.function === '' &&
        state.hardware.length === 0 &&
        state.datacenters.length === 0
    );
}

/** Validates a persisted/imported payload without any store side effect. */
export function parseState(raw: unknown): MitsiState | null {
    const parsed = PersistedAssessmentSchema.safeParse(raw);
    if (!parsed.success) return null;
    const state = parsed.data;
    const dcIds = new Set(state.datacenters.map((dc) => dc.id));
    // An empty reference is an unfinished draft. Only filter real orphans,
    // and only when loading: saving must not silently remove edited rows.
    return {
        ...state,
        hardware: state.hardware.filter(
            (row) => row.datacenterId === '' || dcIds.has(row.datacenterId),
        ),
    };
}

/** True when the file is a valid assessment that contains no survey data. Applies nothing. */
export function isImportEmpty(json: string): boolean {
    try {
        const state = parseState(JSON.parse(json) as unknown);
        return state !== null && isStateEmpty(state);
    } catch {
        return false;
    }
}

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

/** True when the file is a valid assessment that contains no survey data. Applies nothing. */
export function isImportEmpty(json: string): boolean {
    try {
        const parsed = PersistedAssessmentSchema.safeParse(JSON.parse(json));
        return parsed.success && isStateEmpty(parsed.data);
    } catch {
        return false;
    }
}

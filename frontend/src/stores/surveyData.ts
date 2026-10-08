/** Editable survey inputs, validation, progress, and browser persistence. */
import { LocalStorage } from 'quasar';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { z } from 'zod';

import {
    MITSI_SCHEMA_VERSION,
    type MitsiState,
    MitsiStateDraftSchema,
    MitsiStateSchema,
} from 'src/models/MitsiState/schema';
import type { BlockStatus } from 'src/types/ui';
import {
    type DatacenterDraft,
    DatacenterEnergySchema,
    DatacenterEnergyDraftSchema,
    DatacenterDraftSchema,
    DatacenterGeneralInfoSchema,
} from 'src/models/Datacenter/schema';
import {
    type HardwareItem,
    HardwareItemDraftSchema,
    HardwareItemSchema,
} from 'src/models/HardwareItem/schema';
import { type MonitoringPeriod, MonitoringPeriodSchema } from 'src/models/MonitoringPeriod/schema';
import {
    type Scope,
    BoundaryItemDraftSchema,
    ScopeSchema,
    ScopeDraftSchema,
} from 'src/models/Scope/schema';
import {
    type UnderlyingService,
    UnderlyingServiceSchema,
} from 'src/models/UnderlyingService/schema';

/** Storage key used for browser persistence. */
export const MITSI_STORAGE_KEY = 'mitsi-assessment';

export type DatacenterDeletionBlock = { hardwareRowCount: number };

export type RemoveDatacenterResult =
    | { removed: true }
    | { removed: false; reason: 'not_found' }
    | { removed: false; reason: 'in_use'; usage: DatacenterDeletionBlock };

/** Loaded assessments must declare their version instead of receiving a creation default. */
const PersistedAssessmentSchema = MitsiStateDraftSchema.extend({
    schemaVersion: MitsiStateSchema.shape.schemaVersion,
});

/** Browser persistence metadata stays separate from the exported assessment. */
const StoredDraftSchema = z.object({
    assessment: PersistedAssessmentSchema,
    savedAt: z.number().int().min(0).max(8.64e15).nullable().catch(null),
});
type StoredDraft = z.infer<typeof StoredDraftSchema>;

function statusFor(requiredInputsAreValid: boolean, hasUserInput: boolean): BlockStatus {
    if (requiredInputsAreValid) return 'complete';
    if (hasUserInput) return 'partial';
    return 'not_started';
}

export const useSurveyDataStore = defineStore('surveyData', () => {
    const initial = MitsiStateDraftSchema.parse({});
    const scope = ref<Scope>(initial.scope);
    const hardware = ref<HardwareItem[]>(initial.hardware);
    const monitoringPeriod = ref<MonitoringPeriod>({ ...initial.monitoringPeriod });
    const datacenters = ref<DatacenterDraft[]>(initial.datacenters);
    const includeSecondHandEmbodied = ref(initial.includeSecondHandEmbodied);
    const includeUnderlyingServices = ref(initial.includeUnderlyingServices);
    const underlyingServices = ref<UnderlyingService[]>(initial.underlyingServices);
    const savedAt = ref<number | null>(null);
    const exportedAt = ref<number | null>(null);

    // ── Getters ──────────────────────────────────────────────────────────────
    const isScopeValid = computed<boolean>(
        () =>
            ScopeSchema.safeParse(scope.value).success &&
            datacenters.value.length > 0 &&
            datacenters.value.every(
                (dc) => DatacenterGeneralInfoSchema.safeParse(dc.generalInfo).success,
            ),
    );

    /** True when the draft holds nothing worth warning about */
    const isStoreEmpty = computed<boolean>(
        () =>
            scope.value.organizationName === '' &&
            scope.value.serviceName === '' &&
            scope.value.function === '' &&
            hardware.value.length === 0 &&
            datacenters.value.length === 0,
    );

    /** True when a hardware row carries every field needed for the totals. */
    const hardwareRowValid = (h: HardwareItem): boolean => HardwareItemSchema.safeParse(h).success;

    /** Count of hardware rows missing a mandatory value (reuses hardwareRowValid). */
    const missingMandatoryHardware = computed<number>(
        () => hardware.value.filter((h) => !hardwareRowValid(h)).length,
    );

    const hardwareRowsComplete = computed<boolean>(
        () => hardware.value.length > 0 && missingMandatoryHardware.value === 0,
    );
    /** Empty cleared inputs count as untouched; an explicit numeric zero counts as entered. */
    const energyStarted = computed(() => {
        const period = monitoringPeriod.value;
        return (
            period.unit !== initial.monitoringPeriod.unit ||
            period.value !== initial.monitoringPeriod.value ||
            period.comment.trim() !== '' ||
            datacenters.value.some((dc) =>
                Object.values(dc.energy).some(
                    (value) =>
                        value !== null &&
                        value !== undefined &&
                        (typeof value !== 'string' || value.trim() !== ''),
                ),
            )
        );
    });

    // Compare against separate defaults: editable refs must never mutate the baseline.
    const scopeDefaults = ScopeDraftSchema.parse({});
    const scopeHasUserInput = computed(() => {
        const current = scope.value;
        const fu = current.functionalUnit;
        const defaultFu = scopeDefaults.functionalUnit;
        return (
            current.organizationName !== scopeDefaults.organizationName ||
            current.assessors !== scopeDefaults.assessors ||
            current.serviceName !== scopeDefaults.serviceName ||
            current.function !== scopeDefaults.function ||
            current.lifespanYears !== scopeDefaults.lifespanYears ||
            fu.timeUnit !== defaultFu.timeUnit ||
            fu.usageDuration !== defaultFu.usageDuration ||
            fu.resourceCount !== defaultFu.resourceCount ||
            fu.resourceType !== defaultFu.resourceType ||
            current.includedItems.length > 0 ||
            current.excludedItems.length > 0 ||
            datacenters.value.length > 0
        );
    });
    const hardwareHasUserInput = computed(() => hardware.value.length > 0);
    const hasUserInput = computed(
        () =>
            scopeHasUserInput.value ||
            hardwareHasUserInput.value ||
            energyStarted.value ||
            includeSecondHandEmbodied.value !== initial.includeSecondHandEmbodied ||
            includeUnderlyingServices.value !== initial.includeUnderlyingServices ||
            underlyingServices.value.length > 0,
    );

    const energyInputsValid = computed(
        () =>
            isScopeValid.value &&
            MonitoringPeriodSchema.safeParse(monitoringPeriod.value).success &&
            datacenters.value.every((dc) => DatacenterEnergySchema.safeParse(dc.energy).success),
    );

    const scopeStatus = computed(() => statusFor(isScopeValid.value, scopeHasUserInput.value));
    const hardwareInventoryStatus = computed(() =>
        statusFor(isScopeValid.value && hardwareRowsComplete.value, hardwareHasUserInput.value),
    );
    const energyConsumptionStatus = computed(() =>
        statusFor(energyInputsValid.value, energyStarted.value),
    );
    const resultsStatus = computed(() =>
        statusFor(
            scopeStatus.value === 'complete' &&
                hardwareInventoryStatus.value === 'complete' &&
                energyConsumptionStatus.value === 'complete' &&
                (!includeUnderlyingServices.value ||
                    underlyingServices.value.every(
                        (service) => UnderlyingServiceSchema.safeParse(service).success,
                    )),
            hasUserInput.value,
        ),
    );

    // ── Persistence (client-side, Quasar LocalStorage) ───────────────────────
    function loadFromStorage(): void {
        const raw: unknown = LocalStorage.getItem(MITSI_STORAGE_KEY);
        const draft = StoredDraftSchema.safeParse(raw);
        const state = parseState(draft.success ? draft.data.assessment : raw);
        if (!state) return;
        applyState(state);
        savedAt.value = draft.success ? draft.data.savedAt : null;
    }

    function persistDraft(assessment: MitsiState): void {
        const timestamp = Date.now();
        LocalStorage.set(MITSI_STORAGE_KEY, {
            assessment,
            savedAt: timestamp,
        } satisfies StoredDraft);
        savedAt.value = timestamp;
    }

    function saveToStorage(): boolean {
        const parsed = MitsiStateDraftSchema.safeParse(buildState());
        if (!parsed.success) return false;
        try {
            persistDraft(parsed.data);
            return true;
        } catch {
            return false;
        }
    }

    function reset(): void {
        applyState(MitsiStateDraftSchema.parse({}));
        savedAt.value = null;
        exportedAt.value = null;
        LocalStorage.remove(MITSI_STORAGE_KEY);
    }

    // ── Import / export (versioned JSON) ─────────────────────────────────────
    function exportJson(): string {
        const state = MitsiStateDraftSchema.parse(buildState());
        const json = JSON.stringify(state, null, 2);
        exportedAt.value = Date.now();
        return json;
    }

    function importJson(json: string): boolean {
        try {
            const state = parseState(JSON.parse(json) as unknown);
            if (!state) return false;
            persistDraft(state);
            applyState(state);
            return true;
        } catch {
            return false;
        }
    }

    // ── Datacenter lifecycle ─────────────────────────────────────────────────
    function getDatacenterDeletionBlock(id: string): DatacenterDeletionBlock | null {
        const hardwareRowCount = hardware.value.filter((row) => row.datacenterId === id).length;
        return hardwareRowCount > 0 ? { hardwareRowCount } : null;
    }

    function removeDatacenter(id: string): RemoveDatacenterResult {
        const index = datacenters.value.findIndex((dc) => dc.id === id);
        if (index === -1) return { removed: false, reason: 'not_found' };
        const usage = getDatacenterDeletionBlock(id);
        if (usage) return { removed: false, reason: 'in_use', usage };
        datacenters.value.splice(index, 1);
        return { removed: true };
    }

    function clearDatacenterEnergy(id: string): boolean {
        const dc = datacenters.value.find((dc) => dc.id === id);
        if (!dc) return false;
        dc.energy = DatacenterEnergyDraftSchema.parse({});
        return true;
    }

    function addDatacenter(): string {
        const dc = DatacenterDraftSchema.parse({ id: crypto.randomUUID() });
        datacenters.value.push(dc);
        return dc.id;
    }

    function addHardwareItem(): void {
        hardware.value.push(HardwareItemDraftSchema.parse({ id: crypto.randomUUID() }));
    }

    /** Creates a blank included/excluded boundary row (fresh uuid). */
    function addBoundaryItem(which: 'included' | 'excluded'): void {
        const item = BoundaryItemDraftSchema.parse({ id: crypto.randomUUID() });
        if (which === 'included') scope.value.includedItems.push(item);
        else scope.value.excludedItems.push(item);
    }

    // ── Internal helpers ─────────────────────────────────────────────────────
    function buildState(): MitsiState {
        return {
            schemaVersion: MITSI_SCHEMA_VERSION,
            scope: scope.value,
            hardware: hardware.value,
            monitoringPeriod: monitoringPeriod.value,
            datacenters: datacenters.value,
            includeSecondHandEmbodied: includeSecondHandEmbodied.value,
            includeUnderlyingServices: includeUnderlyingServices.value,
            underlyingServices: underlyingServices.value,
        };
    }

    function parseState(raw: unknown): MitsiState | null {
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

    function applyState(state: MitsiState): void {
        scope.value = state.scope;
        hardware.value = state.hardware;
        monitoringPeriod.value = state.monitoringPeriod;
        datacenters.value = state.datacenters;
        includeSecondHandEmbodied.value = state.includeSecondHandEmbodied;
        includeUnderlyingServices.value = state.includeUnderlyingServices;
        underlyingServices.value = state.underlyingServices;
    }

    return {
        scope,
        hardware,
        monitoringPeriod,
        datacenters,
        includeSecondHandEmbodied,
        includeUnderlyingServices,
        underlyingServices,
        savedAt,
        exportedAt,
        isScopeValid,
        isStoreEmpty,
        missingMandatoryHardware,
        scopeStatus,
        hardwareInventoryStatus,
        energyConsumptionStatus,
        resultsStatus,
        loadFromStorage,
        saveToStorage,
        reset,
        exportJson,
        importJson,
        getDatacenterDeletionBlock,
        removeDatacenter,
        clearDatacenterEnergy,
        addDatacenter,
        addBoundaryItem,
        addHardwareItem,
    };
});

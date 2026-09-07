/**
 * MITSI — Pinia store (single source of truth)
 *
 * Holds the whole assessment state, persists client-side via the Quasar
 * LocalStorage plugin, and exposes the actions/computed totals used across
 * all blocks.
 */
import { LocalStorage } from 'quasar';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
    emptyMitsiState,
    MITSI_SCHEMA_VERSION,
    MITSI_STORAGE_KEY,
    type BlockKey,
    type BlockStatus,
    type DatacenterEnergy,
    type HardwareItem,
    type MitsiState,
    type MonitoringPeriod,
    type Scope,
    type TimeUnit,
    type UnderlyingService,
} from 'src/models/mitsi';

/**
 * Counts of each time unit per year, matching the "Counts of time unit for a
 * year" table in the reference workbook exactly.
 */
const COUNTS_PER_YEAR: Record<TimeUnit, number> = {
    second: 31_536_000, // 365 * 24 * 60 * 60
    minute: 525_600,
    hour: 8_760,
    day: 365,
    week: 52,
    month: 12,
    year: 1,
};

export const useMitsiStore = defineStore('mitsi', () => {
    const initial = emptyMitsiState();
    const scope = ref<Scope>(initial.scope);
    const hardware = ref<HardwareItem[]>([]);
    const monitoringPeriod = ref<MonitoringPeriod>(initial.monitoringPeriod);
    const energy = ref<DatacenterEnergy[]>([]);
    const includeSecondHandEmbodied = ref(false);
    const includeUnderlyingServices = ref(false);
    const underlyingServices = ref<UnderlyingService[]>([]);
    const savedAt = ref<number | null>(null);
    const exportedAt = ref<number | null>(null);

    // ── Getters ──────────────────────────────────────────────────────────────
    const isScopeValid = computed<boolean>(() => {
        const s = scope.value;
        const has = (v: string) => v.trim().length > 0;
        return (
            has(s.organizationName) &&
            has(s.serviceName) &&
            has(s.function) &&
            s.lifespanYears > 0 &&
            s.datacenters.length > 0
        );
    });

    /** Embodied emissions (kg CO2-eq), honouring the second-hand setting. */
    const totalEmbodied = computed<number>(() =>
        hardware.value.reduce((sum, h) => {
            if (h.isSecondHand && !includeSecondHandEmbodied.value) return sum;
            return sum + h.quantity * h.impactManufacturingDistributionEol;
        }, 0),
    );

    /** Count of hardware rows excluded because second-hand & not accounted. */
    const secondHandExcludedCount = computed<number>(() =>
        includeSecondHandEmbodied.value ? 0 : hardware.value.filter((h) => h.isSecondHand).length,
    );

    /** Operational emissions over the whole lifespan (kg CO2-eq). */
    const totalOperational = computed<number>(() => {
        const monitoringPeriodYears =
            monitoringPeriod.value.value / COUNTS_PER_YEAR[monitoringPeriod.value.unit];
        if (monitoringPeriodYears <= 0) return 0;
        const lifespanYears = scope.value.lifespanYears || 0;
        const scaling = lifespanYears / monitoringPeriodYears;
        return energy.value.reduce((sum, dc) => {
            const pue = dc.pue && dc.pue > 0 ? dc.pue : 1;
            const perKwh = (dc.carbonIntensity / 1000) * pue;
            return sum + dc.energyConsumption * perKwh * scaling;
        }, 0);
    });

    /** Underlying services emissions over the lifespan (kg CO2-eq). */
    const totalUnderlying = computed<number>(() =>
        includeUnderlyingServices.value
            ? underlyingServices.value.reduce((s, u) => s + (u.co2EstimateKg || 0), 0)
            : 0,
    );

    const totalLifespan = computed<number>(
        () => totalEmbodied.value + totalOperational.value + totalUnderlying.value,
    );

    /** Amount per functional unit (kg CO2-eq per usage). Null when not computable. */
    const perFunctionalUnit = computed<number | null>(() => {
        const s = scope.value;
        // Guard against missing/zero inputs that would yield a meaningless,
        // infinite or negative per-functional-unit figure.
        if (s.resourcesInService <= 0) return null;
        if (s.functionalUnit.usageDuration <= 0) return null;
        if (s.lifespanYears <= 0) return null;
        if (totalLifespan.value <= 0) return null;

        const uses =
            s.lifespanYears * COUNTS_PER_YEAR[s.functionalUnit.timeUnit] * s.resourcesInService;
        if (uses <= 0) return null;
        return totalLifespan.value / uses;
    });

    /** True when a hardware row carries every field needed for the totals. */
    const hardwareRowValid = (h: HardwareItem): boolean =>
        h.name.trim().length > 0 &&
        h.category.length > 0 &&
        h.quantity > 0 &&
        h.datacenterId.trim().length > 0 &&
        h.impactManufacturingDistributionEol >= 0;

    /** True when an energy record carries every field needed for the totals. */
    const energyRowValid = (e: DatacenterEnergy): boolean =>
        e.datacenterId.trim().length > 0 && e.carbonIntensity > 0 && e.energyConsumption >= 0;

    const hardwareRowsComplete = computed<boolean>(
        () => hardware.value.length > 0 && hardware.value.every(hardwareRowValid),
    );
    const energyRowsComplete = computed<boolean>(
        () => energy.value.length > 0 && energy.value.every(energyRowValid),
    );

    /** Per-block completion, reflecting mandatory-field completion, not row presence. */
    const blockStatus = computed<Record<BlockKey, BlockStatus>>(() => ({
        scope: isScopeValid.value ? 'complete' : 'not_started',
        inventory:
            hardware.value.length === 0
                ? 'not_started'
                : hardwareRowsComplete.value
                  ? 'complete'
                  : 'partial',
        energy:
            energy.value.length === 0
                ? 'not_started'
                : energyRowsComplete.value && monitoringPeriod.value.value > 0
                  ? 'complete'
                  : 'partial',
        results:
            isScopeValid.value && (hardwareRowsComplete.value || energyRowsComplete.value)
                ? 'complete'
                : 'not_started',
    }));

    // ── Persistence (client-side, Quasar LocalStorage) ───────────────────────
    function loadFromStorage(): void {
        const state = parseState(LocalStorage.getItem(MITSI_STORAGE_KEY));
        if (state) applyState(state);
    }

    function saveToStorage(): void {
        LocalStorage.set(MITSI_STORAGE_KEY, buildState());
        savedAt.value = Date.now();
    }

    function reset(): void {
        const blank = emptyMitsiState();
        scope.value = blank.scope;
        hardware.value = [];
        monitoringPeriod.value = blank.monitoringPeriod;
        energy.value = [];
        includeSecondHandEmbodied.value = false;
        includeUnderlyingServices.value = false;
        underlyingServices.value = [];
        savedAt.value = null;
        exportedAt.value = null;
        LocalStorage.remove(MITSI_STORAGE_KEY);
    }

    // ── Import / export (versioned JSON) ─────────────────────────────────────
    function exportJson(): string {
        exportedAt.value = Date.now();
        return JSON.stringify(buildState(), null, 2);
    }

    function importJson(json: string): boolean {
        try {
            const state = parseState(JSON.parse(json) as unknown);
            if (!state) return false;
            applyState(state);
            saveToStorage();
            return true;
        } catch {
            return false;
        }
    }

    // ── Referential integrity ────────────────────────────────────────────────
    function deleteDatacenterGuard(datacenterId: string): {
        hardwareRowCount: number;
        energyRecordCount: number;
    } | null {
        const hardwareRowCount = hardware.value.filter(
            (h) => h.datacenterId === datacenterId,
        ).length;
        const energyRecordCount = energy.value.filter(
            (e) => e.datacenterId === datacenterId,
        ).length;
        if (hardwareRowCount === 0 && energyRecordCount === 0) return null;
        return { hardwareRowCount, energyRecordCount };
    }

    // ── Internal helpers ─────────────────────────────────────────────────────
    function isRecord(v: unknown): v is Record<string, unknown> {
        return typeof v === 'object' && v !== null && !Array.isArray(v);
    }

    function buildState(): MitsiState {
        return {
            schemaVersion: MITSI_SCHEMA_VERSION,
            scope: scope.value,
            hardware: hardware.value,
            monitoringPeriod: monitoringPeriod.value,
            energy: energy.value,
            includeSecondHandEmbodied: includeSecondHandEmbodied.value,
            includeUnderlyingServices: includeUnderlyingServices.value,
            underlyingServices: underlyingServices.value,
        };
    }

    function parseState(raw: unknown): MitsiState | null {
        if (!raw || typeof raw !== 'object') return null;
        const o = raw as Record<string, unknown>;

        // Only bare, finite numbers are trusted as schema versions.
        const version = o.schemaVersion;
        if (typeof version !== 'number' || !Number.isFinite(version)) return null;
        // Reject schemas newer than the current one; accept same or older.
        if (version > MITSI_SCHEMA_VERSION) return null;

        const blank = emptyMitsiState();
        // Merge the loaded JSON over the blank state so any missing field falls
        // back to its default instead of remaining undefined.
        const state: MitsiState = {
            ...blank,
            ...(isRecord(o.scope) ? { scope: { ...blank.scope, ...o.scope } } : {}),
            ...(Array.isArray(o.hardware) ? { hardware: o.hardware as HardwareItem[] } : {}),
            ...(isRecord(o.monitoringPeriod)
                ? { monitoringPeriod: { ...blank.monitoringPeriod, ...o.monitoringPeriod } }
                : {}),
            ...(Array.isArray(o.energy) ? { energy: o.energy as DatacenterEnergy[] } : {}),
            ...(typeof o.includeSecondHandEmbodied === 'boolean'
                ? { includeSecondHandEmbodied: o.includeSecondHandEmbodied }
                : {}),
            ...(typeof o.includeUnderlyingServices === 'boolean'
                ? { includeUnderlyingServices: o.includeUnderlyingServices }
                : {}),
            ...(Array.isArray(o.underlyingServices)
                ? { underlyingServices: o.underlyingServices as UnderlyingService[] }
                : {}),
        };
        return state;
    }

    function applyState(state: MitsiState): void {
        const blank = emptyMitsiState();
        scope.value = { ...blank.scope, ...state.scope };
        hardware.value = state.hardware ?? [];
        monitoringPeriod.value = { ...blank.monitoringPeriod, ...state.monitoringPeriod };
        energy.value = state.energy ?? [];
        includeSecondHandEmbodied.value = state.includeSecondHandEmbodied ?? false;
        includeUnderlyingServices.value = state.includeUnderlyingServices ?? false;
        underlyingServices.value = state.underlyingServices ?? [];
    }

    return {
        scope,
        hardware,
        monitoringPeriod,
        energy,
        includeSecondHandEmbodied,
        includeUnderlyingServices,
        underlyingServices,
        savedAt,
        exportedAt,
        isScopeValid,
        totalEmbodied,
        secondHandExcludedCount,
        totalOperational,
        totalUnderlying,
        totalLifespan,
        perFunctionalUnit,
        blockStatus,
        loadFromStorage,
        saveToStorage,
        reset,
        exportJson,
        importJson,
        deleteDatacenterGuard,
    };
});

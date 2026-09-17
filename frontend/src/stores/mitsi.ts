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
import { DatacenterEnergySchema, MitsiStateSchema } from 'src/models/schema';

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

    /**
     * Whether a second-hand row is excluded from the embodied total — i.e. it is
     * second-hand AND second-hand embodied emissions are not being accounted for.
     * Single definition of the rule, reused by the getters and the inventory page.
     */
    function isSecondHandExcluded(row: HardwareItem): boolean {
        return row.isSecondHand && !includeSecondHandEmbodied.value;
    }

    /** Embodied emissions of one row: quantity × per-unit impact. */
    function rowSubtotal(row: HardwareItem): number {
        return row.quantity * row.impactManufacturingDistributionEol;
    }

    /** Embodied emissions (kg CO2-eq), honouring the second-hand setting. */
    const totalEmbodied = computed<number>(() =>
        hardware.value.reduce((sum, h) => {
            if (isSecondHandExcluded(h)) return sum;
            return sum + rowSubtotal(h);
        }, 0),
    );

    /** Count of hardware rows excluded because second-hand & not accounted. */
    const secondHandExcludedCount = computed<number>(
        () => hardware.value.filter(isSecondHandExcluded).length,
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

    /**
     * Fleet of the resource type selected in the functional unit, derived
     * from the inventory over accounted rows (second-hand excluded) —
     * Excel '4.Hardware inventory'!D7×X7 (44 × 4 = 176). 'CPU' selection →
     * CPU fleet (quantity × cpuQuantity); any other value → GPU fleet.
     */
    const resourcesInService = computed<number>(() => {
        const cpu = scope.value.functionalUnit.resourceType.trim().toLowerCase() === 'cpu';
        return hardware.value.reduce(
            (sum, h) =>
                isSecondHandExcluded(h)
                    ? sum
                    : sum + h.quantity * (cpu ? h.cpuQuantity : h.gpuQuantity),
            0,
        );
    });

    /** Amount per functional unit (kg CO2-eq per usage). Null when not computable. */
    const perFunctionalUnit = computed<number | null>(() => {
        const s = scope.value;
        // Guard against missing/zero inputs that would yield a meaningless,
        // infinite or negative per-functional-unit figure.
        if (resourcesInService.value <= 0) return null;
        if (s.functionalUnit.usageDuration <= 0) return null;
        if (s.functionalUnit.resourceCount <= 0) return null;
        if (s.lifespanYears <= 0) return null;
        if (totalLifespan.value <= 0) return null;

        // one functional unit consumes usageDuration × resourceCount resource-hours.
        const uses =
            (s.lifespanYears *
                COUNTS_PER_YEAR[s.functionalUnit.timeUnit] *
                resourcesInService.value) /
            (s.functionalUnit.usageDuration * s.functionalUnit.resourceCount);
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

    /** Count of hardware rows missing a mandatory value (reuses hardwareRowValid). */
    const missingMandatoryHardware = computed<number>(
        () => hardware.value.filter((h) => !hardwareRowValid(h)).length,
    );

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

    /** Energy records follow Scope: create a blank record for each datacenter
     *  that has none yet (schema defaults). Gap-fill only — runs on mount and
     *  on datacenter count increase; deleted rows are not re-added by sync. */
    function ensureEnergyRows(): void {
        for (const dc of scope.value.datacenters) {
            if (!energy.value.some((e) => e.datacenterId === dc.id)) {
                energy.value.push(DatacenterEnergySchema.parse({ datacenterId: dc.id }));
            }
        }
    }

    // ── Internal helpers ─────────────────────────────────────────────────────
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
        const parsed = MitsiStateSchema.safeParse(raw);
        if (!parsed.success) return null;
        return sanitizeReferences(parsed.data);
    }

    /** Referential integrity at the data boundary: the schema validates each
     *  record's shape, but a hand-edited/foreign file may reference datacenters
     *  the same file does not define. The UI can never create such rows
     *  (deleteDatacenterGuard blocks deletion while referenced), so sanitize
     *  once here — everything downstream sees a consistent state. */
    function sanitizeReferences(state: MitsiState): MitsiState {
        const ids = new Set(state.scope.datacenters.map((dc) => dc.id));
        return {
            ...state,
            hardware: state.hardware.filter((h) => ids.has(h.datacenterId)),
            energy: state.energy.filter((e) => ids.has(e.datacenterId)),
        };
    }

    function applyState(state: MitsiState): void {
        scope.value = state.scope;
        hardware.value = state.hardware;
        monitoringPeriod.value = state.monitoringPeriod;
        energy.value = state.energy;
        includeSecondHandEmbodied.value = state.includeSecondHandEmbodied;
        includeUnderlyingServices.value = state.includeUnderlyingServices;
        underlyingServices.value = state.underlyingServices;
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
        isSecondHandExcluded,
        rowSubtotal,
        totalEmbodied,
        secondHandExcludedCount,
        totalOperational,
        totalUnderlying,
        totalLifespan,
        resourcesInService,
        perFunctionalUnit,
        blockStatus,
        missingMandatoryHardware,
        loadFromStorage,
        saveToStorage,
        reset,
        exportJson,
        importJson,
        deleteDatacenterGuard,
        ensureEnergyRows,
    };
});

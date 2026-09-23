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
    newHardwareItem,
    MITSI_SCHEMA_VERSION,
    MITSI_STORAGE_KEY,
    type BlockKey,
    type BlockStatus,
    type Datacenter,
    type HardwareItem,
    type MitsiState,
    type MonitoringPeriod,
    type Scope,
    type UnderlyingService,
} from 'src/models/mitsi';
import {
    BoundaryItemDraftSchema,
    DatacenterEnergySchema,
    DatacenterEnergyDraftSchema,
    DatacenterDraftSchema,
    DatacenterGeneralInfoSchema,
    HardwareCategorySchema,
    HardwareItemSchema,
    MitsiStateDraftSchema,
    MitsiStateSchema,
    MonitoringPeriodSchema,
    ScopeSchema,
} from 'src/models/schema';
import {
    calculateFunctionalUnitEmissions,
    calculateOperationalEmissions,
    countResources,
    rowSubtotal,
    sum,
} from 'src/utils/math';

export type DatacenterDeletionBlock = { hardwareRowCount: number };

export type RemoveDatacenterResult =
    | { removed: true }
    | { removed: false; reason: 'not_found' }
    | { removed: false; reason: 'in_use'; usage: DatacenterDeletionBlock };

export type DatacenterOperationalResult = {
    datacenterId: string;
    co2Period: number | null;
    co2Lifespan: number | null;
};

export type EnergyCoverage = {
    completeDatacenters: number;
    totalDatacenters: number;
    isComplete: boolean;
};

export const useMitsiStore = defineStore('mitsi', () => {
    const initial = emptyMitsiState();
    const scope = ref<Scope>(initial.scope);
    const hardware = ref<HardwareItem[]>([]);
    const monitoringPeriod = ref<MonitoringPeriod>({ ...initial.monitoringPeriod });
    const datacenters = ref<Datacenter[]>(initial.datacenters);
    const includeSecondHandEmbodied = ref(false);
    const includeUnderlyingServices = ref(false);
    const underlyingServices = ref<UnderlyingService[]>([]);
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

    /**
     * Whether a second-hand row is excluded from the embodied total — i.e. it is
     * second-hand AND second-hand embodied emissions are not being accounted for.
     * Single definition of the rule, reused by the getters and the inventory page.
     */
    function isSecondHandExcluded(row: HardwareItem): boolean {
        return row.isSecondHand && !includeSecondHandEmbodied.value;
    }

    /** Embodied emissions (kg CO2-eq), honouring the second-hand setting. */
    const totalEmbodied = computed<number>(() =>
        sum(hardware.value.filter((h) => !isSecondHandExcluded(h)).map(rowSubtotal)),
    );

    /** Count of hardware rows excluded because second-hand & not accounted. */
    const secondHandExcludedCount = computed<number>(
        () => hardware.value.filter(isSecondHandExcluded).length,
    );

    /**
     * Direct v-model edits can be incomplete or invalid until saved. Canonical
     * parsing checks calculation readiness and normalizes cleared optional PUE.
     * Keep unready datacenters visible with unavailable estimates.
     */
    const operationalPerDc = computed<DatacenterOperationalResult[]>(() => {
        const period = MonitoringPeriodSchema.safeParse(monitoringPeriod.value);
        const lifespan = ScopeSchema.shape.lifespanYears.safeParse(scope.value.lifespanYears);
        return datacenters.value.map((dc) => {
            const energy = DatacenterEnergySchema.safeParse(dc.energy);
            if (!energy.success || !period.success) {
                return { datacenterId: dc.id, co2Period: null, co2Lifespan: null };
            }
            return {
                datacenterId: dc.id,
                ...calculateOperationalEmissions({
                    energy: energy.data,
                    monitoringPeriod: period.data,
                    lifespanYears: lifespan.success ? lifespan.data : null,
                }),
            };
        });
    });

    /** Sum available lifespan estimates; no measurements is different from zero. */
    const totalOperational = computed<number | null>(() => {
        const values = operationalPerDc.value
            .map((dc) => dc.co2Lifespan)
            .filter((value): value is number => value !== null);
        return values.length ? sum(values) : null;
    });

    const energyCoverage = computed<EnergyCoverage>(() => {
        const completeDatacenters = operationalPerDc.value.filter(
            (dc) => dc.co2Lifespan !== null,
        ).length;
        const totalDatacenters = datacenters.value.length;
        return {
            completeDatacenters,
            totalDatacenters,
            isComplete:
                isScopeValid.value &&
                totalDatacenters > 0 &&
                completeDatacenters === totalDatacenters,
        };
    });

    /** Underlying services emissions over the lifespan (kg CO2-eq). */
    const totalUnderlying = computed<number>(() =>
        includeUnderlyingServices.value
            ? sum(underlyingServices.value.map((service) => service.co2EstimateKg || 0))
            : 0,
    );

    const hasEmbodiedContribution = computed(() =>
        hardware.value.some(
            (row) =>
                HardwareItemSchema.shape.quantity.safeParse(row.quantity).success &&
                HardwareItemSchema.shape.impactManufacturingDistributionEol.safeParse(
                    row.impactManufacturingDistributionEol,
                ).success,
        ),
    );

    const totalLifespan = computed<number | null>(() => {
        const hasUnderlying =
            includeUnderlyingServices.value && underlyingServices.value.length > 0;
        if (!hasEmbodiedContribution.value && totalOperational.value === null && !hasUnderlying)
            return null;
        const total = totalEmbodied.value + (totalOperational.value ?? 0) + totalUnderlying.value;
        return Number.isFinite(total) ? total : null;
    });

    /** Count only accounted hardware, honoring the second-hand setting. */
    const resourcesInService = computed<number>(() =>
        countResources(
            hardware.value.filter((row) => !isSecondHandExcluded(row)),
            scope.value.functionalUnit.resourceType,
        ),
    );

    /** Validate draft inputs before calling the pure functional-unit calculation. */
    const perFunctionalUnit = computed<number | null>(() => {
        const functionalUnit = ScopeSchema.shape.functionalUnit.safeParse(
            scope.value.functionalUnit,
        );
        const lifespan = ScopeSchema.shape.lifespanYears.safeParse(scope.value.lifespanYears);
        const resources = resourcesInService.value;
        const total = totalLifespan.value;
        if (!functionalUnit.success || !lifespan.success || total === null) return null;
        if (!Number.isFinite(resources) || resources <= 0 || functionalUnit.data.usageDuration <= 0)
            return null;

        return calculateFunctionalUnitEmissions({
            totalEmissions: total,
            lifespanYears: lifespan.data,
            resourcesInService: resources,
            functionalUnit: functionalUnit.data,
        });
    });

    /** Embodied rows grouped by category for the Results tables (spec: one table
     *  per category used): per-element CO₂ and per-row cumulated CO₂; rows whose
     *  second-hand embodied emissions are not accounted are flagged `excluded`
     *  so the page can strike them through. Category values come from the schema
     *  enum at runtime — a new schema category automatically appears in Results. */
    const embodiedByCategory = computed(() =>
        HardwareCategorySchema.options
            .map((category) => {
                const rows = hardware.value
                    .filter((h) => h.category === category)
                    .map((h) => ({
                        id: h.id,
                        name: h.name,
                        description: h.description ?? '',
                        number: h.quantity,
                        co2PerUnit: h.impactManufacturingDistributionEol,
                        co2RowTotal: rowSubtotal(h),
                        excluded: isSecondHandExcluded(h),
                    }));
                return {
                    category,
                    rows,
                    categoryTotal: sum(
                        rows.filter((row) => !row.excluded).map((row) => row.co2RowTotal),
                    ),
                };
            })
            .filter((g) => g.rows.length > 0),
    );

    /** kg CO2-eq per ONE resource of the FU fleet over the whole lifespan
     *  (Excel Results: total ÷ resourcesInService). */
    const totalPerResource = computed<number | null>(() =>
        totalLifespan.value !== null &&
        Number.isFinite(resourcesInService.value) &&
        resourcesInService.value > 0
            ? totalLifespan.value / resourcesInService.value
            : null,
    );

    /** True when a hardware row carries every field needed for the totals. */
    const hardwareRowValid = (h: HardwareItem): boolean => HardwareItemSchema.safeParse(h).success;

    /** Count of hardware rows missing a mandatory value (reuses hardwareRowValid). */
    const missingMandatoryHardware = computed<number>(
        () => hardware.value.filter((h) => !hardwareRowValid(h)).length,
    );

    const hardwareRowsComplete = computed<boolean>(
        () => hardware.value.length > 0 && hardware.value.every(hardwareRowValid),
    );
    const resultsComplete = computed(
        () => isScopeValid.value && hardwareRowsComplete.value && energyCoverage.value.isComplete,
    );
    const resultsPartial = computed(() => totalLifespan.value !== null && !resultsComplete.value);

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

    /** Per-block completion, reflecting mandatory-field completion, not row presence. */
    const blockStatus = computed<Record<BlockKey, BlockStatus>>(() => ({
        scope: isScopeValid.value ? 'complete' : 'not_started',
        inventory:
            hardware.value.length === 0
                ? 'not_started'
                : hardwareRowsComplete.value && isScopeValid.value
                  ? 'complete'
                  : 'partial',
        energy: energyCoverage.value.isComplete
            ? 'complete'
            : energyStarted.value
              ? 'partial'
              : 'not_started',
        results: resultsComplete.value
            ? 'complete'
            : totalLifespan.value !== null
              ? 'partial'
              : 'not_started',
    }));

    // ── Persistence (client-side, Quasar LocalStorage) ───────────────────────
    function loadFromStorage(): void {
        const state = parseState(LocalStorage.getItem(MITSI_STORAGE_KEY));
        if (state) applyState(state);
    }

    function saveToStorage(): boolean {
        const parsed = MitsiStateDraftSchema.safeParse(buildState());
        if (!parsed.success) return false;
        try {
            LocalStorage.set(MITSI_STORAGE_KEY, parsed.data);
            savedAt.value = Date.now();
            return true;
        } catch {
            return false;
        }
    }

    function reset(): void {
        const blank = emptyMitsiState();
        scope.value = blank.scope;
        hardware.value = [];
        monitoringPeriod.value = blank.monitoringPeriod;
        datacenters.value = [];
        includeSecondHandEmbodied.value = false;
        includeUnderlyingServices.value = false;
        underlyingServices.value = [];
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
            LocalStorage.set(MITSI_STORAGE_KEY, state);
            applyState(state);
            savedAt.value = Date.now();
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
        hardware.value.push(newHardwareItem());
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
        // Creation defaults must not make unversioned or older persisted data look current.
        if (!MitsiStateSchema.pick({ schemaVersion: true }).safeParse(raw).success) return null;
        const parsed = MitsiStateDraftSchema.safeParse(raw);
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
        isSecondHandExcluded,
        totalEmbodied,
        secondHandExcludedCount,
        totalOperational,
        energyCoverage,
        resultsPartial,
        totalUnderlying,
        totalLifespan,
        resourcesInService,
        perFunctionalUnit,
        operationalPerDc,
        embodiedByCategory,
        totalPerResource,
        blockStatus,
        missingMandatoryHardware,
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

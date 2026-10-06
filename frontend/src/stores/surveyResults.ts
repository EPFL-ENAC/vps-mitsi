/** Reactive assessment calculations derived from the editable survey data. */
import { defineStore } from 'pinia';
import { computed } from 'vue';
import type { Datacenter, HardwareItem } from 'src/models/mitsi';
import {
    DatacenterEnergySchema,
    HardwareCategorySchema,
    HardwareItemSchema,
    MonitoringPeriodSchema,
    ScopeSchema,
    type HardwareCategory,
} from 'src/models/schema';
import {
    calculateFunctionalUnitEmissions,
    calculateOperationalEmissions,
    countResources,
    rowSubtotal,
    sum,
} from 'src/utils/math';
import { useSurveyDataStore } from 'src/stores/surveyData';

export type DatacenterOperationalResult = {
    datacenter: Datacenter;
    co2Period: number | null;
    co2Lifespan: number | null;
};

export type EnergyCoverage = {
    completeDatacenters: number;
    totalDatacenters: number;
    isComplete: boolean;
};

/** One hardware row as returned by embodiedByCategory (Results tables + charts). */
export interface EmbodiedRow {
    id: string;
    name: string;
    description: string;
    number: number;
    co2PerUnit: number;
    co2RowTotal: number;
    excluded: boolean;
}

/** One category group: rows plus the accounted total. */
export interface EmbodiedGroup {
    category: HardwareCategory;
    rows: EmbodiedRow[];
    categoryTotal: number;
}

export const useSurveyResultsStore = defineStore('surveyResults', () => {
    const data = useSurveyDataStore();
    const rowsCount = computed(() => data.hardware.length);
    const elementsCount = computed(() => sum(data.hardware.map((row) => row.quantity || 0)));

    /**
     * Whether a second-hand row is excluded from the embodied total — i.e. it is
     * second-hand AND second-hand embodied emissions are not being accounted for.
     * Single definition of the rule, reused by the getters and the inventory page.
     */
    function isSecondHandExcluded(row: HardwareItem): boolean {
        return row.isSecondHand && !data.includeSecondHandEmbodied;
    }

    /** Embodied emissions (kg CO2-eq), honouring the second-hand setting. */
    const totalEmbodied = computed<number>(() =>
        sum(data.hardware.filter((h) => !isSecondHandExcluded(h)).map(rowSubtotal)),
    );

    /** Count of hardware rows excluded because second-hand & not accounted. */
    const secondHandExcludedCount = computed<number>(
        () => data.hardware.filter(isSecondHandExcluded).length,
    );

    /**
     * Direct v-model edits can be incomplete or invalid until saved. Canonical
     * parsing checks calculation readiness and normalizes cleared optional PUE.
     * Keep unready datacenters visible with unavailable estimates.
     */
    const operationalPerDc = computed<DatacenterOperationalResult[]>(() => {
        const period = MonitoringPeriodSchema.safeParse(data.monitoringPeriod);
        const lifespan = ScopeSchema.shape.lifespanYears.safeParse(data.scope.lifespanYears);
        return data.datacenters.map((dc) => {
            const energy = DatacenterEnergySchema.safeParse(dc.energy);
            if (!energy.success || !period.success) {
                return { datacenter: dc, co2Period: null, co2Lifespan: null };
            }
            return {
                datacenter: dc,
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
        const totalDatacenters = data.datacenters.length;
        return {
            completeDatacenters,
            totalDatacenters,
            isComplete:
                data.isScopeValid &&
                totalDatacenters > 0 &&
                completeDatacenters === totalDatacenters,
        };
    });

    /** Underlying services emissions over the lifespan (kg CO2-eq). */
    const totalUnderlying = computed<number>(() =>
        data.includeUnderlyingServices
            ? sum(data.underlyingServices.map((service) => service.co2EstimateKg || 0))
            : 0,
    );

    const hasEmbodiedContribution = computed(() =>
        data.hardware.some(
            (row) =>
                HardwareItemSchema.shape.quantity.safeParse(row.quantity).success &&
                HardwareItemSchema.shape.impactManufacturingDistributionEol.safeParse(
                    row.impactManufacturingDistributionEol,
                ).success,
        ),
    );

    const totalLifespan = computed<number | null>(() => {
        const hasUnderlying = data.includeUnderlyingServices && data.underlyingServices.length > 0;
        if (!hasEmbodiedContribution.value && totalOperational.value === null && !hasUnderlying)
            return null;
        const total = totalEmbodied.value + (totalOperational.value ?? 0) + totalUnderlying.value;
        return Number.isFinite(total) ? total : null;
    });

    /** Count only accounted hardware, honoring the second-hand setting. */
    const resourcesInService = computed<number>(() =>
        countResources(
            data.hardware.filter((row) => !isSecondHandExcluded(row)),
            data.scope.functionalUnit.resourceType,
        ),
    );

    /** Validate draft inputs before calling the pure functional-unit calculation. */
    const perFunctionalUnit = computed<number | null>(() => {
        const functionalUnit = ScopeSchema.shape.functionalUnit.safeParse(
            data.scope.functionalUnit,
        );
        const lifespan = ScopeSchema.shape.lifespanYears.safeParse(data.scope.lifespanYears);
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
    const embodiedByCategory = computed<EmbodiedGroup[]>(() =>
        HardwareCategorySchema.options
            .map((category) => {
                const rows = data.hardware
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

    return {
        isSecondHandExcluded,
        rowSubtotal,
        totalEmbodied,
        secondHandExcludedCount,
        totalOperational,
        energyCoverage,
        totalUnderlying,
        totalLifespan,
        resourcesInService,
        perFunctionalUnit,
        operationalPerDc,
        embodiedByCategory,
        totalPerResource,
        rowsCount,
        elementsCount,
    };
});

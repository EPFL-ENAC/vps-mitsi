/** Reactive assessment calculations derived from the editable survey data. */
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { z } from 'zod';
import {
    DatacenterEnergySchema,
    type Datacenter,
    type PueInclusion,
} from 'src/models/Datacenter/schema';
import {
    type HardwareItem,
    HardwareCategorySchema,
    HardwareItemSchema,
    HardwareImpactMeasurementsSchema,
    HardwareMemoryMeasurementsSchema,
    HardwareStorageMeasurementsSchema,
    HardwareCpuFleetMeasurementsSchema,
    HardwareGpuFleetMeasurementsSchema,
    type HardwareCategory,
} from 'src/models/HardwareItem/schema';
import { UnderlyingServiceSchema } from 'src/models/UnderlyingService/schema';
import { MonitoringPeriodSchema } from 'src/models/MonitoringPeriod/schema';
import { ScopeSchema } from 'src/models/Scope/schema';
import { calculatePeriodEmissions } from 'src/models/Datacenter/utils';
import {
    rowSubtotal as calculateRowSubtotal,
    memoryTotal as calculateMemoryTotal,
    storageTotal as calculateStorageTotal,
    cpuFleetTotal,
    gpuFleetTotal,
} from 'src/models/HardwareItem/utils';
import { unitsPerYear } from 'src/models/TimeUnit/utils';
import { sum } from 'src/utils/math';
import { useSurveyDataStore } from 'src/stores/surveyData';
import type { ComputationResult } from 'src/types/computation';
import {
    successfulComputation,
    failedComputation,
    partiallySuccessfulComputation,
} from 'src/utils/computation';

export type DatacenterOperationalResult = {
    datacenter: Datacenter;
    pueInclusion: PueInclusion;
    co2Period: number | null;
    co2Lifespan: number | null;
};

export type EnergyCoverage = {
    completeDatacenters: number;
    totalDatacenters: number;
    isComplete: boolean;
};

export interface EmbodiedRow {
    id: string;
    name: string;
    description: string;
    number: number | null;
    co2PerUnit: number | null;
    co2RowTotal: number | null;
    excluded: boolean;
}

export interface EmbodiedGroup {
    category: HardwareCategory;
    rows: EmbodiedRow[];
    categoryTotal: number | null;
}

const NumberResultSchema = z.number();
const PositiveResultSchema = z.number().positive();
const CompleteValuesSchema = z.array(NumberResultSchema);
const UnderlyingEstimatesSchema = z.array(UnderlyingServiceSchema.shape.co2EstimateKg);
const HardwareQuantitySchema = HardwareItemSchema.pick({ quantity: true });
const HardwareUnitImpactSchema = HardwareItemSchema.pick({
    impactManufacturingDistributionEol: true,
});

/** Finite arithmetic results only; overflow is unavailable rather than a measurement. */
function numberResult(value: unknown): number | null {
    const parsed = NumberResultSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}

/** Validation belongs to the store; calculation functions receive trusted inputs. */
function validatedCalculation<S extends z.ZodType>(
    schema: S,
    input: unknown,
    calculate: (input: z.output<S>) => number,
): number | null {
    const parsed = schema.safeParse(input);
    return parsed.success ? numberResult(calculate(parsed.data)) : null;
}

/** An empty collection sums to zero; an incomplete collection has no total yet. */
function completeSum(values: readonly (number | null)[]): number | null {
    const parsed = CompleteValuesSchema.safeParse(values);
    return parsed.success ? numberResult(sum(parsed.data)) : null;
}

function pueInclusion(value: Datacenter['energy']['pue']): PueInclusion {
    const parsed = DatacenterEnergySchema.shape.pue.safeParse(value);
    if (!parsed.success) return { status: 'unavailable' };
    return parsed.data === null
        ? { status: 'omitted' }
        : { status: 'included', value: parsed.data };
}

export const useSurveyResultsStore = defineStore('surveyResults', () => {
    const data = useSurveyDataStore();
    const rowsCount = computed(() => data.hardware.length);
    const elementsCount = computed<ComputationResult<number, HardwareItem>>(() => {
        let total = 0;
        // Each error describes the ignored row at the same index.
        const inputErrors: z.ZodError[] = [];
        const ignoredInputs: HardwareItem[] = [];

        for (const row of data.hardware) {
            const quantity = hardwareQuantity(row);

            if (quantity.success === 'failure') {
                inputErrors.push(...quantity.inputErrors);
                ignoredInputs.push(row);
            } else {
                total += quantity.result;
            }
        }

        if (ignoredInputs.length === 0) {
            return successfulComputation(total);
        }

        if (ignoredInputs.length === data.hardware.length) {
            return { ...failedComputation(inputErrors), ignoredInputs };
        }

        return partiallySuccessfulComputation(total, inputErrors, ignoredInputs);
    });

    function hardwareQuantity(row: HardwareItem): ComputationResult<number> {
        const parsed = HardwareQuantitySchema.safeParse(row);
        return parsed.success
            ? successfulComputation(parsed.data.quantity)
            : failedComputation([parsed.error]);
    }

    function hardwareImpact(row: HardwareItem): ComputationResult<number> {
        const parsed = HardwareUnitImpactSchema.safeParse(row);
        return parsed.success
            ? successfulComputation(parsed.data.impactManufacturingDistributionEol)
            : failedComputation([parsed.error]);
    }

    function rowSubtotal(row: HardwareItem): ComputationResult<number> {
        const parsed = HardwareImpactMeasurementsSchema.safeParse(row);
        return parsed.success
            ? successfulComputation(calculateRowSubtotal(parsed.data))
            : failedComputation([parsed.error]);
    }

    function memoryTotal(row: HardwareItem): ComputationResult<number> {
        const parsed = HardwareMemoryMeasurementsSchema.safeParse(row);
        return parsed.success
            ? successfulComputation(calculateMemoryTotal(parsed.data))
            : failedComputation([parsed.error]);
    }

    function storageTotal(row: HardwareItem): ComputationResult<number> {
        const parsed = HardwareStorageMeasurementsSchema.safeParse(row);
        return parsed.success
            ? successfulComputation(calculateStorageTotal(parsed.data))
            : failedComputation([parsed.error]);
    }

    function isSecondHandExcluded(row: HardwareItem): boolean {
        return row.isSecondHand && !data.includeSecondHandEmbodied;
    }

    const totalEmbodied = computed<ComputationResult<number, HardwareItem>>(() => {
        const rows = data.hardware.filter((row) => !isSecondHandExcluded(row));
        let total = 0;
        // Each error describes the ignored row at the same index.
        const inputErrors: z.ZodError[] = [];
        const ignoredInputs: HardwareItem[] = [];

        for (const row of rows) {
            const subtotal = rowSubtotal(row);

            if (subtotal.success === 'failure') {
                inputErrors.push(...subtotal.inputErrors);
                ignoredInputs.push(row);
            } else {
                total += subtotal.result;
            }
        }

        if (ignoredInputs.length === 0) {
            return successfulComputation(total);
        }

        if (ignoredInputs.length === rows.length) {
            return { ...failedComputation(inputErrors), ignoredInputs };
        }

        return partiallySuccessfulComputation(total, inputErrors, ignoredInputs);
    });

    const secondHandExcludedCount = computed(
        () => data.hardware.filter(isSecondHandExcluded).length,
    );

    /** Keep unready datacenters visible; preserve existing operational partial aggregation. */
    const operationalPerDc = computed<DatacenterOperationalResult[]>(() => {
        const period = MonitoringPeriodSchema.safeParse(data.monitoringPeriod);
        const lifespan = ScopeSchema.shape.lifespanYears.safeParse(data.scope.lifespanYears);
        return data.datacenters.map((dc) => {
            const energy = DatacenterEnergySchema.safeParse(dc.energy);
            const pue = pueInclusion(dc.energy.pue);
            if (!energy.success || !period.success) {
                return { datacenter: dc, pueInclusion: pue, co2Period: null, co2Lifespan: null };
            }
            const co2Period = numberResult(calculatePeriodEmissions(energy.data));
            const monitoringYears = PositiveResultSchema.safeParse(
                period.data.value / unitsPerYear(period.data.unit),
            );
            return {
                datacenter: dc,
                pueInclusion: pue,
                co2Period,
                co2Lifespan:
                    co2Period !== null && lifespan.success && monitoringYears.success
                        ? numberResult(co2Period * (lifespan.data / monitoringYears.data))
                        : null,
            };
        });
    });

    const totalOperational = computed(() => {
        const values = operationalPerDc.value
            .map((dc) => dc.co2Lifespan)
            .filter((value): value is number => value !== null);
        return values.length ? numberResult(sum(values)) : null;
    });

    const energyCoverage = computed<EnergyCoverage>(() => {
        const completeDatacenters = operationalPerDc.value.filter(
            (dc) => dc.co2Lifespan !== null,
        ).length;
        const totalDatacenters = data.datacenters.length;
        return {
            completeDatacenters,
            totalDatacenters,
            isComplete: data.isScopeValid && completeDatacenters === totalDatacenters,
        };
    });

    const totalUnderlying = computed(() =>
        data.includeUnderlyingServices
            ? validatedCalculation(
                  UnderlyingEstimatesSchema,
                  data.underlyingServices.map((service) => service.co2EstimateKg),
                  sum,
              )
            : 0,
    );

    const hasEmbodiedContribution = computed(() =>
        data.hardware.some((row) => rowSubtotal(row).result !== null),
    );

    const totalLifespan = computed(() => {
        const embodied = totalEmbodied.value;
        const underlying = totalUnderlying.value;
        const operational = totalOperational.value;
        if (embodied.success !== 'success' || underlying === null) return null;
        const hasUnderlying = data.includeUnderlyingServices && data.underlyingServices.length > 0;
        if (!hasEmbodiedContribution.value && operational === null && !hasUnderlying) return null;
        // Preserve existing operational partial behavior until the next sweep.
        return numberResult(embodied.result + (operational ?? 0) + underlying);
    });

    const resourcesInService = computed(() => {
        // Preserve workbook selection: CPU fleet for CPU units, GPU fleet otherwise.
        const cpu = data.scope.functionalUnit.resourceType.trim().toLowerCase() === 'cpu';
        return completeSum(
            data.hardware
                .filter((row) => !isSecondHandExcluded(row))
                .map((row) =>
                    cpu
                        ? validatedCalculation(
                              HardwareCpuFleetMeasurementsSchema,
                              row,
                              cpuFleetTotal,
                          )
                        : validatedCalculation(
                              HardwareGpuFleetMeasurementsSchema,
                              row,
                              gpuFleetTotal,
                          ),
                ),
        );
    });

    const perFunctionalUnit = computed(() => {
        const functionalUnit = ScopeSchema.shape.functionalUnit.safeParse(
            data.scope.functionalUnit,
        );
        const lifespan = ScopeSchema.shape.lifespanYears.safeParse(data.scope.lifespanYears);
        const resources = PositiveResultSchema.safeParse(resourcesInService.value);
        const total = totalLifespan.value;
        if (!functionalUnit.success || !lifespan.success || !resources.success || total === null)
            return null;
        const fu = functionalUnit.data;
        const uses = PositiveResultSchema.safeParse(
            (lifespan.data * unitsPerYear(fu.timeUnit) * resources.data) /
                (fu.usageDuration * fu.resourceCount),
        );
        return uses.success ? numberResult(total / uses.data) : null;
    });

    const embodiedByCategory = computed<EmbodiedGroup[]>(() =>
        HardwareCategorySchema.options
            .map((category) => {
                const rows = data.hardware
                    .filter((row) => row.category === category)
                    .map((row) => ({
                        id: row.id,
                        name: row.name,
                        description: row.description ?? '',
                        number: hardwareQuantity(row).result,
                        co2PerUnit: hardwareImpact(row).result,
                        co2RowTotal: rowSubtotal(row).result,
                        excluded: isSecondHandExcluded(row),
                    }));
                return {
                    category,
                    rows,
                    categoryTotal: completeSum(
                        rows.filter((row) => !row.excluded).map((row) => row.co2RowTotal),
                    ),
                };
            })
            .filter((group) => group.rows.length > 0),
    );

    const totalPerResource = computed(() => {
        const resources = PositiveResultSchema.safeParse(resourcesInService.value);
        return totalLifespan.value !== null && resources.success
            ? numberResult(totalLifespan.value / resources.data)
            : null;
    });

    return {
        isSecondHandExcluded,
        hardwareImpact,
        rowSubtotal,
        memoryTotal,
        storageTotal,
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

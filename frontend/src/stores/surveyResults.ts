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
    const elementsCount = computed(() =>
        completeSum(data.hardware.map((row) => hardwareQuantity(row))),
    );

    function hardwareQuantity(row: HardwareItem): number | null {
        return validatedCalculation(
            HardwareItemSchema.shape.quantity,
            row.quantity,
            (value) => value,
        );
    }

    function hardwareImpact(row: HardwareItem): number | null {
        return validatedCalculation(
            HardwareItemSchema.shape.impactManufacturingDistributionEol,
            row.impactManufacturingDistributionEol,
            (value) => value,
        );
    }

    function rowSubtotal(row: HardwareItem): number | null {
        return validatedCalculation(HardwareImpactMeasurementsSchema, row, calculateRowSubtotal);
    }

    function memoryTotal(row: HardwareItem): number | null {
        return validatedCalculation(HardwareMemoryMeasurementsSchema, row, calculateMemoryTotal);
    }

    function storageTotal(row: HardwareItem): number | null {
        return validatedCalculation(HardwareStorageMeasurementsSchema, row, calculateStorageTotal);
    }

    function isSecondHandExcluded(row: HardwareItem): boolean {
        return row.isSecondHand && !data.includeSecondHandEmbodied;
    }

    const totalEmbodied = computed(() =>
        completeSum(data.hardware.filter((row) => !isSecondHandExcluded(row)).map(rowSubtotal)),
    );

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
        data.hardware.some((row) => rowSubtotal(row) !== null),
    );

    const totalLifespan = computed(() => {
        const embodied = totalEmbodied.value;
        const underlying = totalUnderlying.value;
        const operational = totalOperational.value;
        if (embodied === null || underlying === null) return null;
        const hasUnderlying = data.includeUnderlyingServices && data.underlyingServices.length > 0;
        if (!hasEmbodiedContribution.value && operational === null && !hasUnderlying) return null;
        // Preserve existing operational partial behavior until the next sweep.
        return numberResult(embodied + (operational ?? 0) + underlying);
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
                        number: hardwareQuantity(row),
                        co2PerUnit: hardwareImpact(row),
                        co2RowTotal: rowSubtotal(row),
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

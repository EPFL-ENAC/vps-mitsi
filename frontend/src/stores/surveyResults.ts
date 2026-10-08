/** Reactive assessment calculations derived from the editable survey data. */
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { z } from 'zod';
import {
    DatacenterSchema,
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
import {
    UnderlyingServiceSchema,
    type UnderlyingService,
} from 'src/models/UnderlyingService/schema';
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
    co2Period: number;
    co2Lifespan: number;
};

export type EnergyCoverage = {
    completeDatacenters: number;
    totalDatacenters: number;
    isComplete: boolean;
};

export type EmissionInput = HardwareItem | Datacenter | UnderlyingService;

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
    categoryTotal: ComputationResult<number, HardwareItem>;
}

const ResourceCountSchema = z.object({ resourcesInService: z.number().positive() });
const FunctionalUnitContextSchema = z.object({
    scope: ScopeSchema.pick({ functionalUnit: true, lifespanYears: true }),
});
const UnderlyingEstimateSchema = UnderlyingServiceSchema.pick({ co2EstimateKg: true });
const HardwareQuantitySchema = HardwareItemSchema.pick({ quantity: true });
const HardwareUnitImpactSchema = HardwareItemSchema.pick({
    impactManufacturingDistributionEol: true,
});
const OperationalContextSchema = z.object({
    monitoringPeriod: MonitoringPeriodSchema,
    scope: ScopeSchema.pick({ lifespanYears: true }),
});
const OperationalDatacenterSchema = DatacenterSchema.pick({ energy: true });

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

    function embodiedTotal(
        hardware: readonly HardwareItem[],
    ): ComputationResult<number, HardwareItem> {
        const rows = hardware.filter((row) => !isSecondHandExcluded(row));
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
    }

    const totalEmbodied = computed(() => embodiedTotal(data.hardware));

    const secondHandExcludedCount = computed(
        () => data.hardware.filter(isSecondHandExcluded).length,
    );

    const operationalPerDc = computed<ComputationResult<DatacenterOperationalResult[], Datacenter>>(
        () => {
            const context = OperationalContextSchema.safeParse({
                monitoringPeriod: data.monitoringPeriod,
                scope: data.scope,
            });
            if (!context.success) return failedComputation([context.error]);

            const { monitoringPeriod, scope } = context.data;
            const monitoringYears = monitoringPeriod.value / unitsPerYear(monitoringPeriod.unit);
            const rows: DatacenterOperationalResult[] = [];
            // Each error describes the ignored datacenter at the same index.
            const inputErrors: z.ZodError[] = [];
            const ignoredInputs: Datacenter[] = [];

            for (const datacenter of data.datacenters) {
                const parsed = OperationalDatacenterSchema.safeParse(datacenter);
                if (!parsed.success) {
                    inputErrors.push(parsed.error);
                    ignoredInputs.push(datacenter);
                    continue;
                }

                const co2Period = calculatePeriodEmissions(parsed.data.energy);
                rows.push({
                    datacenter,
                    pueInclusion: pueInclusion(parsed.data.energy.pue),
                    co2Period,
                    co2Lifespan: co2Period * (scope.lifespanYears / monitoringYears),
                });
            }

            if (ignoredInputs.length === 0) return successfulComputation(rows);

            if (rows.length === 0) {
                return { ...failedComputation(inputErrors), ignoredInputs };
            }

            return partiallySuccessfulComputation(rows, inputErrors, ignoredInputs);
        },
    );

    const totalOperational = computed<ComputationResult<number, Datacenter>>(() => {
        const source = operationalPerDc.value;
        if (source.success === 'failure') return source;
        return { ...source, result: sum(source.result.map((row) => row.co2Lifespan)) };
    });

    const energyCoverage = computed<EnergyCoverage>(() => {
        const completeDatacenters = operationalPerDc.value.result?.length ?? 0;
        const totalDatacenters = data.datacenters.length;
        return {
            completeDatacenters,
            totalDatacenters,
            isComplete: data.isScopeValid && completeDatacenters === totalDatacenters,
        };
    });

    const totalUnderlying = computed<ComputationResult<number, UnderlyingService>>(() => {
        if (!data.includeUnderlyingServices) return successfulComputation(0);

        let total = 0;
        const inputErrors: z.ZodError[] = [];
        const ignoredInputs: UnderlyingService[] = [];

        for (const service of data.underlyingServices) {
            const parsed = UnderlyingEstimateSchema.safeParse(service);
            if (!parsed.success) {
                inputErrors.push(parsed.error);
                ignoredInputs.push(service);
            } else {
                total += parsed.data.co2EstimateKg;
            }
        }

        if (ignoredInputs.length === 0) return successfulComputation(total);
        if (ignoredInputs.length === data.underlyingServices.length) {
            return { ...failedComputation(inputErrors), ignoredInputs };
        }
        return partiallySuccessfulComputation(total, inputErrors, ignoredInputs);
    });

    const totalLifespan = computed<ComputationResult<number, EmissionInput>>(() => {
        // Empty or disabled sources do not provide measurements or make the total partial.
        const contributions: ComputationResult<number, EmissionInput>[] = [];
        if (data.hardware.some((row) => !isSecondHandExcluded(row))) {
            contributions.push(totalEmbodied.value);
        }
        if (data.datacenters.length > 0) contributions.push(totalOperational.value);
        if (data.includeUnderlyingServices && data.underlyingServices.length > 0) {
            contributions.push(totalUnderlying.value);
        }

        let total = 0;
        let availableContributions = 0;
        const inputErrors: z.ZodError[] = [];
        const ignoredInputs: EmissionInput[] = [];
        for (const contribution of contributions) {
            inputErrors.push(...contribution.inputErrors);
            ignoredInputs.push(...contribution.ignoredInputs);
            if (contribution.success !== 'failure') {
                total += contribution.result;
                availableContributions++;
            }
        }

        if (availableContributions === 0) {
            return { ...failedComputation(inputErrors), ignoredInputs };
        }
        if (contributions.every((contribution) => contribution.success === 'success')) {
            return successfulComputation(total);
        }
        return partiallySuccessfulComputation(total, inputErrors, ignoredInputs);
    });

    const resourcesInService = computed<ComputationResult<number, HardwareItem>>(() => {
        // Preserve workbook selection: CPU fleet for CPU units, GPU fleet otherwise.
        const cpu = data.scope.functionalUnit.resourceType.trim().toLowerCase() === 'cpu';
        const rows = data.hardware.filter((row) => !isSecondHandExcluded(row));
        let total = 0;
        const inputErrors: z.ZodError[] = [];
        const ignoredInputs: HardwareItem[] = [];

        for (const row of rows) {
            if (cpu) {
                const parsed = HardwareCpuFleetMeasurementsSchema.safeParse(row);
                if (!parsed.success) {
                    inputErrors.push(parsed.error);
                    ignoredInputs.push(row);
                    continue;
                }
                total += cpuFleetTotal(parsed.data);
            } else {
                const parsed = HardwareGpuFleetMeasurementsSchema.safeParse(row);
                if (!parsed.success) {
                    inputErrors.push(parsed.error);
                    ignoredInputs.push(row);
                    continue;
                }
                total += gpuFleetTotal(parsed.data);
            }
        }

        if (ignoredInputs.length === 0) return successfulComputation(total);
        if (ignoredInputs.length === rows.length) {
            return { ...failedComputation(inputErrors), ignoredInputs };
        }
        return partiallySuccessfulComputation(total, inputErrors, ignoredInputs);
    });

    const perFunctionalUnit = computed<ComputationResult<number, EmissionInput>>(() => {
        const context = FunctionalUnitContextSchema.safeParse({ scope: data.scope });
        const total = totalLifespan.value;
        const resourceTotal = resourcesInService.value;
        const inputErrors = [...total.inputErrors, ...resourceTotal.inputErrors];
        const ignoredInputs: EmissionInput[] = [
            ...total.ignoredInputs,
            ...resourceTotal.ignoredInputs,
        ];
        if (!context.success) inputErrors.push(context.error);
        if (
            !context.success ||
            total.success === 'failure' ||
            resourceTotal.success !== 'success'
        ) {
            return { ...failedComputation(inputErrors), ignoredInputs };
        }

        const resources = ResourceCountSchema.safeParse({
            resourcesInService: resourceTotal.result,
        });
        if (!resources.success) {
            return { ...failedComputation([...inputErrors, resources.error]), ignoredInputs };
        }
        const { functionalUnit: fu, lifespanYears } = context.data.scope;
        const uses =
            (lifespanYears * unitsPerYear(fu.timeUnit) * resources.data.resourcesInService) /
            (fu.usageDuration * fu.resourceCount);
        return { ...total, result: total.result / uses };
    });

    const embodiedByCategory = computed<EmbodiedGroup[]>(() =>
        HardwareCategorySchema.options
            .map((category) => {
                const hardware = data.hardware.filter((row) => row.category === category);
                const rows = hardware.map((row) => ({
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
                    categoryTotal: embodiedTotal(hardware),
                };
            })
            .filter((group) => group.rows.length > 0),
    );

    const totalPerResource = computed<ComputationResult<number, EmissionInput>>(() => {
        const total = totalLifespan.value;
        const resourceTotal = resourcesInService.value;
        const inputErrors = [...total.inputErrors, ...resourceTotal.inputErrors];
        const ignoredInputs: EmissionInput[] = [
            ...total.ignoredInputs,
            ...resourceTotal.ignoredInputs,
        ];
        if (total.success === 'failure' || resourceTotal.success !== 'success') {
            return { ...failedComputation(inputErrors), ignoredInputs };
        }
        const resources = ResourceCountSchema.safeParse({
            resourcesInService: resourceTotal.result,
        });
        if (!resources.success) {
            return { ...failedComputation([...inputErrors, resources.error]), ignoredInputs };
        }
        return { ...total, result: total.result / resources.data.resourcesInService };
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

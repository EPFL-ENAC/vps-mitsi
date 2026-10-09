/** Reactive assessment calculations derived from editable survey data; Kg denotes kg CO₂e. */
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { z } from 'zod';
import { DatacenterSchema, type DatacenterDraft } from 'src/models/Datacenter/schema';
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
import {
    calculateDatacenterOperational,
    type DatacenterOperationalResult,
} from 'src/models/Datacenter/computations';
import {
    rowSubtotal as calculateRowSubtotal,
    memoryTotal as calculateMemoryTotal,
    storageTotal as calculateStorageTotal,
    cpuFleetTotal,
    gpuFleetTotal,
} from 'src/models/HardwareItem/computations';
import { timeUnitsPerYear } from 'src/models/TimeUnit/utils';
import { sum } from 'src/utils/math';
import { useSurveyDataStore } from 'src/stores/surveyData';
import { ComputationResult } from 'src/utils/computation';

export type OperationalCalculationCoverage = {
    validDatacenterCount: number;
    totalDatacenterCount: number;
    /** Requires a valid scope and valid operational calculations for every datacenter. */
    isComplete: boolean;
};

export type EmissionInput = HardwareItem | DatacenterDraft | UnderlyingService;

export interface NamedComputation {
    name: string;
    computation: ComputationResult<unknown, unknown>;
}

export interface EmbodiedRow {
    id: string;
    name: string;
    description: string;
    quantity: ComputationResult<number>;
    unitEmbodiedEmissionsKg: ComputationResult<number>;
    rowEmbodiedEmissionsKg: ComputationResult<number>;
    excluded: boolean;
}

export interface EmbodiedGroup {
    category: HardwareCategory;
    rows: EmbodiedRow[];
    totalEmbodiedEmissionsKg: ComputationResult<number, HardwareItem>;
}

// Retain the existing Zod diagnostic path while renaming the public fleet-count result.
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

export const useSurveyResultsStore = defineStore('surveyResults', () => {
    const data = useSurveyDataStore();
    const hardwareRowCount = computed(() => data.hardware.length);
    const hardwareItemCount = computed(() =>
        ComputationResult.bulkValidateAndMap(
            data.hardware,
            HardwareQuantitySchema,
            (input) => input.quantity,
        ).map(sum),
    );

    function hardwareQuantity(row: HardwareItem): ComputationResult<number> {
        return ComputationResult.validateAndMap(
            HardwareQuantitySchema,
            row,
            (input) => input.quantity,
        );
    }

    function hardwareUnitEmbodiedEmissionsKg(row: HardwareItem): ComputationResult<number> {
        return ComputationResult.validateAndMap(
            HardwareUnitImpactSchema,
            row,
            (input) => input.impactManufacturingDistributionEol,
        );
    }

    /** Embodied emissions for the entire row, including its hardware quantity. */
    function hardwareRowEmbodiedEmissionsKg(row: HardwareItem): ComputationResult<number> {
        return ComputationResult.validateAndMap(
            HardwareImpactMeasurementsSchema,
            row,
            calculateRowSubtotal,
        );
    }

    /** Aggregate memory components within one hardware item, without the row quantity. */
    function hardwareMemoryPerUnitGb(row: HardwareItem): ComputationResult<number> {
        return ComputationResult.validateAndMap(
            HardwareMemoryMeasurementsSchema,
            row,
            calculateMemoryTotal,
        );
    }

    /** Aggregate storage within one item in the input capacity unit, which the schema leaves unspecified. */
    function hardwareStorageCapacityPerUnit(row: HardwareItem): ComputationResult<number> {
        return ComputationResult.validateAndMap(
            HardwareStorageMeasurementsSchema,
            row,
            calculateStorageTotal,
        );
    }

    function isSecondHandExcluded(row: HardwareItem): boolean {
        return row.isSecondHand && !data.includeSecondHandEmbodied;
    }

    function embodiedTotal(
        hardware: readonly HardwareItem[],
    ): ComputationResult<number, HardwareItem> {
        return ComputationResult.bulkValidateAndMap(
            hardware.filter((row) => !isSecondHandExcluded(row)),
            HardwareImpactMeasurementsSchema,
            calculateRowSubtotal,
        ).map(sum);
    }

    const totalEmbodiedEmissionsKg = computed(() => embodiedTotal(data.hardware));

    const excludedSecondHandRowCount = computed(
        () => data.hardware.filter(isSecondHandExcluded).length,
    );

    const datacenterOperationalResults = computed<
        ComputationResult<DatacenterOperationalResult[], DatacenterDraft>
    >(() => {
        const context = OperationalContextSchema.safeParse({
            monitoringPeriod: data.monitoringPeriod,
            scope: data.scope,
        });
        if (!context.success) return ComputationResult.failure([context.error]);

        const { monitoringPeriod, scope } = context.data;
        const monitoringYears = monitoringPeriod.value / timeUnitsPerYear(monitoringPeriod.unit);
        return ComputationResult.bulkValidateAndMap(
            data.datacenters,
            DatacenterSchema,
            (validated) =>
                calculateDatacenterOperational(validated, monitoringYears, scope.lifespanYears),
        );
    });

    const totalOperationalEmissionsKg = computed(() =>
        datacenterOperationalResults.value.map((rows) => sum(rows.map((row) => row.co2Lifespan))),
    );

    const operationalCalculationCoverage = computed<OperationalCalculationCoverage>(() => {
        const validDatacenterCount = datacenterOperationalResults.value.result?.length ?? 0;
        const totalDatacenterCount = data.datacenters.length;
        return {
            validDatacenterCount,
            totalDatacenterCount,
            isComplete: data.isScopeValid && validDatacenterCount === totalDatacenterCount,
        };
    });

    const totalUnderlyingEmissionsKg = computed<ComputationResult<number, UnderlyingService>>(
        () => {
            if (!data.includeUnderlyingServices) return ComputationResult.success(0);
            return ComputationResult.bulkValidateAndMap(
                data.underlyingServices,
                UnderlyingEstimateSchema,
                (input) => input.co2EstimateKg,
            ).map(sum);
        },
    );

    const totalLifespanEmissionsKg = computed<ComputationResult<number, EmissionInput>>(() => {
        // Empty or disabled sources do not provide measurements or make the total partial.
        const contributions: ComputationResult<number, EmissionInput>[] = [];
        if (data.hardware.some((row) => !isSecondHandExcluded(row))) {
            contributions.push(totalEmbodiedEmissionsKg.value);
        }
        if (data.datacenters.length > 0) contributions.push(totalOperationalEmissionsKg.value);
        if (data.includeUnderlyingServices && data.underlyingServices.length > 0) {
            contributions.push(totalUnderlyingEmissionsKg.value);
        }

        return ComputationResult.sum(contributions, { empty: 'failure' });
    });

    /** Selected CPU/GPU fleet count, applying the same second-hand exclusion as embodied emissions. */
    const selectedResourceFleetCount = computed<ComputationResult<number, HardwareItem>>(() => {
        // Preserve workbook selection: CPU fleet for CPU units, GPU fleet otherwise.
        const cpu = data.scope.functionalUnit.resourceType.trim().toLowerCase() === 'cpu';
        const excludedIfNeeded = data.hardware.filter((row) => !isSecondHandExcluded(row));

        if (cpu) {
            return ComputationResult.bulkValidateAndMap(
                excludedIfNeeded,
                HardwareCpuFleetMeasurementsSchema,
                cpuFleetTotal,
            ).map(sum);
        }
        return ComputationResult.bulkValidateAndMap(
            excludedIfNeeded,
            HardwareGpuFleetMeasurementsSchema,
            gpuFleetTotal,
        ).map(sum);
    });

    const emissionsPerFunctionalUnitKg = computed<ComputationResult<number, EmissionInput>>(() => {
        const context = FunctionalUnitContextSchema.safeParse({ scope: data.scope });
        const total = totalLifespanEmissionsKg.value;
        const resourceTotal = selectedResourceFleetCount.value;
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
            return ComputationResult.failure(inputErrors, ignoredInputs);
        }

        const resources = ResourceCountSchema.safeParse({
            resourcesInService: resourceTotal.result,
        });
        if (!resources.success) {
            return ComputationResult.failure([...inputErrors, resources.error], ignoredInputs);
        }
        const { functionalUnit: fu, lifespanYears } = context.data.scope;
        const uses =
            (lifespanYears * timeUnitsPerYear(fu.timeUnit) * resources.data.resourcesInService) /
            (fu.usageDuration * fu.resourceCount);
        return total.map((value) => value / uses);
    });

    function hardwareByCategory(category: HardwareCategory): HardwareItem[] {
        return data.hardware.filter((row) => row.category === category);
    }

    function categoryToEmbodiedGroup(category: HardwareCategory): EmbodiedGroup {
        const hardware = hardwareByCategory(category);
        const rows = hardware.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description ?? '',
            quantity: hardwareQuantity(row),
            unitEmbodiedEmissionsKg: hardwareUnitEmbodiedEmissionsKg(row),
            rowEmbodiedEmissionsKg: hardwareRowEmbodiedEmissionsKg(row),
            excluded: isSecondHandExcluded(row),
        }));

        return {
            category,
            rows,
            totalEmbodiedEmissionsKg: embodiedTotal(hardware),
        };
    }

    const embodiedEmissionsByCategory = computed<EmbodiedGroup[]>(() => {
        return HardwareCategorySchema.options
            .map(categoryToEmbodiedGroup)
            .filter((group) => group.rows.length > 0);
    });

    const lifespanEmissionsPerResourceKg = computed<ComputationResult<number, EmissionInput>>(
        () => {
            const total = totalLifespanEmissionsKg.value;
            const resourceTotal = selectedResourceFleetCount.value;
            const inputErrors = [...total.inputErrors, ...resourceTotal.inputErrors];
            const ignoredInputs: EmissionInput[] = [
                ...total.ignoredInputs,
                ...resourceTotal.ignoredInputs,
            ];
            if (total.success === 'failure' || resourceTotal.success !== 'success') {
                return ComputationResult.failure(inputErrors, ignoredInputs);
            }
            const resources = ResourceCountSchema.safeParse({
                resourcesInService: resourceTotal.result,
            });
            if (!resources.success) {
                return ComputationResult.failure([...inputErrors, resources.error], ignoredInputs);
            }
            return total.map((value) => value / resources.data.resourcesInService);
        },
    );

    function allUnsuccessfulComputations(): NamedComputation[] {
        const computations: NamedComputation[] = [
            { name: 'hardwareItemCount', computation: hardwareItemCount.value },
            {
                name: 'totalEmbodiedEmissionsKg',
                computation: totalEmbodiedEmissionsKg.value,
            },
            {
                name: 'datacenterOperationalResults',
                computation: datacenterOperationalResults.value,
            },
            {
                name: 'totalOperationalEmissionsKg',
                computation: totalOperationalEmissionsKg.value,
            },
            {
                name: 'totalLifespanEmissionsKg',
                computation: totalLifespanEmissionsKg.value,
            },
            {
                name: 'selectedResourceFleetCount',
                computation: selectedResourceFleetCount.value,
            },
            {
                name: 'lifespanEmissionsPerResourceKg',
                computation: lifespanEmissionsPerResourceKg.value,
            },
            {
                name: 'emissionsPerFunctionalUnitKg',
                computation: emissionsPerFunctionalUnitKg.value,
            },
        ];
        return computations.filter(({ computation }) => computation.success !== 'success');
    }

    return {
        allUnsuccessfulComputations,
        isSecondHandExcluded,
        hardwareUnitEmbodiedEmissionsKg,
        hardwareRowEmbodiedEmissionsKg,
        hardwareMemoryPerUnitGb,
        hardwareStorageCapacityPerUnit,
        totalEmbodiedEmissionsKg,
        excludedSecondHandRowCount,
        totalOperationalEmissionsKg,
        operationalCalculationCoverage,
        totalUnderlyingEmissionsKg,
        totalLifespanEmissionsKg,
        selectedResourceFleetCount,
        emissionsPerFunctionalUnitKg,
        datacenterOperationalResults,
        embodiedEmissionsByCategory,
        lifespanEmissionsPerResourceKg,
        hardwareRowCount,
        hardwareItemCount,
    };
});

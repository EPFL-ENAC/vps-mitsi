import { defineStore } from 'pinia';
import { Array2D } from 'src/utils/array2d';
import { Dataset } from 'src/utils/dataset';
import { DepthHeatmap } from 'src/utils/depthHeatmap';
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';

interface MeasurementData {
    timestamps: number[];
}

// Dataset 459
interface WeatherData extends MeasurementData {
    airTemperature: number[];
    irradiance: number[];
    windSpeed: number[];
    windDirectionDegrees: number[];
    precipitation: number[];
}

// Dataset 885
interface BuoyData extends MeasurementData {
    height: number[];
}

// Dataset 448
interface LakeData extends MeasurementData {
    surfaceTemperature: number[];
    temperatureOverDepth: DepthHeatmap;
}

// Dataset 875
interface AlgaeData extends MeasurementData {
    chlorophyllAOverDepth: DepthHeatmap;
}

interface LexploreDatasetStoreOptions {
    refreshIntervalMs?: number;
    datasetMaxAgeMs?: number;
}

function makeLexploreDatasetStore<T>(
    id: number,
    extractData: (d: Dataset) => Promise<T>,
    options?: LexploreDatasetStoreOptions,
) {
    options = {
        refreshIntervalMs: 10_000,
        datasetMaxAgeMs: 60_000,
        ...options,
    };

    return defineStore(`lexplore-dataset-${id}`, () => {
        const dataset = shallowRef<Dataset | null>(null);
        const data = ref<T | null>(null);
        const loading = ref(false);
        const lastPullTimestamp = ref<number | null>(null);
        const error = ref<Error | null>(null);

        async function pullDataset() {
            loading.value = true;

            try {
                if (
                    !dataset.value ||
                    Date.now() - (lastPullTimestamp.value ?? 0) > options!.datasetMaxAgeMs!
                ) {
                    console.log(`Dataset.fromId ${id}...`);
                    dataset.value = await Dataset.fromId(id);
                }
                console.log(`Extracting data from dataset ${id}...`);
                data.value = await extractData(dataset.value);
                error.value = null;
            } catch (err) {
                console.error('Error pulling dataset ' + id, err);
                dataset.value = null;
                error.value = err instanceof Error ? err : new Error(String(err));
            } finally {
                loading.value = false;
                lastPullTimestamp.value = Date.now();
            }
        }

        let interval: ReturnType<typeof setInterval> | null = null;

        onMounted(() => {
            void pullDataset();

            interval = setInterval(() => {
                void pullDataset();
            }, options.refreshIntervalMs);
        });

        onUnmounted(() => {
            if (interval) {
                clearInterval(interval);
            }
        });

        return {
            dataset,
            data,
            loading,
            lastPullTimestamp,
            error,
            pullDataset,
        };
    });
}

export const useWeatherStore = makeLexploreDatasetStore<WeatherData>(459, async (dataset) => {
    const data = await dataset.getData(
        { type: 'timeRange', startTimestamp: dataStartTime(), endTimestamp: Date.now() },
        ['time', 'AirTC', 'Slrw', 'WS', 'WindDir', 'Rain'],
    );

    return {
        timestamps: data['time']! as number[],
        airTemperature: data['AirTC']! as number[],
        irradiance: data['Slrw']! as number[],
        windSpeed: (data['WS']! as number[]).map((v: number) => v * 3.6), // Convert from m/s to km/h
        windDirectionDegrees: data['WindDir']! as number[],
        precipitation: data['Rain']! as number[],
    };
});

export const useBuoyStore = makeLexploreDatasetStore<BuoyData>(885, async (dataset) => {
    const data = await dataset.getData(
        { type: 'timeRange', startTimestamp: dataStartTime(), endTimestamp: Date.now() },
        [
            'time',
            'hs', // Replace with the real axis name for dataset 885
        ],
    );

    return {
        timestamps: data['time']! as number[],
        height: data['hs']! as number[],
    };
});

export const useLakeStore = makeLexploreDatasetStore<LakeData>(
    448,
    async (dataset) => {
        const twoYearsAgo = Date.now() - 1 * 365 * 24 * 3600 * 1000;
        const data = await dataset.getData(
            { type: 'timeRange', startTimestamp: twoYearsAgo, endTimestamp: Date.now() },
            ['time', 'depth', 'temp', 'surfacetemp'],
            'depth',
        );

        Array2D.fromTransposed(data['temp'] as number[][]);

        return {
            timestamps: data['time']! as number[],
            surfaceTemperature: data['surfacetemp']! as number[],
            temperatureOverDepth: new DepthHeatmap({
                x: data['time'] as number[],
                y: data['depth'] as number[],
                z: Array2D.fromTransposed(data['temp'] as number[][]).fillNaNAdaptive(),
            }),
        };
    },
    {
        refreshIntervalMs: 60 * 60 * 1000, // Refresh every hour since lake data changes slowly
    },
);

export const useAlgaeStore = makeLexploreDatasetStore<AlgaeData>(875, async (dataset) => {
    const data = await dataset.getData(
        { type: 'timeRange', startTimestamp: dataStartTime(), endTimestamp: Date.now() },
        ['time', 'depth', 'Chl_A'],
        'depth',
    );

    return {
        timestamps: data['time']! as number[],
        chlorophyllAOverDepth: new DepthHeatmap({
            x: data['time'] as number[],
            y: data['depth'] as number[],
            z: Array2D.fromTransposed(data['Chl_A'] as number[][]),
        }),
    };
});

export const useZooplanctonDepthStore = defineStore('zooplancton-depth', () => {
    const heatmapShallow = makeLexploreDatasetStore(
        600,
        async (dataset) => {
            const data = await dataset.getData(
                { type: 'timeRange', startTimestamp: dataStartTime(), endTimestamp: Date.now() },
                ['time', 'depth', 'Sv'],
                'depth',
            );

            return new DepthHeatmap({
                x: data['time'] as number[],
                y: data['depth']?.reverse() as number[],
                z: Array2D.fromTransposed(data['Sv'] as number[][], true),
            });
        },
        {
            refreshIntervalMs: 15 * 60 * 1000, // Refresh every 15 minutes for zooplancton depth
        },
    )();

    const heatmapDeep = makeLexploreDatasetStore(
        599,
        async (dataset) => {
            const data = await dataset.getData(
                { type: 'timeRange', startTimestamp: dataStartTime(), endTimestamp: Date.now() },
                ['time', 'depth', 'Sv'],
                'depth',
            );

            return new DepthHeatmap({
                x: data['time'] as number[],
                y: data['depth'] as number[],
                z: Array2D.fromTransposed(data['Sv'] as number[][]),
            });
        },
        {
            refreshIntervalMs: 15 * 60 * 1000, // Refresh every 15 minutes for zooplancton depth
        },
    )();

    const processedBackscatterHeatmap = computed(() => {
        if (!heatmapShallow.data || !heatmapDeep.data) return null;
        const shallowSliced = heatmapShallow.data.slice({ yEnd: 24.2 }); // Data returns null deeper that this
        const deepSliced = heatmapDeep.data.slice({ yStart: 31.08, yEnd: 90.08 }); // Artifacts start there

        const bridgeY = [25.08, 26.08, 27.08, 28.08, 29.08, 30.08];

        const shallowInterpolated = shallowSliced.toInterpolated(deepSliced.x);
        const shallowZScore = shallowInterpolated.zScore();
        const deepZScore = deepSliced
            .replaceDepthRangeByLerp(48.08, 51.08)
            .replaceDepthRangeByLerp(53.08, 60.08)
            .zScore();

        const appended = shallowZScore.appendBelow(deepZScore, bridgeY);

        return appended.smoothMovingAverage({ windowX: 31, windowY: 31 });
    });

    const zooplanctonDepthPlotByTimestamp = computed(() => {
        return processedBackscatterHeatmap.value?.maxZValuePlot();
    });

    const lastFullDayOfDataTimestampRange = computed(() => {
        if (!zooplanctonDepthPlotByTimestamp.value) return null;

        const timestamps = Object.keys(zooplanctonDepthPlotByTimestamp.value).map(Number);
        if (timestamps.length === 0) {
            return null;
        }

        const maxTimestamp = timestamps[timestamps.length - 1]!;
        const minTimestamp = timestamps[0]!;

        const twoDaysSeconds = 2 * 24 * 3600;

        const lastFullDayEnd = maxTimestamp;
        const lastFullDayStart = lastFullDayEnd - twoDaysSeconds;

        if (lastFullDayEnd < minTimestamp) {
            return null;
        }
        const rangeEnd = Math.min(lastFullDayEnd, maxTimestamp); // In case we don't have a full day available

        return { start: lastFullDayStart, end: rangeEnd };
    });

    const lastAvailableTimestamp = computed(() => {
        if (!zooplanctonDepthPlotByTimestamp.value) return null;

        const timestamps = Object.keys(zooplanctonDepthPlotByTimestamp.value).map(Number);
        if (timestamps.length === 0) {
            return null;
        }

        return timestamps[timestamps.length - 1]!;
    });

    const lastRecordedDepth = computed(() => {
        if (!zooplanctonDepthPlotByTimestamp.value || !lastAvailableTimestamp.value) return null;
        return zooplanctonDepthPlotByTimestamp.value[lastAvailableTimestamp.value]!.y;
    });

    return {
        heatmapShallow,
        heatmapDeep,
        processedBackscatterHeatmap,
        zooplanctonDepthPlotByTimestamp,
        lastFullDayOfDataTimestampRange,
        lastAvailableTimestamp,
        lastRecordedDepth,
    };
});

function dataStartTime(weeksAgo: number = 2) {
    return Date.now() - weeksAgo * 7 * 24 * 3600 * 1000;
}

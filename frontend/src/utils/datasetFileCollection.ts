const API_BASE = 'https://api.datalakes-eawag.ch';

export interface DatasetFile {
    id: number;
    datasets_id: number;
    filelink: string;
    filetype: string;
    filelineage: number;
    mindatetime: string;
    maxdatetime: string;
    mindepth: string;
    maxdepth: string;
    latitude: string;
    longitude: string;
    connect: string;
    parameters_connectid: number;
}

export type DatasetData = Record<string, number[] | number[][]>;

export interface DatasetFileDataChunk {
    file: DatasetFile;
    data: DatasetData;
}

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Request failed with ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
}

export class DatasetFileCollection {
    private readonly files: DatasetFile[];

    constructor(files: DatasetFile[]) {
        this.files = [...files];
    }

    get all(): DatasetFile[] {
        return [...this.files];
    }

    getLatest(): DatasetFile | null {
        return (
            [...this.files].sort((a, b) => {
                const aTime = this.getSortTimestamp(a);
                const bTime = this.getSortTimestamp(b);

                if (aTime !== bTime) {
                    return bTime - aTime;
                }

                return b.id - a.id;
            })[0] ?? null
        );
    }

    async getLatestData(): Promise<DatasetFileDataChunk | null> {
        const latestFile = this.getLatest();

        if (!latestFile) {
            return null;
        }

        return {
            file: latestFile,
            data: await this.fetchRawData(latestFile.id),
        };
    }

    getFilesForTimeRange(startTimestamp: number, endTimestamp: number): DatasetFile[] {
        if (endTimestamp < startTimestamp) {
            throw new Error('endTimestamp must be greater than or equal to startTimestamp');
        }

        return this.files
            .filter((file) => {
                const range = this.getFileRange(file);

                if (!range) {
                    return false;
                }

                return range.start <= endTimestamp && range.end >= startTimestamp;
            })
            .sort((a, b) => {
                const aRange = this.getFileRange(a);
                const bRange = this.getFileRange(b);

                const aStart = aRange?.start ?? Number.POSITIVE_INFINITY;
                const bStart = bRange?.start ?? Number.POSITIVE_INFINITY;

                return aStart - bStart;
            });
    }

    async getDataForTimeRange(
        startTimestamp: number,
        endTimestamp: number,
    ): Promise<DatasetFileDataChunk[]> {
        const matchingFiles = this.getFilesForTimeRange(startTimestamp, endTimestamp);
        console.log(
            `Found ${matchingFiles.length} matching files for time range ${new Date(startTimestamp).toISOString()} - ${new Date(endTimestamp).toISOString()}:`,
            matchingFiles,
        );

        return Promise.all(
            matchingFiles.map(async (file) => ({
                file,
                data: await this.fetchRawData(file.id),
            })),
        );
    }

    private getSortTimestamp(file: DatasetFile): number {
        const timestamp = Date.parse(file.maxdatetime || file.mindatetime || '');

        return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
    }

    private getFileRange(file: DatasetFile): { start: number; end: number } | null {
        const start = Date.parse(file.mindatetime || '');
        const end = Date.parse(file.maxdatetime || file.mindatetime || '');

        if (!Number.isFinite(start) || !Number.isFinite(end)) {
            return null;
        }

        return {
            start: Math.min(start, end),
            end: Math.max(start, end),
        };
    }

    private async fetchRawData(fileId: number): Promise<DatasetData> {
        return fetchJson<DatasetData>(`${API_BASE}/files/${fileId}?get=raw`);
    }
}

// Types derive from schema.ts — edit shape there, not here.
/**
 * MITSI — data model (re-exports)
 *
 * The entity structure is defined once, as Zod schemas, in `src/models/schema.ts`.
 * This module re-exports the schema-derived types plus the app-level constants
 * that are not part of the persisted schema, so pages and components keep
 * importing from `src/models/mitsi` exactly as before.
 */
import { MitsiStateSchema, type MitsiState } from 'src/models/schema';

export { MITSI_SCHEMA_VERSION } from 'src/models/schema';
export type {
    TimeUnit,
    HardwareCategory,
    StorageType,
    StorageTechnology,
    StorageCasing,
    MonitoringUnit,
    FunctionalUnit,
    Datacenter,
    BoundaryItem,
    Scope,
    HardwareItem,
    MonitoringPeriod,
    DatacenterEnergy,
    UnderlyingService,
    MitsiState,
} from 'src/models/schema';

/** Storage key used for client-side (Quasar LocalStorage) persistence. */
export const MITSI_STORAGE_KEY = 'mitsi-assessment';

/** Completion state of an assessment block shown in the nav rail / status bar. */
export type BlockStatus = 'complete' | 'partial' | 'not_started';

/** The four assessment blocks, in the order shown in the navigation rail. */
export type BlockKey = 'scope' | 'inventory' | 'energy' | 'results';

/**
 * Creates a blank (empty) assessment state by parsing `{}` through the schema,
 * so every field falls back to its default.
 */
export function emptyMitsiState(): MitsiState {
    return MitsiStateSchema.parse({});
}

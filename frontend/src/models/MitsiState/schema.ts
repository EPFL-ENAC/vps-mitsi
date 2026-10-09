import { z } from 'zod';
import { DatacenterSchema, DatacenterDraftSchema } from 'src/models/Datacenter/schema';
import { ScopeSchema, ScopeDraftSchema } from 'src/models/Scope/schema';
import { HardwareItemSchema, HardwareItemDraftSchema } from 'src/models/HardwareItem/schema';
import {
    MonitoringPeriodSchema,
    MonitoringPeriodDraftSchema,
} from 'src/models/MonitoringPeriod/schema';
import {
    UnderlyingServiceSchema,
    UnderlyingServiceDraftSchema,
} from 'src/models/UnderlyingService/schema';
import { draftField } from 'src/models/shared/schema';

/** Bumped whenever the persisted/exported JSON shape changes. */
// v5: unanswered numeric drafts are empty instead of numeric placeholders.
export const MITSI_SCHEMA_VERSION = 5;

/** Canonical whole-assessment validation; no default values or data filtering. */
export const MitsiStateSchema = z.object({
    schemaVersion: z.literal(MITSI_SCHEMA_VERSION),
    scope: ScopeSchema,
    hardware: z.array(HardwareItemSchema),
    monitoringPeriod: MonitoringPeriodSchema,
    datacenters: z.array(DatacenterSchema).min(1),
    /** Whether embodied emissions of second-hand hardware are accounted for. */
    includeSecondHandEmbodied: z.boolean(),
    /** Whether underlying-service emissions are added to the total. */
    includeUnderlyingServices: z.boolean(),
    underlyingServices: z.array(UnderlyingServiceSchema),
});

/** Persistable drafts may be incomplete, but supplied values must obey their rules. */
export const MitsiStateDraftSchema = MitsiStateSchema.extend({
    schemaVersion: draftField(MitsiStateSchema.shape.schemaVersion, MITSI_SCHEMA_VERSION),
    scope: ScopeDraftSchema.default(() => ScopeDraftSchema.parse({})),
    hardware: z.array(HardwareItemDraftSchema).default(() => []),
    monitoringPeriod: MonitoringPeriodDraftSchema.default(() =>
        MonitoringPeriodDraftSchema.parse({}),
    ),
    datacenters: z.array(DatacenterDraftSchema).default(() => []),
    includeSecondHandEmbodied: draftField(MitsiStateSchema.shape.includeSecondHandEmbodied, false),
    includeUnderlyingServices: draftField(MitsiStateSchema.shape.includeUnderlyingServices, false),
    underlyingServices: z.array(UnderlyingServiceDraftSchema).default(() => []),
});

export type MitsiState = z.infer<typeof MitsiStateDraftSchema>;

import { z } from 'zod';
import { draftField, nullableNumber } from 'src/models/shared/schema';

/** Datacenter information whose completion belongs to the Scope block. */
export const DatacenterGeneralInfoSchema = z.object({
    abbreviation: z.string().min(1),
    name: z.string().min(1),
    comment: z.string(),
});

export const DatacenterGeneralInfoDraftSchema = DatacenterGeneralInfoSchema.extend({
    abbreviation: draftField(DatacenterGeneralInfoSchema.shape.abbreviation, ''),
    name: draftField(DatacenterGeneralInfoSchema.shape.name, ''),
    comment: DatacenterGeneralInfoSchema.shape.comment.default(''),
});

/** Energy information owned by a datacenter. */
export const DatacenterEnergySchema = z.object({
    comment: z.string(),
    location: z.string(),
    locationComment: z.string(),
    /** Carbon intensity of the grid mix (gCO₂/kWh). */
    carbonIntensity: z.number().min(0),
    carbonIntensityComment: z.string(),
    /** Optional; the report must note whether PUE was included. */
    pue: nullableNumber(z.number().min(0)),
    pueComment: z.string(),
    /** Grid electricity consumed (kWh over the monitoring period). */
    energyConsumption: z.number().min(0),
    energyComment: z.string(),
});

export const DatacenterEnergyDraftSchema = DatacenterEnergySchema.extend({
    comment: DatacenterEnergySchema.shape.comment.default(''),
    location: DatacenterEnergySchema.shape.location.default(''),
    locationComment: DatacenterEnergySchema.shape.locationComment.default(''),
    carbonIntensity: nullableNumber(DatacenterEnergySchema.shape.carbonIntensity).default(null),
    carbonIntensityComment: DatacenterEnergySchema.shape.carbonIntensityComment.default(''),
    pue: DatacenterEnergySchema.shape.pue.default(null),
    pueComment: DatacenterEnergySchema.shape.pueComment.default(''),
    energyConsumption: nullableNumber(DatacenterEnergySchema.shape.energyConsumption).default(null),
    energyComment: DatacenterEnergySchema.shape.energyComment.default(''),
});

export const DatacenterSchema = z.object({
    id: z.string().min(1),
    generalInfo: DatacenterGeneralInfoSchema,
    energy: DatacenterEnergySchema,
});

export const DatacenterDraftSchema = DatacenterSchema.extend({
    generalInfo: DatacenterGeneralInfoDraftSchema.default(() =>
        DatacenterGeneralInfoDraftSchema.parse({}),
    ),
    energy: DatacenterEnergyDraftSchema.default(() => DatacenterEnergyDraftSchema.parse({})),
});

export type DatacenterGeneralInfo = z.infer<typeof DatacenterGeneralInfoDraftSchema>;

export type DatacenterEnergy = z.infer<typeof DatacenterEnergyDraftSchema>;

export type EnergyMeasurements = Pick<
    z.infer<typeof DatacenterEnergySchema>,
    'energyConsumption' | 'carbonIntensity' | 'pue'
>;

export type DatacenterDraft = z.infer<typeof DatacenterDraftSchema>;

export type Datacenter = z.infer<typeof DatacenterSchema>;

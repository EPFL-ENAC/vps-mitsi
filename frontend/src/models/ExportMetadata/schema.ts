import { z } from 'zod';

export const ExportMetadataDraftSchema = z.object({
    exportedBy: z.string().trim().min(1, 'Name is required'),
    comment: z.string().trim().default(''),
});

export const ExportMetadataSchema = ExportMetadataDraftSchema.extend({
    exportedAt: z.string().datetime(),
});

export type ExportMetadataInput = z.input<typeof ExportMetadataDraftSchema>;
export type ExportMetadataDraft = z.output<typeof ExportMetadataDraftSchema>;
export type ExportMetadata = z.output<typeof ExportMetadataSchema>;

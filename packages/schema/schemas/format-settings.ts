import { z } from 'zod';

export const SpacingSettingsSchema = z.object({
  marginX: z.number().min(10).max(26).default(20), // mm - horizontal (left/right)
  marginY: z.number().min(10).max(26).default(15), // mm - vertical (top/bottom)
  fontSize: z.number().min(9).max(13).default(12), // pt
  lineHeight: z.number().min(1.1).max(1.5).default(1.2),
  blockSpacing: z.number().min(1).max(9).default(5) // 1 = lineHeight, 9 = lineHeight * 2.5
});
export type SpacingSettings = z.infer<typeof SpacingSettingsSchema>;

export const PageFormatSchema = z.enum(['A4', 'us_letter']);
export type PageFormat = z.infer<typeof PageFormatSchema>;

export const LocalizationSettingsSchema = z.object({
  language: z.string().default('en-US'), // ISO language code
  dateFormat: z.string().default('MMM yyyy'), // date-fns compatible pattern
  pageFormat: PageFormatSchema.default('A4')
});
export type LocalizationSettings = z.infer<typeof LocalizationSettingsSchema>;

export const ResumeFormatSettingsAtsSchema = z.object({
  spacing: SpacingSettingsSchema,
  localization: LocalizationSettingsSchema
});
export type ResumeFormatSettingsAts = z.infer<typeof ResumeFormatSettingsAtsSchema>;

export const ResumeFormatSettingsHumanSchema = z.object({
  spacing: SpacingSettingsSchema,
  localization: LocalizationSettingsSchema
});
export type ResumeFormatSettingsHuman = z.infer<typeof ResumeFormatSettingsHumanSchema>;

/** @deprecated Use ResumeFormatSettingsSchema instead (feature 014) */
export const UserFormatSettingsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  ats: ResumeFormatSettingsAtsSchema,
  human: ResumeFormatSettingsHumanSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});
/** @deprecated Use ResumeFormatSettings instead (feature 014) */
export type UserFormatSettings = z.infer<typeof UserFormatSettingsSchema>;

// Per-resume format settings (replaces UserFormatSettings)
export const ResumeFormatSettingsSchema = z.object({
  id: z.string().uuid(),
  resumeId: z.string().uuid(),
  ats: ResumeFormatSettingsAtsSchema,
  human: ResumeFormatSettingsHumanSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});
export type ResumeFormatSettings = z.infer<typeof ResumeFormatSettingsSchema>;

export const PatchFormatSettingsBodySchema = z.object({
  ats: z
    .object({
      spacing: SpacingSettingsSchema.partial().optional(),
      localization: LocalizationSettingsSchema.partial().optional()
    })
    .optional(),
  human: z
    .object({
      spacing: SpacingSettingsSchema.partial().optional(),
      localization: LocalizationSettingsSchema.partial().optional()
    })
    .optional()
});
export type PatchFormatSettingsBody = z.infer<typeof PatchFormatSettingsBodySchema>;

export const PutFormatSettingsBodySchema = z.object({
  ats: ResumeFormatSettingsAtsSchema,
  human: ResumeFormatSettingsHumanSchema
});
export type PutFormatSettingsBody = z.infer<typeof PutFormatSettingsBodySchema>;

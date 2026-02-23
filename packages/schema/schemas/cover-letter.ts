import { z } from 'zod';
import { COVER_LETTER_LENGTH_PRESET_MAP } from '../constants/enums';
import {
  CoverLetterLanguageSchema,
  CoverLetterLengthPresetSchema,
  CoverLetterToneSchema,
  CoverLetterTypeSchema,
  LLMProviderSchema
} from './enums';
import { SpacingSettingsSchema } from './format-settings';

const OptionalRecipientNameSchema = z.string().max(120).nullable().optional();
const OptionalInstructionsSchema = z.string().max(4000).nullable().optional();
const OptionalSubjectLineSchema = z.string().max(180).nullable().optional();
const CharacterLimitSchema = z.number().int().min(1).max(10000);
const NullableCharacterLimitSchema = CharacterLimitSchema.nullable();
const OptionalCharacterLimitSchema = NullableCharacterLimitSchema.optional();

const CoverLetterGenerationSettingsBaseSchema = z.object({
  language: CoverLetterLanguageSchema.default('en'),
  type: CoverLetterTypeSchema.default('letter'),
  tone: CoverLetterToneSchema.default('professional'),
  lengthPreset: CoverLetterLengthPresetSchema.default('standard'),
  characterLimit: NullableCharacterLimitSchema.default(null),
  recipientName: OptionalRecipientNameSchema,
  includeSubjectLine: z.boolean().default(false),
  instructions: OptionalInstructionsSchema
});

const hasOwn = <T extends object>(value: T, key: keyof T): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isCharacterLengthPreset = (
  lengthPreset: z.infer<typeof CoverLetterLengthPresetSchema>
): boolean =>
  lengthPreset === COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS ||
  lengthPreset === COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS;

const validateSubjectLineToggle = (
  value: {
    type: 'letter' | 'message';
    includeSubjectLine: boolean;
    lengthPreset: z.infer<typeof CoverLetterLengthPresetSchema>;
    characterLimit?: number | null;
  },
  ctx: z.RefinementCtx
): void => {
  if (value.type !== 'message' && value.includeSubjectLine) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['includeSubjectLine'],
      message: 'Subject line can only be enabled for message type'
    });
  }

  if (value.type !== 'message' && isCharacterLengthPreset(value.lengthPreset)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lengthPreset'],
      message: 'Character-based length presets can only be used for message type'
    });
  }

  if (isCharacterLengthPreset(value.lengthPreset) && value.characterLimit === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['characterLimit'],
      message: 'Character limit is required for selected length preset'
    });
  }

  if (!isCharacterLengthPreset(value.lengthPreset) && value.characterLimit !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['characterLimit'],
      message: 'Character limit can only be used with character-based length presets'
    });
  }
};

/**
 * Generation settings provided before cover letter creation.
 */
export const CoverLetterGenerationSettingsSchema =
  CoverLetterGenerationSettingsBaseSchema.superRefine(validateSubjectLineToggle);

export type CoverLetterGenerationSettings = z.infer<typeof CoverLetterGenerationSettingsSchema>;

/**
 * Main persisted cover letter entity.
 */
export const CoverLetterSchema = z.object({
  id: z.string().uuid(),
  vacancyId: z.string().uuid(),
  generationId: z.string().uuid(),
  language: CoverLetterLanguageSchema,
  type: CoverLetterTypeSchema,
  tone: CoverLetterToneSchema,
  lengthPreset: CoverLetterLengthPresetSchema,
  characterLimit: NullableCharacterLimitSchema,
  recipientName: z.string().max(120).nullable(),
  includeSubjectLine: z.boolean(),
  instructions: z.string().max(4000).nullable(),
  subjectLine: z.string().max(180).nullable(),
  contentMarkdown: z.string().min(1).max(20000),
  formatSettings: SpacingSettingsSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

export type CoverLetter = z.infer<typeof CoverLetterSchema>;

/**
 * Request body for POST /cover-letter/generate.
 */
export const CoverLetterGenerateBodySchema = CoverLetterGenerationSettingsBaseSchema.extend({
  provider: LLMProviderSchema.optional()
}).superRefine(validateSubjectLineToggle);

export type CoverLetterGenerateBody = z.infer<typeof CoverLetterGenerateBodySchema>;

/**
 * Request body for PATCH /cover-letters/:id.
 */
export const CoverLetterPatchBodySchema = z
  .object({
    language: CoverLetterLanguageSchema.optional(),
    type: CoverLetterTypeSchema.optional(),
    tone: CoverLetterToneSchema.optional(),
    lengthPreset: CoverLetterLengthPresetSchema.optional(),
    characterLimit: OptionalCharacterLimitSchema,
    recipientName: OptionalRecipientNameSchema,
    includeSubjectLine: z.boolean().optional(),
    instructions: OptionalInstructionsSchema,
    subjectLine: OptionalSubjectLineSchema,
    contentMarkdown: z.string().min(1).max(20000).optional(),
    formatSettings: SpacingSettingsSchema.partial().optional()
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided'
      });
    }

    if (value.type === 'letter' && value.includeSubjectLine === true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['includeSubjectLine'],
        message: 'Subject line can only be enabled for message type'
      });
    }

    if (
      value.type === 'letter' &&
      hasOwn(value, 'characterLimit') &&
      value.characterLimit !== null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['characterLimit'],
        message: 'Character limit can only be used for message type'
      });
    }

    if (value.lengthPreset) {
      if (isCharacterLengthPreset(value.lengthPreset)) {
        if (!hasOwn(value, 'characterLimit') || value.characterLimit === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['characterLimit'],
            message: 'Character limit is required for selected length preset'
          });
        }

        if (value.type === 'letter') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['lengthPreset'],
            message: 'Character-based length presets can only be used for message type'
          });
        }
      } else if (hasOwn(value, 'characterLimit') && value.characterLimit !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['characterLimit'],
          message: 'Character limit can only be used with character-based length presets'
        });
      }
    }
  });

export type CoverLetterPatchBody = z.infer<typeof CoverLetterPatchBodySchema>;

export const CoverLetterLlmResponseSchema = z.object({
  contentMarkdown: z.string().min(1).max(20000),
  subjectLine: z.string().max(180).nullable().optional()
});

export type CoverLetterLlmResponse = z.infer<typeof CoverLetterLlmResponseSchema>;

export const DefaultCoverLetterFormatSettings = SpacingSettingsSchema.parse({});

export function normalizeNullableText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

import { z } from 'zod';
import { SourceFileTypeSchema } from './enums';

export { type SourceFileType, SourceFileTypeSchema } from './enums';

// Date format: YYYY-MM
const DateMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Must be YYYY-MM format');

export const PersonalInfoSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().url().optional(),
  website: z.string().url().optional()
});
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;

export const ExperienceLinkSchema = z.object({
  name: z.string().min(1),
  link: z.string().url()
});
export type ExperienceLink = z.infer<typeof ExperienceLinkSchema>;

export const ExperienceEntrySchema = z.object({
  company: z.string().min(1),
  position: z.string().min(1),
  startDate: DateMonthSchema,
  endDate: DateMonthSchema.nullable().optional(), // null = "present"
  description: z.string(),
  projects: z.array(z.string()).optional(),
  links: z.array(ExperienceLinkSchema).optional()
});
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;

export const EducationEntrySchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().optional(),
  startDate: DateMonthSchema,
  endDate: DateMonthSchema.optional()
});
export type EducationEntry = z.infer<typeof EducationEntrySchema>;

export const CertificationEntrySchema = z.object({
  name: z.string().min(1),
  issuer: z.string().optional(),
  date: DateMonthSchema.optional()
});
export type CertificationEntry = z.infer<typeof CertificationEntrySchema>;

export const ResumeLanguageSchema = z.object({
  language: z.string().min(1),
  level: z.string().min(1)
});
export type ResumeLanguage = z.infer<typeof ResumeLanguageSchema>;

export const ResumeContentSchema = z.object({
  personalInfo: PersonalInfoSchema,
  summary: z.string().optional(),
  experience: z.array(ExperienceEntrySchema),
  education: z.array(EducationEntrySchema),
  skills: z.array(z.string()),
  certifications: z.array(CertificationEntrySchema).optional(),
  languages: z.array(ResumeLanguageSchema).optional()
});
export type ResumeContent = z.infer<typeof ResumeContentSchema>;

export const ResumeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(255),
  content: ResumeContentSchema,
  sourceFileName: z.string().min(1).max(255),
  sourceFileType: SourceFileTypeSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Resume = z.infer<typeof ResumeSchema>;

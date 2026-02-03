import { z } from 'zod';
import { SourceFileTypeSchema } from './enums';

export { type SourceFileType, SourceFileTypeSchema } from './enums';

// Date format: YYYY-MM
const DateMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Must be YYYY-MM format');

export const PersonalInfoSchema = z.object({
  fullName: z.string().min(1),
  title: z.string().optional(), // Professional title/headline (e.g., "Full-stack Team Lead | TypeScript")
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().url().optional(),
  website: z.string().url().optional(),
  github: z.string().url().optional()
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
  location: z.string().optional(), // e.g., "Remote", "Kyiv, Ukraine"
  startDate: DateMonthSchema,
  endDate: DateMonthSchema.nullable().optional(), // null = "present"
  description: z.string(),
  bullets: z.array(z.string()).optional(), // Bullet points: achievements, responsibilities, projects
  technologies: z.array(z.string()).optional(), // Tech stack used in this role
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

// Skill group with category type and list of skills
export const SkillGroupSchema = z.object({
  type: z.string().min(1), // Category name (e.g., "Languages", "Frontend", "Platform")
  skills: z.array(z.string().min(1)).min(1) // List of skills in this category
});
export type SkillGroup = z.infer<typeof SkillGroupSchema>;

// Custom section item (for sections like "Open Source", "Publications", etc.)
export const CustomSectionItemSchema = z.object({
  title: z.string().optional(), // Bold title (e.g., project name)
  description: z.string().min(1) // Description text
});
export type CustomSectionItem = z.infer<typeof CustomSectionItemSchema>;

// Custom section (e.g., "Open Source", "Publications", "Awards")
export const CustomSectionSchema = z.object({
  sectionTitle: z.string().min(1), // Section heading (e.g., "OPEN SOURCE")
  items: z.array(CustomSectionItemSchema).min(1)
});
export type CustomSection = z.infer<typeof CustomSectionSchema>;

export const ResumeContentSchema = z.object({
  personalInfo: PersonalInfoSchema,
  summary: z.string().optional(),
  experience: z.array(ExperienceEntrySchema),
  education: z.array(EducationEntrySchema),
  skills: z.array(SkillGroupSchema).min(1), // At least one skill group required
  certifications: z.array(CertificationEntrySchema).optional(),
  languages: z.array(ResumeLanguageSchema).optional(),
  customSections: z.array(CustomSectionSchema).optional() // Additional custom sections
});
export type ResumeContent = z.infer<typeof ResumeContentSchema>;

export const ResumeFormatSettingsSchema = z.object({
  marginX: z.number().min(10).max(26).default(20), // mm - horizontal (left/right)
  marginY: z.number().min(10).max(26).default(15), // mm - vertical (top/bottom)
  fontSize: z.number().min(9).max(13).default(12), // pt
  lineHeight: z.number().min(1.1).max(1.5).default(1.2),
  blockSpacing: z.number().min(1).max(9).default(5) // 1 = lineHeight, 9 = lineHeight * 2.5
});

export type ResumeFormatSettings = z.infer<typeof ResumeFormatSettingsSchema>;

export const ResumeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(255),
  content: ResumeContentSchema,
  atsSettings: ResumeFormatSettingsSchema.optional(),
  humanSettings: ResumeFormatSettingsSchema.optional(),
  sourceFileName: z.string().min(1).max(255),
  sourceFileType: SourceFileTypeSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Resume = z.infer<typeof ResumeSchema>;

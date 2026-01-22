import { z } from 'zod'
import { WorkFormatSchema } from './enums'

export { WorkFormatSchema, type WorkFormat } from './enums'

export const LanguageEntrySchema = z.object({
  language: z.string().min(1),
  level: z.string().min(1), // e.g., "Native", "Fluent", "Intermediate", "Basic"
})
export type LanguageEntry = z.infer<typeof LanguageEntrySchema>

export const PhoneEntrySchema = z.object({
  number: z.string().min(1),
  label: z.string().optional(), // e.g., "Mobile", "Work"
})
export type PhoneEntry = z.infer<typeof PhoneEntrySchema>

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  country: z.string().length(2), // ISO 3166-1 alpha-2
  searchRegion: z.string().min(1).max(100),
  workFormat: WorkFormatSchema,
  languages: z.array(LanguageEntrySchema).min(1),
  phones: z.array(PhoneEntrySchema).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Profile = z.infer<typeof ProfileSchema>

// For create/update (omit auto-generated fields)
export const ProfileInputSchema = ProfileSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
})
export type ProfileInput = z.infer<typeof ProfileInputSchema>

// Profile completeness check
export const isProfileComplete = (profile: Profile | null): boolean => {
  if (!profile) return false
  return (
    profile.firstName.length > 0 &&
    profile.lastName.length > 0 &&
    profile.email.length > 0 &&
    profile.country.length === 2 &&
    profile.searchRegion.length > 0 &&
    profile.languages.length > 0
  )
}

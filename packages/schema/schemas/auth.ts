import type { Profile } from './profile';
import type { UserPublic } from './user';
import { z } from 'zod';

// --- Input schemas ---

export const RegisterInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required')
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const ForgotPasswordInputSchema = z.object({
  email: z.string().email('Invalid email address')
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;

export const ResetPasswordInputSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;

export const AcceptTermsInputSchema = z.object({
  legalVersion: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, 'Invalid date format (dd.MM.yyyy)')
});

export type AcceptTermsInput = z.infer<typeof AcceptTermsInputSchema>;

// --- Response types ---

export type AuthMeResponse = {
  user: UserPublic;
  profile: Profile | null;
  isProfileComplete: boolean;
};

export type AcceptTermsResponse = {
  termsAcceptedAt: string | null;
  legalVersion: string | null;
};

import type { TemplateRegistry } from './define'
import { emailChangeRequested } from './email-change-requested'
import { emailChanged } from './email-changed'
import { passwordChanged } from './password-changed'
import { resetPassword } from './reset-password'
import { verifyEmail } from './verify-email'
import { verifyEmailChange } from './verify-email-change'

export const builtInTemplates = {
  verifyEmail,
  resetPassword,
  passwordChanged,
  verifyEmailChange,
  emailChangeRequested,
  emailChanged,
} satisfies TemplateRegistry

export type BuiltInTemplates = typeof builtInTemplates

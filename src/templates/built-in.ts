import type { TemplateRegistry } from './define'
import { emailChangeRequested } from './email-change-requested'
import { emailChanged } from './email-changed'
import { magicLink } from './magic-link'
import { otpCode } from './otp-code'
import { passwordChanged } from './password-changed'
import { resetPassword } from './reset-password'
import { verifyEmail } from './verify-email'
import { verifyEmailChange } from './verify-email-change'
import { welcome } from './welcome'

export const builtInTemplates = {
  verifyEmail,
  resetPassword,
  passwordChanged,
  verifyEmailChange,
  emailChangeRequested,
  emailChanged,
  otpCode,
  magicLink,
  welcome,
} satisfies TemplateRegistry

export type BuiltInTemplates = typeof builtInTemplates

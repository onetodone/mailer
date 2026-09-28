import type { TemplateRegistry } from './define'
import { passwordChanged } from './password-changed'
import { resetPassword } from './reset-password'
import { verifyEmail } from './verify-email'

export const builtInTemplates = { verifyEmail, resetPassword, passwordChanged } satisfies TemplateRegistry

export type BuiltInTemplates = typeof builtInTemplates

import { accountDeleted } from './account-deleted'
import { accountLocked } from './account-locked'
import { accountUnlocked } from './account-unlocked'
import { apiKeyCreated } from './api-key-created'
import { apiKeyExpiring } from './api-key-expiring'
import { confirmAccountDeletion } from './confirm-account-deletion'
import { dataExportReady } from './data-export-ready'
import type { TemplateRegistry } from './define'
import { emailChangeRequested } from './email-change-requested'
import { emailChanged } from './email-changed'
import { inactiveAccountWarning } from './inactive-account-warning'
import { inviteAccepted } from './invite-accepted'
import { magicLink } from './magic-link'
import { memberRemoved } from './member-removed'
import { memberRoleChanged } from './member-role-changed'
import { newSignIn } from './new-sign-in'
import { otpCode } from './otp-code'
import { ownershipReceived } from './ownership-received'
import { ownershipTransferred } from './ownership-transferred'
import { passkeyAdded } from './passkey-added'
import { passkeyRemoved } from './passkey-removed'
import { passwordChanged } from './password-changed'
import { policyUpdated } from './policy-updated'
import { recoveryCodeUsed } from './recovery-code-used'
import { resetPassword } from './reset-password'
import { teamInvite } from './team-invite'
import { twoFactorDisabled } from './two-factor-disabled'
import { twoFactorEnabled } from './two-factor-enabled'
import { userInvite } from './user-invite'
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
  newSignIn,
  twoFactorEnabled,
  twoFactorDisabled,
  accountLocked,
  confirmAccountDeletion,
  accountDeleted,
  teamInvite,
  userInvite,
  inviteAccepted,
  memberRoleChanged,
  memberRemoved,
  ownershipReceived,
  ownershipTransferred,
  passkeyAdded,
  passkeyRemoved,
  recoveryCodeUsed,
  apiKeyCreated,
  apiKeyExpiring,
  accountUnlocked,
  dataExportReady,
  inactiveAccountWarning,
  policyUpdated,
} satisfies TemplateRegistry

export type BuiltInTemplates = typeof builtInTemplates

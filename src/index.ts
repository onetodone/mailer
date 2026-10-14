export { MailerError, type MailerErrorCode, type MailerErrorOptions } from './errors'
export { html, raw, safeUrl, type HtmlValue, type SafeHtml } from './core/html'
export type { Branding, ResolvedBranding, Theme, ThemeInput } from './core/theme'
export type { Block, HeadingOptions, ImageOptions, Ui } from './core/blocks'
export {
  defaultLayout,
  defineLayout,
  type Layout,
  type LayoutContext,
  type LayoutMessages,
  type LayoutResult,
} from './core/layout'
export type { Formatters, Locale, LocaleMessages, MessageKey, Messages, MessagesOverrides, Translate } from './i18n'
export {
  defineTemplate,
  type Template,
  type TemplateContent,
  type TemplateProps,
  type TemplateRenderContext,
} from './templates/define'
export type { TemplateMessages, TemplateTexts } from './templates/messages'
export type { RenderedEmail } from './templates/render'
export type { VerifyEmailProps } from './templates/verify-email'
export type { ResetPasswordProps } from './templates/reset-password'
export type { PasswordChangedProps } from './templates/password-changed'
export type { VerifyEmailChangeProps } from './templates/verify-email-change'
export type { EmailChangeRequestedProps } from './templates/email-change-requested'
export type { EmailChangedProps } from './templates/email-changed'
export type { OtpCodeProps } from './templates/otp-code'
export type { MagicLinkProps } from './templates/magic-link'
export type { WelcomeProps } from './templates/welcome'
export type { NewSignInProps } from './templates/new-sign-in'
export type { TwoFactorEnabledProps } from './templates/two-factor-enabled'
export type { TwoFactorDisabledProps } from './templates/two-factor-disabled'
export type { AccountLockedProps } from './templates/account-locked'
export type { ConfirmAccountDeletionProps } from './templates/confirm-account-deletion'
export type { AccountDeletedProps } from './templates/account-deleted'
export type { TeamInviteProps } from './templates/team-invite'
export type { UserInviteProps } from './templates/user-invite'
export type { InviteAcceptedProps } from './templates/invite-accepted'
export type { MemberRoleChangedProps } from './templates/member-role-changed'
export type { MemberRemovedProps } from './templates/member-removed'
export type { OwnershipReceivedProps } from './templates/ownership-received'
export type { OwnershipTransferredProps } from './templates/ownership-transferred'
export type { PasskeyAddedProps } from './templates/passkey-added'
export type { PasskeyRemovedProps } from './templates/passkey-removed'
export type { RecoveryCodeUsedProps } from './templates/recovery-code-used'
export type { ApiKeyCreatedProps } from './templates/api-key-created'
export type { ApiKeyExpiringProps } from './templates/api-key-expiring'
export type { AccountUnlockedProps } from './templates/account-unlocked'
export type { DataExportReadyProps } from './templates/data-export-ready'
export type { InactiveAccountWarningProps } from './templates/inactive-account-warning'
export type { PolicyUpdatedProps } from './templates/policy-updated'
export type {
  Attachment,
  MailAddress,
  MailAddresses,
  MailTransport,
  OutgoingAttachment,
  OutgoingMessage,
  SendResult,
} from './transports/types'
export { memoryTransport, type MemoryTransport } from './transports/memory'
export { consoleTransport, type ConsoleTransportOptions } from './transports/console'
export type { AttachmentInfo, MailerConfig, MailErrorEvent, MailEvent, MailSentEvent } from './config'
export { createMailer, type Mailer, type RenderOptions, type SendOptions } from './mailer'

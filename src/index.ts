export { MailerError, type MailerErrorCode } from './errors'
export { html, raw, safeUrl, type HtmlValue, type SafeHtml } from './core/html'
export type { Branding, ResolvedBranding, Theme, ThemeInput } from './core/theme'
export type { Block, HeadingOptions, ImageOptions, Ui, UiMessages } from './core/blocks'
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

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  createMailer,
  defineTemplate,
  type AccountDeletedProps,
  type AccountLockedProps,
  type Attachment,
  type Branding,
  type ConfirmAccountDeletionProps,
  type EmailChangedProps,
  type EmailChangeRequestedProps,
  type Locale,
  type MagicLinkProps,
  type MailAddress,
  type MailTransport,
  type NewSignInProps,
  type OtpCodeProps,
  type PasswordChangedProps,
  type ResetPasswordProps,
  type TemplateProps,
  type TwoFactorDisabledProps,
  type TwoFactorEnabledProps,
  type VerifyEmailChangeProps,
  type VerifyEmailProps,
  type WelcomeProps,
} from '@onetodone/mailer'
import { z } from 'zod'

export function env(name: string): string | undefined {
  const value = process.env[name]
  return value === '' ? undefined : value
}

function numberEnv(name: string): number | undefined {
  const value = env(name)
  return value === undefined ? undefined : Number(value)
}

export const branding: Branding = {
  companyName: 'OneToDone',
  appUrl: 'https://github.com/onetodone',
  supportEmail: 'hello@onetodone.com',
  logoUrl: env('LOGO_URL'),
  logoWidth: numberEnv('LOGO_WIDTH'),
  logoHeight: numberEnv('LOGO_HEIGHT'),
  footerText: 'You received this email because you signed up for OneToDone.',
}

export const from: MailAddress = { name: 'OneToDone', address: 'hello@onetodone.com' }

// A record keyed by Locale makes a locale missing from this list a type error.
const builtInLocales = Object.keys({
  en: true,
  'be-Latn': true,
  be: true,
  cs: true,
  de: true,
  et: true,
  fr: true,
  it: true,
  ja: true,
  ka: true,
  lt: true,
  lv: true,
  pl: true,
  ro: true,
  th: true,
  uk: true,
} satisfies Record<Locale, true>) as Locale[]

function selectLocales(setting: string | undefined): Locale[] {
  if (setting === undefined) return builtInLocales
  const codes = setting
    .split(',')
    .map((code) => code.trim())
    .filter((code) => code !== '')
  const selected = builtInLocales.filter((locale) => codes.includes(locale))
  if (selected.length === 0 || codes.some((code) => !(builtInLocales as string[]).includes(code))) {
    console.error(`LOCALES must list built-in locales (${builtInLocales.join(', ')}), received "${setting}".`)
    process.exit(1)
  }
  return selected
}

export const locales = selectLocales(env('LOCALES'))

// Covers ui.image with both kinds of sources, and attachments, which no built-in template uses.
const media = defineTemplate({
  name: 'media',
  schema: z.strictObject({ imageUrl: z.url({ protocol: /^https?$/ }) }),
  messages: {
    en: {
      subject: 'Images and attachments',
      remote: 'An image from an https: URL:',
      inline: 'An inline image from an attachment, shown through cid:',
      attached: 'A PDF file is attached to this email.',
    },
    be: {
      subject: 'Выявы і далучаныя файлы',
      remote: 'Выява па https:-спасылцы:',
      inline: 'Убудаваная выява з далучанага файла, паказаная праз cid:',
      attached: 'Да гэтага ліста далучаны PDF-файл.',
    },
  },
  render: ({ props, ui, t }) => ({
    subject: t('media.subject'),
    body: [
      ui.heading(t('media.subject')),
      ui.paragraph(t('media.remote')),
      ui.image(props.imageUrl, { alt: 'Sample banner', width: 534, height: 200 }),
      ui.paragraph(t('media.inline')),
      ui.image('cid:sample-qr', { alt: 'Sample QR code', width: 192, height: 192 }),
      ui.note(t('media.attached')),
    ],
  }),
})

export function createSampleMailer(transport: MailTransport, sender: MailAddress = from, brand: Branding = branding) {
  return createMailer({ transport, from: sender, branding: brand, templates: { media } })
}

interface PropsByTemplate {
  verifyEmail: VerifyEmailProps
  resetPassword: ResetPasswordProps
  passwordChanged: PasswordChangedProps
  verifyEmailChange: VerifyEmailChangeProps
  emailChangeRequested: EmailChangeRequestedProps
  emailChanged: EmailChangedProps
  otpCode: OtpCodeProps
  magicLink: MagicLinkProps
  welcome: WelcomeProps
  newSignIn: NewSignInProps
  twoFactorEnabled: TwoFactorEnabledProps
  twoFactorDisabled: TwoFactorDisabledProps
  accountLocked: AccountLockedProps
  confirmAccountDeletion: ConfirmAccountDeletionProps
  accountDeleted: AccountDeletedProps
  media: TemplateProps<typeof media>
}

type TemplateName = Parameters<ReturnType<typeof createSampleMailer>['render']>[0]

// Indexing by every template name makes a template without an entry in PropsByTemplate a type error.
export type Sample = {
  [Name in TemplateName]: {
    readonly slug: string
    readonly template: Name
    readonly props: PropsByTemplate[Name]
    readonly attachments?: readonly Attachment[]
  }
}[TemplateName]

export const samples: readonly Sample[] = [
  {
    slug: 'verify-email',
    template: 'verifyEmail',
    props: { userName: 'Lizzie', verifyUrl: 'http://fake-url.loc/verify?token=preview', expiresInMinutes: 2880 },
  },
  {
    slug: 'reset-password',
    template: 'resetPassword',
    props: { userName: 'Lizzie', resetUrl: 'http://fake-url.loc/reset?token=preview', expiresInMinutes: 30 },
  },
  {
    slug: 'password-changed',
    template: 'passwordChanged',
    props: {
      userName: 'Lizzie',
      changedAt: new Date(),
      timeZone: 'Europe/Minsk',
      ip: '0.0.0.0',
      supportUrl: 'http://fake-url.loc/support',
    },
  },
  { slug: 'password-changed-minimal', template: 'passwordChanged', props: {} },
  {
    slug: 'verify-email-change',
    template: 'verifyEmailChange',
    props: {
      userName: 'Lizzie',
      verifyUrl: 'http://fake-url.loc/email/verify?token=preview',
      expiresInMinutes: 1440,
    },
  },
  {
    slug: 'email-change-requested',
    template: 'emailChangeRequested',
    props: {
      userName: 'Lizzie',
      newEmail: 'lizzie.new@example.com',
      requestedAt: new Date(),
      timeZone: 'Europe/Minsk',
      ip: '0.0.0.0',
      cancelUrl: 'http://fake-url.loc/email/cancel?token=preview',
    },
  },
  {
    slug: 'email-change-requested-minimal',
    template: 'emailChangeRequested',
    props: { newEmail: 'l***@example.com' },
  },
  {
    slug: 'email-changed',
    template: 'emailChanged',
    props: {
      userName: 'Lizzie',
      newEmail: 'lizzie.new@example.com',
      changedAt: new Date(),
      timeZone: 'Europe/Minsk',
      ip: '0.0.0.0',
      supportUrl: 'http://fake-url.loc/support',
    },
  },
  { slug: 'email-changed-minimal', template: 'emailChanged', props: {} },
  {
    slug: 'otp-code',
    template: 'otpCode',
    props: { userName: 'Lizzie', code: 'K7Q2M9XW', expiresInMinutes: 10 },
  },
  {
    slug: 'magic-link',
    template: 'magicLink',
    props: { userName: 'Lizzie', signInUrl: 'http://fake-url.loc/sign-in?token=preview', expiresInMinutes: 15 },
  },
  {
    slug: 'welcome',
    template: 'welcome',
    props: { userName: 'Lizzie', ctaUrl: 'http://fake-url.loc/get-started' },
  },
  { slug: 'welcome-minimal', template: 'welcome', props: {} },
  {
    slug: 'new-sign-in',
    template: 'newSignIn',
    props: {
      userName: 'Lizzie',
      signedInAt: new Date(),
      timeZone: 'Europe/Minsk',
      ip: '0.0.0.0',
      device: 'Chrome on macOS',
      location: 'Minsk, Belarus',
      secureUrl: 'http://fake-url.loc/security?token=preview',
    },
  },
  { slug: 'new-sign-in-minimal', template: 'newSignIn', props: {} },
  {
    slug: 'two-factor-enabled',
    template: 'twoFactorEnabled',
    props: {
      userName: 'Lizzie',
      changedAt: new Date(),
      timeZone: 'Europe/Minsk',
      ip: '0.0.0.0',
      supportUrl: 'http://fake-url.loc/support',
    },
  },
  {
    slug: 'two-factor-disabled',
    template: 'twoFactorDisabled',
    props: { userName: 'Lizzie', changedAt: new Date(), timeZone: 'Europe/Minsk', ip: '0.0.0.0' },
  },
  {
    slug: 'account-locked',
    template: 'accountLocked',
    props: {
      userName: 'Lizzie',
      lockedUntil: new Date(Date.now() + 30 * 60_000),
      timeZone: 'Europe/Minsk',
      ip: '0.0.0.0',
      unlockUrl: 'http://fake-url.loc/unlock?token=preview',
    },
  },
  { slug: 'account-locked-minimal', template: 'accountLocked', props: {} },
  {
    slug: 'confirm-account-deletion',
    template: 'confirmAccountDeletion',
    props: {
      userName: 'Lizzie',
      confirmUrl: 'http://fake-url.loc/account/delete?token=preview',
      expiresInMinutes: 60,
    },
  },
  {
    slug: 'account-deleted',
    template: 'accountDeleted',
    props: { userName: 'Lizzie', supportUrl: 'http://fake-url.loc/support' },
  },
  { slug: 'account-deleted-minimal', template: 'accountDeleted', props: {} },
  {
    slug: 'media',
    template: 'media',
    props: { imageUrl: env('IMAGE_URL') ?? 'https://placehold.co/1068x400/png?text=Inline%20Image' },
    attachments: [
      {
        filename: 'qrcode.jpg',
        content: await readFile(join(import.meta.dirname, 'assets', 'qrcode.jpg')),
        cid: 'sample-qr',
      },
      {
        filename: 'sample.pdf',
        content: await readFile(join(import.meta.dirname, 'assets', 'sample.pdf')),
      },
    ],
  },
]

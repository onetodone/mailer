import {
  createMailer,
  defineTemplate,
  type Attachment,
  type Branding,
  type EmailChangedProps,
  type EmailChangeRequestedProps,
  type Locale,
  type MagicLinkProps,
  type MailAddress,
  type MailTransport,
  type OtpCodeProps,
  type PasswordChangedProps,
  type ResetPasswordProps,
  type TemplateProps,
  type VerifyEmailChangeProps,
  type VerifyEmailProps,
  type WelcomeProps,
} from '@onetodone/mailer'
import { z } from 'zod'

import { qrLikePng, samplePdf } from './sample-files.ts'

export function env(name: string): string | undefined {
  const value = process.env[name]
  return value === '' ? undefined : value
}

function numberEnv(name: string): number | undefined {
  const value = env(name)
  return value === undefined ? undefined : Number(value)
}

export const branding: Branding = {
  companyName: 'MyApp',
  appUrl: 'https://example.com',
  supportEmail: 'support@example.com',
  logoUrl: env('LOGO_URL'),
  logoWidth: numberEnv('LOGO_WIDTH'),
  logoHeight: numberEnv('LOGO_HEIGHT'),
  footerText: 'You received this email because you signed up for MyApp.',
}

export const from: MailAddress = { name: 'MyApp', address: 'no-reply@example.com' }

// A record keyed by Locale makes a locale missing from this list a type error.
export const locales = Object.keys({ en: true, be: true } satisfies Record<Locale, true>) as Locale[]

const mediaTexts = {
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
} satisfies Record<Locale, Record<string, string>>

// Covers ui.image with both kinds of sources, and attachments, which no built-in template uses.
const media = defineTemplate({
  name: 'media',
  schema: z.strictObject({ imageUrl: z.url({ protocol: /^https?$/ }) }),
  render: ({ props, ui, locale }) => {
    const text = locale === 'be' ? mediaTexts.be : mediaTexts.en
    return {
      subject: text.subject,
      body: [
        ui.heading(text.subject),
        ui.paragraph(text.remote),
        ui.image(props.imageUrl, { alt: 'Sample banner', width: 534, height: 200 }),
        ui.paragraph(text.inline),
        ui.image('cid:sample-qr', { alt: 'Sample QR code', width: 198, height: 198 }),
        ui.note(text.attached),
      ],
    }
  },
})

export function createSampleMailer(transport: MailTransport, sender: MailAddress = from) {
  return createMailer({ transport, from: sender, branding, templates: { media } })
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
    props: { userName: 'Lizzie', verifyUrl: 'https://example.com/verify?token=preview', expiresInMinutes: 2880 },
  },
  {
    slug: 'reset-password',
    template: 'resetPassword',
    props: { userName: 'Lizzie', resetUrl: 'https://example.com/reset?token=preview', expiresInMinutes: 30 },
  },
  {
    slug: 'password-changed',
    template: 'passwordChanged',
    props: {
      userName: 'Lizzie',
      changedAt: new Date(),
      timeZone: 'Europe/Minsk',
      ip: '203.0.113.42',
      supportUrl: 'https://example.com/support',
    },
  },
  { slug: 'password-changed-minimal', template: 'passwordChanged', props: {} },
  {
    slug: 'verify-email-change',
    template: 'verifyEmailChange',
    props: { userName: 'Lizzie', verifyUrl: 'https://example.com/email/verify?token=preview', expiresInMinutes: 1440 },
  },
  {
    slug: 'email-change-requested',
    template: 'emailChangeRequested',
    props: {
      userName: 'Lizzie',
      newEmail: 'lizzie.new@example.com',
      requestedAt: new Date(),
      timeZone: 'Europe/Minsk',
      ip: '203.0.113.42',
      cancelUrl: 'https://example.com/email/cancel?token=preview',
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
      ip: '203.0.113.42',
      supportUrl: 'https://example.com/support',
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
    props: { userName: 'Lizzie', signInUrl: 'https://example.com/sign-in?token=preview', expiresInMinutes: 15 },
  },
  {
    slug: 'welcome',
    template: 'welcome',
    props: { userName: 'Lizzie', ctaUrl: 'https://example.com/get-started' },
  },
  { slug: 'welcome-minimal', template: 'welcome', props: {} },
  {
    slug: 'media',
    template: 'media',
    props: { imageUrl: env('IMAGE_URL') ?? 'https://placehold.co/1068x400/png?text=MyApp' },
    attachments: [
      { filename: 'qr.png', content: qrLikePng(), cid: 'sample-qr' },
      { filename: 'Рахунак 1042.pdf', content: samplePdf('MyApp sample invoice 1042') },
    ],
  },
]

import type {
  Branding,
  EmailChangedProps,
  EmailChangeRequestedProps,
  Locale,
  MailAddress,
  Mailer,
  PasswordChangedProps,
  ResetPasswordProps,
  VerifyEmailChangeProps,
  VerifyEmailProps,
} from '@onetodone/mailer'

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

interface PropsByTemplate {
  verifyEmail: VerifyEmailProps
  resetPassword: ResetPasswordProps
  passwordChanged: PasswordChangedProps
  verifyEmailChange: VerifyEmailChangeProps
  emailChangeRequested: EmailChangeRequestedProps
  emailChanged: EmailChangedProps
}

type TemplateName = Parameters<Mailer['render']>[0]

// Indexing by every built-in template name makes a template without an entry in PropsByTemplate a type error.
export type Sample = {
  [Name in TemplateName]: {
    readonly slug: string
    readonly template: Name
    readonly props: PropsByTemplate[Name]
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
]

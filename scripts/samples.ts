import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  createMailer,
  defineTemplate,
  type AccountDeletedProps,
  type AccountLockedProps,
  type AccountUnlockedProps,
  type ApiKeyCreatedProps,
  type ApiKeyExpiringProps,
  type Attachment,
  type Branding,
  type ConfirmAccountDeletionProps,
  type DataExportReadyProps,
  type EmailChangedProps,
  type EmailChangeRequestedProps,
  type InactiveAccountWarningProps,
  type InviteAcceptedProps,
  type Locale,
  type MagicLinkProps,
  type MailAddress,
  type MailTransport,
  type MemberRemovedProps,
  type MemberRoleChangedProps,
  type NewSignInProps,
  type OtpCodeProps,
  type OwnershipReceivedProps,
  type OwnershipTransferredProps,
  type PasskeyAddedProps,
  type PasskeyRemovedProps,
  type PasswordChangedProps,
  type PolicyUpdatedProps,
  type RecoveryCodeUsedProps,
  type ResetPasswordProps,
  type TeamInviteProps,
  type TemplateProps,
  type TwoFactorDisabledProps,
  type TwoFactorEnabledProps,
  type UserInviteProps,
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

// The OneToDone logo. Without LOGO_URL, the preview and the screenshots render with its public URL
// and then swap it for the local file, so they work offline and before the file reaches main.
export const brandLogo = {
  url: 'https://raw.githubusercontent.com/onetodone/mailer/main/scripts/assets/logo.png',
  file: join(import.meta.dirname, 'assets', 'logo.png'),
  width: 123,
  height: 32,
} as const

export const from: MailAddress = { name: 'OneToDone', address: 'hello@onetodone.com' }

// A record keyed by Locale makes a locale missing from this list a type error.
const builtInLocales = Object.keys({
  en: true,
  'be-Latn': true,
  be: true,
  cs: true,
  de: true,
  es: true,
  et: true,
  fr: true,
  it: true,
  ja: true,
  ka: true,
  ko: true,
  lt: true,
  lv: true,
  nl: true,
  pl: true,
  pt: true,
  ro: true,
  th: true,
  tr: true,
  uk: true,
  zh: true,
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
  teamInvite: TeamInviteProps
  userInvite: UserInviteProps
  inviteAccepted: InviteAcceptedProps
  memberRoleChanged: MemberRoleChangedProps
  memberRemoved: MemberRemovedProps
  ownershipReceived: OwnershipReceivedProps
  ownershipTransferred: OwnershipTransferredProps
  passkeyAdded: PasskeyAddedProps
  passkeyRemoved: PasskeyRemovedProps
  recoveryCodeUsed: RecoveryCodeUsedProps
  apiKeyCreated: ApiKeyCreatedProps
  apiKeyExpiring: ApiKeyExpiringProps
  accountUnlocked: AccountUnlockedProps
  dataExportReady: DataExportReadyProps
  inactiveAccountWarning: InactiveAccountWarningProps
  policyUpdated: PolicyUpdatedProps
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
    props: { userName: 'Lizzie', startUrl: 'http://fake-url.loc/get-started' },
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
    slug: 'team-invite',
    template: 'teamInvite',
    props: {
      userName: 'Lizzie',
      inviterName: 'Anna Novak',
      inviterEmail: 'anna@example.com',
      organizationName: 'Acme Design',
      role: 'Editor',
      acceptUrl: 'http://fake-url.loc/invite?token=preview',
      expiresInMinutes: 10080,
    },
  },
  {
    slug: 'team-invite-minimal',
    template: 'teamInvite',
    props: { organizationName: 'Acme Design', acceptUrl: 'http://fake-url.loc/invite?token=preview' },
  },
  {
    slug: 'user-invite',
    template: 'userInvite',
    props: {
      userName: 'Lizzie',
      inviterName: 'Anna Novak',
      acceptUrl: 'http://fake-url.loc/invite?token=preview',
      expiresInMinutes: 4320,
    },
  },
  {
    slug: 'invite-accepted',
    template: 'inviteAccepted',
    props: {
      userName: 'Anna',
      memberName: 'Lizzie Smith',
      organizationName: 'Acme Design',
      membersUrl: 'http://fake-url.loc/org/members',
    },
  },
  {
    slug: 'member-role-changed',
    template: 'memberRoleChanged',
    props: {
      userName: 'Lizzie',
      organizationName: 'Acme Design',
      role: 'Admin',
      previousRole: 'Editor',
      changedByName: 'Anna Novak',
      organizationUrl: 'http://fake-url.loc/org',
    },
  },
  {
    slug: 'member-removed',
    template: 'memberRemoved',
    props: { userName: 'Lizzie', organizationName: 'Acme Design', removedByName: 'Anna Novak' },
  },
  {
    slug: 'ownership-received',
    template: 'ownershipReceived',
    props: {
      userName: 'Lizzie',
      organizationName: 'Acme Design',
      previousOwnerName: 'Anna Novak',
      organizationUrl: 'http://fake-url.loc/org',
    },
  },
  {
    slug: 'ownership-transferred',
    template: 'ownershipTransferred',
    props: {
      userName: 'Anna',
      organizationName: 'Acme Design',
      newOwnerName: 'Lizzie Smith',
      newRole: 'Admin',
      transferredAt: new Date(),
      timeZone: 'Europe/Minsk',
      ip: '0.0.0.0',
      supportUrl: 'http://fake-url.loc/support',
    },
  },
  {
    slug: 'passkey-added',
    template: 'passkeyAdded',
    props: {
      userName: 'Lizzie',
      passkeyName: 'iPhone',
      changedAt: new Date(),
      timeZone: 'Europe/Minsk',
      device: 'Safari on iOS',
      ip: '0.0.0.0',
      secureUrl: 'http://fake-url.loc/security?token=preview',
    },
  },
  {
    slug: 'passkey-removed',
    template: 'passkeyRemoved',
    props: {
      userName: 'Lizzie',
      passkeyName: 'YubiKey 5',
      changedAt: new Date(),
      timeZone: 'Europe/Minsk',
      ip: '0.0.0.0',
    },
  },
  {
    slug: 'recovery-code-used',
    template: 'recoveryCodeUsed',
    props: {
      userName: 'Lizzie',
      usedAt: new Date(),
      timeZone: 'Europe/Minsk',
      device: 'Chrome on macOS',
      ip: '0.0.0.0',
      remainingCodes: 3,
      regenerateUrl: 'http://fake-url.loc/security/recovery-codes',
      secureUrl: 'http://fake-url.loc/security?token=preview',
    },
  },
  {
    slug: 'recovery-code-used-minimal',
    template: 'recoveryCodeUsed',
    props: { remainingCodes: 0, regenerateUrl: 'http://fake-url.loc/security/recovery-codes' },
  },
  {
    slug: 'api-key-created',
    template: 'apiKeyCreated',
    props: {
      userName: 'Lizzie',
      keyName: 'CI deploy',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 86_400_000),
      timeZone: 'Europe/Minsk',
      ip: '0.0.0.0',
      manageUrl: 'http://fake-url.loc/settings/api-keys',
    },
  },
  {
    slug: 'api-key-expiring',
    template: 'apiKeyExpiring',
    props: {
      userName: 'Lizzie',
      keyName: 'CI deploy',
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
      timeZone: 'Europe/Minsk',
      manageUrl: 'http://fake-url.loc/settings/api-keys',
    },
  },
  {
    slug: 'account-unlocked',
    template: 'accountUnlocked',
    props: {
      userName: 'Lizzie',
      unlockedAt: new Date(),
      timeZone: 'Europe/Minsk',
      signInUrl: 'http://fake-url.loc/sign-in',
      supportUrl: 'http://fake-url.loc/support',
    },
  },
  {
    slug: 'data-export-ready',
    template: 'dataExportReady',
    props: {
      userName: 'Lizzie',
      downloadUrl: 'http://fake-url.loc/export?token=preview',
      expiresInMinutes: 10080,
      supportUrl: 'http://fake-url.loc/support',
    },
  },
  {
    slug: 'inactive-account-warning',
    template: 'inactiveAccountWarning',
    props: {
      userName: 'Lizzie',
      deletionDate: new Date(Date.now() + 30 * 86_400_000),
      lastSignInAt: new Date(Date.now() - 700 * 86_400_000),
      timeZone: 'Europe/Minsk',
      signInUrl: 'http://fake-url.loc/sign-in',
    },
  },
  {
    slug: 'policy-updated',
    template: 'policyUpdated',
    props: {
      userName: 'Lizzie',
      policy: 'terms',
      policyUrl: 'http://fake-url.loc/terms',
      effectiveAt: new Date(Date.now() + 30 * 86_400_000),
      timeZone: 'Europe/Minsk',
      changes: ['Clearer rules for shared workspaces', 'A new section on refunds'],
    },
  },
  {
    slug: 'policy-updated-minimal',
    template: 'policyUpdated',
    props: { policy: 'privacy', policyUrl: 'http://fake-url.loc/privacy' },
  },
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

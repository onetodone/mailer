import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { defaultLayout } from '../../src/core/layout'
import { resolveBranding } from '../../src/core/theme-schema'
import { MailerError } from '../../src/errors'
import { buildMessages, dictionaries, type Locale } from '../../src/i18n'
import { builtInTemplates } from '../../src/templates/built-in'
import { renderTemplate, type RenderedEmail, type RenderTemplateOptions } from '../../src/templates/render'

const branding = resolveBranding({
  companyName: 'My App',
  appUrl: 'https://myapp.loc',
  supportEmail: 'support@myapp.loc',
  footerText: 'You received this email because you have an account at My App.',
  theme: { primary: '#3b82f6' },
})
const messages = buildMessages()
const locales = Object.keys(dictionaries) as Locale[]
const userNames: Partial<Record<Locale, string>> = { be: 'Ліза', 'be-Latn': 'Liza' }
const verifyUrl = 'https://myapp.loc/verify?token=abc123'
const resetUrl = 'https://myapp.loc/reset?token=abc123'
const supportUrl = 'https://myapp.loc/support'
const cancelUrl = 'https://myapp.loc/email/cancel?token=abc123'
const newEmail = 'lizzie.new@example.com'
const changedAt = new Date('2026-05-04T09:30:00Z')
const signInUrl = 'https://myapp.loc/sign-in?token=abc123'
const code = 'K7Q2M9XW'
const secureUrl = 'https://myapp.loc/security?token=abc123'
const unlockUrl = 'https://myapp.loc/unlock?token=abc123'
const confirmUrl = 'https://myapp.loc/account/delete?token=abc123'
const acceptUrl = 'https://myapp.loc/invite?token=abc123'
const membersUrl = 'https://myapp.loc/org/members'
const organizationUrl = 'https://myapp.loc/org'
const regenerateUrl = 'https://myapp.loc/security/recovery-codes'
const manageUrl = 'https://myapp.loc/settings/api-keys'
const downloadUrl = 'https://myapp.loc/export?token=abc123'
const policyUrl = 'https://myapp.loc/terms'
const organizationName = 'Acme Design'

function options(locale: Locale = 'en', extra: Partial<RenderTemplateOptions> = {}): RenderTemplateOptions {
  return { branding, layout: defaultLayout, locale, messages: messages[locale], ...extra }
}

// ICU data differs between Node versions, so dates never go into snapshots and
// are checked by their parts after normalizing whitespace.
function lineStartingWith(text: string, prefix: string): string {
  const line = text.split('\n').find((candidate) => candidate.startsWith(prefix))
  expect(line, `line starting with "${prefix}"`).toBeDefined()
  return (line ?? '').replace(/\s+/g, ' ')
}

const snapshotCases: [file: string, render: (locale: Locale) => Promise<RenderedEmail>][] = [
  [
    'verify-email',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'verifyEmail',
        { userName: userNames[locale] ?? 'Lizzie', verifyUrl, expiresInMinutes: 1440 },
        options(locale),
      ),
  ],
  [
    'reset-password',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'resetPassword',
        { userName: userNames[locale] ?? 'Lizzie', resetUrl, expiresInMinutes: 30 },
        options(locale),
      ),
  ],
  [
    'password-changed',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'passwordChanged',
        { userName: userNames[locale] ?? 'Lizzie', ip: '203.0.113.7', supportUrl },
        options(locale),
      ),
  ],
  [
    'verify-email-change',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'verifyEmailChange',
        { userName: userNames[locale] ?? 'Lizzie', verifyUrl, expiresInMinutes: 1440 },
        options(locale),
      ),
  ],
  [
    'email-change-requested',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'emailChangeRequested',
        { userName: userNames[locale] ?? 'Lizzie', newEmail, ip: '203.0.113.7', cancelUrl },
        options(locale),
      ),
  ],
  [
    'email-changed',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'emailChanged',
        { userName: userNames[locale] ?? 'Lizzie', newEmail, ip: '203.0.113.7', supportUrl },
        options(locale),
      ),
  ],
  [
    'otp-code',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'otpCode',
        { userName: userNames[locale] ?? 'Lizzie', code, expiresInMinutes: 10 },
        options(locale),
      ),
  ],
  [
    'magic-link',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'magicLink',
        { userName: userNames[locale] ?? 'Lizzie', signInUrl, expiresInMinutes: 15 },
        options(locale),
      ),
  ],
  [
    'welcome',
    (locale) =>
      renderTemplate(builtInTemplates, 'welcome', { userName: userNames[locale] ?? 'Lizzie' }, options(locale)),
  ],
  [
    'new-sign-in',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'newSignIn',
        {
          userName: userNames[locale] ?? 'Lizzie',
          device: 'Chrome on macOS',
          location: 'Berlin, Germany',
          ip: '203.0.113.7',
          secureUrl,
        },
        options(locale),
      ),
  ],
  [
    'two-factor-enabled',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'twoFactorEnabled',
        { userName: userNames[locale] ?? 'Lizzie', ip: '203.0.113.7', supportUrl },
        options(locale),
      ),
  ],
  [
    'two-factor-disabled',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'twoFactorDisabled',
        { userName: userNames[locale] ?? 'Lizzie', ip: '203.0.113.7' },
        options(locale),
      ),
  ],
  [
    'account-locked',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'accountLocked',
        { userName: userNames[locale] ?? 'Lizzie', ip: '203.0.113.7', unlockUrl },
        options(locale),
      ),
  ],
  [
    'confirm-account-deletion',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'confirmAccountDeletion',
        { userName: userNames[locale] ?? 'Lizzie', confirmUrl, expiresInMinutes: 60 },
        options(locale),
      ),
  ],
  [
    'account-deleted',
    (locale) =>
      renderTemplate(builtInTemplates, 'accountDeleted', { userName: userNames[locale] ?? 'Lizzie' }, options(locale)),
  ],
  [
    'team-invite',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'teamInvite',
        {
          userName: userNames[locale] ?? 'Lizzie',
          inviterName: 'Anna Novak',
          inviterEmail: 'anna@example.com',
          organizationName,
          role: 'Editor',
          acceptUrl,
          expiresInMinutes: 10080,
        },
        options(locale),
      ),
  ],
  [
    'user-invite',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'userInvite',
        { userName: userNames[locale] ?? 'Lizzie', inviterName: 'Anna Novak', acceptUrl, expiresInMinutes: 4320 },
        options(locale),
      ),
  ],
  [
    'invite-accepted',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'inviteAccepted',
        { userName: userNames[locale] ?? 'Lizzie', memberName: 'Tom Lee', organizationName, membersUrl },
        options(locale),
      ),
  ],
  [
    'member-role-changed',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'memberRoleChanged',
        {
          userName: userNames[locale] ?? 'Lizzie',
          organizationName,
          role: 'Admin',
          previousRole: 'Editor',
          changedByName: 'Anna Novak',
          organizationUrl,
        },
        options(locale),
      ),
  ],
  [
    'member-removed',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'memberRemoved',
        { userName: userNames[locale] ?? 'Lizzie', organizationName, removedByName: 'Anna Novak' },
        options(locale),
      ),
  ],
  [
    'ownership-received',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'ownershipReceived',
        { userName: userNames[locale] ?? 'Lizzie', organizationName, previousOwnerName: 'Anna Novak', organizationUrl },
        options(locale),
      ),
  ],
  [
    'ownership-transferred',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'ownershipTransferred',
        {
          userName: userNames[locale] ?? 'Lizzie',
          organizationName,
          newOwnerName: 'Tom Lee',
          newRole: 'Admin',
          ip: '203.0.113.7',
          supportUrl,
        },
        options(locale),
      ),
  ],
  [
    'passkey-added',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'passkeyAdded',
        {
          userName: userNames[locale] ?? 'Lizzie',
          passkeyName: 'iPhone',
          device: 'Safari on iOS',
          ip: '203.0.113.7',
          secureUrl,
        },
        options(locale),
      ),
  ],
  [
    'passkey-removed',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'passkeyRemoved',
        { userName: userNames[locale] ?? 'Lizzie', passkeyName: 'YubiKey 5', ip: '203.0.113.7' },
        options(locale),
      ),
  ],
  [
    'recovery-code-used',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'recoveryCodeUsed',
        {
          userName: userNames[locale] ?? 'Lizzie',
          device: 'Chrome on macOS',
          ip: '203.0.113.7',
          remainingCodes: 3,
          regenerateUrl,
          secureUrl,
        },
        options(locale),
      ),
  ],
  [
    'api-key-created',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'apiKeyCreated',
        { userName: userNames[locale] ?? 'Lizzie', keyName: 'CI deploy', ip: '203.0.113.7', manageUrl },
        options(locale),
      ),
  ],
  [
    'account-unlocked',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'accountUnlocked',
        { userName: userNames[locale] ?? 'Lizzie', supportUrl },
        options(locale),
      ),
  ],
  [
    'data-export-ready',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'dataExportReady',
        { userName: userNames[locale] ?? 'Lizzie', downloadUrl, expiresInMinutes: 10080 },
        options(locale),
      ),
  ],
  [
    'policy-updated',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'policyUpdated',
        {
          userName: userNames[locale] ?? 'Lizzie',
          policy: 'terms',
          policyUrl,
          changes: ['Clearer rules for shared workspaces', 'A new section on refunds'],
        },
        options(locale),
      ),
  ],
]

// Their required dates would put ICU output into the snapshots.
const datedCases: [file: string, render: (locale: Locale) => Promise<RenderedEmail>][] = [
  [
    'api-key-expiring',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'apiKeyExpiring',
        { userName: userNames[locale] ?? 'Lizzie', keyName: 'CI deploy', expiresAt: changedAt, manageUrl },
        options(locale),
      ),
  ],
  [
    'inactive-account-warning',
    (locale) =>
      renderTemplate(
        builtInTemplates,
        'inactiveAccountWarning',
        { userName: userNames[locale] ?? 'Lizzie', deletionDate: changedAt, lastSignInAt: changedAt },
        options(locale),
      ),
  ],
]

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-05-04T12:00:00Z'))
})

afterAll(() => {
  vi.useRealTimers()
})

describe.each<Locale>(['en', 'be-Latn'])('built-in templates (%s)', (locale) => {
  it.each(snapshotCases)('%s matches the snapshot', async (file, render) => {
    const email = await render(locale)
    await expect(email.html).toMatchFileSnapshot(`./__snapshots__/${file}.${locale}.html`)
    await expect(`Subject: ${email.subject}\n\n${email.text}\n`).toMatchFileSnapshot(
      `./__snapshots__/${file}.${locale}.txt`,
    )
  })
})

describe.each(locales)('built-in templates in every locale (%s)', (locale) => {
  it.each([...snapshotCases, ...datedCases])('%s renders with every placeholder filled', async (_file, render) => {
    const email = await render(locale)
    for (const part of [email.subject, email.html, email.text]) {
      expect(part).not.toBe('')
      expect(part).not.toMatch(/\{[A-Za-z]+\}/)
    }
  })
})

describe('verifyEmail', () => {
  it('uses the subject, preheader and document language of the locale', async () => {
    const email = await renderTemplate(builtInTemplates, 'verifyEmail', { verifyUrl }, options('be'))
    expect(email.subject).toBe('Пацвердзіце email')
    expect(email.html).toContain('<html lang="be" ')
    expect(email.html).toContain('Застаўся адзін крок, каб завяршыць рэгістрацыю ў My App.')
  })

  it('greets without a name when there is none', async () => {
    for (const userName of [undefined, '   ']) {
      const email = await renderTemplate(builtInTemplates, 'verifyEmail', { userName, verifyUrl }, options())
      expect(email.text).toContain('\n\nHi there,\n\n')
      expect(email.text).not.toContain('{name}')
    }
  })

  it('leaves out the expiry note without expiresInMinutes', async () => {
    const email = await renderTemplate(builtInTemplates, 'verifyEmail', { verifyUrl }, options())
    expect(email.text).not.toContain('expires')
  })

  it('escapes the user name', async () => {
    const userName = '<img src=x onerror=alert(1)>'
    const email = await renderTemplate(builtInTemplates, 'verifyEmail', { userName, verifyUrl }, options())
    expect(email.html).not.toContain('<img src=x')
    expect(email.html).toContain('Hi &lt;img src=x onerror=alert(1)&gt;,')
    expect(email.text).toContain(`Hi ${userName},`)
  })
})

describe('resetPassword', () => {
  it('links the button and the fallback to the reset URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'resetPassword', { resetUrl }, options())
    expect(email.html.match(/href="https:\/\/myapp\.loc\/reset\?token=abc123"/g)).toHaveLength(3)
    expect(email.text).toContain(`Choose a new password: ${resetUrl}`)
  })
})

describe('passwordChanged', () => {
  it('points to the support address when there is no support URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'passwordChanged', {}, options())
    expect(email.html).toContain(
      'If it wasn&#39;t you, write to us right away at <a href="mailto:support@myapp.loc" style="color:#3b82f6;text-decoration:underline;">support@myapp.loc</a>.',
    )
    expect(email.text).toContain("If it wasn't you, write to us right away at support@myapp.loc.")
    expect(email.text).not.toContain('Contact support')
  })

  it('leaves out the details without changedAt and ip', async () => {
    const email = await renderTemplate(builtInTemplates, 'passwordChanged', {}, options())
    expect(email.text).not.toContain('When:')
    expect(email.text).not.toContain('IP address:')
  })

  it('shows when the password was changed, in UTC by default', async () => {
    const email = await renderTemplate(builtInTemplates, 'passwordChanged', { changedAt, ip: '203.0.113.7' }, options())
    const line = lineStartingWith(email.text, 'When: ')
    expect(line).toContain('2026')
    expect(line).toMatch(/\b4\b/)
    expect(line).toContain('9:30')
    expect(line).toContain('UTC')
    expect(email.text).toContain(`${lineStartingWith(email.text, 'When: ')}\nIP address: 203.0.113.7`)
    expect(email.html).toContain('When: ')
  })

  it('uses the timeZone prop over the default time zone', async () => {
    const minsk = await renderTemplate(
      builtInTemplates,
      'passwordChanged',
      { changedAt, timeZone: 'Europe/Minsk' },
      options('en', { timeZone: 'Asia/Tokyo' }),
    )
    expect(lineStartingWith(minsk.text, 'When: ')).toMatch(/12:30.*GMT\+3/)
    const tokyo = await renderTemplate(
      builtInTemplates,
      'passwordChanged',
      { changedAt },
      options('en', { timeZone: 'Asia/Tokyo' }),
    )
    expect(lineStartingWith(tokyo.text, 'When: ')).toMatch(/6:30.*GMT\+9/)
  })

  it('formats the date for the locale', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'passwordChanged',
      { changedAt, timeZone: 'Europe/Minsk' },
      options('be'),
    )
    const line = lineStartingWith(email.text, 'Калі: ')
    expect(line).toContain('2026')
    expect(line).toContain('12:30')
    expect(line).toContain('GMT+3')
  })

  it.each<[string, Record<string, unknown>, string]>([
    [
      'an unknown time zone',
      { timeZone: 'Mars/Base' },
      'timeZone: must be an IANA time zone like "Europe/Berlin", received "Mars/Base"',
    ],
    ['an invalid date', { changedAt: new Date('nope') }, 'changedAt: must be a valid Date'],
    ['an empty IP address', { ip: ' ' }, 'ip: must not be empty'],
    ['a relative support URL', { supportUrl: '/support' }, 'supportUrl: must be an absolute http: or https: URL'],
  ])('rejects %s', async (_case, props, detail) => {
    const error: unknown = await renderTemplate(builtInTemplates, 'passwordChanged', props, options()).then(
      () => undefined,
      (reason: unknown) => reason,
    )
    expect(error).toBeInstanceOf(MailerError)
    expect(error).toMatchObject({
      code: 'INVALID_PROPS',
      message: `Invalid props for template "passwordChanged": ${detail}.`,
    })
  })
})

describe('verifyEmailChange', () => {
  it('links the button and the fallback to the verify URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'verifyEmailChange', { verifyUrl }, options())
    expect(email.subject).toBe('Confirm your new email')
    expect(email.html.match(/href="https:\/\/myapp\.loc\/verify\?token=abc123"/g)).toHaveLength(3)
    expect(email.text).toContain(`Confirm new email: ${verifyUrl}`)
  })

  it('mentions expiry only with expiresInMinutes', async () => {
    const without = await renderTemplate(builtInTemplates, 'verifyEmailChange', { verifyUrl }, options())
    expect(without.text).not.toContain('expires')
    const withExpiry = await renderTemplate(
      builtInTemplates,
      'verifyEmailChange',
      { verifyUrl, expiresInMinutes: 60 },
      options(),
    )
    expect(withExpiry.text).toContain('The link expires in 1 hour.')
  })
})

describe('emailChangeRequested', () => {
  it('names the new address and links the cancel button', async () => {
    const email = await renderTemplate(builtInTemplates, 'emailChangeRequested', { newEmail, cancelUrl }, options())
    expect(email.text).toContain(`to change the email for your My App account to ${newEmail}.`)
    expect(email.text).toContain(`from the email we sent to ${newEmail}.`)
    expect(email.html.match(/href="https:\/\/myapp\.loc\/email\/cancel\?token=abc123"/g)).toHaveLength(3)
    expect(email.text).toContain(`Cancel the change: ${cancelUrl}`)
    expect(email.text).not.toContain('Contact support')
    expect(email.text).not.toContain('write to us right away')
  })

  it('points to support without a cancel URL', async () => {
    const withUrl = await renderTemplate(builtInTemplates, 'emailChangeRequested', { newEmail, supportUrl }, options())
    expect(withUrl.text).toContain(`Contact support: ${supportUrl}`)
    expect(withUrl.text).not.toContain('Cancel the change')
    const withAddress = await renderTemplate(builtInTemplates, 'emailChangeRequested', { newEmail }, options())
    expect(withAddress.html).toContain('<a href="mailto:support@myapp.loc"')
    expect(withAddress.text).toContain("If it wasn't you, write to us right away at support@myapp.loc.")
  })

  it('shows when and where the request came from', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'emailChangeRequested',
      { newEmail, requestedAt: changedAt, timeZone: 'Europe/Minsk', ip: '203.0.113.7' },
      options(),
    )
    const line = lineStartingWith(email.text, 'When: ')
    expect(line).toContain('2026')
    expect(line).toMatch(/12:30.*GMT\+3/)
    expect(email.text).toContain(`${line}\nIP address: 203.0.113.7`)
  })

  it('leaves out the details without requestedAt and ip', async () => {
    const email = await renderTemplate(builtInTemplates, 'emailChangeRequested', { newEmail }, options())
    expect(email.text).not.toContain('When:')
    expect(email.text).not.toContain('IP address:')
  })

  it('escapes the new address', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'emailChangeRequested',
      { newEmail: '<b>x</b>@example.com' },
      options(),
    )
    expect(email.html).not.toContain('<b>x</b>')
    expect(email.html).toContain('&lt;b&gt;x&lt;/b&gt;@example.com')
  })

  it.each<[string, Record<string, unknown>, string]>([
    ['a missing new address', {}, 'newEmail: is required'],
    ['an empty new address', { newEmail: ' ' }, 'newEmail: must not be empty'],
    ['a relative cancel URL', { newEmail, cancelUrl: '/cancel' }, 'cancelUrl: must be an absolute http: or https: URL'],
  ])('rejects %s', async (_case, props, detail) => {
    const error: unknown = await renderTemplate(
      builtInTemplates,
      'emailChangeRequested',
      props as never,
      options(),
    ).then(
      () => undefined,
      (reason: unknown) => reason,
    )
    expect(error).toBeInstanceOf(MailerError)
    expect(error).toMatchObject({
      code: 'INVALID_PROPS',
      message: `Invalid props for template "emailChangeRequested": ${detail}.`,
    })
  })
})

describe('emailChanged', () => {
  it('renders without props', async () => {
    const email = await renderTemplate(builtInTemplates, 'emailChanged', {}, options())
    expect(email.subject).toBe('Your email was changed')
    expect(email.text).not.toContain('New email:')
    expect(email.text).not.toContain('When:')
    expect(email.text).not.toContain('IP address:')
    expect(email.text).toContain('From now on, emails about your account go to the new address.')
    expect(email.html).toContain('<a href="mailto:support@myapp.loc"')
  })

  it('lists the new address, the time and the IP address in order', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'emailChanged',
      { newEmail: 'l***@example.com', changedAt, ip: '203.0.113.7' },
      options(),
    )
    expect(email.text).toContain(
      `New email: l***@example.com\n${lineStartingWith(email.text, 'When: ')}\nIP address: 203.0.113.7`,
    )
    expect(lineStartingWith(email.text, 'When: ')).toContain('UTC')
  })

  it('links the support button to the support URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'emailChanged', { supportUrl }, options())
    expect(email.text).toContain(`Contact support: ${supportUrl}`)
    expect(email.text).not.toContain('write to us right away')
  })
})

describe('otpCode', () => {
  it('shows the code in the body only', async () => {
    const email = await renderTemplate(builtInTemplates, 'otpCode', { code }, options())
    expect(email.subject).toBe('Your verification code')
    expect(email.subject).not.toContain(code)
    expect(email.html).toContain('Use this one-time code to continue in My App.')
    expect(email.html.match(new RegExp(code, 'g'))).toHaveLength(1)
    expect(email.html).toMatch(new RegExp(`letter-spacing:6px;[^"]*">${code}</td>`))
    expect(email.text).toContain(`Enter this code in My App to continue:\n\n${code}\n\n`)
    expect(email.text).toContain("Don't share this code with anyone.")
  })

  it('fills {code} in overridden subject and preheader texts', async () => {
    const overridden = buildMessages({
      en: { otpCode: { subject: 'Your code: {code}', preheader: '{code} is your {companyName} code.' } },
    })
    const email = await renderTemplate(
      builtInTemplates,
      'otpCode',
      { code },
      options('en', { messages: overridden.en }),
    )
    expect(email.subject).toBe(`Your code: ${code}`)
    expect(email.html).toContain(`${code} is your My App code.`)
  })

  it('mentions expiry only with expiresInMinutes', async () => {
    const without = await renderTemplate(builtInTemplates, 'otpCode', { code }, options())
    expect(without.text).not.toContain('expires')
    const withExpiry = await renderTemplate(builtInTemplates, 'otpCode', { code, expiresInMinutes: 5 }, options())
    expect(withExpiry.text).toContain('The code expires in 5 minutes.')
  })

  it('trims and escapes the code', async () => {
    const email = await renderTemplate(builtInTemplates, 'otpCode', { code: ' <b>12</b> ' }, options())
    expect(email.html).not.toContain('<b>12</b>')
    expect(email.html).toContain('>&lt;b&gt;12&lt;/b&gt;</td>')
    expect(email.text).toContain('\n\n<b>12</b>\n\n')
  })

  it.each<[string, Record<string, unknown>, string]>([
    ['a missing code', {}, 'code: is required'],
    ['an empty code', { code: ' ' }, 'code: must not be empty'],
    ['a numeric code', { code: 482913 }, 'code: must be a string, received number'],
    ['a zero expiry', { code, expiresInMinutes: 0 }, 'expiresInMinutes: must be a positive integer'],
  ])('rejects %s', async (_case, props, detail) => {
    const error: unknown = await renderTemplate(builtInTemplates, 'otpCode', props as never, options()).then(
      () => undefined,
      (reason: unknown) => reason,
    )
    expect(error).toBeInstanceOf(MailerError)
    expect(error).toMatchObject({ code: 'INVALID_PROPS', message: `Invalid props for template "otpCode": ${detail}.` })
  })
})

describe('magicLink', () => {
  it('links the button and the fallback to the sign-in URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'magicLink', { signInUrl }, options())
    expect(email.subject).toBe('Your sign-in link')
    expect(email.html.match(/href="https:\/\/myapp\.loc\/sign-in\?token=abc123"/g)).toHaveLength(3)
    expect(email.text).toContain(`Sign in: ${signInUrl}`)
    expect(email.text).toContain("Don't share this link: anyone who has it can sign in to your account.")
  })

  it('mentions expiry only with expiresInMinutes', async () => {
    const without = await renderTemplate(builtInTemplates, 'magicLink', { signInUrl }, options())
    expect(without.text).not.toContain('expires')
    const withExpiry = await renderTemplate(
      builtInTemplates,
      'magicLink',
      { signInUrl, expiresInMinutes: 15 },
      options('be'),
    )
    expect(withExpiry.text).toContain('Спасылка дзейнічае 15 хвілін.')
  })

  it('rejects a link that is not http(s)', async () => {
    const error: unknown = await renderTemplate(
      builtInTemplates,
      'magicLink',
      { signInUrl: 'javascript:alert(1)' },
      options(),
    ).then(
      () => undefined,
      (reason: unknown) => reason,
    )
    expect(error).toMatchObject({
      code: 'INVALID_PROPS',
      message: 'Invalid props for template "magicLink": signInUrl: must be an absolute http: or https: URL.',
    })
  })
})

describe('welcome', () => {
  it('links to the app URL without props', async () => {
    const email = await renderTemplate(builtInTemplates, 'welcome', {}, options())
    expect(email.subject).toBe('Welcome to My App')
    expect(email.text).toContain('\n\nHi there,\n\n')
    expect(email.text).toContain('Get started: https://myapp.loc/')
    expect(email.html.match(/href="https:\/\/myapp\.loc\/"/g)).toHaveLength(4)
  })

  it('links the button and the fallback to startUrl', async () => {
    const startUrl = 'https://myapp.loc/onboarding'
    const email = await renderTemplate(builtInTemplates, 'welcome', { startUrl }, options())
    expect(email.html.match(/href="https:\/\/myapp\.loc\/onboarding"/g)).toHaveLength(3)
    expect(email.text).toContain(`Get started: ${startUrl}`)
  })

  it('rejects a relative startUrl', async () => {
    const error: unknown = await renderTemplate(builtInTemplates, 'welcome', { startUrl: '/start' }, options()).then(
      () => undefined,
      (reason: unknown) => reason,
    )
    expect(error).toMatchObject({
      code: 'INVALID_PROPS',
      message: 'Invalid props for template "welcome": startUrl: must be an absolute http: or https: URL.',
    })
  })
})

describe('newSignIn', () => {
  it('renders without props', async () => {
    const email = await renderTemplate(builtInTemplates, 'newSignIn', {}, options())
    expect(email.subject).toBe('New sign-in to your account')
    expect(email.text).toContain('\n\nHi there,\n\nWe noticed a new sign-in to your My App account.\n\n')
    expect(email.text).not.toContain('When:')
    expect(email.text).not.toContain('IP address:')
    expect(email.html).toContain('<a href="mailto:support@myapp.loc"')
    expect(email.text).toContain("If it wasn't you, write to us right away at support@myapp.loc.")
  })

  it('lists the time, device, location and IP address in order', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'newSignIn',
      {
        signedInAt: changedAt,
        timeZone: 'Europe/Minsk',
        device: 'Firefox on Windows',
        location: 'Minsk, Belarus',
        ip: '203.0.113.7',
      },
      options(),
    )
    const line = lineStartingWith(email.text, 'When: ')
    expect(line).toContain('2026')
    expect(line).toMatch(/12:30.*GMT\+3/)
    expect(email.text).toContain(
      `${line}\nDevice: Firefox on Windows\nLocation: Minsk, Belarus\nIP address: 203.0.113.7`,
    )
  })

  it('links the secure button and replaces support with it', async () => {
    const email = await renderTemplate(builtInTemplates, 'newSignIn', { secureUrl, supportUrl }, options())
    expect(email.html.match(/href="https:\/\/myapp\.loc\/security\?token=abc123"/g)).toHaveLength(3)
    expect(email.text).toContain(
      `If it wasn't you, secure your account right away.\n\nSecure your account: ${secureUrl}`,
    )
    expect(email.text).not.toContain('Contact support')
    expect(email.html).not.toContain(supportUrl)
  })

  it('links the support button without a secure URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'newSignIn', { supportUrl }, options('be'))
    expect(email.text).toContain(`Звярнуцца ў падтрымку: ${supportUrl}`)
    expect(email.text).not.toContain('Абараніць акаўнт')
  })

  it('escapes the device and the location', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'newSignIn',
      { device: '<b>Browser</b>', location: 'A & B' },
      options(),
    )
    expect(email.html).not.toContain('<b>Browser</b>')
    expect(email.html).toContain('Device: &lt;b&gt;Browser&lt;/b&gt;')
    expect(email.html).toContain('Location: A &amp; B')
  })

  it.each<[string, Record<string, unknown>, string]>([
    ['an empty device', { device: ' ' }, 'device: must not be empty'],
    ['a numeric location', { location: 42 }, 'location: must be a string, received number'],
    ['an invalid date', { signedInAt: new Date('nope') }, 'signedInAt: must be a valid Date'],
    ['a relative secure URL', { secureUrl: '/security' }, 'secureUrl: must be an absolute http: or https: URL'],
  ])('rejects %s', async (_case, props, detail) => {
    const error: unknown = await renderTemplate(builtInTemplates, 'newSignIn', props, options()).then(
      () => undefined,
      (reason: unknown) => reason,
    )
    expect(error).toBeInstanceOf(MailerError)
    expect(error).toMatchObject({
      code: 'INVALID_PROPS',
      message: `Invalid props for template "newSignIn": ${detail}.`,
    })
  })
})

describe.each(['twoFactorEnabled', 'twoFactorDisabled'] as const)('%s', (template) => {
  const subjects = {
    twoFactorEnabled: 'Two-factor authentication was turned on',
    twoFactorDisabled: 'Two-factor authentication was turned off',
  }

  it('renders without props', async () => {
    const email = await renderTemplate(builtInTemplates, template, {}, options())
    expect(email.subject).toBe(subjects[template])
    expect(email.text).not.toContain('When:')
    expect(email.text).not.toContain('IP address:')
    expect(email.text).toContain("If this was you, you don't need to do anything.")
    expect(email.html).toContain('<a href="mailto:support@myapp.loc"')
  })

  it('shows when and where the change came from', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      template,
      { changedAt, timeZone: 'Europe/Minsk', ip: '203.0.113.7' },
      options('be'),
    )
    const line = lineStartingWith(email.text, 'Калі: ')
    expect(line).toMatch(/12:30.*GMT\+3/)
    expect(email.text).toContain(`${line}\nIP-адрас: 203.0.113.7`)
  })

  it('links the support button to the support URL', async () => {
    const email = await renderTemplate(builtInTemplates, template, { supportUrl }, options())
    expect(email.text).toContain(`Contact support: ${supportUrl}`)
    expect(email.text).not.toContain('write to us right away')
  })

  it('rejects a relative support URL', async () => {
    const error: unknown = await renderTemplate(builtInTemplates, template, { supportUrl: '/help' }, options()).then(
      () => undefined,
      (reason: unknown) => reason,
    )
    expect(error).toMatchObject({
      code: 'INVALID_PROPS',
      message: `Invalid props for template "${template}": supportUrl: must be an absolute http: or https: URL.`,
    })
  })
})

describe('accountLocked', () => {
  it('offers help from the support address without props', async () => {
    const email = await renderTemplate(builtInTemplates, 'accountLocked', {}, options())
    expect(email.subject).toBe('Your account is locked')
    expect(email.text).not.toContain('Locked until:')
    expect(email.text).not.toContain('Unlock account')
    expect(email.html).toContain(
      'Need help getting back into your account? Write to us at <a href="mailto:support@myapp.loc" style="color:#3b82f6;text-decoration:underline;">support@myapp.loc</a>.',
    )
    expect(email.text).toMatch(
      /Write to us at support@myapp\.loc\.\n\n-+\n\nIf it wasn't you, someone may be trying to guess your password\./,
    )
  })

  it('shows when the lock ends', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'accountLocked',
      { lockedUntil: changedAt, ip: '203.0.113.7' },
      options('en', { timeZone: 'Asia/Tokyo' }),
    )
    const line = lineStartingWith(email.text, 'Locked until: ')
    expect(line).toContain('2026')
    expect(line).toMatch(/6:30.*GMT\+9/)
    expect(email.text).toContain(`${line}\nIP address: 203.0.113.7`)
  })

  it('links the unlock button and replaces support with it', async () => {
    const email = await renderTemplate(builtInTemplates, 'accountLocked', { unlockUrl, supportUrl }, options())
    expect(email.html.match(/href="https:\/\/myapp\.loc\/unlock\?token=abc123"/g)).toHaveLength(3)
    expect(email.text).toContain(`To unlock your account right away, click the button.\n\nUnlock account: ${unlockUrl}`)
    expect(email.text).not.toContain('Contact support')
    expect(email.html).not.toContain(supportUrl)
  })

  it('links the support button without an unlock URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'accountLocked', { supportUrl }, options())
    expect(email.text).toContain(
      `Need help getting back into your account? Contact support.\n\nContact support: ${supportUrl}`,
    )
  })

  it.each<[string, Record<string, unknown>, string]>([
    ['an invalid date', { lockedUntil: new Date('nope') }, 'lockedUntil: must be a valid Date'],
    ['a date string', { lockedUntil: '2026-05-04' }, 'lockedUntil: must be a valid Date'],
    ['a relative unlock URL', { unlockUrl: '/unlock' }, 'unlockUrl: must be an absolute http: or https: URL'],
    ['an unknown prop', { reason: 'attempts' }, 'has unknown key "reason"'],
  ])('rejects %s', async (_case, props, detail) => {
    const error: unknown = await renderTemplate(builtInTemplates, 'accountLocked', props, options()).then(
      () => undefined,
      (reason: unknown) => reason,
    )
    expect(error).toBeInstanceOf(MailerError)
    expect(error).toMatchObject({
      code: 'INVALID_PROPS',
      message: `Invalid props for template "accountLocked": ${detail}.`,
    })
  })
})

describe('confirmAccountDeletion', () => {
  it('warns before the button and links it to the confirm URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'confirmAccountDeletion', { confirmUrl }, options())
    expect(email.subject).toBe('Confirm account deletion')
    expect(email.html.match(/href="https:\/\/myapp\.loc\/account\/delete\?token=abc123"/g)).toHaveLength(3)
    expect(email.text).toContain(
      `Click the button to confirm.\n\nOnce deleted, your account and your data can't be restored.\n\nDelete account: ${confirmUrl}`,
    )
    expect(email.text).toContain("If you didn't ask for this, just ignore this email. Your account won't be deleted.")
  })

  it('mentions expiry only with expiresInMinutes', async () => {
    const without = await renderTemplate(builtInTemplates, 'confirmAccountDeletion', { confirmUrl }, options())
    expect(without.text).not.toContain('expires')
    const withExpiry = await renderTemplate(
      builtInTemplates,
      'confirmAccountDeletion',
      { confirmUrl, expiresInMinutes: 60 },
      options('be'),
    )
    expect(withExpiry.text).toContain('Спасылка дзейнічае 1 гадзіну.')
  })

  it.each<[string, Record<string, unknown>, string]>([
    ['a missing confirm URL', {}, 'confirmUrl: is required'],
    ['a relative confirm URL', { confirmUrl: '/delete' }, 'confirmUrl: must be an absolute http: or https: URL'],
    ['a zero expiry', { confirmUrl, expiresInMinutes: 0 }, 'expiresInMinutes: must be a positive integer'],
  ])('rejects %s', async (_case, props, detail) => {
    const error: unknown = await renderTemplate(
      builtInTemplates,
      'confirmAccountDeletion',
      props as never,
      options(),
    ).then(
      () => undefined,
      (reason: unknown) => reason,
    )
    expect(error).toBeInstanceOf(MailerError)
    expect(error).toMatchObject({
      code: 'INVALID_PROPS',
      message: `Invalid props for template "confirmAccountDeletion": ${detail}.`,
    })
  })
})

describe('accountDeleted', () => {
  it('renders without props', async () => {
    const email = await renderTemplate(builtInTemplates, 'accountDeleted', {}, options())
    expect(email.subject).toBe('Your account was deleted')
    expect(email.text).toContain(
      '\n\nHi there,\n\nYour My App account was deleted, as you asked.\n\nThanks for using My App.',
    )
    expect(email.html).toContain('<a href="mailto:support@myapp.loc"')
    expect(email.text).toContain("If it wasn't you, write to us right away at support@myapp.loc.")
  })

  it('links the support button to the support URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'accountDeleted', { supportUrl }, options('be'))
    expect(email.text).toContain(`Звярнуцца ў падтрымку: ${supportUrl}`)
    expect(email.text).not.toContain('адразу напішыце нам')
  })

  it.each<[string, Record<string, unknown>, string]>([
    ['a relative support URL', { supportUrl: '/help' }, 'supportUrl: must be an absolute http: or https: URL'],
    ['an unknown prop', { deletedAt: new Date() }, 'has unknown key "deletedAt"'],
  ])('rejects %s', async (_case, props, detail) => {
    const error: unknown = await renderTemplate(builtInTemplates, 'accountDeleted', props, options()).then(
      () => undefined,
      (reason: unknown) => reason,
    )
    expect(error).toBeInstanceOf(MailerError)
    expect(error).toMatchObject({
      code: 'INVALID_PROPS',
      message: `Invalid props for template "accountDeleted": ${detail}.`,
    })
  })
})

async function propsError(template: keyof typeof builtInTemplates, props: Record<string, unknown>): Promise<unknown> {
  return renderTemplate(builtInTemplates, template, props as never, options()).then(
    () => undefined,
    (reason: unknown) => reason,
  )
}

describe('teamInvite', () => {
  it('names the inviter by name and email address', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'teamInvite',
      { inviterName: 'Anna', inviterEmail: 'anna@example.com', organizationName, acceptUrl },
      options(),
    )
    expect(email.subject).toBe('Join Acme Design on My App')
    expect(email.text).toContain('Anna (anna@example.com) invited you to join Acme Design on My App.')
    expect(email.html.match(/href="https:\/\/myapp\.loc\/invite\?token=abc123"/g)).toHaveLength(3)
    expect(email.text).toContain(`Accept invitation: ${acceptUrl}`)
  })

  it('names the inviter by email address alone, or not at all', async () => {
    const byEmail = await renderTemplate(
      builtInTemplates,
      'teamInvite',
      { inviterName: ' ', inviterEmail: 'anna@example.com', organizationName, acceptUrl },
      options(),
    )
    expect(byEmail.text).toContain('anna@example.com invited you to join Acme Design on My App.')
    const anonymous = await renderTemplate(builtInTemplates, 'teamInvite', { organizationName, acceptUrl }, options())
    expect(anonymous.text).toContain("You've been invited to join Acme Design on My App.")
  })

  it('shows the role and the expiry only when given', async () => {
    const without = await renderTemplate(builtInTemplates, 'teamInvite', { organizationName, acceptUrl }, options())
    expect(without.text).not.toContain('Role:')
    expect(without.text).not.toContain('expires')
    const withBoth = await renderTemplate(
      builtInTemplates,
      'teamInvite',
      { organizationName, acceptUrl, role: 'Editor', expiresInMinutes: 10080 },
      options(),
    )
    expect(withBoth.text).toContain('Role: Editor')
    expect(withBoth.text).toContain('The invitation expires in 7 days.')
  })

  it('escapes the organization and inviter names', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'teamInvite',
      { inviterName: '<b>Anna</b>', organizationName: 'A & B', acceptUrl },
      options(),
    )
    expect(email.html).not.toContain('<b>Anna</b>')
    expect(email.html).toContain('&lt;b&gt;Anna&lt;/b&gt; invited you to join A &amp; B')
  })

  it.each<[string, Record<string, unknown>, string]>([
    ['a missing organization name', { acceptUrl }, 'organizationName: is required'],
    ['an empty organization name', { organizationName: ' ', acceptUrl }, 'organizationName: must not be empty'],
    ['a missing accept URL', { organizationName }, 'acceptUrl: is required'],
    [
      'a zero expiry',
      { organizationName, acceptUrl, expiresInMinutes: 0 },
      'expiresInMinutes: must be a positive integer',
    ],
  ])('rejects %s', async (_case, props, detail) => {
    const error = await propsError('teamInvite', props)
    expect(error).toBeInstanceOf(MailerError)
    expect(error).toMatchObject({
      code: 'INVALID_PROPS',
      message: `Invalid props for template "teamInvite": ${detail}.`,
    })
  })
})

describe('userInvite', () => {
  it('says an account was created and links the button to the accept URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'userInvite', { inviterName: 'Anna', acceptUrl }, options())
    expect(email.subject).toBe("You're invited to My App")
    expect(email.text).toContain('Anna invited you to My App and created an account for you.')
    expect(email.text).toContain('Accept the invitation to set your password and start using My App.')
    expect(email.html.match(/href="https:\/\/myapp\.loc\/invite\?token=abc123"/g)).toHaveLength(3)
  })

  it('works without an inviter', async () => {
    const email = await renderTemplate(builtInTemplates, 'userInvite', { acceptUrl }, options('be'))
    expect(email.text).toContain('Вас запрасілі ў My App. Для вас ужо створаны акаўнт.')
  })

  it('rejects a relative accept URL', async () => {
    expect(await propsError('userInvite', { acceptUrl: '/invite' })).toMatchObject({
      code: 'INVALID_PROPS',
      message: 'Invalid props for template "userInvite": acceptUrl: must be an absolute http: or https: URL.',
    })
  })
})

describe('inviteAccepted', () => {
  it('names the member and the organization', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'inviteAccepted',
      { memberName: 'Tom', organizationName, membersUrl },
      options(),
    )
    expect(email.subject).toBe('Tom accepted your invitation')
    expect(email.text).toContain('Tom accepted your invitation and joined Acme Design.')
    expect(email.text).toContain(`View members: ${membersUrl}`)
  })

  it('names the app without an organization and has no button without a members URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'inviteAccepted', { memberName: 'tom@example.com' }, options())
    expect(email.text).toContain('tom@example.com accepted your invitation and joined My App.')
    expect(email.text).not.toContain('View members')
  })

  it('rejects a missing member name', async () => {
    expect(await propsError('inviteAccepted', {})).toMatchObject({
      code: 'INVALID_PROPS',
      message: 'Invalid props for template "inviteAccepted": memberName: is required.',
    })
  })
})

describe('memberRoleChanged', () => {
  it('lists the new role, the previous role and who changed it', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'memberRoleChanged',
      { organizationName, role: 'Admin', previousRole: 'Editor', changedByName: 'Anna', organizationUrl },
      options(),
    )
    expect(email.subject).toBe('Your role in Acme Design was changed')
    expect(email.text).toContain('New role: Admin\nPrevious role: Editor\nChanged by: Anna')
    expect(email.text).toContain(`Go to Acme Design: ${organizationUrl}`)
    expect(email.text).toContain('If you have questions about this change, ask an admin of Acme Design.')
  })

  it('shows only the new role and no button without the optional props', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'memberRoleChanged',
      { organizationName, role: 'Viewer' },
      options(),
    )
    expect(email.text).toContain('New role: Viewer\n')
    expect(email.text).not.toContain('Previous role:')
    expect(email.text).not.toContain('Changed by:')
    expect(email.text).not.toContain('Go to Acme Design')
  })

  it('rejects a missing role', async () => {
    expect(await propsError('memberRoleChanged', { organizationName })).toMatchObject({
      code: 'INVALID_PROPS',
      message: 'Invalid props for template "memberRoleChanged": role: is required.',
    })
  })
})

describe('memberRemoved', () => {
  it('says who removed the member and that the account stays', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'memberRemoved',
      { organizationName, removedByName: 'Anna' },
      options(),
    )
    expect(email.subject).toBe('You were removed from Acme Design')
    expect(email.text).toContain('You no longer have access to Acme Design on My App.\n\nRemoved by: Anna')
    expect(email.text).toContain('Your My App account stays active.')
    expect(email.text).toContain('If you think this is a mistake, contact an admin of Acme Design.')
  })

  it('leaves out who removed the member when unknown', async () => {
    const email = await renderTemplate(builtInTemplates, 'memberRemoved', { organizationName }, options())
    expect(email.text).not.toContain('Removed by:')
  })

  it('rejects an unknown prop', async () => {
    expect(await propsError('memberRemoved', { organizationName, supportUrl })).toMatchObject({
      code: 'INVALID_PROPS',
      message: 'Invalid props for template "memberRemoved": has unknown key "supportUrl".',
    })
  })
})

describe('ownershipReceived', () => {
  it('names the previous owner and links to the organization', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'ownershipReceived',
      { organizationName, previousOwnerName: 'Anna', organizationUrl },
      options(),
    )
    expect(email.subject).toBe("You're now the owner of Acme Design")
    expect(email.text).toContain('Anna transferred ownership of Acme Design on My App to you.')
    expect(email.text).toContain(`Go to Acme Design: ${organizationUrl}`)
  })

  it('works without the previous owner and the URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'ownershipReceived', { organizationName }, options())
    expect(email.text).toContain('Ownership of Acme Design on My App was transferred to you.')
    expect(email.text).not.toContain('Go to Acme Design')
  })
})

describe('ownershipTransferred', () => {
  it('names the new owner and lists the new role, time and IP address', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'ownershipTransferred',
      { organizationName, newOwnerName: 'Tom', newRole: 'Admin', transferredAt: changedAt, ip: '203.0.113.7' },
      options(),
    )
    expect(email.text).toContain("transferred to Tom, so you're no longer its owner.")
    const line = lineStartingWith(email.text, 'When: ')
    expect(line).toContain('UTC')
    expect(email.text).toContain(`Your role: Admin\n${line}\nIP address: 203.0.113.7`)
  })

  it('points to the support address without a support URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'ownershipTransferred', { organizationName }, options())
    expect(email.text).toContain('was transferred to another member')
    expect(email.html).toContain('<a href="mailto:support@myapp.loc"')
  })
})

describe.each(['passkeyAdded', 'passkeyRemoved'] as const)('%s', (template) => {
  it('lists the passkey, time, device and IP address in order', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      template,
      { passkeyName: 'iPhone', changedAt, device: 'Safari on iOS', ip: '203.0.113.7' },
      options(),
    )
    const line = lineStartingWith(email.text, 'When: ')
    expect(email.text).toContain(`Passkey: iPhone\n${line}\nDevice: Safari on iOS\nIP address: 203.0.113.7`)
  })

  it('links the secure button and replaces support with it', async () => {
    const email = await renderTemplate(builtInTemplates, template, { secureUrl, supportUrl }, options())
    expect(email.text).toContain(`Secure your account: ${secureUrl}`)
    expect(email.text).not.toContain('Contact support')
  })

  it('points to support without a secure URL', async () => {
    const withUrl = await renderTemplate(builtInTemplates, template, { supportUrl }, options())
    expect(withUrl.text).toContain(`Contact support: ${supportUrl}`)
    const withAddress = await renderTemplate(builtInTemplates, template, {}, options())
    expect(withAddress.text).toContain("If it wasn't you, write to us right away at support@myapp.loc.")
  })
})

describe('recoveryCodeUsed', () => {
  it('shows how many codes are left and offers new ones', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'recoveryCodeUsed',
      { remainingCodes: 3, regenerateUrl },
      options(),
    )
    expect(email.text).toContain('Recovery codes left: 3')
    expect(email.text).toContain(
      `You can generate a new set of recovery codes at any time.\n\nGenerate new codes: ${regenerateUrl}`,
    )
    expect(email.text).not.toContain('You have no recovery codes left.')
  })

  it('asks for new codes when none are left', async () => {
    const withUrl = await renderTemplate(
      builtInTemplates,
      'recoveryCodeUsed',
      { remainingCodes: 0, regenerateUrl },
      options(),
    )
    expect(withUrl.text).toContain('Recovery codes left: 0')
    expect(withUrl.text).toMatch(/You have no recovery codes left\.[^\n]*\n\nGenerate new codes: /)
    const withoutUrl = await renderTemplate(builtInTemplates, 'recoveryCodeUsed', { remainingCodes: 0 }, options())
    expect(withoutUrl.text).toContain('You have no recovery codes left.')
    expect(withoutUrl.text).not.toContain('Generate new codes')
  })

  it('says nothing about codes without remainingCodes and regenerateUrl', async () => {
    const email = await renderTemplate(builtInTemplates, 'recoveryCodeUsed', {}, options())
    expect(email.text).not.toContain('Recovery codes left')
    expect(email.text).not.toContain('Generate new codes')
    expect(email.text).toContain('someone may have your recovery codes. Write to us right away at support@myapp.loc.')
  })

  it('links the secure button and replaces support with it', async () => {
    const email = await renderTemplate(builtInTemplates, 'recoveryCodeUsed', { secureUrl, supportUrl }, options())
    expect(email.text).toContain(`Secure your account right away.\n\nSecure your account: ${secureUrl}`)
    expect(email.text).not.toContain('Contact support')
  })

  it.each<[string, Record<string, unknown>, string]>([
    ['a negative count', { remainingCodes: -1 }, 'remainingCodes: must be a non-negative integer'],
    ['a fractional count', { remainingCodes: 1.5 }, 'remainingCodes: must be a non-negative integer'],
    [
      'a relative regenerate URL',
      { regenerateUrl: '/codes' },
      'regenerateUrl: must be an absolute http: or https: URL',
    ],
  ])('rejects %s', async (_case, props, detail) => {
    expect(await propsError('recoveryCodeUsed', props)).toMatchObject({
      code: 'INVALID_PROPS',
      message: `Invalid props for template "recoveryCodeUsed": ${detail}.`,
    })
  })
})

describe('apiKeyCreated', () => {
  it('lists the name, creation and expiry times and IP address in order', async () => {
    const expiresAt = new Date('2027-05-04T09:30:00Z')
    const email = await renderTemplate(
      builtInTemplates,
      'apiKeyCreated',
      { keyName: 'CI deploy', createdAt: changedAt, expiresAt, ip: '203.0.113.7' },
      options(),
    )
    const created = lineStartingWith(email.text, 'When: ')
    const expires = lineStartingWith(email.text, 'Expires: ')
    expect(expires).toContain('2027')
    expect(email.text).toContain(`Name: CI deploy\n${created}\n${expires}\nIP address: 203.0.113.7`)
  })

  it('links the manage button and replaces support with it', async () => {
    const email = await renderTemplate(builtInTemplates, 'apiKeyCreated', { manageUrl, supportUrl }, options())
    expect(email.text).toContain(
      `If it wasn't you, revoke the key and secure your account right away.\n\nManage API keys: ${manageUrl}`,
    )
    expect(email.text).not.toContain('Contact support')
  })

  it('points to support without a manage URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'apiKeyCreated', {}, options())
    expect(email.text).toContain("If it wasn't you, write to us right away at support@myapp.loc.")
  })

  it('rejects the key itself', async () => {
    expect(await propsError('apiKeyCreated', { key: 'sk_live_123' })).toMatchObject({
      code: 'INVALID_PROPS',
      message: 'Invalid props for template "apiKeyCreated": has unknown key "key".',
    })
  })
})

describe('apiKeyExpiring', () => {
  it('shows the expiry and links the manage button', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'apiKeyExpiring',
      { keyName: 'CI deploy', expiresAt: changedAt, timeZone: 'Europe/Minsk', manageUrl },
      options(),
    )
    expect(email.subject).toBe('Your API key expires soon')
    expect(lineStartingWith(email.text, 'Expires: ')).toMatch(/12:30.*GMT\+3/)
    expect(email.text).toContain(`Manage API keys: ${manageUrl}`)
  })

  it('has no button without a manage URL', async () => {
    const email = await renderTemplate(builtInTemplates, 'apiKeyExpiring', { expiresAt: changedAt }, options())
    expect(email.text).not.toContain('Name:')
    expect(email.text).not.toContain('Manage API keys')
  })

  it('rejects a missing expiry', async () => {
    expect(await propsError('apiKeyExpiring', {})).toMatchObject({
      code: 'INVALID_PROPS',
      message: 'Invalid props for template "apiKeyExpiring": expiresAt: is required.',
    })
  })
})

describe('accountUnlocked', () => {
  it('links the sign-in button to the app URL by default', async () => {
    const email = await renderTemplate(builtInTemplates, 'accountUnlocked', {}, options())
    expect(email.subject).toBe('Your account is unlocked')
    expect(email.text).toContain('Sign in: https://myapp.loc/')
    expect(email.text).toContain("Still can't sign in? Write to us at support@myapp.loc.")
  })

  it('links the sign-in and support buttons to their URLs', async () => {
    const email = await renderTemplate(builtInTemplates, 'accountUnlocked', { signInUrl, supportUrl }, options())
    expect(email.text).toContain(`Sign in: ${signInUrl}`)
    expect(email.text).toContain(`Contact support: ${supportUrl}`)
  })
})

describe('dataExportReady', () => {
  it('links the download button and mentions expiry only with expiresInMinutes', async () => {
    const without = await renderTemplate(builtInTemplates, 'dataExportReady', { downloadUrl }, options())
    expect(without.text).toContain(`Download your data: ${downloadUrl}`)
    expect(without.text).not.toContain('expires')
    expect(without.text).toContain("Don't share the link with anyone.")
    const withExpiry = await renderTemplate(
      builtInTemplates,
      'dataExportReady',
      { downloadUrl, expiresInMinutes: 10080 },
      options('be'),
    )
    expect(withExpiry.text).toContain('Спасылка дзейнічае 7 дзён.')
  })

  it('rejects a missing download URL', async () => {
    expect(await propsError('dataExportReady', {})).toMatchObject({
      code: 'INVALID_PROPS',
      message: 'Invalid props for template "dataExportReady": downloadUrl: is required.',
    })
  })
})

describe('inactiveAccountWarning', () => {
  it('shows the deletion date and links the sign-in button to the app URL by default', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'inactiveAccountWarning',
      { deletionDate: changedAt },
      options(),
    )
    expect(lineStartingWith(email.text, 'Deletion date: ')).toContain('2026')
    expect(email.text).not.toContain('Last sign-in:')
    expect(email.text).toContain('Sign in: https://myapp.loc/')
  })

  it('shows the last sign-in and links the button to signInUrl', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'inactiveAccountWarning',
      { deletionDate: changedAt, lastSignInAt: new Date('2025-01-02T03:04:00Z'), signInUrl },
      options(),
    )
    expect(lineStartingWith(email.text, 'Last sign-in: ')).toContain('2025')
    expect(email.text).toContain(`Sign in: ${signInUrl}`)
  })

  it('rejects a missing deletion date', async () => {
    expect(await propsError('inactiveAccountWarning', {})).toMatchObject({
      code: 'INVALID_PROPS',
      message: 'Invalid props for template "inactiveAccountWarning": deletionDate: is required.',
    })
  })
})

describe('policyUpdated', () => {
  it('uses the terms of service texts and lists the changes', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'policyUpdated',
      { policy: 'terms', policyUrl, changes: ['Clearer rules', '<b>Refunds</b>'] },
      options(),
    )
    expect(email.subject).toBe('Updates to our Terms of Service')
    expect(email.text).toContain("What's changing:\n• Clearer rules\n• <b>Refunds</b>")
    expect(email.html).toContain('• &lt;b&gt;Refunds&lt;/b&gt;')
    expect(email.text).toContain(`Read the Terms of Service: ${policyUrl}`)
    expect(email.text).toContain('you agree to the updated terms.')
  })

  it('uses the privacy policy texts and shows when the changes take effect', async () => {
    const email = await renderTemplate(
      builtInTemplates,
      'policyUpdated',
      { policy: 'privacy', policyUrl, effectiveAt: changedAt },
      options(),
    )
    expect(email.subject).toBe('Updates to our Privacy Policy')
    expect(lineStartingWith(email.text, 'Effective from: ')).toContain('2026')
    expect(email.text).not.toContain("What's changing:")
    expect(email.text).toContain("You don't need to do anything.")
  })

  it.each<[string, Record<string, unknown>, string]>([
    ['an unknown policy', { policy: 'cookies', policyUrl }, 'policy: must be "terms" or "privacy", received "cookies"'],
    [
      'changes that are not an array',
      { policy: 'terms', policyUrl, changes: 'All' },
      'changes: must be an array of strings, received "All"',
    ],
    ['an empty change', { policy: 'terms', policyUrl, changes: [' '] }, 'changes.0: must not be empty'],
  ])('rejects %s', async (_case, props, detail) => {
    expect(await propsError('policyUpdated', props)).toMatchObject({
      code: 'INVALID_PROPS',
      message: `Invalid props for template "policyUpdated": ${detail}.`,
    })
  })
})

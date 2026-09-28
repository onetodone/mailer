import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { defaultLayout } from '../../src/core/layout'
import { resolveBranding } from '../../src/core/theme'
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
const userNames: Partial<Record<Locale, string>> = { be: 'Ліза' }
const verifyUrl = 'https://myapp.loc/verify?token=abc123'
const resetUrl = 'https://myapp.loc/reset?token=abc123'
const supportUrl = 'https://myapp.loc/support'
const changedAt = new Date('2026-05-04T09:30:00Z')

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
]

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-05-04T12:00:00Z'))
})

afterAll(() => {
  vi.useRealTimers()
})

describe.each(locales)('built-in templates (%s)', (locale) => {
  it.each(snapshotCases)('%s matches the snapshot', async (file, render) => {
    const email = await render(locale)
    await expect(email.html).toMatchFileSnapshot(`./__snapshots__/${file}.${locale}.html`)
    await expect(`Subject: ${email.subject}\n\n${email.text}\n`).toMatchFileSnapshot(
      `./__snapshots__/${file}.${locale}.txt`,
    )
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

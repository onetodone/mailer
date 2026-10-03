import { afterAll, beforeAll, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { z } from 'zod'

import { html } from '../../src/core/html'
import { defineLayout } from '../../src/core/layout'
import { MailerError } from '../../src/errors'
import { createMailer, type Mailer } from '../../src/mailer'
import { defineTemplate } from '../../src/templates/define'
import { memoryTransport } from '../../src/transports/memory'
import type { MailTransport } from '../../src/transports/types'
import { branding, from, mailerRejection } from '../support/mailer'

const to = 'lizzie@example.com'
const verifyUrl = 'https://myapp.loc/verify?token=abc123'
const resetUrl = 'https://myapp.loc/reset?token=abc123'
const supportUrl = 'https://myapp.loc/support'
const cancelUrl = 'https://myapp.loc/email/cancel?token=abc123'
const newEmail = 'lizzie.new@example.com'
const signInUrl = 'https://myapp.loc/sign-in?token=abc123'
const secureUrl = 'https://myapp.loc/security?token=abc123'
const unlockUrl = 'https://myapp.loc/unlock?token=abc123'
const confirmUrl = 'https://myapp.loc/account/delete?token=abc123'

const orderShipped = defineTemplate({
  name: 'orderShipped',
  schema: z.strictObject({ orderId: z.string(), trackUrl: z.url() }),
  render: ({ props, ui }) => ({
    subject: `Order #${props.orderId} shipped`,
    preheader: 'Your order is on its way',
    body: [
      ui.heading('Your order is on its way'),
      ui.button('Track order', props.trackUrl),
      ui.linkFallback(props.trackUrl),
    ],
  }),
})

const resetCode = defineTemplate({
  name: 'resetPassword',
  schema: z.strictObject({ code: z.string() }),
  render: ({ props, ui }) => ({ subject: 'Your reset code', body: [ui.code(props.code)] }),
})

function setup() {
  const transport = memoryTransport()
  return { transport, mailer: createMailer({ transport, from, branding }) }
}

function failingTransport(send: MailTransport['send']): MailTransport {
  return { send }
}

describe('built-in templates through the memory transport', () => {
  const snapshotBranding = {
    ...branding,
    footerText: 'You received this email because you have an account at My App.',
    theme: { primary: '#3b82f6' },
  }
  const userNames = { en: 'Lizzie', be: 'Ліза' }
  const cases: [file: string, send: (mailer: Mailer, locale: keyof typeof userNames) => Promise<unknown>][] = [
    [
      'verify-email',
      (mailer, locale) =>
        mailer.send('verifyEmail', {
          to,
          locale,
          props: { userName: userNames[locale], verifyUrl, expiresInMinutes: 1440 },
        }),
    ],
    [
      'reset-password',
      (mailer, locale) =>
        mailer.send('resetPassword', {
          to,
          locale,
          props: { userName: userNames[locale], resetUrl, expiresInMinutes: 30 },
        }),
    ],
    [
      'password-changed',
      (mailer, locale) =>
        mailer.send('passwordChanged', {
          to,
          locale,
          props: { userName: userNames[locale], ip: '203.0.113.7', supportUrl },
        }),
    ],
    [
      'verify-email-change',
      (mailer, locale) =>
        mailer.send('verifyEmailChange', {
          to,
          locale,
          props: { userName: userNames[locale], verifyUrl, expiresInMinutes: 1440 },
        }),
    ],
    [
      'email-change-requested',
      (mailer, locale) =>
        mailer.send('emailChangeRequested', {
          to,
          locale,
          props: { userName: userNames[locale], newEmail, ip: '203.0.113.7', cancelUrl },
        }),
    ],
    [
      'email-changed',
      (mailer, locale) =>
        mailer.send('emailChanged', {
          to,
          locale,
          props: { userName: userNames[locale], newEmail, ip: '203.0.113.7', supportUrl },
        }),
    ],
    [
      'otp-code',
      (mailer, locale) =>
        mailer.send('otpCode', {
          to,
          locale,
          props: { userName: userNames[locale], code: 'K7Q2M9XW', expiresInMinutes: 10 },
        }),
    ],
    [
      'magic-link',
      (mailer, locale) =>
        mailer.send('magicLink', {
          to,
          locale,
          props: { userName: userNames[locale], signInUrl, expiresInMinutes: 15 },
        }),
    ],
    [
      'welcome',
      (mailer, locale) =>
        mailer.send('welcome', {
          to,
          locale,
          props: { userName: userNames[locale] },
        }),
    ],
    [
      'new-sign-in',
      (mailer, locale) =>
        mailer.send('newSignIn', {
          to,
          locale,
          props: {
            userName: userNames[locale],
            device: 'Chrome on macOS',
            location: 'Berlin, Germany',
            ip: '203.0.113.7',
            secureUrl,
          },
        }),
    ],
    [
      'two-factor-enabled',
      (mailer, locale) =>
        mailer.send('twoFactorEnabled', {
          to,
          locale,
          props: { userName: userNames[locale], ip: '203.0.113.7', supportUrl },
        }),
    ],
    [
      'two-factor-disabled',
      (mailer, locale) =>
        mailer.send('twoFactorDisabled', {
          to,
          locale,
          props: { userName: userNames[locale], ip: '203.0.113.7' },
        }),
    ],
    [
      'account-locked',
      (mailer, locale) =>
        mailer.send('accountLocked', {
          to,
          locale,
          props: { userName: userNames[locale], ip: '203.0.113.7', unlockUrl },
        }),
    ],
    [
      'confirm-account-deletion',
      (mailer, locale) =>
        mailer.send('confirmAccountDeletion', {
          to,
          locale,
          props: { userName: userNames[locale], confirmUrl, expiresInMinutes: 60 },
        }),
    ],
    [
      'account-deleted',
      (mailer, locale) =>
        mailer.send('accountDeleted', {
          to,
          locale,
          props: { userName: userNames[locale] },
        }),
    ],
  ]

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-05-04T12:00:00Z'))
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  describe.each(['en', 'be'] as const)('%s', (locale) => {
    it.each(cases)('sends %s as rendered in the template snapshots', async (file, send) => {
      const transport = memoryTransport()
      const mailer = createMailer({ transport, from, branding: snapshotBranding })

      await send(mailer, locale)

      expect(transport.sent).toHaveLength(1)
      const [message] = transport.sent
      expect(message).toStrictEqual({
        from,
        to,
        subject: expect.any(String) as string,
        html: expect.any(String) as string,
        text: expect.any(String) as string,
      })
      await expect(message?.html).toMatchFileSnapshot(`../templates/__snapshots__/${file}.${locale}.html`)
      await expect(`Subject: ${message?.subject ?? ''}\n\n${message?.text ?? ''}\n`).toMatchFileSnapshot(
        `../templates/__snapshots__/${file}.${locale}.txt`,
      )
    })
  })

  it('renders the same email without sending it', async () => {
    const transport = memoryTransport()
    const mailer = createMailer({ transport, from, branding: snapshotBranding })

    await mailer.send('resetPassword', { to, locale: 'be', props: { resetUrl } })
    const rendered = await mailer.render('resetPassword', { locale: 'be', props: { resetUrl } })

    expect(transport.sent).toHaveLength(1)
    expect(rendered).toEqual({
      subject: transport.sent[0]?.subject,
      html: transport.sent[0]?.html,
      text: transport.sent[0]?.text,
    })
  })
})

describe('custom templates', () => {
  it('adds a template with typed props', async () => {
    const transport = memoryTransport()
    const mailer = createMailer({ transport, from, branding, templates: { orderShipped } })

    await mailer.send('orderShipped', { to, props: { orderId: '42', trackUrl: 'https://shop.loc/track/42' } })

    expect(transport.sent[0]?.subject).toBe('Order #42 shipped')
    expect(transport.sent[0]?.text).toContain('Track order: https://shop.loc/track/42')
    expectTypeOf<Parameters<typeof mailer.send>[0]>().toEqualTypeOf<
      | 'verifyEmail'
      | 'resetPassword'
      | 'passwordChanged'
      | 'verifyEmailChange'
      | 'emailChangeRequested'
      | 'emailChanged'
      | 'otpCode'
      | 'magicLink'
      | 'welcome'
      | 'newSignIn'
      | 'twoFactorEnabled'
      | 'twoFactorDisabled'
      | 'accountLocked'
      | 'confirmAccountDeletion'
      | 'accountDeleted'
      | 'orderShipped'
    >()
    const check = async () => {
      // @ts-expect-error: orderId is required
      await mailer.send('orderShipped', { to, props: { trackUrl: 'https://shop.loc/track/42' } })
      // @ts-expect-error: orderId is a string
      await mailer.send('orderShipped', { to, props: { orderId: 42, trackUrl: 'https://shop.loc/track/42' } })
      // @ts-expect-error: unknown template name
      await mailer.send('orderCancelled', { to, props: {} })
      // @ts-expect-error: props are required
      await mailer.render('orderShipped')
    }
    expect(check).toBeTypeOf('function')
  })

  it('validates the props of a custom template', async () => {
    const mailer = createMailer({ transport: memoryTransport(), from, branding, templates: { orderShipped } })
    const error = await mailerRejection(
      mailer.send('orderShipped', { to, props: { orderId: '42', trackUrl: 'not a url' } }),
    )
    expect(error.code).toBe('INVALID_PROPS')
    expect(error.message).toMatch(/^Invalid props for template "orderShipped": trackUrl: /)
  })

  it('replaces a built-in template by name', async () => {
    const transport = memoryTransport()
    const mailer = createMailer({ transport, from, branding, templates: { resetPassword: resetCode } })

    await mailer.send('resetPassword', { to, props: { code: '481 516' } })
    await mailer.send('verifyEmail', { to, props: { verifyUrl } })

    expect(transport.sent.map((message) => message.subject)).toEqual(['Your reset code', 'Confirm your email'])
    expect(transport.sent[0]?.text).toContain('481 516')
    const check = async () => {
      // @ts-expect-error: the replacement takes a code, not a link
      await mailer.send('resetPassword', { to, props: { resetUrl } })
    }
    expect(check).toBeTypeOf('function')
  })
})

describe('texts and locales', () => {
  it('overrides single texts and keeps the others', async () => {
    const transport = memoryTransport()
    const mailer = createMailer({
      transport,
      from,
      branding,
      messages: {
        en: { verifyEmail: { subject: 'Welcome aboard' } },
        be: { common: { greetingAnonymous: 'Вітаем,' } },
      },
    })

    await mailer.send('verifyEmail', { to, props: { verifyUrl } })
    await mailer.send('verifyEmail', { to, locale: 'be', props: { verifyUrl } })

    expect(transport.sent[0]?.subject).toBe('Welcome aboard')
    expect(transport.sent[0]?.text).toContain('Confirm your email')
    expect(transport.sent[1]?.subject).toBe('Пацвердзіце email')
    expect(transport.sent[1]?.text).toContain('Вітаем,')
  })

  it('sends in a locale defined only in messages, with English for the missing texts', async () => {
    const transport = memoryTransport()
    const mailer = createMailer({
      transport,
      from,
      branding,
      locale: 'sk',
      messages: { sk: { verifyEmail: { subject: 'Potvrďte svoj e-mail' } } },
    })

    await mailer.send('verifyEmail', { to, props: { verifyUrl, expiresInMinutes: 5 } })

    expect(transport.sent[0]?.subject).toBe('Potvrďte svoj e-mail')
    expect(transport.sent[0]?.html).toContain('<html lang="sk" ')
    expect(transport.sent[0]?.text).toContain('The link expires in 5 minutes.')
  })

  it('uses the configured locale unless the call passes one', async () => {
    const transport = memoryTransport()
    const mailer = createMailer({ transport, from, branding, locale: 'be' })

    await mailer.send('passwordChanged', { to })
    await mailer.send('passwordChanged', { to, locale: 'en' })

    expect(transport.sent.map((message) => message.subject)).toEqual(['Пароль зменены', 'Your password was changed'])
    expect((await mailer.render('passwordChanged')).subject).toBe('Пароль зменены')
    expect((await mailer.render('passwordChanged', { locale: 'en' })).subject).toBe('Your password was changed')
  })

  it('rejects a locale without texts', async () => {
    const mailer = createMailer({ transport: memoryTransport(), from, branding, messages: { sk: {} } })
    const sendError = await mailerRejection(mailer.send('passwordChanged', { to, locale: 'nl' as never }))
    expect(sendError.code).toBe('INVALID_OPTIONS')
    expect(sendError.message).toBe(
      'Invalid send options: locale must be one of "en", "be-Latn", "be", "cs", "de", "et", "fr", "it", "ja", "ka", "lt", "lv", "pl", "ro", "th", "uk", "sk", received "nl".',
    )
    const renderError = await mailerRejection(mailer.render('passwordChanged', { locale: 'nl' as never }))
    expect(renderError.code).toBe('INVALID_OPTIONS')
    expect(renderError.message).toBe(
      'Invalid render options: locale must be one of "en", "be-Latn", "be", "cs", "de", "et", "fr", "it", "ja", "ka", "lt", "lv", "pl", "ro", "th", "uk", "sk", received "nl".',
    )
    const check = async () => {
      // @ts-expect-error: "nl" has no texts
      await mailer.send('passwordChanged', { to, locale: 'nl' })
    }
    expect(check).toBeTypeOf('function')
  })

  it('formats dates in the configured time zone unless the props set one', async () => {
    const transport = memoryTransport()
    const mailer = createMailer({ transport, from, branding, timeZone: 'Europe/Minsk' })
    const changedAt = new Date('2026-05-04T09:30:00Z')

    await mailer.send('passwordChanged', { to, props: { changedAt } })
    await mailer.send('passwordChanged', { to, props: { changedAt, timeZone: 'UTC' } })

    const [minsk, utc] = transport.sent.map((message) => message.text.replace(/\s+/g, ' '))
    expect(minsk).toMatch(/When: May 4, 2026 at 12:30 PM GMT\+3/)
    expect(utc).toMatch(/When: May 4, 2026 at 9:30 AM UTC/)
  })
})

describe('send', () => {
  it('passes addresses and headers to the transport as given', async () => {
    const transport = memoryTransport()
    const mailer = createMailer({
      transport,
      from: 'My App <no-reply@myapp.loc>',
      replyTo: 'support@myapp.loc',
      branding,
    })
    const recipients = [{ name: 'Lizzie', address: to }, 'Bob <bob@example.com>']
    const headers = { 'X-Entity-Ref-ID': '42' }

    await mailer.send('verifyEmail', {
      to: recipients,
      cc: 'team@example.com',
      bcc: ['audit@example.com'],
      headers,
      props: { verifyUrl },
    })

    expect(transport.sent[0]).toStrictEqual({
      from: 'My App <no-reply@myapp.loc>',
      to: recipients,
      cc: 'team@example.com',
      bcc: ['audit@example.com'],
      replyTo: 'support@myapp.loc',
      subject: 'Confirm your email',
      html: expect.stringContaining(verifyUrl) as string,
      text: expect.stringContaining(verifyUrl) as string,
      headers,
    })
  })

  it('replaces the configured replyTo with the one passed to send', async () => {
    const transport = memoryTransport()
    const mailer = createMailer({ transport, from, replyTo: 'support@myapp.loc', branding })

    await mailer.send('passwordChanged', { to, replyTo: { name: 'Security', address: 'security@myapp.loc' } })

    expect(transport.sent[0]?.replyTo).toEqual({ name: 'Security', address: 'security@myapp.loc' })
  })

  it('returns what the transport reports', async () => {
    const result = { messageId: '<1@myapp.loc>', accepted: [to], rejected: [] }
    const mailer = createMailer({ transport: { send: () => Promise.resolve(result) }, from, branding })

    await expect(mailer.send('passwordChanged', { to })).resolves.toBe(result)
  })

  it('lets props be left out when every prop is optional', async () => {
    const { transport, mailer } = setup()

    await mailer.send('passwordChanged', { to })

    expect(transport.sent[0]?.subject).toBe('Your password was changed')
    const check = async () => {
      // @ts-expect-error: verifyUrl is required
      await mailer.send('verifyEmail', { to })
    }
    expect(check).toBeTypeOf('function')
    const error = await mailerRejection(mailer.send('verifyEmail', { to } as never))
    expect(error.code).toBe('INVALID_PROPS')
    expect(error.message).toBe('Invalid props for template "verifyEmail": verifyUrl: is required.')
  })

  it('wraps the layout around every template', async () => {
    const transport = memoryTransport()
    const layout = defineLayout(({ subject, content }) => ({
      html: html`<main title="${subject}">${content.html}</main>`,
      text: `${content.text}\n-- custom`,
    }))
    const mailer = createMailer({ transport, from, branding, layout })

    await mailer.send('passwordChanged', { to })

    expect(transport.sent[0]?.html).toMatch(/^<main title="Your password was changed">/)
    expect(transport.sent[0]?.text).toMatch(/\n-- custom$/)
  })

  it('rejects unknown templates', async () => {
    const { transport, mailer } = setup()
    const error = await mailerRejection(mailer.send('orderShipped' as never, { to } as never))
    expect(error.code).toBe('UNKNOWN_TEMPLATE')
    expect(transport.sent).toHaveLength(0)
  })

  it.each<[string, Record<string, unknown>, string]>([
    [
      'a line break in a header value',
      { headers: { 'X-Ref': '1\r\nBcc: victim@example.com' } },
      'headers.X-Ref must not contain line breaks',
    ],
    [
      'a line break in a header name',
      { headers: { 'X-Ref\r\nBcc': 'victim@example.com' } },
      'headers has an invalid header name "X-Ref\\r\\nBcc": use printable ASCII without spaces or colons',
    ],
    [
      'a colon in a header name',
      { headers: { 'X-Ref:': '1' } },
      'headers has an invalid header name "X-Ref:": use printable ASCII without spaces or colons',
    ],
    [
      'a space in a header name',
      { headers: { 'X Ref': '1' } },
      'headers has an invalid header name "X Ref": use printable ASCII without spaces or colons',
    ],
    [
      'a header value that is not a string',
      { headers: { 'X-Ref': 42 } },
      'headers.X-Ref must be a string, received number',
    ],
    [
      'a line break in a recipient string',
      { to: 'Lizzie\r\nBcc: victim@example.com <lizzie@example.com>' },
      'to must not contain line breaks',
    ],
    [
      'a line break in a recipient name',
      { to: { name: 'Lizzie\nBcc: victim@example.com', address: to } },
      'to.name must not contain line breaks',
    ],
    [
      'a line break in a cc address',
      { cc: ['team@example.com', 'x@example.com\r\nBcc: victim@example.com'] },
      'cc.1 must not contain line breaks',
    ],
    [
      'a line break in a replyTo address',
      { replyTo: { address: 'help@myapp.loc\n' } },
      'replyTo.address must not contain line breaks',
    ],
    [
      'an invalid bcc address',
      { bcc: 'bob' },
      'bcc must be an email address like "user@example.com" or "Name <user@example.com>", received "bob"',
    ],
    ['no recipients', { to: [] }, 'to must list at least one address'],
    ['a missing recipient', { to: undefined }, 'to is required'],
    ['an unknown option', { prop: {} }, 'has unknown key "prop"'],
  ])('rejects %s without sending', async (_case, override, detail) => {
    const { transport, mailer } = setup()
    const error = await mailerRejection(mailer.send('passwordChanged', { to, ...override }))
    expect(error.code).toBe('INVALID_OPTIONS')
    expect(error.message).toBe(`Invalid send options: ${detail}.`)
    expect(transport.sent).toHaveLength(0)
  })

  it('rejects options that are not an object', async () => {
    const { mailer } = setup()
    const error = await mailerRejection(mailer.send('passwordChanged', undefined as never))
    expect(error.message).toBe('Invalid send options: must be an object.')
  })
})

describe('transport failures', () => {
  it('wraps errors in TRANSPORT_FAILED with the error as cause', async () => {
    const reason = new Error('connection refused')
    const mailer = createMailer({ transport: failingTransport(() => Promise.reject(reason)), from, branding })

    const error = await mailerRejection(mailer.send('passwordChanged', { to }))

    expect(error.code).toBe('TRANSPORT_FAILED')
    expect(error.message).toBe('Email delivery failed: connection refused')
    expect(error.cause).toBe(reason)
  })

  it('wraps errors thrown synchronously and values that are not errors', async () => {
    const throwing = createMailer({
      transport: failingTransport(() => {
        throw new TypeError('provider.send is not a function')
      }),
      from,
      branding,
    })
    const rejecting = createMailer({
      transport: failingTransport(() => Promise.reject(new Error('quota exceeded', { cause: 'quota' }))),
      from,
      branding,
    })
    const withString = createMailer({
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a non-Error reason is the case under test
      transport: failingTransport(() => Promise.reject('rate limited')),
      from,
      branding,
    })

    expect((await mailerRejection(throwing.send('passwordChanged', { to }))).message).toBe(
      'Email delivery failed: provider.send is not a function',
    )
    expect((await mailerRejection(rejecting.send('passwordChanged', { to }))).code).toBe('TRANSPORT_FAILED')
    expect((await mailerRejection(withString.send('passwordChanged', { to }))).message).toBe(
      'Email delivery failed: rate limited',
    )
  })

  it('passes a MailerError from the transport through', async () => {
    const reason = new MailerError('TRANSPORT_FAILED', 'SMTP delivery failed (ECONNREFUSED): connect refused')
    const mailer = createMailer({ transport: failingTransport(() => Promise.reject(reason)), from, branding })

    await expect(mailer.send('passwordChanged', { to })).rejects.toBe(reason)
  })

  it('passes errors from template code through', async () => {
    const bug = new Error('template bug')
    const broken = defineTemplate({
      name: 'broken',
      schema: z.object({}),
      render: () => {
        throw bug
      },
    })
    const { transport } = setup()
    const mailer = createMailer({ transport, from, branding, templates: { broken } })

    await expect(mailer.send('broken', { to })).rejects.toBe(bug)
    await expect(mailer.render('broken')).rejects.toBe(bug)
    expect(transport.sent).toHaveLength(0)
  })
})

describe('close', () => {
  it('waits for the transport to close', async () => {
    let closed = false
    const transport: MailTransport = {
      send: () => Promise.resolve({ messageId: 'id' }),
      close: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        closed = true
      },
    }
    const mailer = createMailer({ transport, from, branding })

    await mailer.close()

    expect(closed).toBe(true)
  })

  it('resolves for transports without close', async () => {
    const { mailer } = setup()
    await expect(mailer.close()).resolves.toBeUndefined()
  })
})

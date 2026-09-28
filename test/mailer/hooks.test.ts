import { inspect } from 'node:util'

import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi, type MockInstance } from 'vitest'

import type { MailErrorEvent, MailSentEvent } from '../../src/config'
import { MailerError } from '../../src/errors'
import { createMailer } from '../../src/mailer'
import { memoryTransport } from '../../src/transports/memory'
import type { MailTransport } from '../../src/transports/types'
import { branding, from } from '../support/mailer'

const to = 'lizzie@example.com'
const token = 'secret-token-123'
const verifyUrl = `https://myapp.loc/verify?token=${token}`

let emitWarning: MockInstance<typeof process.emitWarning>

beforeEach(() => {
  emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function hooks() {
  const sent: MailSentEvent[] = []
  const failed: MailErrorEvent[] = []
  return {
    sent,
    failed,
    onSent: (event: MailSentEvent) => {
      sent.push(event)
    },
    onError: (event: MailErrorEvent) => {
      failed.push(event)
    },
  }
}

function rejectingTransport(reason: Error): MailTransport {
  return { send: () => Promise.reject(reason) }
}

function expectNoToken(event: MailSentEvent | MailErrorEvent | undefined): void {
  expect(event).toBeDefined()
  expect(JSON.stringify(event)).not.toContain(token)
  expect(inspect(event, { depth: null, showHidden: true })).not.toContain(token)
}

describe('onSent', () => {
  it('receives the details of the email, the result and the duration', async () => {
    const { sent, onSent, onError } = hooks()
    const mailer = createMailer({
      transport: memoryTransport(),
      from,
      replyTo: 'support@myapp.loc',
      branding,
      onSent,
      onError,
    })

    const result = await mailer.send('verifyEmail', {
      to,
      cc: ['team@example.com'],
      bcc: 'audit@example.com',
      headers: { 'X-Entity-Ref-ID': '42' },
      locale: 'be',
      props: { verifyUrl },
    })

    expect(sent).toStrictEqual([
      {
        template: 'verifyEmail',
        locale: 'be',
        from,
        to,
        cc: ['team@example.com'],
        bcc: 'audit@example.com',
        replyTo: 'support@myapp.loc',
        headers: { 'X-Entity-Ref-ID': '42' },
        subject: 'Пацвердзіце email',
        result,
        durationMs: expect.any(Number) as number,
      },
    ])
    expect(sent[0]?.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('leaves the content and the props out of the event', async () => {
    const { sent, onSent } = hooks()
    const mailer = createMailer({ transport: memoryTransport(), from, branding, onSent })

    await mailer.send('verifyEmail', { to, props: { userName: 'Lizzie', verifyUrl } })

    expect(Object.keys(sent[0] ?? {}).sort()).toEqual([
      'durationMs',
      'from',
      'locale',
      'result',
      'subject',
      'template',
      'to',
    ])
    expectNoToken(sent[0])
  })

  it('is awaited before send resolves', async () => {
    const order: string[] = []
    const mailer = createMailer({
      transport: memoryTransport(),
      from,
      branding,
      onSent: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        order.push('hook')
      },
    })

    await mailer.send('passwordChanged', { to })
    order.push('send')

    expect(order).toEqual(['hook', 'send'])
  })

  it('is not called by render', async () => {
    const { sent, failed, onSent, onError } = hooks()
    const mailer = createMailer({ transport: memoryTransport(), from, branding, onSent, onError })

    await mailer.render('passwordChanged')
    await expect(mailer.render('verifyEmail', { props: { verifyUrl: 'not a url' } })).rejects.toThrow(MailerError)

    expect(sent).toHaveLength(0)
    expect(failed).toHaveLength(0)
  })

  it.each([
    [
      'throws',
      () => {
        throw new Error('hook broke')
      },
    ],
    ['rejects', () => Promise.reject(new Error('hook broke'))],
  ])('does not change the result when it %s, and emits a warning', async (_case, onSent) => {
    const { failed, onError } = hooks()
    const transport = memoryTransport()
    const mailer = createMailer({ transport, from, branding, onSent, onError })

    const result = await mailer.send('passwordChanged', { to })

    expect(result.messageId).toBeTypeOf('string')
    expect(transport.sent).toHaveLength(1)
    expect(failed).toHaveLength(0)
    expect(emitWarning).toHaveBeenCalledOnce()
    expect(emitWarning).toHaveBeenCalledWith(
      'The onSent hook failed. The email was sent and send() resolves as usual.',
      {
        type: 'MailerWarning',
        detail: expect.stringContaining('Error: hook broke') as string,
      },
    )
  })
})

describe('onError', () => {
  it('receives the error for a transport failure, with the subject', async () => {
    const { sent, failed, onSent, onError } = hooks()
    const mailer = createMailer({
      transport: rejectingTransport(new Error('connection refused')),
      from,
      branding,
      onSent,
      onError,
    })

    const error = await mailer.send('verifyEmail', { to, props: { verifyUrl } }).catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(MailerError)
    expect(sent).toHaveLength(0)
    expect(failed).toStrictEqual([
      {
        template: 'verifyEmail',
        locale: 'en',
        from,
        to,
        subject: 'Confirm your email',
        error,
        durationMs: expect.any(Number) as number,
      },
    ])
    expectNoToken(failed[0])
  })

  it('receives the error for invalid props, without a subject', async () => {
    const { failed, onError } = hooks()
    const mailer = createMailer({ transport: memoryTransport(), from, branding, onError })

    const error = await mailer
      .send('verifyEmail', { to, props: { verifyUrl, expiresInMinutes: 0 } })
      .catch((reason: unknown) => reason)

    expect(failed).toHaveLength(1)
    expect(failed[0]?.error).toBe(error)
    expect(failed[0]?.subject).toBeUndefined()
    expect((error as MailerError).code).toBe('INVALID_PROPS')
    expectNoToken(failed[0])
  })

  it('receives the error for invalid options, with the options as passed', async () => {
    const { failed, onError } = hooks()
    const mailer = createMailer({ transport: memoryTransport(), from, branding, onError })
    const headers = { 'X-Ref': '1\r\nBcc: victim@example.com' }

    const error = await mailer.send('passwordChanged', { to, headers }).catch((reason: unknown) => reason)

    expect((error as MailerError).code).toBe('INVALID_OPTIONS')
    expect(failed[0]).toMatchObject({ template: 'passwordChanged', to, headers, error })
  })

  it.each([
    [
      'throws',
      () => {
        throw new Error('hook broke')
      },
    ],
    ['rejects', () => Promise.reject(new Error('hook broke'))],
  ])('keeps the original error when it %s, and emits a warning', async (_case, onError) => {
    const reason = new Error('connection refused')
    const mailer = createMailer({ transport: rejectingTransport(reason), from, branding, onError })

    const error = await mailer.send('passwordChanged', { to }).catch((rejection: unknown) => rejection)

    expect(error).toBeInstanceOf(MailerError)
    expect((error as MailerError).cause).toBe(reason)
    expect(emitWarning).toHaveBeenCalledOnce()
    expect(emitWarning).toHaveBeenCalledWith('The onError hook failed. send() rejects with the original error.', {
      type: 'MailerWarning',
      detail: expect.stringContaining('Error: hook broke') as string,
    })
  })

  it('reports hook failures that are not errors', async () => {
    const mailer = createMailer({
      transport: memoryTransport(),
      from,
      branding,
      onSent: () => Promise.reject(Object.create(null) as Error),
    })

    await mailer.send('passwordChanged', { to })

    expect(emitWarning).toHaveBeenCalledWith(expect.any(String), {
      type: 'MailerWarning',
      detail: '[Object: null prototype] {}',
    })
  })
})

describe('hook types', () => {
  it('types the events', () => {
    createMailer({
      transport: memoryTransport(),
      from,
      branding,
      onSent: (event) => {
        expectTypeOf(event).toEqualTypeOf<MailSentEvent>()
        expectTypeOf(event.result.messageId).toEqualTypeOf<string>()
      },
      onError: async (event) => {
        expectTypeOf(event.error).toEqualTypeOf<unknown>()
        expectTypeOf(event.subject).toEqualTypeOf<string | undefined>()
        await Promise.resolve()
      },
    })
    expectTypeOf<MailSentEvent>().not.toHaveProperty('html')
    expectTypeOf<MailSentEvent>().not.toHaveProperty('props')
  })
})

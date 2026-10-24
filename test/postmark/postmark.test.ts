import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { MailerError } from '../../src/errors'
import { createMailer } from '../../src/mailer'
import * as postmark from '../../src/postmark'
import { postmarkTransport, type PostmarkTransportOptions } from '../../src/postmark'
import type { OutgoingMessage } from '../../src/transports/types'
import { catchError, catchRejection } from '../support/catch-error'

type Fetch = NonNullable<PostmarkTransportOptions['fetch']>

const serverToken = '00000000-0000-4000-8000-000000000000'

const message: OutgoingMessage = {
  from: { name: 'My App', address: 'no-reply@myapp.loc' },
  to: 'user@example.com',
  subject: 'Confirm your email',
  html: '<p>Hello</p>',
  text: 'Hello',
}

const fullMessage: OutgoingMessage = {
  ...message,
  to: ['user@example.com', { name: 'Second User', address: 'second@example.com' }],
  cc: 'Copy <copy@example.com>',
  bcc: [{ address: 'hidden@example.com' }],
  replyTo: { name: 'Support "Team", Ліза', address: 'support@myapp.loc' },
  headers: { 'X-Entity-Ref-ID': '42', 'List-Unsubscribe': '<https://myapp.loc/unsubscribe>' },
}

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const accepted = { To: 'user@example.com', SubmittedAt: '2026-10-24T12:00:00Z', MessageID: 'msg-1', ErrorCode: 0 }

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, text: () => Promise.resolve(JSON.stringify(body)) }
}

function fakeFetch(respond: () => ReturnType<Fetch> = () => Promise.resolve(reply(200, accepted))) {
  return vi.fn<Fetch>(respond)
}

function sentBody(fetchFn: ReturnType<typeof fakeFetch>): Record<string, unknown> {
  const body = fetchFn.mock.calls[0]?.[1].body ?? ''
  return JSON.parse(body) as Record<string, unknown>
}

async function transportError(promise: Promise<unknown>): Promise<MailerError> {
  const error = await catchRejection(promise)
  expect(error).toBeInstanceOf(MailerError)
  expect(error).toMatchObject({ code: 'TRANSPORT_FAILED' })
  return error as MailerError
}

function configError(fn: () => unknown): MailerError {
  const error = catchError(fn)
  expect(error).toBeInstanceOf(MailerError)
  expect(error).toMatchObject({ code: 'INVALID_CONFIG' })
  return error as MailerError
}

describe('postmark entry', () => {
  it('exposes the Postmark transport', () => {
    expect(Object.keys(postmark).sort()).toEqual(['postmarkTransport'])
  })

  it('accepts the global fetch', () => {
    expectTypeOf(fetch).toExtend<Fetch>()
    expect('close' in postmarkTransport({ serverToken, fetch })).toBe(false)
  })
})

describe('postmarkTransport', () => {
  it('posts the email to the Postmark API', async () => {
    const fetchFn = fakeFetch()

    const result = await postmarkTransport({ serverToken, fetch: fetchFn }).send(message)

    expect(result).toEqual({ messageId: 'msg-1' })
    expect(fetchFn).toHaveBeenCalledOnce()
    const [url, init] = fetchFn.mock.calls[0] ?? []
    expect(url).toBe('https://api.postmarkapp.com/email')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': '@onetodone/mailer',
      'x-postmark-server-token': serverToken,
    })
    expect(sentBody(fetchFn)).toEqual({
      From: '"My App" <no-reply@myapp.loc>',
      To: 'user@example.com',
      Subject: 'Confirm your email',
      HtmlBody: '<p>Hello</p>',
      TextBody: 'Hello',
    })
  })

  it('maps every field', async () => {
    const fetchFn = fakeFetch()

    await postmarkTransport({ serverToken, messageStream: 'password-resets', fetch: fetchFn }).send(fullMessage)

    expect(sentBody(fetchFn)).toEqual({
      From: '"My App" <no-reply@myapp.loc>',
      To: 'user@example.com, "Second User" <second@example.com>',
      Cc: 'Copy <copy@example.com>',
      Bcc: 'hidden@example.com',
      ReplyTo: '"Support \\"Team\\", Ліза" <support@myapp.loc>',
      Subject: 'Confirm your email',
      HtmlBody: '<p>Hello</p>',
      TextBody: 'Hello',
      Headers: [
        { Name: 'X-Entity-Ref-ID', Value: '42' },
        { Name: 'List-Unsubscribe', Value: '<https://myapp.loc/unsubscribe>' },
      ],
      MessageStream: 'password-resets',
    })
  })

  it('sends attachments as base64, with a content ID for inline images', async () => {
    const fetchFn = fakeFetch()

    await postmarkTransport({ serverToken, fetch: fetchFn }).send({
      ...message,
      html: '<p>Hello</p><img src="cid:qr@myapp.loc" alt="QR code">',
      attachments: [
        { filename: 'invoice-1042.pdf', content: Buffer.from('%PDF-1.7 invoice'), contentType: 'application/pdf' },
        { filename: 'orders.csv', content: 'id,name\n1,Ліза', contentType: 'text/csv; charset=utf-8' },
        { filename: 'qr.png', content: png, contentType: 'image/png', cid: 'qr@myapp.loc' },
      ],
    })

    expect(sentBody(fetchFn).Attachments).toEqual([
      {
        Name: 'invoice-1042.pdf',
        Content: Buffer.from('%PDF-1.7 invoice').toString('base64'),
        ContentType: 'application/pdf',
      },
      {
        Name: 'orders.csv',
        Content: Buffer.from('id,name\n1,Ліза', 'utf8').toString('base64'),
        ContentType: 'text/csv; charset=utf-8',
      },
      {
        Name: 'qr.png',
        Content: Buffer.from(png).toString('base64'),
        ContentType: 'image/png',
        ContentID: 'cid:qr@myapp.loc',
      },
    ])
  })

  it.each([
    ['https://postmark-proxy.example.com', 'https://postmark-proxy.example.com/email'],
    ['https://example.com/postmark/', 'https://example.com/postmark/email'],
    ['http://127.0.0.1:8080', 'http://127.0.0.1:8080/email'],
  ])('posts to %s', async (baseUrl, url) => {
    const fetchFn = fakeFetch()

    await postmarkTransport({ serverToken, baseUrl, fetch: fetchFn }).send(message)

    expect(fetchFn.mock.calls[0]?.[0]).toBe(url)
  })

  it('uses the global fetch at send time', async () => {
    const fetchFn = fakeFetch(() => Promise.resolve(reply(200, { ...accepted, MessageID: 'msg-2' })))
    const transport = postmarkTransport({ serverToken })
    vi.stubGlobal('fetch', fetchFn)

    try {
      await expect(transport.send(message)).resolves.toEqual({ messageId: 'msg-2' })
    } finally {
      vi.unstubAllGlobals()
    }
    expect(fetchFn).toHaveBeenCalledOnce()
  })
})

describe('postmarkTransport failures', () => {
  it.each([
    [401, 10, 'The Server Token you provided in the X-Postmark-Server-Token request header was invalid.', false],
    [422, 300, "Error parsing 'To': Illegal email address 'user'.", false],
    [
      422,
      400,
      "The 'From' address you supplied (no-reply@myapp.loc) is not a Sender Signature on your account.",
      false,
    ],
    [422, 406, 'You tried to send to recipient(s) that have been marked as inactive.', false],
    [422, 412, 'While your account is pending approval, all recipient addresses must share the same domain.', false],
    [500, 101, 'Unexpected error.', true],
    [503, 100, 'The Postmark API is offline for maintenance.', true],
  ])('maps HTTP %i with error code %i', async (status, code, reason, retryable) => {
    const body = { ErrorCode: code, Message: reason }
    const fetchFn = fakeFetch(() => Promise.resolve(reply(status, body)))

    const error = await transportError(postmarkTransport({ serverToken, fetch: fetchFn }).send(message))

    expect(error.message).toBe(`Postmark delivery failed (HTTP ${String(status)}, error ${String(code)}): ${reason}`)
    expect(error).toMatchObject({ retryable, status })
    expect(error.cause).toEqual(body)
  })

  it.each([
    [413, false],
    [429, true],
  ])('maps HTTP %i without a JSON body', async (status, retryable) => {
    const fetchFn = fakeFetch(() => Promise.resolve({ ok: false, status, text: () => Promise.resolve('') }))

    const error = await transportError(postmarkTransport({ serverToken, fetch: fetchFn }).send(message))

    expect(error.message).toBe(`Postmark delivery failed (HTTP ${String(status)})`)
    expect(error).toMatchObject({ retryable, status, cause: '' })
  })

  it('fails without retrying when a success response has no message ID', async () => {
    const fetchFn = fakeFetch(() => Promise.resolve(reply(200, { ErrorCode: 0, Message: 'OK' })))

    const error = await transportError(postmarkTransport({ serverToken, fetch: fetchFn }).send(message))

    expect(error.message).toBe('Postmark answered HTTP 200 without a message ID')
    expect(error).toMatchObject({ retryable: false, status: 200, cause: { ErrorCode: 0, Message: 'OK' } })
  })

  it('marks network failures as retryable', async () => {
    const cause = new TypeError('fetch failed', { cause: Object.assign(new Error('connect'), { code: 'ECONNRESET' }) })
    const failing = fakeFetch(() => Promise.reject(cause))

    const error = await transportError(postmarkTransport({ serverToken, fetch: failing }).send(message))

    expect(error.message).toBe('Postmark delivery failed (ECONNRESET): fetch failed')
    expect(error.cause).toBe(cause)
    expect(error.retryable).toBe(true)
    expect(error.status).toBeUndefined()
  })

  it('keeps retryable and status through the mailer', async () => {
    const fetchFn = fakeFetch(() => Promise.resolve(reply(503, { ErrorCode: 100, Message: 'Offline.' })))
    const mailer = createMailer({
      transport: postmarkTransport({ serverToken, fetch: fetchFn }),
      from: 'My App <no-reply@myapp.loc>',
      branding: { companyName: 'My App', appUrl: 'https://myapp.loc', supportEmail: 'support@myapp.loc' },
    })

    const error = await transportError(mailer.send('passwordChanged', { to: 'user@example.com' }))

    expect(error).toMatchObject({ retryable: true, status: 503 })
  })
})

describe('postmarkTransport over HTTP', () => {
  let server: Server | undefined

  async function stopServer() {
    const running = server
    server = undefined
    if (running !== undefined) await new Promise((resolve) => running.close(resolve))
  }

  afterEach(stopServer)

  async function startServer(
    respond: (body: string, headers: IncomingHttpHeaders) => { status: number; body: unknown },
  ): Promise<string> {
    server = createServer((request, response) => {
      const chunks: Buffer[] = []
      request.on('data', (chunk: Buffer) => chunks.push(chunk))
      request.on('end', () => {
        const { status, body } = respond(Buffer.concat(chunks).toString('utf8'), request.headers)
        response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body))
      })
    })
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
    return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`
  }

  it('sends through the global fetch', async () => {
    const requests: { body: unknown; headers: IncomingHttpHeaders }[] = []
    const baseUrl = await startServer((body, headers) => {
      requests.push({ body: JSON.parse(body), headers })
      return { status: 200, body: { ...accepted, MessageID: 'msg-3' } }
    })

    const result = await postmarkTransport({ serverToken, baseUrl }).send(message)

    expect(result).toEqual({ messageId: 'msg-3' })
    expect(requests).toHaveLength(1)
    expect(requests[0]?.headers).toMatchObject({
      accept: 'application/json',
      'content-type': 'application/json',
      'x-postmark-server-token': serverToken,
    })
    expect(requests[0]?.body).toMatchObject({ To: 'user@example.com', Subject: 'Confirm your email' })
  })

  it('fails as retryable when the server is unreachable', async () => {
    const baseUrl = await startServer(() => ({ status: 200, body: {} }))
    await stopServer()

    const error = await transportError(postmarkTransport({ serverToken, baseUrl }).send(message))

    expect(error.message).toBe('Postmark delivery failed (ECONNREFUSED): fetch failed')
    expect(error.retryable).toBe(true)
  })
})

describe('postmarkTransport settings', () => {
  it.each([
    [{}, 'postmark.serverToken is required'],
    [{ serverToken: '' }, 'postmark.serverToken must not be empty'],
    [{ serverToken, messageStream: '' }, 'postmark.messageStream must not be empty'],
    [{ serverToken, baseUrl: 'api.postmarkapp.com' }, 'postmark.baseUrl must be an absolute http: or https: URL'],
    [{ serverToken, fetch: 'fetch' }, 'postmark.fetch must be a function, received "fetch"'],
    [{ serverToken, apiKey: 'key' }, 'postmark has unknown key "apiKey"'],
    [undefined, 'postmark must be an object'],
  ])('rejects %j', (options, problem) => {
    const error = configError(() => postmarkTransport(options as never))
    expect(error.message).toBe(`Invalid mailer configuration: ${problem}.`)
  })

  it('never echoes the server token', () => {
    const error = configError(() => postmarkTransport({ serverToken: 42 } as never))
    expect(error.message).toBe('Invalid mailer configuration: postmark.serverToken must be a string, received number.')
  })
})

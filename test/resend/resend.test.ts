import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { MailerError } from '../../src/errors'
import { createMailer } from '../../src/mailer'
import * as resend from '../../src/resend'
import { resendTransport, type ResendTransportOptions } from '../../src/resend'
import type { OutgoingMessage } from '../../src/transports/types'
import { catchError, catchRejection } from '../support/catch-error'

type Fetch = NonNullable<ResendTransportOptions['fetch']>

const apiKey = 're_test_123'

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
  headers: { 'X-Entity-Ref-ID': '42' },
}

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, text: () => Promise.resolve(JSON.stringify(body)) }
}

function fakeFetch(respond: () => ReturnType<Fetch> = () => Promise.resolve(reply(200, { id: 'email-1' }))) {
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

describe('resend entry', () => {
  it('exposes the Resend transport', () => {
    expect(Object.keys(resend).sort()).toEqual(['resendTransport'])
  })

  it('accepts the global fetch', () => {
    expectTypeOf(fetch).toExtend<Fetch>()
    expect('close' in resendTransport({ apiKey, fetch })).toBe(false)
  })
})

describe('resendTransport', () => {
  it('posts the email to the Resend API', async () => {
    const fetchFn = fakeFetch()

    const result = await resendTransport({ apiKey, fetch: fetchFn }).send(message)

    expect(result).toEqual({ messageId: 'email-1' })
    expect(fetchFn).toHaveBeenCalledOnce()
    const [url, init] = fetchFn.mock.calls[0] ?? []
    expect(url).toBe('https://api.resend.com/emails')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'user-agent': '@onetodone/mailer',
    })
    expect(sentBody(fetchFn)).toEqual({
      from: '"My App" <no-reply@myapp.loc>',
      to: ['user@example.com'],
      subject: 'Confirm your email',
      html: '<p>Hello</p>',
      text: 'Hello',
    })
  })

  it('maps every field', async () => {
    const fetchFn = fakeFetch()

    await resendTransport({ apiKey, fetch: fetchFn }).send(fullMessage)

    expect(sentBody(fetchFn)).toEqual({
      from: '"My App" <no-reply@myapp.loc>',
      to: ['user@example.com', '"Second User" <second@example.com>'],
      cc: ['Copy <copy@example.com>'],
      bcc: ['hidden@example.com'],
      reply_to: ['"Support \\"Team\\", Ліза" <support@myapp.loc>'],
      subject: 'Confirm your email',
      html: '<p>Hello</p>',
      text: 'Hello',
      headers: { 'X-Entity-Ref-ID': '42' },
    })
  })

  it('sends attachments as base64, with a content ID for inline images', async () => {
    const fetchFn = fakeFetch()
    const slice = new Uint8Array(new ArrayBuffer(16), 4, 8).fill(7)

    await resendTransport({ apiKey, fetch: fetchFn }).send({
      ...message,
      html: '<p>Hello</p><img src="cid:qr@myapp.loc" alt="QR code">',
      attachments: [
        { filename: 'invoice-1042.pdf', content: Buffer.from('%PDF-1.7 invoice'), contentType: 'application/pdf' },
        { filename: 'orders.csv', content: 'id,name\n1,Ліза', contentType: 'text/csv; charset=utf-8' },
        { filename: 'slice.bin', content: slice, contentType: 'application/octet-stream' },
        { filename: 'qr.png', content: png, contentType: 'image/png', cid: 'qr@myapp.loc' },
      ],
    })

    expect(sentBody(fetchFn).attachments).toEqual([
      {
        filename: 'invoice-1042.pdf',
        content: Buffer.from('%PDF-1.7 invoice').toString('base64'),
        content_type: 'application/pdf',
      },
      {
        filename: 'orders.csv',
        content: Buffer.from('id,name\n1,Ліза', 'utf8').toString('base64'),
        content_type: 'text/csv; charset=utf-8',
      },
      {
        filename: 'slice.bin',
        content: Buffer.alloc(8, 7).toString('base64'),
        content_type: 'application/octet-stream',
      },
      {
        filename: 'qr.png',
        content: Buffer.from(png).toString('base64'),
        content_type: 'image/png',
        content_id: 'qr@myapp.loc',
      },
    ])
  })

  it('encodes large attachments', async () => {
    const fetchFn = fakeFetch()
    const content = Uint8Array.from({ length: 300_001 }, (_, index) => (index * 31) % 256)

    await resendTransport({ apiKey, fetch: fetchFn }).send({
      ...message,
      attachments: [{ filename: 'large.bin', content, contentType: 'application/octet-stream' }],
    })

    const [attachment] = sentBody(fetchFn).attachments as { content: string }[]
    expect(attachment?.content).toBe(Buffer.from(content).toString('base64'))
  })

  it.each([
    ['https://resend-proxy.example.com', 'https://resend-proxy.example.com/emails'],
    ['https://example.com/resend/', 'https://example.com/resend/emails'],
    ['http://127.0.0.1:8080', 'http://127.0.0.1:8080/emails'],
  ])('posts to %s', async (baseUrl, url) => {
    const fetchFn = fakeFetch()

    await resendTransport({ apiKey, baseUrl, fetch: fetchFn }).send(message)

    expect(fetchFn.mock.calls[0]?.[0]).toBe(url)
  })

  it('uses the global fetch at send time', async () => {
    const fetchFn = fakeFetch(() => Promise.resolve(reply(200, { id: 'email-2' })))
    const transport = resendTransport({ apiKey })
    vi.stubGlobal('fetch', fetchFn)

    try {
      await expect(transport.send(message)).resolves.toEqual({ messageId: 'email-2' })
    } finally {
      vi.unstubAllGlobals()
    }
    expect(fetchFn).toHaveBeenCalledOnce()
  })
})

describe('resendTransport failures', () => {
  it.each([
    [400, 'validation_error', 'Invalid `to` field.', false],
    [401, 'validation_error', 'API key is invalid', false],
    [403, 'validation_error', 'The myapp.loc domain is not verified.', false],
    [422, 'invalid_attachment', 'Attachment must have either a `content` or `path`.', false],
    [408, 'request_timeout', 'Request timed out.', true],
    [
      409,
      'concurrent_idempotent_requests',
      'Same idempotency key used while original request is still in progress.',
      true,
    ],
    [429, 'rate_limit_exceeded', 'Too many requests.', true],
    [429, 'daily_quota_exceeded', 'You have reached your daily email sending quota.', true],
    [500, 'application_error', 'Internal server error.', true],
    [503, 'service_unavailable', 'Service unavailable.', true],
  ])('maps HTTP %i %s', async (status, name, reason, retryable) => {
    const body = { statusCode: status, name, message: reason }
    const fetchFn = fakeFetch(() => Promise.resolve(reply(status, body)))

    const error = await transportError(resendTransport({ apiKey, fetch: fetchFn }).send(message))

    expect(error.message).toBe(`Resend delivery failed (HTTP ${String(status)} ${name}): ${reason}`)
    expect(error).toMatchObject({ retryable, status })
    expect(error.cause).toEqual(body)
  })

  it('keeps a response that is not JSON as cause', async () => {
    const fetchFn = fakeFetch(() =>
      Promise.resolve({ ok: false, status: 502, text: () => Promise.resolve('<html>Bad gateway</html>') }),
    )

    const error = await transportError(resendTransport({ apiKey, fetch: fetchFn }).send(message))

    expect(error.message).toBe('Resend delivery failed (HTTP 502)')
    expect(error).toMatchObject({ retryable: true, status: 502, cause: '<html>Bad gateway</html>' })
  })

  it('fails without retrying when a success response has no email ID', async () => {
    const fetchFn = fakeFetch(() => Promise.resolve(reply(200, { object: 'email' })))

    const error = await transportError(resendTransport({ apiKey, fetch: fetchFn }).send(message))

    expect(error.message).toBe('Resend answered HTTP 200 without an email ID')
    expect(error).toMatchObject({ retryable: false, status: 200, cause: { object: 'email' } })
  })

  it('marks network failures as retryable', async () => {
    const cause = new TypeError('fetch failed', { cause: Object.assign(new Error('connect'), { code: 'ECONNRESET' }) })
    const failing = fakeFetch(() => Promise.reject(cause))
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a non-Error reason is the case under test
    const stringly = fakeFetch(() => Promise.reject('offline'))
    const unreadable = fakeFetch(() =>
      Promise.resolve({ ok: true, status: 200, text: () => Promise.reject(new Error('terminated')) }),
    )

    const error = await transportError(resendTransport({ apiKey, fetch: failing }).send(message))
    expect(error.message).toBe('Resend delivery failed (ECONNRESET): fetch failed')
    expect(error.cause).toBe(cause)
    expect(error.retryable).toBe(true)
    expect(error.status).toBeUndefined()
    expect(await transportError(resendTransport({ apiKey, fetch: stringly }).send(message))).toMatchObject({
      message: 'Resend delivery failed: offline',
      retryable: true,
    })
    expect(await transportError(resendTransport({ apiKey, fetch: unreadable }).send(message))).toMatchObject({
      message: 'Resend delivery failed: terminated',
      retryable: true,
    })
  })

  it('keeps retryable and status through the mailer', async () => {
    const fetchFn = fakeFetch(() =>
      Promise.resolve(reply(429, { statusCode: 429, name: 'rate_limit_exceeded', message: 'Too many requests.' })),
    )
    const mailer = createMailer({
      transport: resendTransport({ apiKey, fetch: fetchFn }),
      from: 'My App <no-reply@myapp.loc>',
      branding: { companyName: 'My App', appUrl: 'https://myapp.loc', supportEmail: 'support@myapp.loc' },
    })

    const error = await transportError(mailer.send('passwordChanged', { to: 'user@example.com' }))

    expect(error).toMatchObject({ retryable: true, status: 429 })
  })
})

describe('resendTransport over HTTP', () => {
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
      return { status: 200, body: { id: 'email-3' } }
    })

    const result = await resendTransport({ apiKey, baseUrl }).send(message)

    expect(result).toEqual({ messageId: 'email-3' })
    expect(requests).toHaveLength(1)
    expect(requests[0]?.headers).toMatchObject({
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'user-agent': '@onetodone/mailer',
    })
    expect(requests[0]?.body).toMatchObject({ to: ['user@example.com'], subject: 'Confirm your email' })
  })

  it('fails as retryable when the server is unreachable', async () => {
    const baseUrl = await startServer(() => ({ status: 200, body: {} }))
    await stopServer()

    const error = await transportError(resendTransport({ apiKey, baseUrl }).send(message))

    expect(error.message).toBe('Resend delivery failed (ECONNREFUSED): fetch failed')
    expect(error.retryable).toBe(true)
  })
})

describe('resendTransport settings', () => {
  it.each([
    [{}, 'resend.apiKey is required'],
    [{ apiKey: '' }, 'resend.apiKey must not be empty'],
    [{ apiKey, baseUrl: 'api.resend.com' }, 'resend.baseUrl must be an absolute http: or https: URL'],
    [{ apiKey, baseUrl: 'ftp://api.resend.com' }, 'resend.baseUrl must be an absolute http: or https: URL'],
    [{ apiKey, fetch: 'fetch' }, 'resend.fetch must be a function, received "fetch"'],
    [{ apiKey, timeout: 5000 }, 'resend has unknown key "timeout"'],
    [undefined, 'resend must be an object'],
    [apiKey, 'resend must be an object'],
  ])('rejects %j', (options, problem) => {
    const error = configError(() => resendTransport(options as never))
    expect(error.message).toBe(`Invalid mailer configuration: ${problem}.`)
  })

  it('never echoes the API key', () => {
    const error = configError(() => resendTransport({ apiKey: 42 } as never))
    expect(error.message).toBe('Invalid mailer configuration: resend.apiKey must be a string, received number.')
  })
})

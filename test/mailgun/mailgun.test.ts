import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { MailerError } from '../../src/errors'
import * as mailgun from '../../src/mailgun'
import { mailgunTransport, type MailgunTransportOptions } from '../../src/mailgun'
import { createMailer } from '../../src/mailer'
import type { OutgoingMessage } from '../../src/transports/types'
import { catchError, catchRejection } from '../support/catch-error'

type Fetch = NonNullable<MailgunTransportOptions['fetch']>

const apiKey = 'key-0123456789abcdef'
const domain = 'mg.myapp.loc'

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
  replyTo: [{ name: 'Support "Team", Ліза', address: 'support@myapp.loc' }, 'help@myapp.loc'],
  headers: { 'X-Entity-Ref-ID': '42' },
}

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const queued = { id: '<20261024120000.1@mg.myapp.loc>', message: 'Queued. Thank you.' }

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, text: () => Promise.resolve(JSON.stringify(body)) }
}

function fakeFetch(respond: () => ReturnType<Fetch> = () => Promise.resolve(reply(200, queued))) {
  return vi.fn<Fetch>(respond)
}

function parseForm(body: ArrayBuffer, contentType: string): Promise<FormData> {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- an independent multipart parser is what the tests need
  return new Response(body, { headers: { 'content-type': contentType } }).formData()
}

async function sentForm(fetchFn: ReturnType<typeof fakeFetch>): Promise<FormData> {
  const init = fetchFn.mock.calls[0]?.[1]
  if (init === undefined) throw new Error('fetch was not called')
  return parseForm(init.body, init.headers['content-type'] ?? '')
}

function textFields(form: FormData): [string, string][] {
  return [...form.entries()].flatMap(([name, value]) => (typeof value === 'string' ? [[name, value]] : []))
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

describe('mailgun entry', () => {
  it('exposes the Mailgun transport', () => {
    expect(Object.keys(mailgun).sort()).toEqual(['mailgunTransport'])
  })

  it('accepts the global fetch', () => {
    expectTypeOf(fetch).toExtend<Fetch>()
    expect('close' in mailgunTransport({ apiKey, domain, fetch })).toBe(false)
  })
})

describe('mailgunTransport', () => {
  it('posts the email to the Mailgun API', async () => {
    const fetchFn = fakeFetch()

    const result = await mailgunTransport({ apiKey, domain, fetch: fetchFn }).send(message)

    expect(result).toEqual({ messageId: '<20261024120000.1@mg.myapp.loc>' })
    expect(fetchFn).toHaveBeenCalledOnce()
    const [url, init] = fetchFn.mock.calls[0] ?? []
    expect(url).toBe('https://api.mailgun.net/v3/mg.myapp.loc/messages')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({
      accept: 'application/json',
      authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
      'content-type': expect.stringMatching(/^multipart\/form-data; boundary=mailer-[0-9a-f-]{36}$/) as string,
      'user-agent': '@onetodone/mailer',
    })
    expect(textFields(await sentForm(fetchFn))).toEqual([
      ['from', '"My App" <no-reply@myapp.loc>'],
      ['to', 'user@example.com'],
      ['subject', 'Confirm your email'],
      ['html', '<p>Hello</p>'],
      ['text', 'Hello'],
    ])
  })

  it('maps every field', async () => {
    const fetchFn = fakeFetch()

    await mailgunTransport({ apiKey, domain, fetch: fetchFn }).send(fullMessage)

    expect(textFields(await sentForm(fetchFn))).toEqual([
      ['from', '"My App" <no-reply@myapp.loc>'],
      ['to', 'user@example.com'],
      ['to', '"Second User" <second@example.com>'],
      ['cc', 'Copy <copy@example.com>'],
      ['bcc', 'hidden@example.com'],
      ['h:Reply-To', '"Support \\"Team\\", Ліза" <support@myapp.loc>, help@myapp.loc'],
      ['subject', 'Confirm your email'],
      ['html', '<p>Hello</p>'],
      ['text', 'Hello'],
      ['h:X-Entity-Ref-ID', '42'],
    ])
  })

  it('uses a new boundary for every email', async () => {
    const fetchFn = fakeFetch()
    const transport = mailgunTransport({ apiKey, domain, fetch: fetchFn })

    await transport.send(message)
    await transport.send(message)

    const [first, second] = fetchFn.mock.calls.map(([, init]) => init.headers['content-type'])
    expect(first).not.toBe(second)
  })

  it('sends attachments as files, and inline images named by their content ID', async () => {
    const fetchFn = fakeFetch()
    const slice = new Uint8Array(new ArrayBuffer(16), 4, 8).fill(7)
    const pdf = Buffer.from('%PDF-1.7 invoice')

    await mailgunTransport({ apiKey, domain, fetch: fetchFn }).send({
      ...message,
      html: '<p>Hello</p><img src="cid:qr@myapp.loc" alt="QR code">',
      attachments: [
        { filename: 'invoice-1042.pdf', content: pdf, contentType: 'application/pdf' },
        { filename: 'orders "Q4".csv', content: 'id,name\n1,Ліза', contentType: 'text/csv; charset=utf-8' },
        { filename: 'slice.bin', content: slice, contentType: 'application/octet-stream' },
        { filename: 'qr.png', content: png, contentType: 'image/png', cid: 'qr@myapp.loc' },
      ],
    })

    const form = await sentForm(fetchFn)
    const files = await Promise.all(
      [...form.entries()].flatMap(([name, value]) =>
        value instanceof File
          ? [value.bytes().then((bytes) => ({ name, filename: value.name, type: value.type, bytes: [...bytes] }))]
          : [],
      ),
    )
    expect(files).toEqual([
      { name: 'attachment', filename: 'invoice-1042.pdf', type: 'application/pdf', bytes: [...pdf] },
      {
        name: 'attachment',
        filename: 'orders "Q4".csv',
        type: 'text/csv; charset=utf-8',
        bytes: [...Buffer.from('id,name\n1,Ліза', 'utf8')],
      },
      { name: 'attachment', filename: 'slice.bin', type: 'application/octet-stream', bytes: Array(8).fill(7) },
      { name: 'inline', filename: 'qr@myapp.loc', type: 'image/png', bytes: [...png] },
    ])
  })

  it.each([
    [{}, 'https://api.mailgun.net/v3/mg.myapp.loc/messages'],
    [{ region: 'us' as const }, 'https://api.mailgun.net/v3/mg.myapp.loc/messages'],
    [{ region: 'eu' as const }, 'https://api.eu.mailgun.net/v3/mg.myapp.loc/messages'],
    [
      { region: 'eu' as const, baseUrl: 'https://example.com/mailgun/' },
      'https://example.com/mailgun/v3/mg.myapp.loc/messages',
    ],
    [{ baseUrl: 'http://127.0.0.1:8080' }, 'http://127.0.0.1:8080/v3/mg.myapp.loc/messages'],
  ])('posts with %j', async (settings, url) => {
    const fetchFn = fakeFetch()

    await mailgunTransport({ apiKey, domain, ...settings, fetch: fetchFn }).send(message)

    expect(fetchFn.mock.calls[0]?.[0]).toBe(url)
  })

  it('uses the global fetch at send time', async () => {
    const fetchFn = fakeFetch(() => Promise.resolve(reply(200, { ...queued, id: '<2@mg.myapp.loc>' })))
    const transport = mailgunTransport({ apiKey, domain })
    vi.stubGlobal('fetch', fetchFn)

    try {
      await expect(transport.send(message)).resolves.toEqual({ messageId: '<2@mg.myapp.loc>' })
    } finally {
      vi.unstubAllGlobals()
    }
    expect(fetchFn).toHaveBeenCalledOnce()
  })
})

describe('mailgunTransport failures', () => {
  it.each([
    [400, "'from' parameter is not a valid address. please check documentation", false],
    [403, 'Domain mg.myapp.loc is not allowed to send: Free accounts are for test purposes only.', false],
    [404, 'Domain not found: mg.myapp.loc', false],
    [429, 'Too many requests', true],
    [500, 'Internal server error', true],
  ])('maps HTTP %i', async (status, reason, retryable) => {
    const body = { message: reason }
    const fetchFn = fakeFetch(() => Promise.resolve(reply(status, body)))

    const error = await transportError(mailgunTransport({ apiKey, domain, fetch: fetchFn }).send(message))

    expect(error.message).toBe(`Mailgun delivery failed (HTTP ${String(status)}): ${reason}`)
    expect(error).toMatchObject({ retryable, status })
    expect(error.cause).toEqual(body)
  })

  it('keeps a response that is not JSON as cause', async () => {
    const fetchFn = fakeFetch(() =>
      Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve('Forbidden') }),
    )

    const error = await transportError(mailgunTransport({ apiKey, domain, fetch: fetchFn }).send(message))

    expect(error.message).toBe('Mailgun delivery failed (HTTP 401)')
    expect(error).toMatchObject({ retryable: false, status: 401, cause: 'Forbidden' })
  })

  it('fails without retrying when a success response has no message ID', async () => {
    const fetchFn = fakeFetch(() => Promise.resolve(reply(200, { message: 'Queued. Thank you.' })))

    const error = await transportError(mailgunTransport({ apiKey, domain, fetch: fetchFn }).send(message))

    expect(error.message).toBe('Mailgun answered HTTP 200 without a message ID')
    expect(error).toMatchObject({ retryable: false, status: 200, cause: { message: 'Queued. Thank you.' } })
  })

  it('marks network failures as retryable', async () => {
    const cause = new TypeError('fetch failed', { cause: Object.assign(new Error('connect'), { code: 'ECONNRESET' }) })
    const failing = fakeFetch(() => Promise.reject(cause))

    const error = await transportError(mailgunTransport({ apiKey, domain, fetch: failing }).send(message))

    expect(error.message).toBe('Mailgun delivery failed (ECONNRESET): fetch failed')
    expect(error.cause).toBe(cause)
    expect(error.retryable).toBe(true)
    expect(error.status).toBeUndefined()
  })

  it('keeps retryable and status through the mailer', async () => {
    const fetchFn = fakeFetch(() => Promise.resolve(reply(429, { message: 'Too many requests' })))
    const mailer = createMailer({
      transport: mailgunTransport({ apiKey, domain, fetch: fetchFn }),
      from: 'My App <no-reply@myapp.loc>',
      branding: { companyName: 'My App', appUrl: 'https://myapp.loc', supportEmail: 'support@myapp.loc' },
    })

    const error = await transportError(mailer.send('passwordChanged', { to: 'user@example.com' }))

    expect(error).toMatchObject({ retryable: true, status: 429 })
  })
})

describe('mailgunTransport over HTTP', () => {
  let server: Server | undefined

  async function stopServer() {
    const running = server
    server = undefined
    if (running !== undefined) await new Promise((resolve) => running.close(resolve))
  }

  afterEach(stopServer)

  async function startServer(
    respond: (body: Buffer, headers: IncomingHttpHeaders, url: string) => { status: number; body: unknown },
  ): Promise<string> {
    server = createServer((request, response) => {
      const chunks: Buffer[] = []
      request.on('data', (chunk: Buffer) => chunks.push(chunk))
      request.on('end', () => {
        const { status, body } = respond(Buffer.concat(chunks), request.headers, request.url ?? '')
        response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body))
      })
    })
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
    return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`
  }

  it('sends through the global fetch', async () => {
    const requests: { body: Buffer; headers: IncomingHttpHeaders; url: string }[] = []
    const baseUrl = await startServer((body, headers, url) => {
      requests.push({ body, headers, url })
      return { status: 200, body: { ...queued, id: '<3@mg.myapp.loc>' } }
    })

    const result = await mailgunTransport({ apiKey, domain, baseUrl }).send({
      ...message,
      attachments: [{ filename: 'qr.png', content: png, contentType: 'image/png', cid: 'qr@myapp.loc' }],
    })

    expect(result).toEqual({ messageId: '<3@mg.myapp.loc>' })
    expect(requests).toHaveLength(1)
    const [request] = requests
    expect(request?.url).toBe('/v3/mg.myapp.loc/messages')
    expect(request?.headers.authorization).toBe(`Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`)
    const body = request?.body ?? Buffer.alloc(0)
    const form = await parseForm(
      body.buffer.slice(body.byteOffset, body.byteOffset + body.length) as ArrayBuffer,
      request?.headers['content-type'] ?? '',
    )
    expect(form.get('subject')).toBe('Confirm your email')
    const inline = form.get('inline')
    expect(inline instanceof File ? [...(await inline.bytes())] : inline).toEqual([...png])
  })

  it('fails as retryable when the server is unreachable', async () => {
    const baseUrl = await startServer(() => ({ status: 200, body: {} }))
    await stopServer()

    const error = await transportError(mailgunTransport({ apiKey, domain, baseUrl }).send(message))

    expect(error.message).toBe('Mailgun delivery failed (ECONNREFUSED): fetch failed')
    expect(error.retryable).toBe(true)
  })
})

describe('mailgunTransport settings', () => {
  it.each([
    [{ domain }, 'mailgun.apiKey is required'],
    [{ apiKey }, 'mailgun.domain is required'],
    [{ apiKey: '', domain }, 'mailgun.apiKey must not be empty'],
    [{ apiKey, domain: '' }, 'mailgun.domain must not be empty'],
    [{ apiKey, domain, region: 'asia' }, 'mailgun.region must be "us" or "eu", received "asia"'],
    [{ apiKey, domain, baseUrl: 'api.mailgun.net' }, 'mailgun.baseUrl must be an absolute http: or https: URL'],
    [{ apiKey, domain, fetch: 'fetch' }, 'mailgun.fetch must be a function, received "fetch"'],
    [{ apiKey, domain, sandbox: true }, 'mailgun has unknown key "sandbox"'],
    [undefined, 'mailgun must be an object'],
  ])('rejects %j', (options, problem) => {
    const error = configError(() => mailgunTransport(options as never))
    expect(error.message).toBe(`Invalid mailer configuration: ${problem}.`)
  })

  it('never echoes the API key', () => {
    const error = configError(() => mailgunTransport({ apiKey: 42, domain } as never))
    expect(error.message).toBe('Invalid mailer configuration: mailgun.apiKey must be a string, received number.')
  })
})

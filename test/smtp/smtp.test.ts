import { createTransport } from 'nodemailer'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { MailerError } from '../../src/errors'
import * as smtp from '../../src/smtp'
import { smtpTransport, type NodemailerTransporter, type SmtpTransportOptions } from '../../src/smtp'
import type { OutgoingMessage } from '../../src/transports/types'
import { catchError, catchRejection } from '../support/catch-error'
import { startSmtpServer, type TestSmtpServer } from '../support/smtp-server'

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
  cc: 'copy@example.com',
  bcc: [{ address: 'hidden@example.com' }],
  replyTo: { name: 'Support', address: 'support@myapp.loc' },
  headers: { 'X-Entity-Ref-ID': '42' },
}

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const withAttachments: OutgoingMessage = {
  ...message,
  html: '<p>Hello</p><img src="cid:qr@myapp.loc" alt="QR code">',
  attachments: [
    { filename: 'invoice-1042.pdf', content: Buffer.from('%PDF-1.7 invoice'), contentType: 'application/pdf' },
    { filename: 'orders.csv', content: 'id,name\n1,Ліза', contentType: 'text/csv; charset=utf-8' },
    { filename: 'qr.png', content: png, contentType: 'image/png', cid: 'qr@myapp.loc' },
  ],
}

let server: TestSmtpServer | undefined

afterEach(async () => {
  await server?.close()
  server = undefined
})

async function startServer(options?: Parameters<typeof startSmtpServer>[0]): Promise<TestSmtpServer> {
  server = await startSmtpServer(options)
  return server
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

function fakeTransporter(sendMail: NodemailerTransporter['sendMail']) {
  return { sendMail: vi.fn(sendMail), close: vi.fn() }
}

describe('smtp entry', () => {
  it('exposes the SMTP transport', () => {
    expect(Object.keys(smtp).sort()).toEqual(['smtpTransport'])
  })

  it('accepts any nodemailer transporter', () => {
    expectTypeOf(createTransport({ host: 'localhost' })).toExtend<NodemailerTransporter>()
    expectTypeOf(createTransport({ host: 'localhost', pool: true })).toExtend<NodemailerTransporter>()
    expectTypeOf(createTransport({ jsonTransport: true })).toExtend<NodemailerTransporter>()
    expectTypeOf<SmtpTransportOptions>().toHaveProperty('host')
    // @ts-expect-error options not covered by the settings go through a nodemailer transporter
    const unsupported = () => smtpTransport({ host: 'localhost', dkim: {} })
    expect(unsupported).toThrow(MailerError)
  })
})

describe('smtpTransport over SMTP', () => {
  it('delivers the email with every field', async () => {
    const { port, mails } = await startServer()
    const transport = smtpTransport({ host: '127.0.0.1', port, name: 'mailer.test' })

    const result = await transport.send(fullMessage)

    expect(result.messageId).toMatch(/^<.+@.+>$/)
    expect(result.accepted).toEqual([
      'user@example.com',
      'second@example.com',
      'copy@example.com',
      'hidden@example.com',
    ])
    expect(result.rejected).toEqual([])
    expect(mails).toHaveLength(1)
    const [mail] = mails
    expect(mail?.from).toBe('no-reply@myapp.loc')
    expect(mail?.to).toEqual(['user@example.com', 'second@example.com', 'copy@example.com', 'hidden@example.com'])
    const data = mail?.data ?? ''
    expect(data).toMatch(/^From: "?My App"? <no-reply@myapp\.loc>$/m)
    expect(data).toMatch(/^To: user@example\.com, "?Second User"? <second@example\.com>$/m)
    expect(data).toMatch(/^Cc: copy@example\.com$/m)
    expect(data).toMatch(/^Reply-To: "?Support"? <support@myapp\.loc>$/m)
    expect(data).toMatch(/^Subject: Confirm your email$/m)
    expect(data).toMatch(/^X-Entity-Ref-ID: 42$/m)
    expect(data).toMatch(/^Message-ID: /im)
    expect(data).toContain('multipart/alternative')
    expect(data).toContain('Content-Type: text/plain')
    expect(data).toContain('Content-Type: text/html')
    expect(data).toContain('<p>Hello</p>')
    expect(data).not.toMatch(/^Bcc:/im)
    expect(data).not.toContain('hidden@example.com')
  })

  it('delivers regular attachments and inline images', async () => {
    const { port, mails } = await startServer()
    const transport = smtpTransport({ host: '127.0.0.1', port })

    await transport.send(withAttachments)

    const data = mails[0]?.data ?? ''
    expect(data).toMatch(/^Content-Type: multipart\/mixed;/im)
    expect(data).toMatch(/^Content-Type: multipart\/related;/im)
    expect(data).toMatch(/^Content-Type: application\/pdf; name="?invoice-1042\.pdf"?$/im)
    expect(data).toMatch(/^Content-Disposition: attachment; filename="?invoice-1042\.pdf"?$/im)
    expect(data).toContain(Buffer.from('%PDF-1.7 invoice').toString('base64'))
    expect(data).toMatch(/^Content-Type: text\/csv; charset=utf-8; name="?orders\.csv"?$/im)
    expect(data).toMatch(/^Content-Disposition: attachment; filename="?orders\.csv"?$/im)
    expect(data).toMatch(/^Content-Type: image\/png; name="?qr\.png"?$/im)
    expect(data).toMatch(/^Content-Disposition: inline; filename="?qr\.png"?$/im)
    expect(data).toMatch(/^Content-ID: <qr@myapp\.loc>$/im)
    expect(data).toContain(Buffer.from(png).toString('base64'))
    const related = data.slice(data.search(/multipart\/related/i))
    expect(related).toContain('<img src="cid:qr@myapp.loc" alt="QR code">')
  })

  it('logs in with the credentials', async () => {
    const { port, logins } = await startServer()
    const transport = smtpTransport({ host: '127.0.0.1', port, auth: { user: 'mailer', pass: 's3cret' } })

    await transport.send(message)

    expect(logins).toEqual([{ user: 'mailer', pass: 's3cret' }])
  })

  it('delivers to the accepted recipients and reports the rejected ones', async () => {
    const { port, mails } = await startServer({ reject: ['gone@example.com'] })
    const transport = smtpTransport({ host: '127.0.0.1', port })

    const result = await transport.send({ ...message, to: ['user@example.com', 'gone@example.com'] })

    expect(result.accepted).toEqual(['user@example.com'])
    expect(result.rejected).toEqual(['gone@example.com'])
    expect(mails[0]?.to).toEqual(['user@example.com'])
  })

  it('fails with TRANSPORT_FAILED when every recipient is rejected', async () => {
    const { port, mails } = await startServer({ reject: ['gone@example.com'] })
    const transport = smtpTransport({ host: '127.0.0.1', port })

    const error = await transportError(transport.send({ ...message, to: 'gone@example.com' }))

    expect(error.message).toMatch(/^SMTP delivery failed \(EENVELOPE\): /)
    expect(error.cause).toBeInstanceOf(Error)
    expect(error.cause).toMatchObject({ code: 'EENVELOPE' })
    expect(mails).toEqual([])
  })

  it('fails with TRANSPORT_FAILED when the server is unreachable', async () => {
    const { port } = await startServer()
    await server?.close()
    server = undefined
    const transport = smtpTransport({ host: '127.0.0.1', port })

    const error = await transportError(transport.send(message))

    expect(error.message).toMatch(/^SMTP delivery failed \(\w+\): .*ECONNREFUSED/)
    expect(error.cause).toBeInstanceOf(Error)
  })

  it('reuses pooled connections until closed', async () => {
    const { port, mails } = await startServer()
    const transport = smtpTransport({ host: '127.0.0.1', port, pool: true, maxConnections: 1 })

    await Promise.all([transport.send(message), transport.send({ ...message, subject: 'Second' })])
    await transport.close()

    expect(mails.map((mail) => /^Subject: (.*)$/m.exec(mail.data)?.[1])).toEqual(['Confirm your email', 'Second'])
  })
})

describe('smtpTransport with a nodemailer transporter', () => {
  it('passes the email to sendMail', async () => {
    const transporter = createTransport({ jsonTransport: true })
    const sendMail = vi.spyOn(transporter, 'sendMail')

    const result = await smtpTransport(transporter).send(fullMessage)

    expect(result.messageId).toEqual(expect.any(String))
    const info = (await sendMail.mock.results[0]?.value) as { message: string }
    const { replyTo, ...mail } = JSON.parse(info.message) as Record<string, unknown>
    expect(mail).toMatchObject({
      from: { name: 'My App', address: 'no-reply@myapp.loc' },
      to: [
        { name: '', address: 'user@example.com' },
        { name: 'Second User', address: 'second@example.com' },
      ],
      cc: [{ name: '', address: 'copy@example.com' }],
      bcc: [{ name: '', address: 'hidden@example.com' }],
      subject: 'Confirm your email',
      html: '<p>Hello</p>',
      text: 'Hello',
      headers: { 'X-Entity-Ref-ID': '42' },
    })
    // nodemailer 6.0 serializes a single Reply-To address without the list.
    expect([replyTo].flat()).toEqual([{ name: 'Support', address: 'support@myapp.loc' }])
  })

  it('maps addresses to the shape nodemailer accepts', async () => {
    const transporter = fakeTransporter(() =>
      Promise.resolve({ messageId: '<1@test>', accepted: [{ address: 'user@example.com' }], rejected: ['x@y.z'] }),
    )

    const result = await smtpTransport(transporter).send(fullMessage)

    expect(result).toEqual({ messageId: '<1@test>', accepted: ['user@example.com'], rejected: ['x@y.z'] })
    expect(transporter.sendMail).toHaveBeenCalledWith({
      from: { name: 'My App', address: 'no-reply@myapp.loc' },
      to: ['user@example.com', { name: 'Second User', address: 'second@example.com' }],
      cc: ['copy@example.com'],
      bcc: [{ name: '', address: 'hidden@example.com' }],
      replyTo: [{ name: 'Support', address: 'support@myapp.loc' }],
      subject: 'Confirm your email',
      html: '<p>Hello</p>',
      text: 'Hello',
      headers: { 'X-Entity-Ref-ID': '42' },
    })
  })

  it('maps attachments to nodemailer attachments with an explicit disposition', async () => {
    const transporter = fakeTransporter(() => Promise.resolve({ messageId: '<1@test>' }))

    await smtpTransport(transporter).send(withAttachments)

    const attachments = transporter.sendMail.mock.calls[0]?.[0].attachments
    expect(attachments).toEqual([
      {
        filename: 'invoice-1042.pdf',
        content: Buffer.from('%PDF-1.7 invoice'),
        contentType: 'application/pdf',
        contentDisposition: 'attachment',
      },
      {
        filename: 'orders.csv',
        content: 'id,name\n1,Ліза',
        contentType: 'text/csv; charset=utf-8',
        contentDisposition: 'attachment',
      },
      {
        filename: 'qr.png',
        content: Buffer.from(png),
        contentType: 'image/png',
        contentDisposition: 'inline',
        cid: 'qr@myapp.loc',
      },
    ])
    expect(Buffer.isBuffer(attachments?.[2]?.content)).toBe(true)
  })

  it('shares the memory of Uint8Array content', async () => {
    const transporter = fakeTransporter(() => Promise.resolve({ messageId: '<1@test>' }))
    const content = new Uint8Array(new ArrayBuffer(16), 4, 8).fill(7)

    await smtpTransport(transporter).send({
      ...message,
      attachments: [{ filename: 'slice.bin', content, contentType: 'application/octet-stream' }],
    })

    const sent = transporter.sendMail.mock.calls[0]?.[0].attachments?.[0]?.content
    expect(sent).toEqual(Buffer.alloc(8, 7))
    expect(Buffer.isBuffer(sent) && sent.buffer).toBe(content.buffer)
  })

  it('leaves optional fields out', async () => {
    const transporter = fakeTransporter(() => Promise.resolve({ messageId: '<1@test>' }))

    const result = await smtpTransport(transporter).send(message)

    expect(result).toEqual({ messageId: '<1@test>' })
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['user@example.com'],
        cc: undefined,
        bcc: undefined,
        headers: undefined,
        attachments: undefined,
      }),
    )
  })

  it('wraps a rejection in TRANSPORT_FAILED with the error as cause', async () => {
    const cause = Object.assign(new Error('Invalid login: 535 Authentication failed'), { code: 'EAUTH' })
    const transporter = fakeTransporter(() => Promise.reject(cause))

    const error = await transportError(smtpTransport(transporter).send(message))

    expect(error.message).toBe('SMTP delivery failed (EAUTH): Invalid login: 535 Authentication failed')
    expect(error.cause).toBe(cause)
  })

  it('wraps synchronous throws and non-Error reasons', async () => {
    const throwing = fakeTransporter(() => {
      throw new Error('Not connected')
    })
    const rejecting = fakeTransporter(() => Promise.reject(new Error('boom')))
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a non-Error reason is the case under test
    const stringly = fakeTransporter(() => Promise.reject('down'))

    expect((await transportError(smtpTransport(throwing).send(message))).message).toBe(
      'SMTP delivery failed: Not connected',
    )
    expect((await transportError(smtpTransport(rejecting).send(message))).message).toBe('SMTP delivery failed: boom')
    const error = await transportError(smtpTransport(stringly).send(message))
    expect(error.message).toBe('SMTP delivery failed: down')
    expect(error.cause).toBe('down')
  })

  it('closes the transporter', async () => {
    const transporter = fakeTransporter(() => Promise.resolve({ messageId: '<1@test>' }))

    await smtpTransport(transporter).close()

    expect(transporter.close).toHaveBeenCalledOnce()
  })

  it('closes a transporter without close', async () => {
    await expect(smtpTransport({ sendMail: () => Promise.resolve({ messageId: '' }) }).close()).resolves.toBeUndefined()
  })
})

describe('smtpTransport settings', () => {
  it.each([
    [{}, 'smtp.host is required'],
    [{ host: '  ' }, 'smtp.host must not be empty'],
    [{ host: 'localhost', port: 0 }, 'smtp.port must be a port number from 1 to 65535'],
    [{ host: 'localhost', port: 65536 }, 'smtp.port must be a port number from 1 to 65535'],
    [{ host: 'localhost', port: 25.5 }, 'smtp.port must be a port number from 1 to 65535'],
    [{ host: 'localhost', port: '587' }, 'smtp.port must be a port number from 1 to 65535, received "587"'],
    [{ host: 'localhost', secure: 'yes' }, 'smtp.secure must be true or false, received "yes"'],
    [{ host: 'localhost', auth: { user: 'mailer' } }, 'smtp.auth.pass is required'],
    [{ host: 'localhost', auth: { user: '', pass: 'x' } }, 'smtp.auth.user must not be empty'],
    [{ host: 'localhost', tls: { rejectUnauthorised: false } }, 'smtp.tls has unknown key "rejectUnauthorised"'],
    [{ host: 'localhost', maxConnections: 0 }, 'smtp.maxConnections must be a positive integer'],
    [{ host: 'localhost', dkim: {} }, 'smtp has unknown key "dkim"'],
    [undefined, 'smtp must be an object'],
    ['smtp://localhost', 'smtp must be an object'],
  ])('rejects %j', (options, problem) => {
    const error = configError(() => smtpTransport(options as never))
    expect(error.message).toBe(`Invalid mailer configuration: ${problem}.`)
  })

  it('never echoes credentials', () => {
    const error = configError(() => smtpTransport({ host: 'localhost', auth: { user: 42, pass: 's3cret' } } as never))
    expect(error.message).toBe('Invalid mailer configuration: smtp.auth.user must be a string, received number.')
  })

  it('accepts every setting', async () => {
    const options: SmtpTransportOptions = {
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: { user: 'mailer', pass: 's3cret' },
      requireTLS: true,
      tls: { rejectUnauthorized: false, servername: 'example.com' },
      name: 'app.example.com',
      pool: true,
      maxConnections: 2,
      maxMessages: 50,
      connectionTimeout: 10_000,
      greetingTimeout: 5_000,
      socketTimeout: 30_000,
    }
    await expect(smtpTransport(options).close()).resolves.toBeUndefined()
  })
})

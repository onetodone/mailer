import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { html } from '../../src/core/html'
import { defineLayout } from '../../src/core/layout'
import { createMailer, type SendOptions } from '../../src/mailer'
import { defineTemplate } from '../../src/templates/define'
import { memoryTransport } from '../../src/transports/memory'
import type { Attachment, OutgoingAttachment } from '../../src/transports/types'
import { branding, from, mailerRejection } from '../support/mailer'

const to = 'lizzie@example.com'
const pdf = Buffer.from('%PDF-1.7 invoice')
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

const ticket = defineTemplate({
  name: 'ticket',
  schema: z.object({ images: z.array(z.string()).default([]) }),
  render: ({ props, ui }) => ({
    subject: 'Your ticket',
    body: [
      ui.paragraph('Show this code at the entrance.'),
      ...props.images.map((id) => ui.image(`cid:${id}`, { alt: id })),
    ],
  }),
})

function setup() {
  const transport = memoryTransport()
  return { transport, mailer: createMailer({ transport, from, branding, templates: { ticket } }) }
}

describe('attachments', () => {
  it('hands the files to the transport with their content as passed', async () => {
    const { transport, mailer } = setup()
    const attachments: Attachment[] = [
      { filename: 'invoice-1042.pdf', content: pdf },
      { filename: 'invite.ics', content: 'BEGIN:VCALENDAR', contentType: 'text/calendar; method=REQUEST' },
    ]

    await mailer.send('passwordChanged', { to, attachments })

    expect(transport.sent[0]?.attachments).toStrictEqual([
      { filename: 'invoice-1042.pdf', content: pdf, contentType: 'application/pdf' },
      { filename: 'invite.ics', content: 'BEGIN:VCALENDAR', contentType: 'text/calendar; method=REQUEST' },
    ])
    expect(transport.sent[0]?.attachments?.[0]?.content).toBe(pdf)
  })

  it.each<[filename: string, content: Uint8Array | string, contentType: string]>([
    ['invoice.PDF', pdf, 'application/pdf'],
    ['photo.jpeg', png, 'image/jpeg'],
    ['qr.png', png, 'image/png'],
    ['report.xlsx', pdf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['orders.csv', 'id,name\n1,Ліза', 'text/csv; charset=utf-8'],
    ['notes.txt', 'Hello', 'text/plain; charset=utf-8'],
    ['notes.txt', png, 'text/plain'],
    ['archive.tar.gz', pdf, 'application/octet-stream'],
    ['README', 'Hello', 'application/octet-stream'],
    ['constructor', pdf, 'application/octet-stream'],
    ['file.constructor', pdf, 'application/octet-stream'],
  ])('guesses the type of %s', async (filename, content, contentType) => {
    const { transport, mailer } = setup()

    await mailer.send('passwordChanged', { to, attachments: [{ filename, content }] })

    expect(transport.sent[0]?.attachments?.[0]?.contentType).toBe(contentType)
  })

  it('passes an empty list through', async () => {
    const { transport, mailer } = setup()

    await mailer.send('passwordChanged', { to, attachments: [] })

    expect(transport.sent[0]?.attachments).toEqual([])
  })

  it('leaves attachments out of the message when none are passed', async () => {
    const { transport, mailer } = setup()

    await mailer.send('passwordChanged', { to })

    expect(transport.sent[0]).not.toHaveProperty('attachments')
  })

  it('accepts every valid field', async () => {
    const { transport, mailer } = setup()

    await mailer.send('passwordChanged', {
      to,
      attachments: [
        { filename: 'Рахунак №7.pdf', content: pdf, contentType: 'application/pdf' },
        { filename: 'empty.txt', content: '' },
        { filename: 'logo.png', content: png, contentType: 'image/png', cid: 'logo@myapp.loc' },
      ],
    })

    expect(transport.sent).toHaveLength(1)
  })

  it('types the attachments option', () => {
    expectTypeOf<SendOptions['attachments']>().toEqualTypeOf<readonly Attachment[] | undefined>()
    expectTypeOf<{ filename: string; content: Buffer }>().toExtend<Attachment>()
    expectTypeOf<{ filename: string; path: string }>().not.toExtend<Attachment>()
    expectTypeOf<Attachment>().not.toExtend<OutgoingAttachment>()
    expectTypeOf<OutgoingAttachment>().toExtend<Attachment>()
  })
})

describe('inline images', () => {
  it('keeps the cid of attachments the HTML references', async () => {
    const { transport, mailer } = setup()

    await mailer.send('ticket', {
      to,
      props: { images: ['qr@myapp.loc'] },
      attachments: [
        { filename: 'invoice.pdf', content: pdf },
        { filename: 'qr.png', content: png, cid: 'qr@myapp.loc' },
      ],
    })

    const [message] = transport.sent
    expect(message?.html).toContain('<img src="cid:qr@myapp.loc" ')
    expect(message?.attachments).toStrictEqual([
      { filename: 'invoice.pdf', content: pdf, contentType: 'application/pdf' },
      { filename: 'qr.png', content: png, contentType: 'image/png', cid: 'qr@myapp.loc' },
    ])
  })

  it('sends an attachment whose cid the HTML never references as a regular attachment', async () => {
    const { transport, mailer } = setup()

    await mailer.send('ticket', {
      to,
      props: { images: ['qr'] },
      attachments: [
        { filename: 'qr.png', content: png, cid: 'qr' },
        { filename: 'map.png', content: png, cid: 'map' },
      ],
    })

    expect(transport.sent[0]?.attachments).toStrictEqual([
      { filename: 'qr.png', content: png, contentType: 'image/png', cid: 'qr' },
      { filename: 'map.png', content: png, contentType: 'image/png' },
    ])
  })

  it('rejects a cid: the HTML references without a matching attachment, without sending', async () => {
    const { transport, mailer } = setup()

    const error = await mailerRejection(
      mailer.send('ticket', {
        to,
        props: { images: ['qr'] },
        attachments: [{ filename: 'qr.png', content: png, cid: 'QR' }],
      }),
    )

    expect(error.code).toBe('INVALID_OPTIONS')
    expect(error.message).toBe('Invalid send options: attachments must include cid "qr" referenced in the HTML.')
    expect(transport.sent).toHaveLength(0)
  })

  it('names every missing cid, also when no attachments are passed', async () => {
    const { mailer } = setup()

    const error = await mailerRejection(mailer.send('ticket', { to, props: { images: ['qr', 'map', 'qr'] } }))

    expect(error.message).toBe(
      'Invalid send options: attachments must include cids "qr", "map" referenced in the HTML.',
    )
  })

  it('checks references in the layout too', async () => {
    const transport = memoryTransport()
    const layout = defineLayout(({ content }) => ({
      html: html`<img src="cid:logo" alt="My App">${content.html}`,
      text: content.text,
    }))
    const mailer = createMailer({ transport, from, branding, layout })

    const error = await mailerRejection(mailer.send('passwordChanged', { to }))
    await mailer.send('passwordChanged', { to, attachments: [{ filename: 'logo.png', content: png, cid: 'logo' }] })

    expect(error.message).toBe('Invalid send options: attachments must include cid "logo" referenced in the HTML.')
    expect(transport.sent[0]?.attachments?.[0]?.cid).toBe('logo')
  })

  it('does not check references when rendering', async () => {
    const { mailer } = setup()

    const { html: markup } = await mailer.render('ticket', { props: { images: ['qr'] } })

    expect(markup).toContain('<img src="cid:qr" ')
  })
})

describe('attachment validation', () => {
  it.each<[string, unknown, string]>([
    [
      'a list that is not an array',
      { filename: 'a.pdf', content: pdf },
      'attachments must be an array of attachments, received object',
    ],
    ['an entry that is not an object', ['a.pdf'], 'attachments.0 must be an object'],
    ['a missing file name', [{ content: pdf }], 'attachments.0.filename is required'],
    [
      'a file name that is not a string',
      [{ filename: 42, content: pdf }],
      'attachments.0.filename must be a string, received number',
    ],
    ['an empty file name', [{ filename: '  ', content: pdf }], 'attachments.0.filename must not be empty'],
    [
      'a line break in a file name',
      [{ filename: 'a.pdf\r\nBcc: victim@example.com', content: pdf }],
      'attachments.0.filename must not contain line breaks or other control characters',
    ],
    [
      'a tab in a file name',
      [{ filename: 'a\t.pdf', content: pdf }],
      'attachments.0.filename must not contain line breaks or other control characters',
    ],
    [
      'a NUL character in a file name',
      [{ filename: 'a.pdf\u0000.exe', content: pdf }],
      'attachments.0.filename must not contain line breaks or other control characters',
    ],
    [
      'a C1 control character in a file name',
      [{ filename: 'a\u0085.pdf', content: pdf }],
      'attachments.0.filename must not contain line breaks or other control characters',
    ],
    ['a missing content', [{ filename: 'a.pdf' }], 'attachments.0.content is required'],
    [
      'content that is an ArrayBuffer',
      [{ filename: 'a.pdf', content: new ArrayBuffer(4) }],
      'attachments.0.content must be a string, a Buffer or a Uint8Array, received object',
    ],
    [
      'a line break in a content type',
      [{ filename: 'a.pdf', content: pdf, contentType: 'application/pdf\r\nBcc: victim@example.com' }],
      'attachments.0.contentType must not contain line breaks or other control characters',
    ],
    [
      'a content type that is not a MIME type',
      [{ filename: 'a.pdf', content: pdf, contentType: 'pdf' }],
      'attachments.0.contentType must be a MIME type like "application/pdf", received "pdf"',
    ],
    [
      'a cid with a space',
      [{ filename: 'a.png', content: png, cid: 'my logo' }],
      'attachments.0.cid must use only ASCII letters, digits, ".", "_", "-" and "@", received "my logo"',
    ],
    [
      'a cid in angle brackets',
      [{ filename: 'a.png', content: png, cid: '<logo>' }],
      'attachments.0.cid must use only ASCII letters, digits, ".", "_", "-" and "@", received "<logo>"',
    ],
    [
      'a repeated cid',
      [
        { filename: 'a.png', content: png, cid: 'logo' },
        { filename: 'b.png', content: png, cid: 'logo' },
      ],
      'attachments.1.cid must be unique, received "logo" again',
    ],
    [
      'an unknown key',
      [{ filename: 'a.pdf', path: '/tmp/a.pdf' }],
      'attachments.0.content is required; attachments.0 has unknown key "path"',
    ],
  ])('rejects %s without sending', async (_case, attachments, detail) => {
    const { transport, mailer } = setup()

    const error = await mailerRejection(mailer.send('passwordChanged', { to, attachments } as never))

    expect(error.code).toBe('INVALID_OPTIONS')
    expect(error.message).toBe(`Invalid send options: ${detail}.`)
    expect(transport.sent).toHaveLength(0)
  })

  it('never echoes the content', async () => {
    const { mailer } = setup()

    const error = await mailerRejection(
      mailer.send('passwordChanged', { to, attachments: [{ filename: 'a\n.txt', content: 'secret-token-123' }] }),
    )

    expect(error.message).not.toContain('secret-token-123')
  })

  it('is not an option of render', async () => {
    const { mailer } = setup()

    const error = await mailerRejection(mailer.render('passwordChanged', { attachments: [] } as never))

    expect(error.message).toBe('Invalid render options: has unknown key "attachments".')
  })
})

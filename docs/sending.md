# Sending emails

`mailer.send(template, options)` renders the template and hands the email to the transport. It resolves with the transport's result: `{ messageId, accepted?, rejected? }`.

| Option        | Description                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| `to`          | Recipients: one address or a list. Required.                                          |
| `cc`          | Carbon-copy recipients.                                                               |
| `bcc`         | Blind carbon-copy recipients.                                                         |
| `replyTo`     | Where replies go. Replaces the mailer's `replyTo` for this email.                     |
| `headers`     | Extra message headers, such as `{ 'X-Entity-Ref-ID': 'order-1042' }`.                 |
| `attachments` | Files to attach and inline images. See [attachments](#attachments-and-inline-images). |
| `locale`      | Locale of this email. Default: the mailer's `locale`.                                 |
| `props`       | Template props. Can be left out when every prop of the template is optional.          |

An address is written in one of three forms: `'lizzie@example.com'`, `'Lizzie Smith <lizzie@example.com>'` or `{ name: 'Lizzie Smith', address: 'lizzie@example.com' }`. Any field that takes addresses also accepts a non-empty list of them. Addresses reach the transport exactly as you passed them.

```ts
await mailer.send('resetPassword', {
  to: { name: 'Lizzie Smith', address: 'lizzie@example.com' },
  replyTo: 'support@example.com',
  headers: { 'X-Entity-Ref-ID': 'reset-8f14e45f' },
  locale: 'be',
  props: { resetUrl: 'https://example.com/reset?token=abc123', expiresInMinutes: 30 },
})
```

The options are validated before anything is sent. These throw a `MailerError` with code `INVALID_OPTIONS`:

- a malformed address;
- a line break in an address, a display name or a header value;
- a header name with spaces, a colon or non-ASCII characters;
- an attachment without `filename` or `content`, a line break or another control character in a file name or content type, a content type that is not a MIME type, or an invalid or repeated `cid`;
- a `cid:` reference in the HTML without an attachment of that `cid`;
- an unknown locale or option.

## Attachments and inline images

Pass files in `attachments`, such as an invoice your application generated. `orderShipped` is the custom template from [templates](customization.md#4-templates):

```ts
import { readFile } from 'node:fs/promises'

await mailer.send('orderShipped', {
  to: 'lizzie@example.com',
  props: { orderId: '1042', trackUrl: 'https://example.com/orders/1042/tracking' },
  attachments: [
    { filename: 'invoice-1042.pdf', content: await readFile('invoices/1042.pdf') },
    { filename: 'items.csv', content: 'sku,quantity\nA-17,2\n' },
  ],
})
```

| Field         | Description                                                                                                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filename`    | Required. File name the recipient sees.                                                                                                                                                                                                         |
| `content`     | Required. The file as a `Buffer` or `Uint8Array`, or text, which is sent as UTF-8.                                                                                                                                                              |
| `contentType` | MIME type, such as `application/pdf`. Default: guessed from the extension of `filename` (PDF, office documents, CSV, text, calendar, common images), or `application/octet-stream`. A guessed text type of text content gets `; charset=utf-8`. |
| `cid`         | Content-ID that makes the file an inline image, see below.                                                                                                                                                                                      |

There is no `path` option: read files yourself, so every transport receives the same data.

To show an image inside the email, such as a QR code generated for this recipient, attach it with a `cid` and reference it as `cid:<cid>`, for example with `ui.image` in a [custom template](customization.md#4-templates). Here `qrCodePng` is the image as a `Buffer`, such as the output of a QR code library:

```ts
import { createMailer, defineTemplate } from '@onetodone/mailer'
import { z } from 'zod'

const ticket = defineTemplate({
  name: 'ticket',
  schema: z.object({ eventName: z.string() }),
  render: ({ props, ui }) => ({
    subject: `Your ticket for ${props.eventName}`,
    body: [
      ui.heading(props.eventName),
      ui.paragraph('Show this code at the entrance:'),
      ui.image('cid:ticket-qr', { alt: 'Ticket QR code', width: 200, height: 200 }),
    ],
  }),
})

const mailer = createMailer({ transport, from, branding, templates: { ticket } })

await mailer.send('ticket', {
  to: 'lizzie@example.com',
  props: { eventName: 'Spring Meetup' },
  attachments: [{ filename: 'ticket.png', content: qrCodePng, cid: 'ticket-qr' }],
})
```

- A `cid` consists of ASCII letters, digits, `.`, `_`, `-` and `@`, and is unique within one email. References are case-sensitive.
- After rendering, `send` checks the whole HTML, layout included: every `cid:` reference needs an attachment with that `cid`. Otherwise `send` throws `INVALID_OPTIONS` naming the missing cid, and nothing is sent.
- An attachment whose `cid` the HTML never references is sent as a regular attachment.
- An image with a public URL needs no attachment: `ui.image('https://example.com/banner.png', { alt: 'Spring sale' })`.
- Use PNG, JPEG or GIF for images in emails: Gmail and Outlook do not show SVG.
- `render` takes no attachments and does not check `cid:` references.

## Rendering without sending

`mailer.render(template, options)` returns `{ subject, html, text }` without calling the transport or the hooks. Use it for previews, snapshot tests or your own delivery:

```ts
const { subject, html, text } = await mailer.render('resetPassword', {
  locale: 'be',
  props: { resetUrl: 'https://example.com/reset?token=abc123' },
})
```

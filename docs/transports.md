# Transports

A transport delivers the rendered emails. The package ships three, and you can [write your own](#your-own-transport).

## SMTP

`smtpTransport` sends through [nodemailer](https://nodemailer.com), which you install next to this package:

```ts
import { smtpTransport } from '@onetodone/mailer/smtp'

const transport = smtpTransport({
  host: 'smtp.example.com',
  port: 587,
  auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  pool: true,
})
```

| Option              | Description                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `host`              | Required. Server host name or IP address.                                                                                          |
| `port`              | Server port. Default `465` when `secure` is set, otherwise `587`.                                                                  |
| `secure`            | Connect over TLS from the start, usually on port 465. Without it, the connection upgrades with STARTTLS when the server offers it. |
| `auth`              | Credentials: `{ user, pass }`.                                                                                                     |
| `requireTLS`        | Fail unless the connection upgrades with STARTTLS.                                                                                 |
| `tls`               | `rejectUnauthorized` (default `true`) and `servername`.                                                                            |
| `name`              | Host name announced in the SMTP greeting. Default: the machine's host name.                                                        |
| `pool`              | Keep connections open and reuse them. Call `mailer.close()` on shutdown.                                                           |
| `maxConnections`    | Most pooled connections at once. Default `5`.                                                                                      |
| `maxMessages`       | Most emails per pooled connection before it is replaced. Default `100`.                                                            |
| `connectionTimeout` | Milliseconds to wait for the connection. Default `120000`.                                                                         |
| `greetingTimeout`   | Milliseconds to wait for the server greeting. Default `30000`.                                                                     |
| `socketTimeout`     | Milliseconds of inactivity before the connection times out. Default `600000`.                                                      |

The options are validated when the transport is created, and invalid ones throw `INVALID_CONFIG`. For anything they do not cover, such as DKIM signing, OAuth2 or a proxy, pass your own nodemailer transporter:

```ts
import { createTransport } from 'nodemailer'
import { smtpTransport } from '@onetodone/mailer/smtp'

const transport = smtpTransport(
  createTransport({
    host: 'smtp.example.com',
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    dkim: { domainName: 'example.com', keySelector: 'mail', privateKey: process.env.DKIM_PRIVATE_KEY! },
  }),
)
```

Attachments with a `cid` go out as inline images next to the HTML, the others as regular attachments.

A failed delivery rejects with `TRANSPORT_FAILED`, with nodemailer's error as `cause`. When the server accepts some recipients and rejects others, `send` resolves and lists them in `accepted` and `rejected`. `mailer.close()` closes the connections, including those of a transporter you passed in.

## Console

`consoleTransport()` prints each email instead of sending it: the addresses, the subject, the name, type and size of each attachment, and the plain-text version. Pass `log` to write somewhere other than `console.log`. The text contains links with tokens, so use it in development only.

```ts
import { consoleTransport } from '@onetodone/mailer'
import { smtpTransport } from '@onetodone/mailer/smtp'

const transport =
  process.env.NODE_ENV === 'production' ? smtpTransport({ host: 'smtp.example.com' }) : consoleTransport()
```

To see the HTML during development, point `smtpTransport` at a local SMTP catcher such as [Mailpit](https://mailpit.axllent.org).

## Memory

`memoryTransport()` keeps emails in memory instead of sending them. See [testing](testing.md).

## Your own transport

Any object with a `send` method is a transport, so you can deliver through an HTTP email API:

```ts
import type { MailTransport } from '@onetodone/mailer'

const apiTransport: MailTransport = {
  async send(message) {
    const response = await fetch('https://mail-api.example.com/v1/send', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.MAIL_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        ...message,
        attachments: message.attachments?.map(({ content, ...attachment }) => ({
          ...attachment,
          content: Buffer.from(content).toString('base64'),
        })),
      }),
    })
    if (!response.ok) throw new Error(`Mail API responded with ${response.status}`)
    const { id } = (await response.json()) as { id: string }
    return { messageId: id }
  },
}
```

`message` has `from`, `to`, `cc`, `bcc`, `replyTo`, `subject`, `html`, `text`, `headers` and `attachments`. Addresses keep the form the caller used: a string or a `{ name, address }` object, one or a list. Errors that are not a `MailerError` are wrapped in `TRANSPORT_FAILED`, with the original error as `cause`. Add an optional `close()` method if the transport holds connections.

Each attachment has `filename`, `content` (a `Uint8Array` or a string to send as UTF-8), `contentType`, which is always set, and `cid` on inline images only. A transport must deliver every attachment or throw, never drop one silently. Send attachments with a `cid` inline under that Content-ID, and the others as regular attachments.

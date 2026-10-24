# Transports

A transport delivers the rendered emails. The package ships six, and you can [write your own](#your-own-transport).

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

A failed delivery rejects with `TRANSPORT_FAILED`, with nodemailer's error as `cause`. When the server replied, `status` holds the SMTP reply code. `retryable` is `true` for a 4xx reply or a lost connection or timeout, and `false` for a 5xx reply (see [retries](errors.md#retries)). When the server accepts some recipients and rejects others, `send` resolves and lists them in `accepted` and `rejected`. `mailer.close()` closes the connections, including those of a transporter you passed in.

## Resend

`resendTransport` sends through the [Resend](https://resend.com) API with the built-in `fetch`, so it needs no other package and also runs on Bun, Deno and edge runtimes:

```ts
import { resendTransport } from '@onetodone/mailer/resend'

const transport = resendTransport({ apiKey: process.env.RESEND_API_KEY! })
```

| Option    | Description                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------- |
| `apiKey`  | Required. Resend API key.                                                                         |
| `baseUrl` | Base URL of the Resend API. Default `https://api.resend.com`.                                     |
| `fetch`   | Function that makes the HTTP request. Default: the global `fetch`. Use it for a timeout or proxy. |

The `from` address must be on a domain verified in Resend. Attachments with a `cid` go out as inline images, the others as regular attachments. The result's `messageId` is the Resend email ID, which the Resend dashboard and webhooks use. The transport holds no connections, so `mailer.close()` has nothing to close.

A failed delivery rejects with `TRANSPORT_FAILED`. When Resend answered, `status` holds the HTTP status, and `cause` holds Resend's error response, such as `{ statusCode: 429, name: 'rate_limit_exceeded', message: '…' }`. `retryable` is `true` for a rate limit or quota (429), a conflict (409), a server error (5xx) or a network failure, and `false` for any other 4xx, such as an invalid API key or an unverified domain (see [retries](errors.md#retries)).

To give up on a slow request, pass a `fetch` with a timeout. A request that times out may still have been delivered, so a retry can send the email twice:

```ts
import { resendTransport } from '@onetodone/mailer/resend'

const transport = resendTransport({
  apiKey: process.env.RESEND_API_KEY!,
  fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(10_000) }),
})
```

## Postmark

`postmarkTransport` sends through the [Postmark](https://postmarkapp.com) API with the built-in `fetch`, so it needs no other package and also runs on Bun, Deno and edge runtimes:

```ts
import { postmarkTransport } from '@onetodone/mailer/postmark'

const transport = postmarkTransport({ serverToken: process.env.POSTMARK_SERVER_TOKEN! })
```

| Option          | Description                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `serverToken`   | Required. Server API token, from the API Tokens tab of a Postmark server.                         |
| `messageStream` | ID of the message stream. Default `outbound`, the default transactional stream.                   |
| `baseUrl`       | Base URL of the Postmark API. Default `https://api.postmarkapp.com`.                              |
| `fetch`         | Function that makes the HTTP request. Default: the global `fetch`. Use it for a timeout or proxy. |

The `from` address must be a confirmed sender signature or on a verified domain in Postmark. Until Postmark approves the account, it only delivers to addresses on the domain of the `from` address. Attachments with a `cid` go out as inline images, the others as regular attachments. The result's `messageId` is the Postmark message ID, which the Postmark activity feed and webhooks use. The transport holds no connections, so `mailer.close()` has nothing to close.

A failed delivery rejects with `TRANSPORT_FAILED`. When Postmark answered, `status` holds the HTTP status, and `cause` holds Postmark's error response, such as `{ ErrorCode: 406, Message: '…' }` for an inactive recipient. `retryable` is `true` for a rate limit (429), a server error or outage (5xx) or a network failure, and `false` for any other 4xx, such as an invalid token, an unconfirmed sender signature or an inactive recipient (see [retries](errors.md#retries)).

## Mailgun

`mailgunTransport` sends through the [Mailgun](https://www.mailgun.com) API with the built-in `fetch`, so it needs no other package and also runs on Bun, Deno and edge runtimes:

```ts
import { mailgunTransport } from '@onetodone/mailer/mailgun'

const transport = mailgunTransport({
  apiKey: process.env.MAILGUN_API_KEY!,
  domain: 'mg.example.com',
  region: 'eu',
})
```

| Option    | Description                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| `apiKey`  | Required. Mailgun API key: a sending key of the domain or the account's private key.                                |
| `domain`  | Required. Sending domain registered in Mailgun.                                                                     |
| `region`  | `us` or `eu`, the region the domain was created in. Default `us`.                                                   |
| `baseUrl` | Base URL of the Mailgun API. Overrides `region`. Default `https://api.mailgun.net` or `https://api.eu.mailgun.net`. |
| `fetch`   | Function that makes the HTTP request. Default: the global `fetch`. Use it for a timeout or proxy.                   |

A sandbox domain only delivers to the authorized recipients of the account. Attachments with a `cid` go out as inline images, the others as regular attachments. The result's `messageId` is the Message-ID Mailgun assigned, such as `<20261024123456.1@mg.example.com>`; Mailgun events and webhooks show it without the angle brackets. The transport holds no connections, so `mailer.close()` has nothing to close.

A failed delivery rejects with `TRANSPORT_FAILED`. When Mailgun answered, `status` holds the HTTP status, and `cause` holds Mailgun's error response, such as `{ message: 'Domain not found: mg.example.com' }`, or its text when it is not JSON. `retryable` is `true` for a rate limit (429), a server error (5xx) or a network failure, and `false` for any other 4xx, such as an invalid API key, an unknown domain or a recipient a sandbox domain may not send to (see [retries](errors.md#retries)).

The `fetch` option of the Mailgun transport receives the multipart request body as an `ArrayBuffer`. The timeout example under [Resend](#resend) works for every HTTP transport.

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

`message` has `from`, `to`, `cc`, `bcc`, `replyTo`, `subject`, `html`, `text`, `headers` and `attachments`. Addresses keep the form the caller used: a string or a `{ name, address }` object, one or a list. Errors that are not a `MailerError` are wrapped in `TRANSPORT_FAILED`, with the original error as `cause`. To tell queue workers whether another attempt can help, throw a `MailerError` with `retryable` and `status` instead (see [retries](errors.md#retries)). Add an optional `close()` method if the transport holds connections; stateless transports, such as those for HTTP APIs, leave it out.

Each attachment has `filename`, `content` (a `Uint8Array` or a string to send as UTF-8), `contentType`, which is always set, and `cid` on inline images only. A transport must deliver every attachment or throw, never drop one silently. Send attachments with a `cid` inline under that Content-ID, and the others as regular attachments.

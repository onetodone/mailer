import { z } from 'zod'

import { MailerError } from '../errors'
import {
  describeNetworkFailure,
  field,
  formatAddress,
  formatAddresses,
  isRetryableStatus,
  parseJson,
  toBytes,
} from '../transports/http'
import type { MailTransport, OutgoingMessage } from '../transports/types'
import { expected, httpUrl, objectError, parseConfig } from '../validators'

/** Settings for {@link mailgunTransport}. */
export interface MailgunTransportOptions {
  /** Mailgun API key: a domain sending key or the account's private key. */
  readonly apiKey: string
  /** Sending domain registered in Mailgun, such as `mg.example.com`. */
  readonly domain: string
  /**
   * Region the domain was created in: `us` (`https://api.mailgun.net`) or
   * `eu` (`https://api.eu.mailgun.net`). Default `us`.
   */
  readonly region?: 'us' | 'eu' | undefined
  /** Base URL of the Mailgun API. Overrides `region` when set. */
  readonly baseUrl?: string | undefined
  /**
   * Function that makes the HTTP request. Default: the global `fetch`. Pass
   * one to add a timeout, a proxy or logging.
   */
  readonly fetch?:
    | ((
        url: string,
        init: { method: string; headers: Record<string, string>; body: ArrayBuffer },
      ) => Promise<{ readonly ok: boolean; readonly status: number; text(): Promise<string> }>)
    | undefined
}

type Fetch = NonNullable<MailgunTransportOptions['fetch']>

const nonEmptyString = z.string({ error: expected('a string') }).min(1, { error: 'must not be empty' })

const mailgunOptionsSchema: z.ZodType<MailgunTransportOptions, MailgunTransportOptions> = z.strictObject(
  {
    apiKey: nonEmptyString,
    domain: nonEmptyString,
    region: z.enum(['us', 'eu'], { error: expected('"us" or "eu"') }).optional(),
    baseUrl: httpUrl.optional(),
    fetch: z.custom<Fetch>((value) => typeof value === 'function', { error: expected('a function') }).optional(),
  },
  { error: objectError },
)

const regionUrls = { us: 'https://api.mailgun.net', eu: 'https://api.eu.mailgun.net' }

interface FormPart {
  name: string
  value: Uint8Array | string
  filename?: string
  contentType?: string
}

// Quotes and line breaks in multipart parameter values are percent-encoded, as browsers do.
function quoted(value: string): string {
  return `"${value.replace(/"/g, '%22').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}"`
}

function encodeForm(parts: readonly FormPart[], boundary: string): ArrayBuffer {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  for (const { name, value, filename, contentType } of parts) {
    let head = `--${boundary}\r\nContent-Disposition: form-data; name=${quoted(name)}`
    if (filename !== undefined) head += `; filename=${quoted(filename)}`
    if (contentType !== undefined) head += `\r\nContent-Type: ${contentType}`
    chunks.push(encoder.encode(`${head}\r\n\r\n`), toBytes(value), encoder.encode('\r\n'))
  }
  chunks.push(encoder.encode(`--${boundary}--\r\n`))
  const body = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.length
  }
  return body.buffer
}

function toFormParts(message: OutgoingMessage): FormPart[] {
  const parts: FormPart[] = [{ name: 'from', value: formatAddress(message.from) }]
  for (const [name, addresses] of [
    ['to', message.to],
    ['cc', message.cc],
    ['bcc', message.bcc],
  ] as const) {
    for (const address of formatAddresses(addresses) ?? []) parts.push({ name, value: address })
  }
  const replyTo = formatAddresses(message.replyTo)
  if (replyTo !== undefined) parts.push({ name: 'h:Reply-To', value: replyTo.join(', ') })
  parts.push(
    { name: 'subject', value: message.subject },
    { name: 'html', value: message.html },
    { name: 'text', value: message.text },
  )
  for (const [name, value] of Object.entries(message.headers ?? {})) parts.push({ name: `h:${name}`, value })
  for (const { filename, content, contentType, cid } of message.attachments ?? []) {
    // Mailgun takes the Content-ID of an inline image from its file name.
    parts.push(
      cid === undefined
        ? { name: 'attachment', value: content, filename, contentType }
        : { name: 'inline', value: content, filename: cid, contentType },
    )
  }
  return parts
}

/**
 * Creates a transport that sends emails through the
 * [Mailgun](https://www.mailgun.com) API over HTTPS, with the global `fetch`
 * and no extra dependencies.
 *
 * Attachments with a `cid` go out as inline images, the others as regular
 * attachments. The result's `messageId` is the Message-ID Mailgun assigned,
 * such as `<20261024123456.1@mg.example.com>`. The transport holds no
 * connections, so it has no `close()`.
 *
 * Send failures reject with a {@link MailerError} with code `TRANSPORT_FAILED`.
 * When Mailgun answered, `status` holds the HTTP status and `cause` the parsed
 * error response, such as `{ message: '…' }`, or its text when it is not JSON.
 * `retryable` is `true` for a rate limit (429), a server error (5xx) or a
 * network failure, and `false` for any other 4xx, such as an invalid API key,
 * an unknown domain or an unauthorized sandbox recipient.
 *
 * @throws {MailerError} With code `INVALID_CONFIG` when the settings are invalid.
 *
 * @example
 * import { mailgunTransport } from '@onetodone/mailer/mailgun'
 *
 * const transport = mailgunTransport({
 *   apiKey: process.env.MAILGUN_API_KEY!,
 *   domain: 'mg.example.com',
 *   region: 'eu',
 * })
 */
export function mailgunTransport(options: MailgunTransportOptions): MailTransport {
  const settings = parseConfig(mailgunOptionsSchema, options, 'mailgun')
  const baseUrl = settings.baseUrl ?? regionUrls[settings.region ?? 'us']
  const url = `${baseUrl.replace(/\/+$/, '')}/v3/${encodeURIComponent(settings.domain)}/messages`
  const authorization = `Basic ${btoa(`api:${settings.apiKey}`)}`

  return {
    async send(message) {
      const boundary = `mailer-${crypto.randomUUID()}`
      const headers = {
        accept: 'application/json',
        authorization,
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'user-agent': '@onetodone/mailer',
      }
      const body = encodeForm(toFormParts(message), boundary)

      let response: Awaited<ReturnType<Fetch>>
      let text: string
      try {
        response = await (settings.fetch ?? fetch)(url, { method: 'POST', headers, body })
        text = await response.text()
      } catch (error) {
        throw new MailerError('TRANSPORT_FAILED', describeNetworkFailure('Mailgun', error), {
          cause: error,
          retryable: true,
        })
      }

      const { status } = response
      const parsed = parseJson(text)
      if (!response.ok) {
        const reason = field(parsed, 'message')
        throw new MailerError(
          'TRANSPORT_FAILED',
          reason === undefined
            ? `Mailgun delivery failed (HTTP ${String(status)})`
            : `Mailgun delivery failed (HTTP ${String(status)}): ${reason}`,
          { cause: parsed ?? text, retryable: isRetryableStatus(status), status },
        )
      }

      const id = field(parsed, 'id')
      if (id === undefined) {
        // The email may already be on its way, so a retry could send it twice.
        throw new MailerError('TRANSPORT_FAILED', `Mailgun answered HTTP ${String(status)} without a message ID`, {
          cause: parsed ?? text,
          retryable: false,
          status,
        })
      }
      return { messageId: id }
    },
  }
}

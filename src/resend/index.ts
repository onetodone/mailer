import { z } from 'zod'

import { MailerError } from '../errors'
import {
  describeNetworkFailure,
  field,
  formatAddress,
  formatAddresses,
  isRetryableStatus,
  parseJson,
  toBase64,
} from '../transports/http'
import type { MailTransport, OutgoingAttachment } from '../transports/types'
import { expected, httpUrl, objectError, parseConfig } from '../validators'

/** Settings for {@link resendTransport}. */
export interface ResendTransportOptions {
  /** Resend API key, such as `re_123…`. */
  readonly apiKey: string
  /** Base URL of the Resend API. Default `https://api.resend.com`. */
  readonly baseUrl?: string | undefined
  /**
   * Function that makes the HTTP request. Default: the global `fetch`. Pass
   * one to add a timeout, a proxy or logging.
   */
  readonly fetch?:
    | ((
        url: string,
        init: { method: string; headers: Record<string, string>; body: string },
      ) => Promise<{ readonly ok: boolean; readonly status: number; text(): Promise<string> }>)
    | undefined
}

type Fetch = NonNullable<ResendTransportOptions['fetch']>

const resendOptionsSchema: z.ZodType<ResendTransportOptions, ResendTransportOptions> = z.strictObject(
  {
    apiKey: z.string({ error: expected('a string') }).min(1, { error: 'must not be empty' }),
    baseUrl: httpUrl.optional(),
    fetch: z.custom<Fetch>((value) => typeof value === 'function', { error: expected('a function') }).optional(),
  },
  { error: objectError },
)

const defaultBaseUrl = 'https://api.resend.com'

/** An attachment in the form the Resend API accepts. */
interface ResendAttachment {
  filename: string
  content: string
  content_type: string
  content_id?: string
}

function toResendAttachment({ filename, content, contentType, cid }: OutgoingAttachment): ResendAttachment {
  const attachment: ResendAttachment = { filename, content: toBase64(content), content_type: contentType }
  if (cid !== undefined) attachment.content_id = cid
  return attachment
}

/**
 * Creates a transport that sends emails through the
 * [Resend](https://resend.com) API over HTTPS, with the global `fetch` and no
 * extra dependencies.
 *
 * Attachments with a `cid` go out as inline images, the others as regular
 * attachments. The result's `messageId` is the Resend email ID. The transport
 * holds no connections, so it has no `close()`.
 *
 * Send failures reject with a {@link MailerError} with code `TRANSPORT_FAILED`.
 * When Resend answered, `status` holds the HTTP status and `cause` the parsed
 * error response, such as `{ statusCode: 429, name: 'rate_limit_exceeded',
 * message: '…' }`. `retryable` is `true` for a rate limit or quota (429), a
 * conflict (409), a server error (5xx) or a network failure, and `false` for
 * any other 4xx, such as an invalid API key or an unverified domain.
 *
 * @throws {MailerError} With code `INVALID_CONFIG` when the settings are invalid.
 *
 * @example
 * import { resendTransport } from '@onetodone/mailer/resend'
 *
 * const transport = resendTransport({ apiKey: process.env.RESEND_API_KEY! })
 */
export function resendTransport(options: ResendTransportOptions): MailTransport {
  const settings = parseConfig(resendOptionsSchema, options, 'resend')
  const url = `${(settings.baseUrl ?? defaultBaseUrl).replace(/\/+$/, '')}/emails`
  const headers = {
    authorization: `Bearer ${settings.apiKey}`,
    'content-type': 'application/json',
    // Resend rejects requests without a User-Agent.
    'user-agent': '@onetodone/mailer',
  }

  return {
    async send(message) {
      const body = JSON.stringify({
        from: formatAddress(message.from),
        to: formatAddresses(message.to),
        cc: formatAddresses(message.cc),
        bcc: formatAddresses(message.bcc),
        reply_to: formatAddresses(message.replyTo),
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
        attachments: message.attachments?.map(toResendAttachment),
      })

      let response: Awaited<ReturnType<Fetch>>
      let text: string
      try {
        response = await (settings.fetch ?? fetch)(url, { method: 'POST', headers, body })
        text = await response.text()
      } catch (error) {
        throw new MailerError('TRANSPORT_FAILED', describeNetworkFailure('Resend', error), {
          cause: error,
          retryable: true,
        })
      }

      const { status } = response
      const parsed = parseJson(text)
      if (!response.ok) {
        const name = field(parsed, 'name')
        const reason = field(parsed, 'message')
        const label = name === undefined ? `HTTP ${String(status)}` : `HTTP ${String(status)} ${name}`
        throw new MailerError(
          'TRANSPORT_FAILED',
          reason === undefined ? `Resend delivery failed (${label})` : `Resend delivery failed (${label}): ${reason}`,
          { cause: parsed ?? text, retryable: isRetryableStatus(status), status },
        )
      }

      const id = field(parsed, 'id')
      if (id === undefined) {
        // The email may already be on its way, so a retry could send it twice.
        throw new MailerError('TRANSPORT_FAILED', `Resend answered HTTP ${String(status)} without an email ID`, {
          cause: parsed ?? text,
          retryable: false,
          status,
        })
      }
      return { messageId: id }
    },
  }
}

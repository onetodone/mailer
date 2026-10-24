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
import type { MailAddresses, MailTransport, OutgoingAttachment } from '../transports/types'
import { expected, httpUrl, objectError, parseConfig } from '../validators'

/** Settings for {@link postmarkTransport}. */
export interface PostmarkTransportOptions {
  /** Postmark server API token, from the API Tokens tab of a server. */
  readonly serverToken: string
  /**
   * ID of the message stream to send through. Default `outbound`, the
   * default transactional stream of every server.
   */
  readonly messageStream?: string | undefined
  /** Base URL of the Postmark API. Default `https://api.postmarkapp.com`. */
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

type Fetch = NonNullable<PostmarkTransportOptions['fetch']>

const nonEmptyString = z.string({ error: expected('a string') }).min(1, { error: 'must not be empty' })

const postmarkOptionsSchema: z.ZodType<PostmarkTransportOptions, PostmarkTransportOptions> = z.strictObject(
  {
    serverToken: nonEmptyString,
    messageStream: nonEmptyString.optional(),
    baseUrl: httpUrl.optional(),
    fetch: z.custom<Fetch>((value) => typeof value === 'function', { error: expected('a function') }).optional(),
  },
  { error: objectError },
)

const defaultBaseUrl = 'https://api.postmarkapp.com'

/** An attachment in the form the Postmark API accepts. */
interface PostmarkAttachment {
  Name: string
  Content: string
  ContentType: string
  ContentID?: string
}

function joinAddresses(addresses: MailAddresses | undefined): string | undefined {
  return formatAddresses(addresses)?.join(', ')
}

function toPostmarkAttachment({ filename, content, contentType, cid }: OutgoingAttachment): PostmarkAttachment {
  const attachment: PostmarkAttachment = { Name: filename, Content: toBase64(content), ContentType: contentType }
  if (cid !== undefined) attachment.ContentID = `cid:${cid}`
  return attachment
}

function errorCode(body: unknown): number | undefined {
  if (typeof body !== 'object' || body === null || !('ErrorCode' in body)) return undefined
  return typeof body.ErrorCode === 'number' ? body.ErrorCode : undefined
}

/**
 * Creates a transport that sends emails through the
 * [Postmark](https://postmarkapp.com) API over HTTPS, with the global `fetch`
 * and no extra dependencies.
 *
 * Attachments with a `cid` go out as inline images, the others as regular
 * attachments. The result's `messageId` is the Postmark message ID. The
 * transport holds no connections, so it has no `close()`.
 *
 * Send failures reject with a {@link MailerError} with code `TRANSPORT_FAILED`.
 * When Postmark answered, `status` holds the HTTP status and `cause` the parsed
 * error response, such as `{ ErrorCode: 406, Message: '…' }`. `retryable` is
 * `true` for a rate limit (429), a server error or outage (5xx) or a network
 * failure, and `false` for any other 4xx, such as an invalid token, an inactive
 * recipient or an unconfirmed sender signature.
 *
 * @throws {MailerError} With code `INVALID_CONFIG` when the settings are invalid.
 *
 * @example
 * import { postmarkTransport } from '@onetodone/mailer/postmark'
 *
 * const transport = postmarkTransport({ serverToken: process.env.POSTMARK_SERVER_TOKEN! })
 */
export function postmarkTransport(options: PostmarkTransportOptions): MailTransport {
  const settings = parseConfig(postmarkOptionsSchema, options, 'postmark')
  const url = `${(settings.baseUrl ?? defaultBaseUrl).replace(/\/+$/, '')}/email`
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    'user-agent': '@onetodone/mailer',
    'x-postmark-server-token': settings.serverToken,
  }

  return {
    async send(message) {
      const body = JSON.stringify({
        From: formatAddress(message.from),
        To: joinAddresses(message.to),
        Cc: joinAddresses(message.cc),
        Bcc: joinAddresses(message.bcc),
        ReplyTo: joinAddresses(message.replyTo),
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text,
        Headers:
          message.headers === undefined
            ? undefined
            : Object.entries(message.headers).map(([Name, Value]) => ({ Name, Value })),
        Attachments: message.attachments?.map(toPostmarkAttachment),
        MessageStream: settings.messageStream,
      })

      let response: Awaited<ReturnType<Fetch>>
      let text: string
      try {
        response = await (settings.fetch ?? fetch)(url, { method: 'POST', headers, body })
        text = await response.text()
      } catch (error) {
        throw new MailerError('TRANSPORT_FAILED', describeNetworkFailure('Postmark', error), {
          cause: error,
          retryable: true,
        })
      }

      const { status } = response
      const parsed = parseJson(text)
      if (!response.ok) {
        const code = errorCode(parsed)
        const reason = field(parsed, 'Message')
        const label = code === undefined ? `HTTP ${String(status)}` : `HTTP ${String(status)}, error ${String(code)}`
        throw new MailerError(
          'TRANSPORT_FAILED',
          reason === undefined
            ? `Postmark delivery failed (${label})`
            : `Postmark delivery failed (${label}): ${reason}`,
          { cause: parsed ?? text, retryable: isRetryableStatus(status), status },
        )
      }

      const id = field(parsed, 'MessageID')
      if (id === undefined) {
        // The email may already be on its way, so a retry could send it twice.
        throw new MailerError('TRANSPORT_FAILED', `Postmark answered HTTP ${String(status)} without a message ID`, {
          cause: parsed ?? text,
          retryable: false,
          status,
        })
      }
      return { messageId: id }
    },
  }
}

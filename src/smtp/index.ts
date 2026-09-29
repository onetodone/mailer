import { createTransport } from 'nodemailer'
import { z } from 'zod'

import { MailerError, parseConfig } from '../errors'
import type { MailAddress, MailAddresses, MailTransport, OutgoingAttachment } from '../transports/types'
import { expected, flag, nonEmptyText, objectError, port, positiveInteger } from '../validators'

/** SMTP connection settings for {@link smtpTransport}. */
export interface SmtpTransportOptions {
  /** SMTP server host name or IP address. */
  readonly host: string
  /** Server port. Default `465` when `secure` is set, otherwise `587`. */
  readonly port?: number | undefined
  /**
   * Connect over TLS from the start, usually on port 465. Without it, the
   * connection upgrades with STARTTLS when the server offers it.
   */
  readonly secure?: boolean | undefined
  /** Login credentials. */
  readonly auth?: { readonly user: string; readonly pass: string } | undefined
  /** Fail unless the connection upgrades with STARTTLS. Has no effect when `secure` is set. */
  readonly requireTLS?: boolean | undefined
  /** TLS settings. */
  readonly tls?:
    | {
        /** Reject certificates that fail verification. Default `true`; turn it off only for local servers. */
        readonly rejectUnauthorized?: boolean | undefined
        /** Host name to verify the certificate against, when it differs from `host`. */
        readonly servername?: string | undefined
      }
    | undefined
  /** Host name this client announces in the SMTP greeting. Default: the machine's host name. */
  readonly name?: string | undefined
  /** Keep a pool of connections open and reuse them. Call `close()` on shutdown. */
  readonly pool?: boolean | undefined
  /** Most connections the pool opens at once. Default `5`. */
  readonly maxConnections?: number | undefined
  /** Most emails sent over one pooled connection before it is replaced. Default `100`. */
  readonly maxMessages?: number | undefined
  /** Milliseconds to wait for the connection. Default `120000`. */
  readonly connectionTimeout?: number | undefined
  /** Milliseconds to wait for the server greeting after connecting. Default `30000`. */
  readonly greetingTimeout?: number | undefined
  /** Milliseconds of inactivity before the connection times out. Default `600000`. */
  readonly socketTimeout?: number | undefined
}

const credential = z.string({ error: expected('a string') }).min(1, { error: 'must not be empty' })

const smtpOptionsSchema: z.ZodType<SmtpTransportOptions, SmtpTransportOptions> = z.strictObject(
  {
    host: nonEmptyText,
    port: port.optional(),
    secure: flag.optional(),
    auth: z.strictObject({ user: credential, pass: credential }, { error: objectError }).optional(),
    requireTLS: flag.optional(),
    tls: z
      .strictObject(
        { rejectUnauthorized: flag.optional(), servername: nonEmptyText.optional() },
        { error: objectError },
      )
      .optional(),
    name: nonEmptyText.optional(),
    pool: flag.optional(),
    maxConnections: positiveInteger.optional(),
    maxMessages: positiveInteger.optional(),
    connectionTimeout: positiveInteger.optional(),
    greetingTimeout: positiveInteger.optional(),
    socketTimeout: positiveInteger.optional(),
  },
  { error: objectError },
)

/** An address in the form nodemailer accepts. */
type NodemailerAddress = string | { name: string; address: string }

/** An attachment in the form nodemailer accepts. */
interface NodemailerAttachment {
  filename: string
  content: string | Buffer
  contentType: string
  contentDisposition: 'attachment' | 'inline'
  cid?: string
}

/**
 * The part of a nodemailer transporter that {@link smtpTransport} uses. The
 * result of any `nodemailer.createTransport(...)` call fits.
 */
export interface NodemailerTransporter {
  /** Sends one email. */
  sendMail(mail: {
    from: NodemailerAddress
    to: NodemailerAddress[]
    cc?: NodemailerAddress[] | undefined
    bcc?: NodemailerAddress[] | undefined
    replyTo?: NodemailerAddress[] | undefined
    subject: string
    html: string
    text: string
    headers?: Record<string, string> | undefined
    attachments?: NodemailerAttachment[] | undefined
  }): Promise<{
    messageId: string
    accepted?: readonly (string | { address: string })[] | undefined
    rejected?: readonly (string | { address: string })[] | undefined
  }>
  /** Closes open connections. */
  close?(): void
}

/** The transport returned by {@link smtpTransport}. */
export interface SmtpTransport extends MailTransport {
  /** Closes the connections of the underlying nodemailer transporter, including one passed in. */
  close(): Promise<void>
}

function isTransporter(input: unknown): input is NodemailerTransporter {
  return typeof input === 'object' && input !== null && 'sendMail' in input && typeof input.sendMail === 'function'
}

function toNodemailerAddress(address: MailAddress): NodemailerAddress {
  return typeof address === 'string' ? address : { name: address.name ?? '', address: address.address }
}

function toNodemailerAddresses(addresses: MailAddresses): NodemailerAddress[]
function toNodemailerAddresses(addresses: MailAddresses | undefined): NodemailerAddress[] | undefined
function toNodemailerAddresses(addresses: MailAddresses | undefined): NodemailerAddress[] | undefined {
  return addresses === undefined ? undefined : [addresses].flat().map(toNodemailerAddress)
}

function toNodemailerAttachment({ filename, content, contentType, cid }: OutgoingAttachment): NodemailerAttachment {
  const data =
    typeof content === 'string' ? content : Buffer.from(content.buffer, content.byteOffset, content.byteLength)
  return cid === undefined
    ? { filename, content: data, contentType, contentDisposition: 'attachment' }
    : { filename, content: data, contentType, contentDisposition: 'inline', cid }
}

function toAddressStrings(
  addresses: readonly (string | { address: string })[] | undefined,
): readonly string[] | undefined {
  return addresses?.map((address) => (typeof address === 'string' ? address : address.address))
}

function describeFailure(error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error)
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? ` (${error.code})`
      : ''
  return `SMTP delivery failed${code}: ${reason}`
}

/**
 * Creates a transport that sends emails over SMTP with nodemailer, which must
 * be installed next to this package. Pass connection settings, or a
 * transporter from `nodemailer.createTransport()` for anything the settings
 * do not cover, such as DKIM signing or OAuth2.
 *
 * Attachments with a `cid` go out inline, next to the HTML; the others as
 * regular attachments.
 *
 * Send failures reject with a {@link MailerError} with code `TRANSPORT_FAILED`
 * and nodemailer's error as `cause`. When the server accepts some recipients
 * and rejects others, the send succeeds and the result lists them in
 * `rejected`.
 *
 * @throws {MailerError} With code `INVALID_CONFIG` when the settings are invalid.
 *
 * @example
 * import { smtpTransport } from '@onetodone/mailer/smtp'
 *
 * const transport = smtpTransport({
 *   host: 'smtp.example.com',
 *   port: 465,
 *   secure: true,
 *   auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
 * })
 *
 * @example
 * const transport = smtpTransport(nodemailer.createTransport({ host, port, auth, dkim }))
 */
export function smtpTransport(options: SmtpTransportOptions | NodemailerTransporter): SmtpTransport {
  const transporter: NodemailerTransporter = isTransporter(options)
    ? options
    : createTransport(parseConfig(smtpOptionsSchema, options, 'smtp'))

  return {
    async send(message) {
      try {
        const info = await transporter.sendMail({
          from: toNodemailerAddress(message.from),
          to: toNodemailerAddresses(message.to),
          cc: toNodemailerAddresses(message.cc),
          bcc: toNodemailerAddresses(message.bcc),
          replyTo: toNodemailerAddresses(message.replyTo),
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: message.headers === undefined ? undefined : { ...message.headers },
          attachments: message.attachments?.map(toNodemailerAttachment),
        })
        return {
          messageId: info.messageId,
          accepted: toAddressStrings(info.accepted),
          rejected: toAddressStrings(info.rejected),
        }
      } catch (error) {
        throw new MailerError('TRANSPORT_FAILED', describeFailure(error), { cause: error })
      }
    },
    close() {
      transporter.close?.()
      return Promise.resolve()
    },
  }
}

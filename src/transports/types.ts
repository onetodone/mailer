/**
 * An email address: `user@example.com`, `My App <no-reply@myapp.loc>`, or an
 * object with the address and an optional display name.
 */
export type MailAddress = string | { readonly name?: string | undefined; readonly address: string }

/** One address or a list of addresses. */
export type MailAddresses = MailAddress | readonly MailAddress[]

/**
 * A file to attach to an email: a document such as an invoice, or an image
 * shown inside the email through its `cid`.
 */
export interface Attachment {
  /** File name the recipient sees, such as `invoice-1042.pdf`. */
  readonly filename: string
  /** The file: bytes (a `Buffer` or a `Uint8Array`) or text, which is sent as UTF-8. */
  readonly content: Uint8Array | string
  /**
   * MIME type, such as `application/pdf`. Default: guessed from the file name
   * extension, or `application/octet-stream`.
   */
  readonly contentType?: string | undefined
  /**
   * Content-ID of an inline image: ASCII letters, digits, `.`, `_`, `-` and
   * `@`. The HTML shows it through `cid:<cid>`, for example with
   * `ui.image('cid:<cid>', { alt })`. When the HTML never references it, the
   * file is sent as a regular attachment.
   */
  readonly cid?: string | undefined
}

/**
 * An attachment as the mailer hands it to the transport: `contentType` is
 * always set, and `cid` is set only on images the HTML references.
 */
export interface OutgoingAttachment {
  /** File name the recipient sees. */
  readonly filename: string
  /** The file: bytes, or text to send as UTF-8. */
  readonly content: Uint8Array | string
  /** MIME type, such as `application/pdf` or `text/csv; charset=utf-8`. */
  readonly contentType: string
  /**
   * Content-ID of an inline image the HTML references as `cid:<cid>`. Send
   * the file inline with this ID. Without it, send the file as a regular
   * attachment.
   */
  readonly cid?: string | undefined
}

/**
 * A rendered email, ready for delivery. Addresses keep the shape the sender
 * passed: a string or an object, one address or a list.
 */
export interface OutgoingMessage {
  /** Sender. */
  readonly from: MailAddress
  /** Recipients. */
  readonly to: MailAddresses
  /** Carbon-copy recipients. */
  readonly cc?: MailAddresses | undefined
  /** Blind carbon-copy recipients. Transports must not reveal them in the message headers. */
  readonly bcc?: MailAddresses | undefined
  /** Addresses replies go to instead of `from`. */
  readonly replyTo?: MailAddresses | undefined
  /** Subject line. */
  readonly subject: string
  /** HTML version of the email. */
  readonly html: string
  /** Plain-text version of the email. */
  readonly text: string
  /** Extra message headers, such as `{ 'X-Entity-Ref-ID': '42' }`. */
  readonly headers?: Readonly<Record<string, string>> | undefined
  /** Files to attach, including inline images. Transports must deliver every one or reject. */
  readonly attachments?: readonly OutgoingAttachment[] | undefined
}

/** What a transport reports after handing over an email. */
export interface SendResult {
  /** Identifier the transport assigned to the email, such as the SMTP `Message-ID`. */
  readonly messageId: string
  /** Recipient addresses the server accepted, when the transport reports them. */
  readonly accepted?: readonly string[] | undefined
  /** Recipient addresses the server rejected, when the transport reports them. */
  readonly rejected?: readonly string[] | undefined
}

/**
 * Delivers rendered emails. Implement it to send through any provider.
 *
 * A transport delivers every attachment in `message.attachments` or rejects;
 * it never drops one silently. An attachment with a `cid` is an inline image:
 * send it inline under that Content-ID.
 *
 * @example
 * const transport: MailTransport = {
 *   async send(message) {
 *     const { id } = await provider.emails.send(message)
 *     return { messageId: id }
 *   },
 * }
 */
export interface MailTransport {
  /** Delivers one email. Rejects when the email could not be handed over. */
  send(message: OutgoingMessage): Promise<SendResult>
  /** Releases open connections, such as an SMTP pool. Call it on shutdown. */
  close?(): Promise<void>
}

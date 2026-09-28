/**
 * An email address: `user@example.com`, `My App <no-reply@myapp.loc>`, or an
 * object with the address and an optional display name.
 */
export type MailAddress = string | { readonly name?: string | undefined; readonly address: string }

/** One address or a list of addresses. */
export type MailAddresses = MailAddress | readonly MailAddress[]

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

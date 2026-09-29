import { randomUUID } from 'node:crypto'

import { contentSize } from '../attachments'
import type { MailAddress, MailAddresses, MailTransport, OutgoingAttachment, OutgoingMessage } from './types'

/** Options for {@link consoleTransport}. */
export interface ConsoleTransportOptions {
  /** Receives each email as one string. Default `console.log`. */
  readonly log?: ((entry: string) => void) | undefined
}

const separator = '-'.repeat(60)

function logToConsole(entry: string): void {
  console.log(entry)
}

function formatAddress(address: MailAddress): string {
  if (typeof address === 'string') return address
  return address.name === undefined || address.name === '' ? address.address : `${address.name} <${address.address}>`
}

function formatAddresses(addresses: MailAddresses): string {
  return [addresses].flat().map(formatAddress).join(', ')
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatAttachment({ filename, content, contentType, cid }: OutgoingAttachment): string {
  const details = [contentType, formatSize(contentSize(content)), ...(cid === undefined ? [] : [`inline cid:${cid}`])]
  return `${filename} (${details.join(', ')})`
}

function formatMessage(message: OutgoingMessage): string {
  const headers: [string, MailAddresses | undefined][] = [
    ['From', message.from],
    ['To', message.to],
    ['Cc', message.cc],
    ['Bcc', message.bcc],
    ['Reply-To', message.replyTo],
  ]
  return [
    separator,
    ...headers.flatMap(([name, value]) => (value === undefined ? [] : [`${name}: ${formatAddresses(value)}`])),
    `Subject: ${message.subject}`,
    ...(message.attachments === undefined || message.attachments.length === 0
      ? []
      : [`Attachments: ${message.attachments.map(formatAttachment).join(', ')}`]),
    '',
    message.text,
  ].join('\n')
}

/**
 * Creates a transport that prints emails instead of sending them: the
 * addresses, the subject, the name, type and size of each attachment, and the
 * plain-text version. Use it in development only, because the text contains
 * links with tokens.
 *
 * @example
 * const transport = process.env.NODE_ENV === 'production' ? smtpTransport(smtpOptions) : consoleTransport()
 */
export function consoleTransport(options: ConsoleTransportOptions = {}): MailTransport {
  const log = options.log ?? logToConsole
  return {
    send(message) {
      log(formatMessage(message))
      return Promise.resolve({ messageId: randomUUID() })
    },
  }
}

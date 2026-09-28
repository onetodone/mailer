import { randomUUID } from 'node:crypto'

import type { MailAddress, MailAddresses, MailTransport, OutgoingMessage } from './types'

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
    '',
    message.text,
  ].join('\n')
}

/**
 * Creates a transport that prints emails instead of sending them: the
 * addresses, the subject and the plain-text version. Use it in development
 * only, because the text contains links with tokens.
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

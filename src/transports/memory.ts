import { randomUUID } from 'node:crypto'

import type { MailTransport, OutgoingMessage } from './types'

/** A transport that keeps emails in memory instead of sending them. */
export interface MemoryTransport extends MailTransport {
  /** Every email handed to the transport, oldest first. */
  readonly sent: readonly OutgoingMessage[]
  /** Forgets the recorded emails. Empties `sent` in place, so references to it stay valid. */
  clear(): void
}

/**
 * Creates a transport that records emails in `sent` instead of delivering
 * them. Use it in tests.
 *
 * @example
 * const transport = memoryTransport()
 * const mailer = createMailer({ ...config, transport })
 *
 * await registerUser()
 * expect(transport.sent).toHaveLength(1)
 * expect(transport.sent[0]?.to).toBe('user@example.com')
 */
export function memoryTransport(): MemoryTransport {
  const sent: OutgoingMessage[] = []
  return {
    sent,
    send(message) {
      sent.push(message)
      return Promise.resolve({ messageId: randomUUID() })
    },
    clear() {
      sent.length = 0
    },
  }
}

import { describe, expect, it } from 'vitest'

import { memoryTransport } from '../../src/transports/memory'
import type { OutgoingMessage } from '../../src/transports/types'

const message: OutgoingMessage = {
  from: { name: 'My App', address: 'no-reply@myapp.loc' },
  to: 'user@example.com',
  subject: 'Confirm your email',
  html: '<p>Hello</p>',
  text: 'Hello',
}

describe('memoryTransport', () => {
  it('records emails in the order they were sent', async () => {
    const transport = memoryTransport()
    const second: OutgoingMessage = {
      ...message,
      to: ['a@example.com', { address: 'b@example.com' }],
      subject: 'Second',
    }

    await transport.send(message)
    await transport.send(second)

    expect(transport.sent).toEqual([message, second])
    expect(transport.sent[0]?.to).toBe('user@example.com')
    expect(transport.sent[1]).toBe(second)
  })

  it('returns a unique message id for every email', async () => {
    const transport = memoryTransport()

    const [first, second] = await Promise.all([transport.send(message), transport.send(message)])

    expect(first.messageId).toMatch(/^[\da-f-]{36}$/)
    expect(first.messageId).not.toBe(second.messageId)
  })

  it('clears the recorded emails in place', async () => {
    const transport = memoryTransport()
    const { sent } = transport
    await transport.send(message)

    transport.clear()

    expect(transport.sent).toBe(sent)
    expect(sent).toEqual([])
    await transport.send(message)
    expect(sent).toHaveLength(1)
  })

  it('keeps separate records per transport', async () => {
    const first = memoryTransport()
    const second = memoryTransport()

    await first.send(message)

    expect(first.sent).toHaveLength(1)
    expect(second.sent).toHaveLength(0)
  })
})

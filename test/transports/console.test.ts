import { afterEach, describe, expect, it, vi } from 'vitest'

import { consoleTransport } from '../../src/transports/console'
import type { OutgoingMessage } from '../../src/transports/types'

const message: OutgoingMessage = {
  from: { name: 'My App', address: 'no-reply@myapp.loc' },
  to: 'user@example.com',
  subject: 'Confirm your email',
  html: '<p>Hello</p>',
  text: 'Hi Lizzie,\n\nConfirm your email: https://myapp.loc/verify?token=abc',
}

const separator = '-'.repeat(60)

function capture() {
  const entries: string[] = []
  const transport = consoleTransport({ log: (entry) => entries.push(entry) })
  return { entries, transport }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('consoleTransport', () => {
  it('prints the addresses, subject and text of each email as one entry', async () => {
    const { entries, transport } = capture()

    await transport.send(message)

    expect(entries).toEqual([
      [
        separator,
        'From: My App <no-reply@myapp.loc>',
        'To: user@example.com',
        'Subject: Confirm your email',
        '',
        'Hi Lizzie,',
        '',
        'Confirm your email: https://myapp.loc/verify?token=abc',
      ].join('\n'),
    ])
  })

  it('prints copies and reply addresses when they are set', async () => {
    const { entries, transport } = capture()

    await transport.send({
      ...message,
      from: 'My App <no-reply@myapp.loc>',
      to: ['user@example.com', { name: 'Second User', address: 'second@example.com' }],
      cc: { address: 'copy@example.com' },
      bcc: ['hidden@example.com'],
      replyTo: { name: '', address: 'support@myapp.loc' },
    })

    expect(entries[0]?.split('\n').slice(1, 7)).toEqual([
      'From: My App <no-reply@myapp.loc>',
      'To: user@example.com, Second User <second@example.com>',
      'Cc: copy@example.com',
      'Bcc: hidden@example.com',
      'Reply-To: support@myapp.loc',
      'Subject: Confirm your email',
    ])
  })

  it('leaves out the HTML version', async () => {
    const { entries, transport } = capture()

    await transport.send(message)

    expect(entries[0]).not.toContain('<p>')
  })

  it('returns a unique message id for every email', async () => {
    const { transport } = capture()

    const [first, second] = await Promise.all([transport.send(message), transport.send(message)])

    expect(first.messageId).toMatch(/^[\da-f-]{36}$/)
    expect(first.messageId).not.toBe(second.messageId)
  })

  it('logs to the console by default', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const transport = consoleTransport()

    await transport.send(message)

    expect(log).toHaveBeenCalledOnce()
    expect(log.mock.calls[0]?.[0]).toContain('Subject: Confirm your email')
  })
})

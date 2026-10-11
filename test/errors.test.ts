import { describe, expect, it, vi } from 'vitest'

import { MailerError } from '../src/errors'

describe('MailerError', () => {
  it('matches errors from another copy of the module, such as the other build', async () => {
    vi.resetModules()
    const other = await import('../src/errors')

    expect(other.MailerError).not.toBe(MailerError)
    expect(new other.MailerError('UNSAFE_URL', 'Unsafe URL.')).toBeInstanceOf(MailerError)
    expect(new MailerError('UNSAFE_URL', 'Unsafe URL.')).toBeInstanceOf(other.MailerError)
  })

  it('does not match other errors', () => {
    expect(new Error('Failed.')).not.toBeInstanceOf(MailerError)
    expect({ name: 'MailerError', code: 'UNSAFE_URL' }).not.toBeInstanceOf(MailerError)
    expect(null).not.toBeInstanceOf(MailerError)
  })

  it('keeps instanceof checks of subclasses to their own instances', () => {
    class TransportError extends MailerError {}

    expect(new TransportError('TRANSPORT_FAILED', 'Failed.')).toBeInstanceOf(TransportError)
    expect(new TransportError('TRANSPORT_FAILED', 'Failed.')).toBeInstanceOf(MailerError)
    expect(new MailerError('TRANSPORT_FAILED', 'Failed.')).not.toBeInstanceOf(TransportError)
  })

  it('adds no own properties besides name and code', () => {
    const error = new MailerError('UNSAFE_URL', 'Unsafe URL.')

    expect(Object.getOwnPropertySymbols(error)).toEqual([])
    expect(Object.keys(error).sort()).toEqual(['code', 'name'])
  })
})

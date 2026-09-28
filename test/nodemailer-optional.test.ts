import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.doUnmock('nodemailer')
  vi.resetModules()
})

describe('nodemailer as an optional peer', () => {
  it('is not needed to load the main entry', async () => {
    vi.resetModules()
    vi.doMock('nodemailer', () => {
      throw new Error('Cannot find package "nodemailer"')
    })

    const entry = await import('../src/index')

    expect(entry.memoryTransport).toBeTypeOf('function')
    expect(entry.consoleTransport).toBeTypeOf('function')
    await expect(import('../src/smtp')).rejects.toMatchObject({
      cause: { message: 'Cannot find package "nodemailer"' },
    })
  })
})

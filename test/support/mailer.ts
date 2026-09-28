import { expect } from 'vitest'

import { MailerError } from '../../src/errors'
import { createMailer } from '../../src/mailer'
import { catchError, catchRejection } from './catch-error'

export const branding = {
  companyName: 'My App',
  appUrl: 'https://myapp.loc',
  supportEmail: 'support@myapp.loc',
}

export const from = { name: 'My App', address: 'no-reply@myapp.loc' }

export function createUnchecked(config: unknown): ReturnType<typeof createMailer> {
  return createMailer(config as never)
}

export function mailerError(error: Error): MailerError {
  expect(error).toBeInstanceOf(MailerError)
  return error as MailerError
}

export function configError(fn: () => unknown): MailerError {
  const error = mailerError(catchError(fn))
  expect(error.code).toBe('INVALID_CONFIG')
  return error
}

export async function mailerRejection(promise: Promise<unknown>): Promise<MailerError> {
  return mailerError(await catchRejection(promise))
}

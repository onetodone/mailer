import { z } from 'zod'

import { safeUrl } from './core/html'

// Messages are phrased as predicates ("must be …", "is required") so they read
// naturally after a field path such as `branding.theme.primary`.

export function describeInput(input: unknown): string {
  return typeof input === 'string' ? JSON.stringify(input) : typeof input
}

export function expected(description: string) {
  return (issue: { input?: unknown }) =>
    issue.input === undefined ? 'is required' : `must be ${description}, received ${describeInput(issue.input)}`
}

export function objectError(issue: { code?: string; keys?: readonly string[] }): string {
  if (issue.code === 'unrecognized_keys' && issue.keys !== undefined) {
    return `has unknown ${issue.keys.length === 1 ? 'key' : 'keys'} ${issue.keys.map((key) => `"${key}"`).join(', ')}`
  }
  return 'must be an object'
}

const hexColorExpectation = expected('a HEX color like "#3b82f6"')

export const hexColor = z
  .string({ error: hexColorExpectation })
  .trim()
  .regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i, { error: hexColorExpectation })
  .transform((value) => {
    const digits = value.slice(1).toLowerCase()
    return `#${digits.length === 3 ? digits.replace(/./g, '$&$&') : digits}`
  })

export const pixels = z.number({ error: expected('a number of pixels') }).min(0, { error: 'must be 0 or greater' })

export const positiveInteger = z
  .number({ error: expected('a positive integer') })
  .int({ error: 'must be a positive integer' })
  .positive({ error: 'must be a positive integer' })

export const nonEmptyText = z
  .string({ error: expected('a string') })
  .trim()
  .min(1, { error: 'must not be empty' })

export const optionalText = z.string({ error: expected('a string') }).trim()

// The value is never echoed in the message: links often carry tokens.
export const httpUrl = z
  .string({ error: expected('an absolute http: or https: URL') })
  .trim()
  .transform((value, ctx) => {
    try {
      return safeUrl(value)
    } catch {
      ctx.addIssue({ code: 'custom', message: 'must be an absolute http: or https: URL', input: value })
      return z.NEVER
    }
  })

export const email = z
  .string({ error: expected('an email address') })
  .trim()
  .pipe(z.email({ error: (issue) => `must be an email address, received ${describeInput(issue.input)}` }))

export const date = z.date({
  error: (issue) => (issue.input === undefined ? 'is required' : 'must be a valid Date'),
})

const timeZoneExpectation = expected('an IANA time zone like "Europe/Berlin"')

export const timeZone = z
  .string({ error: timeZoneExpectation })
  .trim()
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: value })
        return true
      } catch {
        return false
      }
    },
    { error: timeZoneExpectation },
  )

import { z } from 'zod'

import { contentIdRule, isContentId } from './core/content-id'
import { safeUrl } from './core/html'
import type { Attachment, MailAddress, MailAddresses } from './transports/types'

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

export const flag = z.boolean({ error: expected('true or false') })

export const port = z
  .number({ error: expected('a port number from 1 to 65535') })
  .int({ error: 'must be a port number from 1 to 65535' })
  .min(1, { error: 'must be a port number from 1 to 65535' })
  .max(65535, { error: 'must be a port number from 1 to 65535' })

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

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const lineBreak = /[\r\n]/
const namedAddress = /^([^<>]*)<([^<>]*)>\s*$/
const emailFormat = z.email()
const addressExpectation = 'an email address like "user@example.com" or "Name <user@example.com>"'

type Report = (message: string, path?: readonly PropertyKey[]) => void

function checkEmail(value: unknown, report: Report, path: readonly PropertyKey[]): void {
  if (value === undefined) report('is required', path)
  else if (typeof value !== 'string') report(`must be an email address, received ${describeInput(value)}`, path)
  else if (lineBreak.test(value)) report('must not contain line breaks', path)
  else if (!emailFormat.safeParse(value.trim()).success) {
    report(`must be an email address, received ${describeInput(value)}`, path)
  }
}

function checkAddress(value: unknown, report: Report, path: readonly PropertyKey[] = []): void {
  if (typeof value === 'string') {
    const address = namedAddress.exec(value)?.[2] ?? value
    if (lineBreak.test(value)) report('must not contain line breaks', path)
    else if (!emailFormat.safeParse(address.trim()).success) {
      report(`must be ${addressExpectation}, received ${describeInput(value)}`, path)
    }
    return
  }
  if (!isRecord(value)) {
    report(
      value === undefined ? 'is required' : `must be ${addressExpectation}, received ${describeInput(value)}`,
      path,
    )
    return
  }
  const unknownKeys = Object.keys(value).filter((key) => key !== 'name' && key !== 'address')
  if (unknownKeys.length > 0) report(objectError({ code: 'unrecognized_keys', keys: unknownKeys }), path)
  const { name } = value
  if (typeof name === 'string') {
    if (lineBreak.test(name)) report('must not contain line breaks', [...path, 'name'])
  } else if (name !== undefined) {
    report(`must be a string, received ${describeInput(name)}`, [...path, 'name'])
  }
  checkEmail(value.address, report, [...path, 'address'])
}

function reporter(ctx: z.RefinementCtx, input: unknown): Report {
  return (message, path = []) => {
    ctx.addIssue({ code: 'custom', message, path: [...path], input })
  }
}

// Addresses are only checked, never transformed, so they reach the transport
// exactly as the caller passed them. Line breaks are rejected everywhere to
// block header injection.
export const mailAddress = z.custom<MailAddress>().superRefine((value, ctx) => {
  checkAddress(value, reporter(ctx, value))
})

export const mailAddresses = z.custom<MailAddresses>().superRefine((value, ctx) => {
  const report = reporter(ctx, value)
  if (!Array.isArray(value)) {
    checkAddress(value, report)
    return
  }
  if (value.length === 0) report('must list at least one address')
  value.forEach((address: unknown, index) => {
    checkAddress(address, report, [index])
  })
})

// RFC 5322 field names: printable ASCII without spaces or colons.
const headerName = /^[!-9;-~]+$/

export const headers = z.custom<Readonly<Record<string, string>>>().superRefine((value, ctx) => {
  const report = reporter(ctx, value)
  if (!isRecord(value)) {
    report('must be an object')
    return
  }
  for (const [name, headerValue] of Object.entries(value)) {
    if (!headerName.test(name)) {
      report(`has an invalid header name ${JSON.stringify(name)}: use printable ASCII without spaces or colons`)
    }
    if (typeof headerValue !== 'string') report(`must be a string, received ${describeInput(headerValue)}`, [name])
    else if (lineBreak.test(headerValue)) report('must not contain line breaks', [name])
  }
})

// CR and LF would split a MIME header; no other control character belongs in
// a file name or a content type either.
const controlCharacter = /\p{Cc}/u

const headerText = z.string({ error: expected('a string') }).refine((value) => !controlCharacter.test(value), {
  error: 'must not contain line breaks or other control characters',
  abort: true,
})

const mimeType = /^[\w!#$&^.+-]+\/[\w!#$&^.+-]+(?:\s*;.*)?$/

const attachment = z.strictObject(
  {
    filename: headerText.refine((value) => value.trim() !== '', { error: 'must not be empty' }),
    content: z.custom<Uint8Array | string>((value) => typeof value === 'string' || value instanceof Uint8Array, {
      error: expected('a string, a Buffer or a Uint8Array'),
    }),
    contentType: headerText
      .regex(mimeType, {
        error: (issue) => `must be a MIME type like "application/pdf", received ${describeInput(issue.input)}`,
      })
      .optional(),
    cid: z
      .string({ error: expected('a string') })
      .refine(isContentId, {
        error: (issue) => `must use only ${contentIdRule}, received ${describeInput(issue.input)}`,
      })
      .optional(),
  },
  { error: objectError },
)

export const attachments: z.ZodType<Attachment[], readonly Attachment[]> = z
  .array(attachment, { error: expected('an array of attachments') })
  .superRefine((list, ctx) => {
    const seen = new Set<string>()
    list.forEach(({ cid }, index) => {
      if (cid === undefined) return
      if (seen.has(cid)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'cid'],
          message: `must be unique, received ${JSON.stringify(cid)} again`,
          input: cid,
        })
      }
      seen.add(cid)
    })
  })

export function isLocaleTag(value: string): boolean {
  try {
    return Intl.getCanonicalLocales(value).length === 1
  } catch {
    return false
  }
}

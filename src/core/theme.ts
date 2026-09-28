import { z } from 'zod'

import { parseConfig } from '../errors'
import { safeUrl } from './html'

/** Resolved theme tokens. Colors are lowercase `#rrggbb`. */
export interface Theme {
  /** Brand color for buttons and links. */
  readonly primary: string
  /** Text color on `primary`, such as button labels. */
  readonly primaryText: string
  /** Page background around the email card. */
  readonly background: string
  /** Background of the email card. */
  readonly surface: string
  /** Main text color. */
  readonly text: string
  /** Secondary text: notes, footer, fallback links. */
  readonly mutedText: string
  /** Borders and dividers. */
  readonly border: string
  /** Corner radius of the card and buttons, in pixels. */
  readonly radius: number
}

/** Branding with defaults applied and every value validated. */
export interface ResolvedBranding {
  readonly companyName: string
  readonly appUrl: string
  readonly supportEmail: string
  readonly logoUrl: string | undefined
  readonly logoWidth: number
  readonly logoHeight: number | undefined
  readonly footerText: string | undefined
  readonly theme: Theme
}

const defaultTheme = {
  primary: '#2563eb',
  background: '#f4f4f5',
  surface: '#ffffff',
  text: '#18181b',
  mutedText: '#71717a',
  border: '#e4e4e7',
  radius: 8,
} as const

const defaultLogoWidth = 120

const lightText = '#ffffff'
const darkText = '#18181b'

function describeInput(input: unknown): string {
  return typeof input === 'string' ? JSON.stringify(input) : typeof input
}

function expected(description: string) {
  return (issue: { input?: unknown }) =>
    issue.input === undefined ? 'is required' : `must be ${description}, received ${describeInput(issue.input)}`
}

function objectError(issue: { code?: string; keys?: readonly string[] }): string {
  if (issue.code === 'unrecognized_keys' && issue.keys !== undefined) {
    return `has unknown ${issue.keys.length === 1 ? 'key' : 'keys'} ${issue.keys.map((key) => `"${key}"`).join(', ')}`
  }
  return 'must be an object'
}

const hexColorExpectation = expected('a HEX color like "#3b82f6"')

const hexColor = z
  .string({ error: hexColorExpectation })
  .trim()
  .regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i, { error: hexColorExpectation })
  .transform((value) => {
    const digits = value.slice(1).toLowerCase()
    return `#${digits.length === 3 ? digits.replace(/./g, '$&$&') : digits}`
  })

const pixels = z.number({ error: expected('a number of pixels') }).min(0, { error: 'must be 0 or greater' })

const positiveInteger = z
  .number({ error: expected('a positive integer') })
  .int({ error: 'must be a positive integer' })
  .positive({ error: 'must be a positive integer' })

const nonEmptyText = z
  .string({ error: expected('a string') })
  .trim()
  .min(1, { error: 'must not be empty' })

const optionalText = z.string({ error: expected('a string') }).trim()

const httpUrl = z
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

const email = z
  .string({ error: expected('an email address') })
  .trim()
  .pipe(z.email({ error: (issue) => `must be an email address, received ${describeInput(issue.input)}` }))

// Picks white unless it falls below 3:1 against the brand color, so light brand
// colors such as yellow still get readable button labels.
function readableTextOn(background: string): string {
  return contrastRatio(background, lightText) >= 3 ? lightText : darkText
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number]
  return (lighter + 0.05) / (darker + 0.05)
}

function relativeLuminance(hex: string): number {
  const channel = (start: number) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

/**
 * Schema for theme tokens. Every token is optional; missing ones get defaults
 * and `primaryText` defaults to a color that stays readable on `primary`.
 */
export const themeSchema = z
  .strictObject(
    {
      /** Brand color for buttons and links. Default `#2563eb`. */
      primary: hexColor.optional(),
      /** Text color on `primary`. Default: white, or near-black when white is not readable on `primary`. */
      primaryText: hexColor.optional(),
      /** Page background around the email card. Default `#f4f4f5`. */
      background: hexColor.optional(),
      /** Background of the email card. Default `#ffffff`. */
      surface: hexColor.optional(),
      /** Main text color. Default `#18181b`. */
      text: hexColor.optional(),
      /** Secondary text: notes, footer, fallback links. Default `#71717a`. */
      mutedText: hexColor.optional(),
      /** Borders and dividers. Default `#e4e4e7`. */
      border: hexColor.optional(),
      /** Corner radius of the card and buttons, in pixels. Default `8`. */
      radius: pixels.optional(),
    },
    { error: objectError },
  )
  .transform((input): Theme => {
    const primary = input.primary ?? defaultTheme.primary
    return {
      primary,
      primaryText: input.primaryText ?? readableTextOn(primary),
      background: input.background ?? defaultTheme.background,
      surface: input.surface ?? defaultTheme.surface,
      text: input.text ?? defaultTheme.text,
      mutedText: input.mutedText ?? defaultTheme.mutedText,
      border: input.border ?? defaultTheme.border,
      radius: input.radius ?? defaultTheme.radius,
    }
  })

/** Schema for branding settings: validates, trims and applies defaults. */
export const brandingSchema = z
  .strictObject(
    {
      /** Shown in the header when there is no logo, in the logo alt text and in the copyright line. */
      companyName: nonEmptyText,
      /** Absolute http(s) URL the logo or company name links to. */
      appUrl: httpUrl,
      /** Address for the support link in the footer. */
      supportEmail: email,
      /** Absolute http(s) URL of the logo image. Without it the header shows `companyName`. */
      logoUrl: httpUrl.optional(),
      /** Logo width in pixels. Default `120`. */
      logoWidth: positiveInteger.optional(),
      /** Logo height in pixels. Reserves space while images are blocked. */
      logoHeight: positiveInteger.optional(),
      /** Extra line at the top of the footer, such as why the recipient gets this email. */
      footerText: optionalText.optional(),
      /** Theme tokens. */
      theme: themeSchema.prefault({}),
    },
    { error: objectError },
  )
  .transform((input): ResolvedBranding => ({
    companyName: input.companyName,
    appUrl: input.appUrl,
    supportEmail: input.supportEmail,
    logoUrl: input.logoUrl,
    logoWidth: input.logoWidth ?? defaultLogoWidth,
    logoHeight: input.logoHeight,
    footerText: input.footerText === '' ? undefined : input.footerText,
    theme: input.theme,
  }))

/** Theme tokens accepted in `branding.theme`. All optional. */
export type ThemeInput = z.input<typeof themeSchema>

/** Branding settings: company name, links, logo, footer text and theme. */
export type Branding = z.input<typeof brandingSchema>

export function resolveTheme(input: ThemeInput = {}): Theme {
  return parseConfig(themeSchema, input, 'theme')
}

export function resolveBranding(input: Branding): ResolvedBranding {
  return parseConfig(brandingSchema, input, 'branding')
}

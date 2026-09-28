import { z } from 'zod'

import { parseConfig } from '../errors'
import {
  email,
  hexColor,
  httpUrl,
  nonEmptyText,
  objectError,
  optionalText,
  pixels,
  positiveInteger,
} from '../validators'

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

/** Theme tokens accepted in `branding.theme`. All optional. Colors are HEX, such as `#3b82f6` or `#fff`. */
export interface ThemeInput {
  /** Brand color for buttons and links. Default `#2563eb`. */
  readonly primary?: string | undefined
  /** Text color on `primary`. Default: white, or near-black when white is not readable on `primary`. */
  readonly primaryText?: string | undefined
  /** Page background around the email card. Default `#f4f4f5`. */
  readonly background?: string | undefined
  /** Background of the email card. Default `#ffffff`. */
  readonly surface?: string | undefined
  /** Main text color. Default `#18181b`. */
  readonly text?: string | undefined
  /** Secondary text: notes, footer, fallback links. Default `#71717a`. */
  readonly mutedText?: string | undefined
  /** Borders and dividers. Default `#e4e4e7`. */
  readonly border?: string | undefined
  /** Corner radius of the card and buttons, in pixels. Default `8`. */
  readonly radius?: number | undefined
}

/** Branding settings: company name, links, logo, footer text and theme. */
export interface Branding {
  /** Shown in the header when there is no logo, in the logo alt text and in the copyright line. */
  readonly companyName: string
  /** Absolute http(s) URL the logo or company name links to. */
  readonly appUrl: string
  /** Address for the support link in the footer. */
  readonly supportEmail: string
  /** Absolute http(s) URL of the logo image. Without it the header shows `companyName`. */
  readonly logoUrl?: string | undefined
  /** Logo width in pixels. Default `120`. */
  readonly logoWidth?: number | undefined
  /** Logo height in pixels. Reserves space while images are blocked. */
  readonly logoHeight?: number | undefined
  /** Extra line at the top of the footer, such as why the recipient gets this email. */
  readonly footerText?: string | undefined
  /** Theme tokens. */
  readonly theme?: ThemeInput | undefined
}

/**
 * Schema for theme tokens. Every token is optional; missing ones get defaults
 * and `primaryText` defaults to a color that stays readable on `primary`.
 */
export const themeSchema: z.ZodType<Theme, ThemeInput> = z
  .strictObject(
    {
      primary: hexColor.optional(),
      primaryText: hexColor.optional(),
      background: hexColor.optional(),
      surface: hexColor.optional(),
      text: hexColor.optional(),
      mutedText: hexColor.optional(),
      border: hexColor.optional(),
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
export const brandingSchema: z.ZodType<ResolvedBranding, Branding> = z
  .strictObject(
    {
      companyName: nonEmptyText,
      appUrl: httpUrl,
      supportEmail: email,
      logoUrl: httpUrl.optional(),
      logoWidth: positiveInteger.optional(),
      logoHeight: positiveInteger.optional(),
      footerText: optionalText.optional(),
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

export function resolveTheme(input: ThemeInput = {}): Theme {
  return parseConfig(themeSchema, input, 'theme')
}

export function resolveBranding(input: Branding): ResolvedBranding {
  return parseConfig(brandingSchema, input, 'branding')
}

import { z } from 'zod'

import {
  email,
  hexColor,
  httpUrl,
  nonEmptyText,
  objectError,
  optionalText,
  parseConfig,
  pixels,
  positiveInteger,
} from '../validators'
import type { Branding, ResolvedBranding, Theme, ThemeInput } from './theme'

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

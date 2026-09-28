import { describe, expect, it } from 'vitest'

import { brandingSchema, resolveBranding, resolveTheme, themeSchema, type Branding } from '../../src/core/theme'
import { MailerError } from '../../src/errors'
import { catchError } from '../support/catch-error'

const branding: Branding = {
  companyName: 'My App',
  appUrl: 'https://myapp.loc',
  supportEmail: 'support@myapp.loc',
}

function configError(fn: () => unknown): MailerError {
  const error = catchError(fn)
  expect(error).toBeInstanceOf(MailerError)
  expect(error).toMatchObject({ code: 'INVALID_CONFIG' })
  return error as MailerError
}

describe('resolveTheme', () => {
  it('fills every token with a default', () => {
    expect(resolveTheme()).toEqual({
      primary: '#2563eb',
      primaryText: '#ffffff',
      background: '#f4f4f5',
      surface: '#ffffff',
      text: '#18181b',
      mutedText: '#71717a',
      border: '#e4e4e7',
      radius: 8,
    })
    expect(resolveTheme({})).toEqual(resolveTheme())
  })

  it('keeps defaults for tokens that are not overridden', () => {
    const theme = resolveTheme({ primary: '#7c3aed', radius: 0 })
    expect(theme).toMatchObject({ primary: '#7c3aed', radius: 0, surface: '#ffffff', border: '#e4e4e7' })
  })

  it('treats undefined tokens as missing', () => {
    expect(resolveTheme({ primary: undefined, radius: undefined })).toEqual(resolveTheme())
  })

  it('normalizes colors to lowercase #rrggbb', () => {
    expect(resolveTheme({ primary: '#ABC', text: ' #11AA22 ' })).toMatchObject({ primary: '#aabbcc', text: '#11aa22' })
  })

  it.each(['blue', '#12', '#1234', '#ggg', '#12345g', '#12345678', 'rgb(0, 0, 0)', '2563eb', ''])(
    'rejects %j as a HEX color',
    (value) => {
      const error = configError(() => resolveTheme({ primary: value }))
      expect(error.message).toBe(
        `Invalid mailer configuration: theme.primary must be a HEX color like "#3b82f6", received ${JSON.stringify(value.trim())}.`,
      )
    },
  )

  it('rejects non-string colors', () => {
    const error = configError(() => resolveTheme({ border: 0xffffff as unknown as string }))
    expect(error.message).toContain('theme.border must be a HEX color like "#3b82f6", received number')
  })

  it('reports every invalid token', () => {
    const error = configError(() => resolveTheme({ primary: 'red', mutedText: 'grey' }))
    expect(error.message).toContain('theme.primary')
    expect(error.message).toContain('theme.mutedText')
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects radius %s', (radius) => {
    const error = configError(() => resolveTheme({ radius }))
    expect(error.message).toContain('theme.radius')
  })

  it('rejects unknown tokens', () => {
    const error = configError(() => resolveTheme({ primaryColor: '#000000' } as never))
    expect(error.message).toContain('theme has unknown key "primaryColor"')
  })

  it('keeps the ZodError as the cause', () => {
    const error = configError(() => resolveTheme({ primary: 'blue' }))
    expect(error.cause).toMatchObject({ name: 'ZodError' })
  })

  describe('primaryText', () => {
    it.each([
      ['#2563eb', '#ffffff'],
      ['#3b82f6', '#ffffff'],
      ['#000000', '#ffffff'],
      ['#facc15', '#18181b'],
      ['#ffffff', '#18181b'],
      ['#22c55e', '#18181b'],
    ])('on %s defaults to %s', (primary, primaryText) => {
      expect(resolveTheme({ primary }).primaryText).toBe(primaryText)
    })

    it('keeps an explicit value', () => {
      expect(resolveTheme({ primary: '#facc15', primaryText: '#FFF' }).primaryText).toBe('#ffffff')
    })
  })
})

describe('resolveBranding', () => {
  it('applies defaults', () => {
    expect(resolveBranding(branding)).toEqual({
      companyName: 'My App',
      appUrl: 'https://myapp.loc/',
      supportEmail: 'support@myapp.loc',
      logoUrl: undefined,
      logoWidth: 120,
      logoHeight: undefined,
      footerText: undefined,
      theme: resolveTheme(),
    })
  })

  it('trims text and keeps optional values', () => {
    const resolved = resolveBranding({
      ...branding,
      companyName: '  My App  ',
      supportEmail: ' help@myapp.loc ',
      logoUrl: 'https://cdn.myapp.loc/logo.png',
      logoWidth: 160,
      logoHeight: 40,
      footerText: ' You signed up for My App. ',
      theme: { primary: '#10b981' },
    })
    expect(resolved).toMatchObject({
      companyName: 'My App',
      supportEmail: 'help@myapp.loc',
      logoUrl: 'https://cdn.myapp.loc/logo.png',
      logoWidth: 160,
      logoHeight: 40,
      footerText: 'You signed up for My App.',
      theme: { primary: '#10b981' },
    })
  })

  it('treats an empty footer text as missing', () => {
    expect(resolveBranding({ ...branding, footerText: '   ' }).footerText).toBeUndefined()
  })

  it.each([
    [{ companyName: '  ' }, 'branding.companyName must not be empty'],
    [{ appUrl: 'javascript:alert(1)' }, 'branding.appUrl must be an absolute http: or https: URL'],
    [{ appUrl: 'myapp.loc' }, 'branding.appUrl must be an absolute http: or https: URL'],
    [{ logoUrl: 'data:image/png;base64,AAAA' }, 'branding.logoUrl must be an absolute http: or https: URL'],
    [{ supportEmail: 'support' }, 'branding.supportEmail must be an email address, received "support"'],
    [{ supportEmail: 'a@b.com"><script>' }, 'branding.supportEmail must be an email address'],
    [{ logoWidth: 0 }, 'branding.logoWidth must be a positive integer'],
    [{ logoWidth: 12.5 }, 'branding.logoWidth must be a positive integer'],
    [{ logoHeight: -4 }, 'branding.logoHeight must be a positive integer'],
    [{ theme: { surface: 'white' } }, 'branding.theme.surface must be a HEX color like "#3b82f6", received "white"'],
    [{ theme: 'dark' }, 'branding.theme must be an object'],
    [{ logo: 'x' }, 'branding has unknown key "logo"'],
  ])('rejects %j', (override, message) => {
    const error = configError(() => resolveBranding({ ...branding, ...override } as Branding))
    expect(error.message).toContain(message)
  })

  it('reports missing required fields', () => {
    const error = configError(() => resolveBranding({} as Branding))
    expect(error.message).toBe(
      'Invalid mailer configuration: branding.companyName is required; branding.appUrl is required; branding.supportEmail is required.',
    )
  })

  it('rejects a non-object', () => {
    const error = configError(() => resolveBranding(null as unknown as Branding))
    expect(error.message).toBe('Invalid mailer configuration: branding must be an object.')
  })
})

describe('schemas', () => {
  it('parse to the same values the resolvers return', () => {
    expect(themeSchema.parse({ primary: '#FFF' })).toEqual(resolveTheme({ primary: '#FFF' }))
    expect(brandingSchema.parse(branding)).toEqual(resolveBranding(branding))
  })
})

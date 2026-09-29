import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { html } from '../../src/core/html'
import { defaultLayout, defineLayout, type LayoutContext } from '../../src/core/layout'
import { resolveBranding } from '../../src/core/theme'
import { MailerError } from '../../src/errors'
import { buildMessages } from '../../src/i18n'
import type { AccountDeletedProps } from '../../src/templates/account-deleted'
import type { AccountLockedProps } from '../../src/templates/account-locked'
import { builtInTemplates, type BuiltInTemplates } from '../../src/templates/built-in'
import type { ConfirmAccountDeletionProps } from '../../src/templates/confirm-account-deletion'
import { defineTemplate, type TemplateProps, type TemplateRegistry } from '../../src/templates/define'
import type { EmailChangeRequestedProps } from '../../src/templates/email-change-requested'
import type { EmailChangedProps } from '../../src/templates/email-changed'
import type { MagicLinkProps } from '../../src/templates/magic-link'
import type { NewSignInProps } from '../../src/templates/new-sign-in'
import type { OtpCodeProps } from '../../src/templates/otp-code'
import type { PasswordChangedProps } from '../../src/templates/password-changed'
import { renderTemplate, type RenderedEmail, type RenderTemplateOptions } from '../../src/templates/render'
import type { ResetPasswordProps } from '../../src/templates/reset-password'
import type { StandardSchemaV1 } from '../../src/templates/standard-schema'
import type { TwoFactorDisabledProps } from '../../src/templates/two-factor-disabled'
import type { TwoFactorEnabledProps } from '../../src/templates/two-factor-enabled'
import type { VerifyEmailProps } from '../../src/templates/verify-email'
import type { VerifyEmailChangeProps } from '../../src/templates/verify-email-change'
import type { WelcomeProps } from '../../src/templates/welcome'

const branding = resolveBranding({
  companyName: 'My App',
  appUrl: 'https://myapp.loc',
  supportEmail: 'support@myapp.loc',
})
const messages = buildMessages()
const options: RenderTemplateOptions = { branding, layout: defaultLayout, locale: 'en', messages: messages.en }
const url = 'https://myapp.loc/verify?token=abc123'

function renderUnchecked(
  templates: TemplateRegistry,
  name: string,
  props: unknown,
  renderOptions: RenderTemplateOptions,
): Promise<RenderedEmail> {
  return renderTemplate(templates, name as never, props as never, renderOptions)
}

async function rejection(promise: Promise<unknown>): Promise<MailerError> {
  const error: unknown = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(MailerError)
  return error as MailerError
}

function capturingLayout() {
  const calls: LayoutContext[] = []
  const layout = defineLayout((context) => {
    calls.push(context)
    return { html: html`<main>${context.content.html}</main>`, text: context.content.text }
  })
  return { calls, layout }
}

const note = defineTemplate({
  name: 'note',
  schema: z.object({ text: z.string().trim(), show: z.boolean() }),
  render: ({ props, ui }) => ({
    subject: '  Hello\n  world  ',
    preheader: 'Preview',
    body: [ui.paragraph(props.text), props.show && ui.note('Shown'), null, undefined],
  }),
})

describe('renderTemplate types', () => {
  it('rejects unknown names and wrong props at compile time', () => {
    const check = () => {
      // @ts-expect-error: unknown template name
      void renderTemplate(builtInTemplates, 'orderShipped', {}, options)
      // @ts-expect-error: verifyUrl is required
      void renderTemplate(builtInTemplates, 'verifyEmail', { userName: 'Lizzie' }, options)
      // @ts-expect-error: expiresInMinutes is a number
      void renderTemplate(builtInTemplates, 'verifyEmail', { verifyUrl: url, expiresInMinutes: '30' }, options)
      // @ts-expect-error: unknown prop
      void renderTemplate(builtInTemplates, 'resetPassword', { resetUrl: url, token: 'abc123' }, options)
      // @ts-expect-error: props of another template
      void renderTemplate(builtInTemplates, 'resetPassword', { verifyUrl: url }, options)
    }
    expect(check).toBeTypeOf('function')
  })

  it('types props as the schema input of each template', () => {
    expectTypeOf<TemplateProps<BuiltInTemplates['verifyEmail']>>().toEqualTypeOf<VerifyEmailProps>()
    expectTypeOf<VerifyEmailProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly verifyUrl: string
      readonly expiresInMinutes?: number | undefined
    }>()
    expectTypeOf<TemplateProps<BuiltInTemplates['resetPassword']>>().toEqualTypeOf<ResetPasswordProps>()
    expectTypeOf<ResetPasswordProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly resetUrl: string
      readonly expiresInMinutes?: number | undefined
    }>()
    expectTypeOf<TemplateProps<BuiltInTemplates['passwordChanged']>>().toEqualTypeOf<PasswordChangedProps>()
    expectTypeOf<PasswordChangedProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly changedAt?: Date | undefined
      readonly timeZone?: string | undefined
      readonly ip?: string | undefined
      readonly supportUrl?: string | undefined
    }>()
    expectTypeOf<TemplateProps<BuiltInTemplates['verifyEmailChange']>>().toEqualTypeOf<VerifyEmailChangeProps>()
    expectTypeOf<VerifyEmailChangeProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly verifyUrl: string
      readonly expiresInMinutes?: number | undefined
    }>()
    expectTypeOf<TemplateProps<BuiltInTemplates['emailChangeRequested']>>().toEqualTypeOf<EmailChangeRequestedProps>()
    expectTypeOf<EmailChangeRequestedProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly newEmail: string
      readonly requestedAt?: Date | undefined
      readonly timeZone?: string | undefined
      readonly ip?: string | undefined
      readonly cancelUrl?: string | undefined
      readonly supportUrl?: string | undefined
    }>()
    expectTypeOf<TemplateProps<BuiltInTemplates['emailChanged']>>().toEqualTypeOf<EmailChangedProps>()
    expectTypeOf<EmailChangedProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly newEmail?: string | undefined
      readonly changedAt?: Date | undefined
      readonly timeZone?: string | undefined
      readonly ip?: string | undefined
      readonly supportUrl?: string | undefined
    }>()
    expectTypeOf<TemplateProps<BuiltInTemplates['otpCode']>>().toEqualTypeOf<OtpCodeProps>()
    expectTypeOf<OtpCodeProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly code: string
      readonly expiresInMinutes?: number | undefined
    }>()
    expectTypeOf<TemplateProps<BuiltInTemplates['magicLink']>>().toEqualTypeOf<MagicLinkProps>()
    expectTypeOf<MagicLinkProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly signInUrl: string
      readonly expiresInMinutes?: number | undefined
    }>()
    expectTypeOf<TemplateProps<BuiltInTemplates['welcome']>>().toEqualTypeOf<WelcomeProps>()
    expectTypeOf<WelcomeProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly ctaUrl?: string | undefined
    }>()
    expectTypeOf<TemplateProps<BuiltInTemplates['newSignIn']>>().toEqualTypeOf<NewSignInProps>()
    expectTypeOf<NewSignInProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly signedInAt?: Date | undefined
      readonly timeZone?: string | undefined
      readonly ip?: string | undefined
      readonly device?: string | undefined
      readonly location?: string | undefined
      readonly secureUrl?: string | undefined
      readonly supportUrl?: string | undefined
    }>()
    expectTypeOf<TemplateProps<BuiltInTemplates['twoFactorEnabled']>>().toEqualTypeOf<TwoFactorEnabledProps>()
    expectTypeOf<TwoFactorEnabledProps>().toEqualTypeOf<PasswordChangedProps>()
    expectTypeOf<TemplateProps<BuiltInTemplates['twoFactorDisabled']>>().toEqualTypeOf<TwoFactorDisabledProps>()
    expectTypeOf<TwoFactorDisabledProps>().toEqualTypeOf<PasswordChangedProps>()
    expectTypeOf<TemplateProps<BuiltInTemplates['accountLocked']>>().toEqualTypeOf<AccountLockedProps>()
    expectTypeOf<AccountLockedProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly lockedUntil?: Date | undefined
      readonly timeZone?: string | undefined
      readonly ip?: string | undefined
      readonly unlockUrl?: string | undefined
      readonly supportUrl?: string | undefined
    }>()
    expectTypeOf<
      TemplateProps<BuiltInTemplates['confirmAccountDeletion']>
    >().toEqualTypeOf<ConfirmAccountDeletionProps>()
    expectTypeOf<ConfirmAccountDeletionProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly confirmUrl: string
      readonly expiresInMinutes?: number | undefined
    }>()
    expectTypeOf<TemplateProps<BuiltInTemplates['accountDeleted']>>().toEqualTypeOf<AccountDeletedProps>()
    expectTypeOf<AccountDeletedProps>().toEqualTypeOf<{
      readonly userName?: string | undefined
      readonly supportUrl?: string | undefined
    }>()
    expectTypeOf(renderTemplate<{ note: typeof note }, 'note'>)
      .parameter(2)
      .toEqualTypeOf<{ text: string; show: boolean }>()
  })
})

describe('renderTemplate', () => {
  it('throws UNKNOWN_TEMPLATE for a name that is not registered', async () => {
    const error = await rejection(renderUnchecked(builtInTemplates, 'orderShipped', {}, options))
    expect(error.code).toBe('UNKNOWN_TEMPLATE')
    expect(error.message).toBe(
      'Unknown template "orderShipped". Available templates: verifyEmail, resetPassword, passwordChanged, verifyEmailChange, emailChangeRequested, emailChanged, otpCode, magicLink, welcome, newSignIn, twoFactorEnabled, twoFactorDisabled, accountLocked, confirmAccountDeletion, accountDeleted.',
    )
    const inherited = await rejection(renderUnchecked(builtInTemplates, 'toString', {}, options))
    expect(inherited.code).toBe('UNKNOWN_TEMPLATE')
  })

  it('throws INVALID_PROPS with every issue and its path', async () => {
    const error = await rejection(
      renderUnchecked(
        builtInTemplates,
        'verifyEmail',
        { verifyUrl: 'javascript:alert(1)//?token=secret', expiresInMinutes: 0 },
        options,
      ),
    )
    expect(error.code).toBe('INVALID_PROPS')
    expect(error.message).toBe(
      'Invalid props for template "verifyEmail": verifyUrl: must be an absolute http: or https: URL; expiresInMinutes: must be a positive integer.',
    )
    expect(error.message).not.toContain('secret')
    expect(error.cause).toEqual([
      expect.objectContaining({ path: ['verifyUrl'] }),
      expect.objectContaining({ path: ['expiresInMinutes'] }),
    ])
  })

  it.each<[string, unknown, string]>([
    ['missing props', {}, 'verifyUrl: is required'],
    ['no props object', undefined, 'must be an object'],
    ['an unknown prop', { verifyUrl: url, token: 'abc123' }, 'has unknown key "token"'],
    ['a non-string name', { verifyUrl: url, userName: 42 }, 'userName: must be a string, received number'],
  ])('reports %s', async (_case, props, detail) => {
    const error = await rejection(renderUnchecked(builtInTemplates, 'verifyEmail', props, options))
    expect(error.message).toBe(`Invalid props for template "verifyEmail": ${detail}.`)
  })

  it('works with any Standard Schema, including async validation', async () => {
    const schema: StandardSchemaV1<{ items: string[] }> = {
      '~standard': {
        version: 1,
        vendor: 'handwritten',
        validate: (value) =>
          Promise.resolve(
            Array.isArray((value as { items?: unknown }).items)
              ? { value: value as { items: string[] } }
              : { issues: [{ message: 'Expected a list', path: [{ key: 'items' }, 0] }] },
          ),
      },
    }
    const templates = {
      list: defineTemplate({
        name: 'list',
        schema,
        render: ({ props, ui }) => ({ subject: 'List', body: [ui.paragraph(props.items.join(', '))] }),
      }),
    }
    const email = await renderTemplate(templates, 'list', { items: ['a', 'b'] }, options)
    expect(email.text).toContain('a, b')
    const error = await rejection(renderUnchecked(templates, 'list', {}, options))
    expect(error.message).toBe('Invalid props for template "list": items.0: Expected a list.')
  })

  it('renders the validated props through the layout', async () => {
    const { calls, layout } = capturingLayout()
    const email = await renderTemplate({ note }, 'note', { text: '  Hi  ', show: false }, { ...options, layout })
    expect(email).toEqual({
      subject: 'Hello world',
      html: '<main><p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:#18181b;mso-line-height-rule:exactly;">Hi</p></main>',
      text: 'Hi',
    })
    expect(calls[0]).toMatchObject({
      subject: 'Hello world',
      preheader: 'Preview',
      locale: 'en',
      branding,
      theme: branding.theme,
      messages: { footerSupport: 'Questions? Write to us at', footerRights: 'All rights reserved.' },
    })
  })

  it('skips false, null and undefined body entries', async () => {
    const { layout } = capturingLayout()
    const email = await renderTemplate({ note }, 'note', { text: 'Hi', show: true }, { ...options, layout })
    expect(email.text).toBe('Hi\n\nShown')
  })

  it('uses the texts of the locale', async () => {
    const { calls, layout } = capturingLayout()
    await renderTemplate(
      { note },
      'note',
      { text: 'Hi', show: false },
      {
        ...options,
        layout,
        locale: 'be',
        messages: messages.be,
      },
    )
    expect(calls[0]?.locale).toBe('be')
    expect(calls[0]?.messages).toEqual({
      footerSupport: 'Ёсць пытанні? Пішыце нам:',
      footerRights: 'Усе правы абаронены.',
    })
  })

  it('fills the company name into layout and block texts', async () => {
    const { calls, layout } = capturingLayout()
    const custom = buildMessages({
      en: { common: { footerRights: '{companyName} keeps all rights.', linkFallback: 'Open in {companyName}:' } },
    })
    const email = await renderTemplate(
      builtInTemplates,
      'verifyEmail',
      { verifyUrl: url },
      {
        ...options,
        layout,
        messages: custom.en,
      },
    )
    expect(calls[0]?.messages.footerRights).toBe('My App keeps all rights.')
    expect(email.text).toContain(`Open in My App:\n${url}`)
  })

  it('passes the default time zone to the formatters', async () => {
    const templates = {
      clock: defineTemplate({
        name: 'clock',
        schema: z.object({ at: z.date() }),
        render: ({ props, format, ui }) => ({ subject: 'Clock', body: [ui.paragraph(format.dateTime(props.at))] }),
      }),
    }
    const email = await renderTemplate(
      templates,
      'clock',
      { at: new Date('2026-05-04T09:30:00Z') },
      {
        ...options,
        timeZone: 'Asia/Tokyo',
      },
    )
    expect(email.text.replace(/\s+/g, ' ')).toContain('GMT+9')
  })
})

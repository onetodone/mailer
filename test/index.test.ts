import { describe, expect, expectTypeOf, it } from 'vitest'

import * as mailer from '../src/index'
import type {
  Branding,
  LayoutContext,
  Locale,
  LocaleMessages,
  MailAddress,
  MailAddresses,
  Mailer,
  MailerConfig,
  MailerErrorCode,
  MailErrorEvent,
  MailEvent,
  MailSentEvent,
  MailTransport,
  MemoryTransport,
  MessageKey,
  MessagesOverrides,
  OutgoingMessage,
  PasswordChangedProps,
  RenderedEmail,
  RenderOptions,
  ResetPasswordProps,
  SafeHtml,
  SendOptions,
  SendResult,
  TemplateProps,
  TemplateRenderContext,
  ThemeInput,
  Translate,
  VerifyEmailProps,
} from '../src/index'

describe('main entry', () => {
  it('exposes the mailer, rendering, template and transport API', () => {
    expect(Object.keys(mailer).sort()).toEqual([
      'MailerError',
      'consoleTransport',
      'createMailer',
      'defaultLayout',
      'defineLayout',
      'defineTemplate',
      'html',
      'memoryTransport',
      'raw',
      'safeUrl',
    ])
  })

  it('exposes types for configuration and custom layouts', () => {
    expectTypeOf<Branding>().toHaveProperty('companyName')
    expectTypeOf<ThemeInput>().toHaveProperty('primary')
    expectTypeOf<LayoutContext['content']['html']>().toEqualTypeOf<SafeHtml>()
    expectTypeOf(mailer.html`<p></p>`).toEqualTypeOf<SafeHtml>()
  })

  it('exposes types for custom templates and texts', () => {
    expectTypeOf<Locale>().toEqualTypeOf<'en' | 'be'>()
    expectTypeOf<'verifyEmail.subject' | 'common.linkFallback'>().toExtend<MessageKey>()
    expectTypeOf<'common.minutes'>().not.toExtend<MessageKey>()
    expectTypeOf<TemplateRenderContext<{ id: string }>['t']>().toEqualTypeOf<Translate>()
    expectTypeOf<'INVALID_PROPS' | 'UNKNOWN_TEMPLATE'>().toExtend<MailerErrorCode>()
    const template = mailer.defineTemplate({
      name: 'ping',
      schema: { '~standard': { version: 1, vendor: 'test', validate: () => ({ value: { id: 'x' } }) } },
      render: () => ({ subject: 'Ping', body: [] }),
    })
    expect(template.name).toBe('ping')
    expectTypeOf<TemplateProps<typeof template>>().toEqualTypeOf<unknown>()
  })

  it('exposes types for custom transports', () => {
    expectTypeOf<MailTransport['send']>().parameter(0).toEqualTypeOf<OutgoingMessage>()
    expectTypeOf<MailTransport['send']>().returns.resolves.toEqualTypeOf<SendResult>()
    expectTypeOf({ send: () => Promise.resolve({ messageId: 'id' }) }).toExtend<MailTransport>()
    expectTypeOf<{ name: string; address: string }>().toExtend<MailAddress>()
    expectTypeOf<readonly MailAddress[]>().toExtend<MailAddresses>()
    expectTypeOf(mailer.memoryTransport()).toEqualTypeOf<MemoryTransport>()
    expectTypeOf<MemoryTransport>().toExtend<MailTransport>()
    expectTypeOf(mailer.consoleTransport()).toEqualTypeOf<MailTransport>()
    expectTypeOf<'TRANSPORT_FAILED'>().toExtend<MailerErrorCode>()
  })

  it('exposes types for the mailer', () => {
    const mailerInstance = mailer.createMailer({
      transport: mailer.memoryTransport(),
      from: 'no-reply@myapp.loc',
      branding: { companyName: 'My App', appUrl: 'https://myapp.loc', supportEmail: 'support@myapp.loc' },
    })
    expectTypeOf(mailerInstance).toExtend<Mailer>()
    expectTypeOf<Mailer['render']>().returns.resolves.toEqualTypeOf<RenderedEmail>()
    expectTypeOf<MailerConfig>().toHaveProperty('onSent')
    expectTypeOf<MailSentEvent>().toExtend<MailEvent>()
    expectTypeOf<MailErrorEvent['error']>().toEqualTypeOf<unknown>()
    expectTypeOf<SendOptions>().toHaveProperty('to')
    expectTypeOf<RenderOptions>().toHaveProperty('locale')
    expectTypeOf<VerifyEmailProps>().toHaveProperty('verifyUrl')
    expectTypeOf<ResetPasswordProps>().toHaveProperty('resetUrl')
    expectTypeOf<PasswordChangedProps>().toHaveProperty('changedAt')
    expectTypeOf<{ pl: LocaleMessages }>().toExtend<MessagesOverrides>()
    expectTypeOf<'INVALID_OPTIONS'>().toExtend<MailerErrorCode>()
  })
})

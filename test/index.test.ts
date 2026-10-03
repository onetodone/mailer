import { describe, expect, expectTypeOf, it } from 'vitest'

import * as mailer from '../src/index'
import type {
  AccountDeletedProps,
  AccountLockedProps,
  Attachment,
  AttachmentInfo,
  Branding,
  ConfirmAccountDeletionProps,
  EmailChangedProps,
  EmailChangeRequestedProps,
  ImageOptions,
  LayoutContext,
  Locale,
  LocaleMessages,
  MagicLinkProps,
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
  NewSignInProps,
  OtpCodeProps,
  OutgoingAttachment,
  OutgoingMessage,
  PasswordChangedProps,
  RenderedEmail,
  RenderOptions,
  ResetPasswordProps,
  SafeHtml,
  SendOptions,
  SendResult,
  TemplateMessages,
  TemplateProps,
  TemplateRenderContext,
  TemplateTexts,
  ThemeInput,
  Translate,
  TwoFactorDisabledProps,
  TwoFactorEnabledProps,
  VerifyEmailChangeProps,
  VerifyEmailProps,
  WelcomeProps,
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
    expectTypeOf<Locale>().toEqualTypeOf<
      'en' | 'be-Latn' | 'be' | 'cs' | 'de' | 'et' | 'fr' | 'it' | 'ja' | 'ka' | 'lt' | 'lv' | 'pl' | 'ro' | 'th' | 'uk'
    >()
    expectTypeOf<'verifyEmail.subject' | 'common.linkFallback'>().toExtend<MessageKey>()
    expectTypeOf<'common.minutes'>().not.toExtend<MessageKey>()
    expectTypeOf<TemplateRenderContext<{ id: string }>['t']>().toEqualTypeOf<Translate>()
    expectTypeOf<'INVALID_PROPS' | 'UNKNOWN_TEMPLATE'>().toExtend<MailerErrorCode>()
    expectTypeOf<TemplateRenderContext<unknown>['ui']['image']>().parameter(1).toEqualTypeOf<ImageOptions>()
    const template = mailer.defineTemplate({
      name: 'ping',
      schema: { '~standard': { version: 1, vendor: 'test', validate: () => ({ value: { id: 'x' } }) } },
      render: () => ({ subject: 'Ping', body: [] }),
    })
    expect(template.name).toBe('ping')
    expectTypeOf<TemplateProps<typeof template>>().toEqualTypeOf<unknown>()
  })

  it('exposes types for the texts of custom templates', () => {
    const texts = {
      en: { subject: 'Invoice #{number}', intro: 'Your invoice is attached.' },
      be: { subject: 'Рахунак №{number}' },
    } satisfies TemplateMessages
    expectTypeOf(texts.en).toExtend<TemplateTexts>()
    const invoice = mailer.defineTemplate({
      name: 'invoice',
      schema: { '~standard': { version: 1, vendor: 'test', validate: () => ({ value: {} }) } },
      messages: texts,
      render: ({ t }) => {
        expectTypeOf(t).toEqualTypeOf<
          Translate<'invoice.subject' | 'invoice.intro' | (`common.${string}` & MessageKey)>
        >()
        return { subject: t('invoice.subject'), body: [] }
      },
    })
    const plain = mailer.defineTemplate({
      name: 'plain',
      schema: { '~standard': { version: 1, vendor: 'test', validate: () => ({ value: {} }) } },
      render: () => ({ subject: 'Plain', body: [] }),
    })
    expect(invoice.messages).toBe(texts)
    expect(plain.messages).toBeUndefined()
    interface Templates {
      invoice: typeof invoice
      plain: typeof plain
    }
    expectTypeOf<{ be: { invoice: { intro: string }; verifyEmail: { subject: string } } }>().toExtend<
      MessagesOverrides<Templates>
    >()
    expectTypeOf<{ be: { invoice: { title: string } } }>().not.toExtend<MessagesOverrides<Templates>>()
    expectTypeOf<LocaleMessages<Templates>>().toHaveProperty('invoice')
    expectTypeOf<LocaleMessages<{ plain: typeof plain }>>().toEqualTypeOf<LocaleMessages>()
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
    expectTypeOf<NonNullable<OutgoingMessage['attachments']>[number]>().toEqualTypeOf<OutgoingAttachment>()
    expectTypeOf<OutgoingAttachment['contentType']>().toEqualTypeOf<string>()
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
    expectTypeOf<NonNullable<SendOptions['attachments']>[number]>().toEqualTypeOf<Attachment>()
    expectTypeOf<NonNullable<MailEvent['attachments']>[number]>().toEqualTypeOf<AttachmentInfo>()
    expectTypeOf<RenderOptions>().toHaveProperty('locale')
    expectTypeOf<VerifyEmailProps>().toHaveProperty('verifyUrl')
    expectTypeOf<ResetPasswordProps>().toHaveProperty('resetUrl')
    expectTypeOf<PasswordChangedProps>().toHaveProperty('changedAt')
    expectTypeOf<VerifyEmailChangeProps>().toHaveProperty('verifyUrl')
    expectTypeOf<EmailChangeRequestedProps>().toHaveProperty('newEmail')
    expectTypeOf<EmailChangedProps>().toHaveProperty('newEmail')
    expectTypeOf<OtpCodeProps>().toHaveProperty('code')
    expectTypeOf<MagicLinkProps>().toHaveProperty('signInUrl')
    expectTypeOf<WelcomeProps>().toHaveProperty('ctaUrl')
    expectTypeOf<NewSignInProps>().toHaveProperty('device')
    expectTypeOf<TwoFactorEnabledProps>().toHaveProperty('changedAt')
    expectTypeOf<TwoFactorDisabledProps>().toHaveProperty('changedAt')
    expectTypeOf<AccountLockedProps>().toHaveProperty('unlockUrl')
    expectTypeOf<ConfirmAccountDeletionProps>().toHaveProperty('confirmUrl')
    expectTypeOf<AccountDeletedProps>().toHaveProperty('supportUrl')
    expectTypeOf<{ sk: LocaleMessages }>().toExtend<MessagesOverrides>()
    expectTypeOf<'INVALID_OPTIONS'>().toExtend<MailerErrorCode>()
  })
})

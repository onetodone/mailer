import { describe, expect, expectTypeOf, it } from 'vitest'

import * as mailer from '../src/index'
import type {
  Branding,
  LayoutContext,
  Locale,
  MailerErrorCode,
  MessageKey,
  SafeHtml,
  TemplateProps,
  TemplateRenderContext,
  ThemeInput,
  Translate,
} from '../src/index'

describe('main entry', () => {
  it('exposes the rendering and template API', () => {
    expect(Object.keys(mailer).sort()).toEqual([
      'MailerError',
      'defaultLayout',
      'defineLayout',
      'defineTemplate',
      'html',
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
})

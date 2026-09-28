import { describe, expect, expectTypeOf, it } from 'vitest'

import * as mailer from '../src/index'
import type { Branding, LayoutContext, SafeHtml, ThemeInput } from '../src/index'

describe('main entry', () => {
  it('exposes the rendering API', () => {
    expect(Object.keys(mailer).sort()).toEqual([
      'MailerError',
      'defaultLayout',
      'defineLayout',
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
})

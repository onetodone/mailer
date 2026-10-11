import { describe, expect, it } from 'vitest'

import { textDirection } from '../../src/core/direction'

describe('textDirection', () => {
  it.each(['ar', 'ar-EG', 'he', 'fa', 'ur', 'yi', 'ckb', 'ps', 'dv', 'sd', 'ug', 'pa-PK', 'az-Arab'])(
    'is rtl for %s',
    (locale) => {
      expect(textDirection(locale)).toBe('rtl')
    },
  )

  it.each(['en', 'be', 'be-Latn', 'uk', 'ja', 'zh', 'th', 'ka', 'pa', 'az', 'ar-Latn', 'sr'])(
    'is ltr for %s',
    (locale) => {
      expect(textDirection(locale)).toBe('ltr')
    },
  )

  it('is ltr for a tag Intl cannot parse', () => {
    expect(textDirection('not a locale')).toBe('ltr')
  })
})

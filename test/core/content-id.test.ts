import { describe, expect, it } from 'vitest'

import { contentIdReferences, isContentId } from '../../src/core/content-id'

describe('isContentId', () => {
  it.each(['logo', 'qr-code@myapp.loc', 'image001.png@01DA1B2C.3D4E5F60', 'chart_2026'])('accepts %j', (value) => {
    expect(isContentId(value)).toBe(true)
  })

  it.each(['', 'a b', '<logo>', 'logo"', 'logo%40x', 'лого', 'logo\r\n'])('rejects %j', (value) => {
    expect(isContentId(value)).toBe(false)
  })
})

describe('contentIdReferences', () => {
  it('finds references in attributes and CSS', () => {
    const markup = [
      '<img src="cid:logo" alt="">',
      "<img src='cid:qr@myapp.loc'>",
      '<img src=cid:bare>',
      '<td background="cid:bg">',
      '<v:fill type="frame" src="cid:vml" />',
      '<td style="background-image:url(cid:css)">',
      '<div style="background:url(\'cid:quoted\')">',
      '<div style="background:url(&quot;cid:entity&quot;)">',
      '<div style="background:url(&#39;cid:apostrophe&#39;)">',
      '<IMG SRC="CID:upper">',
    ].join('\n')

    expect(contentIdReferences(markup)).toEqual([
      'logo',
      'qr@myapp.loc',
      'bare',
      'bg',
      'vml',
      'css',
      'quoted',
      'entity',
      'apostrophe',
      'upper',
    ])
  })

  it('lists each reference once, in order', () => {
    expect(contentIdReferences('<img src="cid:b"><img src="cid:a"><img src="cid:b">')).toEqual(['b', 'a'])
  })

  it('decodes URL escapes', () => {
    expect(contentIdReferences('<img src="cid:logo%40myapp.loc">')).toEqual(['logo@myapp.loc'])
    expect(contentIdReferences('<img src="cid:bad%E0%A4%A">')).toEqual(['bad%E0%A4%A'])
  })

  it('reports an empty reference', () => {
    expect(contentIdReferences('<img src="cid:">')).toEqual([''])
  })

  it('ignores cid: in link query strings and body text', () => {
    const markup = [
      '<a href="https://myapp.loc/?ref=cid:1&amp;next=cid:2">Open</a>',
      '<p>Inline images use cid:logo references.</p>',
      '<img src="https://myapp.loc/cid:logo.png">',
    ].join('\n')

    expect(contentIdReferences(markup)).toEqual([])
  })
})

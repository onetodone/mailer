import { describe, expect, it } from 'vitest'

import { packageName } from '../src/index'

describe('main entry', () => {
  it('exposes the package name', () => {
    expect(packageName).toBe('@onetodone/mailer')
  })
})

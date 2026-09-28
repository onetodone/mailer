import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { defineTemplate, type Template, type TemplateProps } from '../../src/templates/define'
import type { StandardSchemaV1 } from '../../src/templates/standard-schema'

describe('defineTemplate', () => {
  it('returns the template unchanged', () => {
    const template = { name: 'plain', schema: z.object({}), render: () => ({ subject: 'Plain', body: [] }) }
    expect(defineTemplate(template)).toBe(template)
  })

  it('infers the name and the props from the schema', () => {
    const orderShipped = defineTemplate({
      name: 'orderShipped',
      schema: z.object({ orderId: z.string(), items: z.number().default(1) }),
      render: ({ props, ui }) => {
        expectTypeOf(props).toEqualTypeOf<{ orderId: string; items: number }>()
        return { subject: `Order #${props.orderId} shipped`, body: [ui.paragraph(String(props.items))] }
      },
    })
    expectTypeOf(orderShipped.name).toEqualTypeOf<'orderShipped'>()
    expectTypeOf<TemplateProps<typeof orderShipped>>().toEqualTypeOf<{
      orderId: string
      items?: number | undefined
    }>()
    expectTypeOf(orderShipped).toExtend<Template>()
  })

  it('accepts any Standard Schema implementation', () => {
    const schema: StandardSchemaV1<{ id: string }> = {
      '~standard': {
        version: 1,
        vendor: 'handwritten',
        validate: (value) => Promise.resolve({ value: value as { id: string } }),
      },
    }
    const template = defineTemplate({
      name: 'custom',
      schema,
      render: ({ props }) => ({ subject: props.id, body: [] }),
    })
    expectTypeOf<TemplateProps<typeof template>>().toEqualTypeOf<{ id: string }>()
    expect(template.schema).toBe(schema)
  })
})

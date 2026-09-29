# Testing

Use `memoryTransport` in your tests. It records every email in `sent`, and `clear()` empties it:

```ts
import { beforeEach, expect, it } from 'vitest'
import { createMailer, memoryTransport } from '@onetodone/mailer'

const transport = memoryTransport()
const mailer = createMailer({ transport, from, branding })

beforeEach(() => {
  transport.clear()
})

it('sends a verification link after sign-up', async () => {
  await signUp(mailer, { email: 'lizzie@example.com' })

  expect(transport.sent).toHaveLength(1)
  const email = transport.sent[0]
  expect(email?.to).toBe('lizzie@example.com')
  expect(email?.subject).toBe('Confirm your email')
  expect(email?.text).toContain('https://example.com/verify?token=')
})
```

Each entry in `sent` is the message the transport received: the addresses as passed, `subject`, `html`, `text`, `headers` and `attachments`, with `contentType` filled in. Hand the mailer to your code the way you pass other dependencies, so tests can use one built on `memoryTransport`.

To check what an email says without sending it, use `render`:

```ts
const { subject, text } = await mailer.render('resetPassword', {
  props: { resetUrl: 'https://example.com/reset?token=abc123' },
})

expect(subject).toBe('Reset your password')
expect(text).toContain('https://example.com/reset?token=abc123')
```

The copyright line in the footer shows the current year. Before snapshotting a whole email, pin the clock, for example with `vi.setSystemTime`.

// Smoke test of the installed package outside Node: CI installs the tarball in an empty project and
// runs this file with Bun and Deno. It covers the main entry and the Resend transport, which must
// work wherever `fetch` and the web platform globals are available.
import { createMailer, MailerError, memoryTransport } from '@onetodone/mailer'
import { resendTransport, type ResendTransportOptions } from '@onetodone/mailer/resend'

function check(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Smoke test failed: ${message}`)
}

const from = 'Example Organization <no-reply@organization.example>'
const to = 'lizzie@example.com'
const branding = {
  companyName: 'Example Organization',
  appUrl: 'https://organization.example',
  supportEmail: 'help@organization.example',
}
const verifyUrl = 'https://organization.example/verify?token=abc123'

// Rendering, with locale-aware dates and a right-to-left locale.
const transport = memoryTransport()
const mailer = createMailer({
  transport,
  from,
  branding,
  messages: { ar: { otpCode: { subject: 'رمز التحقق' } } },
})

const english = await mailer.render('verifyEmail', { props: { userName: 'Lizzie', verifyUrl, expiresInMinutes: 60 } })
check(english.subject.length > 0, 'verifyEmail has a subject')
check(english.html.includes(verifyUrl), 'verifyEmail HTML links the URL')
check(english.text.includes(verifyUrl), 'verifyEmail text contains the URL')

const german = await mailer.render('passwordChanged', {
  locale: 'de',
  props: { changedAt: new Date(Date.UTC(2026, 0, 15, 12, 0)), timeZone: 'Europe/Berlin' },
})
check(german.text.includes('13:00'), 'passwordChanged formats the time in the time zone')

const arabic = await mailer.render('otpCode', { locale: 'ar', props: { code: '123456' } })
check(arabic.html.includes('dir="rtl"'), 'Arabic renders right to left')

// Sending, with text and binary attachments.
const sent = await mailer.send('verifyEmail', {
  to,
  props: { verifyUrl },
  attachments: [
    { filename: 'notes.txt', content: 'Grüße' },
    { filename: 'data.bin', content: new Uint8Array([1, 2, 3]) },
  ],
})
check(/^[0-9a-f-]{36}$/.test(sent.messageId), 'memoryTransport returns a UUID')
check(transport.sent.length === 1, 'memoryTransport records the email')

// A failing hook is reported, not thrown.
const hooked = createMailer({
  transport,
  from,
  branding,
  onSent: () => {
    throw new Error('Expected failure of the smoke-test hook')
  },
})
await hooked.send('verifyEmail', { to, props: { verifyUrl } })

// The Resend transport, with a mocked fetch.
type Fetch = NonNullable<ResendTransportOptions['fetch']>
const requests: { url: string; body: string }[] = []
function respond(status: number, body: unknown): Fetch {
  return (url, init) => {
    requests.push({ url, body: init.body })
    return Promise.resolve({ ok: status < 300, status, text: () => Promise.resolve(JSON.stringify(body)) })
  }
}

const resendMailer = createMailer({
  transport: resendTransport({ apiKey: 're_test', fetch: respond(200, { id: 'email-1' }) }),
  from,
  branding,
})
const delivered = await resendMailer.send('verifyEmail', {
  to,
  props: { verifyUrl },
  attachments: [{ filename: 'notes.txt', content: 'Grüße' }],
})
check(delivered.messageId === 'email-1', 'Resend returns the email ID')
const request = JSON.parse(requests[0]?.body ?? '{}') as { attachments?: { content: string }[] }
check(request.attachments?.[0]?.content === 'R3LDvMOfZQ==', 'Resend encodes attachments as base64')

const limited = createMailer({
  transport: resendTransport({ apiKey: 're_test', fetch: respond(429, { name: 'rate_limit_exceeded' }) }),
  from,
  branding,
})
const error: unknown = await limited
  .send('verifyEmail', { to, props: { verifyUrl } })
  .catch((rejection: unknown) => rejection)
check(error instanceof MailerError, 'Resend failures are MailerError instances')
check(error.retryable === true && error.status === 429, 'a rate limit is retryable with status 429')

console.log('Runtime smoke test passed.')

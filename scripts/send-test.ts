import { randomUUID } from 'node:crypto'

import { MailerError, type MailTransport } from '@onetodone/mailer'
import { mailgunTransport } from '@onetodone/mailer/mailgun'
import { postmarkTransport } from '@onetodone/mailer/postmark'
import { resendTransport } from '@onetodone/mailer/resend'
import { smtpTransport } from '@onetodone/mailer/smtp'

import { createSampleMailer, env, from, locales, samples } from './samples.ts'

const transports = ['smtp', 'resend', 'postmark', 'mailgun'] as const
type TransportName = (typeof transports)[number]
const transportNames = { smtp: 'SMTP', resend: 'Resend', postmark: 'Postmark', mailgun: 'Mailgun' }

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function required(name: string, transport: TransportName): string {
  return env(name) ?? fail(`${name} is required when MAIL_TRANSPORT is "${transport}".`)
}

const user = env('SMTP_USER')
const resendApiKey = env('RESEND_API_KEY')
const isTransportName = (value: string): value is TransportName => (transports as readonly string[]).includes(value)
const transportSetting = env('MAIL_TRANSPORT')
if (transportSetting !== undefined && !isTransportName(transportSetting)) {
  fail(`MAIL_TRANSPORT must be one of ${transports.join(', ')}, received "${transportSetting}".`)
}
const transportName = transportSetting ?? (resendApiKey === undefined ? 'smtp' : 'resend')

const mailFrom = env('MAIL_FROM')
if ((transportName !== 'smtp' || user !== undefined) && mailFrom === undefined) {
  const reason = transportName === 'smtp' ? 'SMTP_USER is set' : `sending through ${transportNames[transportName]}`
  fail(
    `MAIL_FROM is required when ${reason}: ` +
      'real providers only accept a From address on the authenticated account or its domain.',
  )
}

const secureSetting = env('SMTP_SECURE')
if (secureSetting !== undefined && secureSetting !== 'true' && secureSetting !== 'false') {
  fail(`SMTP_SECURE must be "true" or "false", received "${secureSetting}".`)
}

const host = env('SMTP_HOST') ?? 'localhost'
const port = Number(env('SMTP_PORT') ?? 1025)
// nodemailer never infers TLS from the port, and port 465 only speaks TLS from the first byte.
const secure = secureSetting === undefined ? port === 465 : secureSetting === 'true'
const to = (env('MAIL_TO') ?? 'Lizzie <lizzie@example.com>')
  .split(',')
  .map((address) => address.trim())
  .filter((address) => address !== '')

const sampleSetting = env('SAMPLES')
const slugs = sampleSetting
  ?.split(',')
  .map((slug) => slug.trim())
  .filter((slug) => slug !== '')
const unknownSlugs = slugs?.filter((slug) => !samples.some((sample) => sample.slug === slug)) ?? []
if (slugs?.length === 0 || unknownSlugs.length > 0) {
  fail(
    `SAMPLES must list sample names (${samples.map((sample) => sample.slug).join(', ')}), received "${sampleSetting ?? ''}".`,
  )
}
const selected = slugs === undefined ? samples : samples.filter((sample) => slugs.includes(sample.slug))

function createTransport(name: TransportName): MailTransport {
  switch (name) {
    case 'smtp':
      return smtpTransport({
        host,
        port,
        secure,
        auth: user === undefined ? undefined : { user, pass: env('SMTP_PASS') ?? '' },
      })
    case 'resend':
      return resendTransport({ apiKey: required('RESEND_API_KEY', name) })
    case 'postmark':
      return postmarkTransport({
        serverToken: required('POSTMARK_SERVER_TOKEN', name),
        messageStream: env('POSTMARK_MESSAGE_STREAM'),
      })
    case 'mailgun':
      return mailgunTransport({
        apiKey: required('MAILGUN_API_KEY', name),
        domain: required('MAILGUN_DOMAIN', name),
        region: env('MAILGUN_REGION') as 'us' | 'eu' | undefined,
      })
  }
}

const mailer = createSampleMailer(createTransport(transportName), mailFrom ?? from)

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let sent = 0
try {
  for (const sample of selected) {
    for (const locale of locales) {
      const send = () =>
        mailer.send(sample.template, {
          to,
          locale,
          props: sample.props,
          attachments: sample.attachments,
          // A unique X-Entity-Ref-ID keeps Gmail from threading emails that share a subject.
          headers: { 'X-Entity-Ref-ID': randomUUID() },
        })
      let result
      try {
        result = await send()
      } catch (error) {
        // Provider APIs limit the request rate, so wait once and try again.
        if (!(error instanceof MailerError && error.status === 429)) throw error
        await sleep(1000)
        result = await send()
      }
      sent += 1
      console.log(`${sample.slug}.${locale} → ${result.messageId}`)
    }
  }
} finally {
  await mailer.close()
}

console.log(
  `Sent ${String(sent)} emails through ${transportName === 'smtp' ? `${host}:${String(port)}` : transportNames[transportName]}`,
)

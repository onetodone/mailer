import { randomUUID } from 'node:crypto'

import { MailerError } from '@onetodone/mailer'
import { resendTransport } from '@onetodone/mailer/resend'
import { smtpTransport } from '@onetodone/mailer/smtp'

import { createSampleMailer, env, from, locales, samples } from './samples.ts'

const user = env('SMTP_USER')
const resendApiKey = env('RESEND_API_KEY')
const mailFrom = env('MAIL_FROM')
if ((user !== undefined || resendApiKey !== undefined) && mailFrom === undefined) {
  console.error(
    `MAIL_FROM is required when ${resendApiKey === undefined ? 'SMTP_USER' : 'RESEND_API_KEY'} is set: ` +
      'real providers only accept a From address on the authenticated account or its domain.',
  )
  process.exit(1)
}

const secureSetting = env('SMTP_SECURE')
if (secureSetting !== undefined && secureSetting !== 'true' && secureSetting !== 'false') {
  console.error(`SMTP_SECURE must be "true" or "false", received "${secureSetting}".`)
  process.exit(1)
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
  console.error(
    `SAMPLES must list sample names (${samples.map((sample) => sample.slug).join(', ')}), received "${sampleSetting ?? ''}".`,
  )
  process.exit(1)
}
const selected = slugs === undefined ? samples : samples.filter((sample) => slugs.includes(sample.slug))

const mailer = createSampleMailer(
  resendApiKey === undefined
    ? smtpTransport({
        host,
        port,
        secure,
        auth: user === undefined ? undefined : { user, pass: env('SMTP_PASS') ?? '' },
      })
    : resendTransport({ apiKey: resendApiKey }),
  mailFrom ?? from,
)

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

console.log(`Sent ${String(sent)} emails through ${resendApiKey === undefined ? `${host}:${String(port)}` : 'Resend'}`)

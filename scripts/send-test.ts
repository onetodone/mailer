import { randomUUID } from 'node:crypto'

import { createMailer } from '@onetodone/mailer'
import { smtpTransport } from '@onetodone/mailer/smtp'

import { branding, env, from, locales, samples } from './samples.ts'

const user = env('SMTP_USER')
const mailFrom = env('MAIL_FROM')
if (user !== undefined && mailFrom === undefined) {
  console.error(
    'MAIL_FROM is required when SMTP_USER is set: real SMTP providers only accept a From address ' +
      'on the authenticated account or its domain.',
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

const mailer = createMailer({
  transport: smtpTransport({
    host,
    port,
    secure,
    auth: user === undefined ? undefined : { user, pass: env('SMTP_PASS') ?? '' },
  }),
  from: mailFrom ?? from,
  branding,
})

let sent = 0
try {
  for (const sample of samples) {
    for (const locale of locales) {
      const result = await mailer.send(sample.template, {
        to,
        locale,
        props: sample.props,
        // A unique X-Entity-Ref-ID keeps Gmail from threading emails that share a subject.
        headers: { 'X-Entity-Ref-ID': randomUUID() },
      })
      sent += 1
      console.log(`${sample.slug}.${locale} → ${result.messageId}`)
    }
  }
} finally {
  await mailer.close()
}

console.log(`Sent ${String(sent)} emails through ${host}:${String(port)}`)

# Recipes

Ready-made wiring for auth libraries, frameworks and job queues. Every recipe imports one shared mailer module, like the one from the [quick start](../README.md#quick-start):

```ts
// mailer.ts
import { createMailer } from '@onetodone/mailer'
import { smtpTransport } from '@onetodone/mailer/smtp'

export const mailer = createMailer({
  transport: smtpTransport({
    host: 'smtp.example.com',
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  }),
  from: 'My App <no-reply@example.com>',
  branding: {
    companyName: 'My App',
    appUrl: 'https://example.com',
    supportEmail: 'support@example.com',
  },
})
```

## Better Auth

[Better Auth](https://www.better-auth.com) builds every link and code, then hands it to a callback. Each callback maps to a built-in template:

| Better Auth callback                            | Template                                          |
| ----------------------------------------------- | ------------------------------------------------- |
| `emailVerification.sendVerificationEmail`       | `verifyEmail`, or `verifyEmailChange` (see below) |
| `emailAndPassword.sendResetPassword`            | `resetPassword`                                   |
| `emailAndPassword.onPasswordReset`              | `passwordChanged`                                 |
| `user.deleteUser.sendDeleteAccountVerification` | `confirmAccountDeletion`                          |
| `user.deleteUser.afterDelete`                   | `accountDeleted`                                  |
| `sendMagicLink` of the `magicLink` plugin       | `magicLink`                                       |
| `sendVerificationOTP` of the `emailOTP` plugin  | `otpCode`                                         |

```ts
// auth.ts
import { betterAuth } from 'better-auth'
import { emailOTP, magicLink } from 'better-auth/plugins'
import { mailer } from './mailer'

// Better Auth takes lifetimes in seconds, the templates in minutes.
const verifyEmailExpiresIn = 60 * 60 * 24
const resetPasswordExpiresIn = 60 * 60
const deleteAccountExpiresIn = 60 * 60
const magicLinkExpiresIn = 60 * 10
const otpExpiresIn = 60 * 5

export const auth = betterAuth({
  emailVerification: {
    expiresIn: verifyEmailExpiresIn,
    sendVerificationEmail: async ({ user, url }) => {
      // For an email change, the user is already verified and `user.email` is the new address.
      await mailer.send(user.emailVerified ? 'verifyEmailChange' : 'verifyEmail', {
        to: user.email,
        props: { userName: user.name, verifyUrl: url, expiresInMinutes: verifyEmailExpiresIn / 60 },
      })
    },
  },
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: resetPasswordExpiresIn,
    sendResetPassword: async ({ user, url }) => {
      await mailer.send('resetPassword', {
        to: user.email,
        props: { userName: user.name, resetUrl: url, expiresInMinutes: resetPasswordExpiresIn / 60 },
      })
    },
    onPasswordReset: async ({ user }) => {
      await mailer.send('passwordChanged', {
        to: user.email,
        props: { userName: user.name, changedAt: new Date() },
      })
    },
  },
  user: {
    changeEmail: { enabled: true },
    deleteUser: {
      enabled: true,
      deleteTokenExpiresIn: deleteAccountExpiresIn,
      sendDeleteAccountVerification: async ({ user, url }) => {
        await mailer.send('confirmAccountDeletion', {
          to: user.email,
          props: { userName: user.name, confirmUrl: url, expiresInMinutes: deleteAccountExpiresIn / 60 },
        })
      },
      afterDelete: async (user) => {
        await mailer.send('accountDeleted', { to: user.email, props: { userName: user.name } })
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: magicLinkExpiresIn,
      sendMagicLink: async ({ email, url }) => {
        await mailer.send('magicLink', {
          to: email,
          props: { signInUrl: url, expiresInMinutes: magicLinkExpiresIn / 60 },
        })
      },
    }),
    emailOTP({
      expiresIn: otpExpiresIn,
      sendVerificationOTP: async ({ email, otp }) => {
        await mailer.send('otpCode', { to: email, props: { code: otp, expiresInMinutes: otpExpiresIn / 60 } })
      },
    }),
  ],
})
```

- Better Auth sends the link for a new email address through `sendVerificationEmail` as well. At that point the user's current address is verified, so `user.emailVerified` tells the two cases apart.
- With `user.changeEmail.sendChangeEmailConfirmation`, Better Auth first asks the current address to approve the change. No built-in template has that wording; [add your own](customization.md#4-templates) for it.
- Add a database adapter and any other Better Auth settings as usual. They do not affect the email callbacks.

## Auth.js

[Auth.js](https://authjs.dev) (NextAuth.js 5) signs users in by email through a provider of type `email`. Its `sendVerificationRequest` maps to `magicLink`:

```ts
import NextAuth from 'next-auth'
import { mailer } from './mailer'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: 'email',
      type: 'email',
      name: 'Email',
      maxAge: 60 * 15,
      sendVerificationRequest: async ({ identifier, url, expires }) => {
        await mailer.send('magicLink', {
          to: identifier,
          props: { signInUrl: url, expiresInMinutes: Math.ceil((expires.getTime() - Date.now()) / 60_000) },
        })
      },
    },
  ],
})
```

Sign-in by email needs a database adapter in the Auth.js config.

## Express

Send from a route handler and close the mailer on shutdown. Express 5 passes a rejected promise from an `async` handler to its error handler:

```ts
// server.ts
import express from 'express'
import { mailer } from './mailer'

const app = express()
app.use(express.json())

app.post('/password-reset', async (req, res) => {
  const { email } = req.body as { email: string }
  const user = await users.findByEmail(email)
  if (user !== undefined) {
    const token = await createToken(user.id)
    await mailer.send('resetPassword', {
      to: user.email,
      props: { userName: user.name, resetUrl: `https://example.com/reset?token=${token}`, expiresInMinutes: 60 },
    })
  }
  // The same answer whether the account exists or not.
  res.status(204).end()
})

const server = app.listen(3000)

process.on('SIGTERM', () => {
  server.close(() => void mailer.close())
})
```

## Fastify

The same route in Fastify. The `onClose` hook closes the mailer when the server stops:

```ts
import Fastify from 'fastify'
import { mailer } from './mailer'

const app = Fastify()

app.addHook('onClose', async () => {
  await mailer.close()
})

app.post<{ Body: { email: string } }>('/password-reset', async (request, reply) => {
  const user = await users.findByEmail(request.body.email)
  if (user !== undefined) {
    const token = await createToken(user.id)
    await mailer.send('resetPassword', {
      to: user.email,
      props: { userName: user.name, resetUrl: `https://example.com/reset?token=${token}`, expiresInMinutes: 60 },
    })
  }
  return reply.code(204).send()
})

await app.listen({ port: 3000 })
```

## Next.js

Send from a route handler or a server action. SMTP needs the Node.js runtime, which is the default; do not switch these routes to the Edge runtime:

```ts
import { mailer } from './mailer'

export async function POST(request: Request) {
  const { email } = (await request.json()) as { email: string }
  const user = await users.findByEmail(email)
  if (user !== undefined) {
    const token = await createToken(user.id)
    await mailer.send('resetPassword', {
      to: user.email,
      props: { userName: user.name, resetUrl: `https://example.com/reset?token=${token}`, expiresInMinutes: 60 },
    })
  }
  return new Response(null, { status: 204 })
}
```

In development, Next.js reloads modules on every change. Keep one mailer across reloads, so SMTP connections are not opened again each time:

```ts
import { createMailer, type Mailer } from '@onetodone/mailer'

const globalForMailer = globalThis as typeof globalThis & { mailer?: Mailer }

export const mailer = (globalForMailer.mailer ??= createMailer({ transport, from, branding }))
```

## NestJS

Provide the mailer from a global module and close it on shutdown:

```ts
// mailer.module.ts
import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common'
import { createMailer, type Mailer } from '@onetodone/mailer'

export const MAILER = Symbol('MAILER')

@Injectable()
class MailerShutdown implements OnApplicationShutdown {
  constructor(@Inject(MAILER) private readonly mailer: Mailer) {}

  async onApplicationShutdown() {
    await this.mailer.close()
  }
}

@Global()
@Module({
  providers: [{ provide: MAILER, useFactory: () => createMailer({ transport, from, branding }) }, MailerShutdown],
  exports: [MAILER],
})
export class MailerModule {}
```

Import `MailerModule` once in your root module, call `app.enableShutdownHooks()` in `main.ts`, and inject the mailer where you need it:

```ts
// accounts.service.ts
import { Inject, Injectable } from '@nestjs/common'
import type { Mailer } from '@onetodone/mailer'
import { MAILER } from './mailer.module'

@Injectable()
export class AccountsService {
  constructor(@Inject(MAILER) private readonly mailer: Mailer) {}

  async sendPasswordReset(email: string, resetUrl: string) {
    await this.mailer.send('resetPassword', { to: email, props: { resetUrl, expiresInMinutes: 60 } })
  }
}
```

## Background jobs

Queues and retries are up to your application. With [BullMQ](https://docs.bullmq.io), retry only the errors that another attempt can fix:

```ts
// email-queue.ts
import { MailerError } from '@onetodone/mailer'
import { Queue, UnrecoverableError, Worker } from 'bullmq'
import { mailer } from './mailer'

interface PasswordResetJob {
  to: string
  resetUrl: string
}

const connection = { host: 'localhost', port: 6379 }

export const passwordResetQueue = new Queue<PasswordResetJob>('password-reset', {
  connection,
  defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 30_000 }, removeOnComplete: true },
})

export const passwordResetWorker = new Worker<PasswordResetJob>(
  'password-reset',
  async (job) => {
    try {
      await mailer.send('resetPassword', { to: job.data.to, props: { resetUrl: job.data.resetUrl } })
    } catch (error) {
      if (error instanceof MailerError && error.code !== 'TRANSPORT_FAILED') {
        // Invalid props or options fail the same way on every attempt.
        throw new UnrecoverableError(error.message)
      }
      throw error
    }
  },
  { connection },
)
```

- Job data is stored in Redis and carries the reset link with its token. Keep Redis private, and remove jobs once they are done (`removeOnComplete`).
- `onError` [hooks](hooks.md) still run for every failed attempt, so failures reach your logs and metrics.

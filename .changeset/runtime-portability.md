---
'@onetodone/mailer': patch
---

Run the main entry and the Resend transport on Bun, Deno and edge runtimes such as Cloudflare Workers.

- The main entry and `@onetodone/mailer/resend` import no Node.js built-in modules, so they load without Node.js compatibility flags. `@onetodone/mailer/smtp` still needs Node.js.
- A failing `onSent` or `onError` hook is reported with `process.emitWarning` as a `MailerWarning` where `process.emitWarning` exists, and with `console.warn` elsewhere.

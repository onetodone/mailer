---
'@onetodone/mailer': patch
---

Add mail transports.

- `MailTransport` interface for delivering rendered emails through any provider, with the `OutgoingMessage`, `SendResult`, `MailAddress` and `MailAddresses` types. Addresses can be strings (`user@example.com`, `My App <no-reply@myapp.loc>`) or `{ name, address }` objects, one or a list, with `cc`, `bcc`, `replyTo` and custom `headers`.
- `memoryTransport()` records emails in `sent` instead of sending them, with `clear()` to reset between tests.
- `consoleTransport()` prints the addresses, subject and plain-text version of each email, for local development. Pass `log` to send the output somewhere else.
- `smtpTransport()` from `@onetodone/mailer/smtp` sends over SMTP with nodemailer (optional peer dependency, `>=6`). It accepts connection settings (host, port, TLS, credentials, pooling, timeouts), which are validated when the transport is created, or an existing `nodemailer.createTransport()` transporter for setups such as DKIM or OAuth2. `close()` releases pooled connections. The main entry does not load nodemailer.
- `MailerError` code `TRANSPORT_FAILED`: SMTP failures reject with it, and `cause` holds nodemailer's error.

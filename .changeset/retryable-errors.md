---
'@onetodone/mailer': patch
---

Tell retryable delivery failures from rejected emails through `MailerError.retryable` and `MailerError.status`.

- `retryable` is `true` when the same email may be delivered on a later attempt, `false` when another attempt fails the same way, and `undefined` when unknown.
- `status` holds the SMTP reply code or the HTTP status of the provider's API when the provider answered.
- `smtpTransport` sets them on `TRANSPORT_FAILED`: a 4xx reply, a lost connection or a timeout is retryable, a 5xx reply is not.
- Your own transport can set them by throwing `new MailerError('TRANSPORT_FAILED', message, { cause, retryable, status })`; the `MailerErrorOptions` type describes the options.
- The meaning of `TRANSPORT_FAILED` is unchanged, and errors your transport throws without these fields keep them `undefined`.

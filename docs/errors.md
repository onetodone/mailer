# Errors

The package throws `MailerError`, which has a `code` to branch on:

| Code               | Thrown when                                                                                                                                                          | `cause`                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `INVALID_CONFIG`   | `createMailer` or `smtpTransport` gets invalid settings.                                                                                                             | The validation error         |
| `INVALID_OPTIONS`  | `send` or `render` gets an invalid address, header, attachment, locale or option, or the HTML references a `cid:` without an attachment.                             | The validation error, if any |
| `INVALID_PROPS`    | Template props fail the template's schema.                                                                                                                           | The schema's issues          |
| `UNKNOWN_TEMPLATE` | No template is registered under the requested name.                                                                                                                  |                              |
| `TRANSPORT_FAILED` | The transport could not deliver the email.                                                                                                                           | The transport's error        |
| `UNSAFE_URL`       | `safeUrl`, `ui.button`, `ui.linkFallback` or `ui.image` gets a link that is not an absolute `http:` or `https:` URL, or `ui.image` gets an invalid `cid:` reference. |                              |

- Messages name the setting or prop and the problem. They never include link values, because links usually carry tokens.
- Errors thrown by your own template or layout code pass through unchanged, as does a `MailerError` thrown by your own transport.
- Retries are up to your application, for example through a job queue:

```ts
import { MailerError } from '@onetodone/mailer'

try {
  await mailer.send('verifyEmail', { to: user.email, props: { verifyUrl } })
} catch (error) {
  if (error instanceof MailerError && error.code === 'TRANSPORT_FAILED') {
    await queue.retryLater('verifyEmail', user.id)
  } else {
    throw error
  }
}
```

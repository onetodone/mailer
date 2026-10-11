# Errors

The package throws `MailerError`, which has a `code` to branch on:

| Code               | Thrown when                                                                                                                                                          | `cause`                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `INVALID_CONFIG`   | `createMailer` or `smtpTransport` gets invalid settings.                                                                                                             | The validation error         |
| `INVALID_OPTIONS`  | `send` or `render` gets an invalid address, header, attachment, locale or option, or the HTML references a `cid:` without an attachment.                             | The validation error, if any |
| `INVALID_PROPS`    | Template props fail the template's schema.                                                                                                                           | The schema's issues          |
| `UNKNOWN_TEMPLATE` | No template is registered under the requested name.                                                                                                                  |                              |
| `TRANSPORT_FAILED` | The transport could not deliver the email. See [retries](#retries).                                                                                                  | The transport's error        |
| `UNSAFE_URL`       | `safeUrl`, `ui.button`, `ui.linkFallback` or `ui.image` gets a link that is not an absolute `http:` or `https:` URL, or `ui.image` gets an invalid `cid:` reference. |                              |

- Messages name the setting or prop and the problem. They never include link values, because links usually carry tokens.
- Errors thrown by your own template or layout code pass through unchanged, as does a `MailerError` thrown by your own transport.
- `error instanceof MailerError` holds for errors from both the ESM and the CommonJS build of the package, even when an app loads both.
- `MailerErrorCode` may gain codes in a minor release, so give a `switch` over `error.code` a `default` branch. Existing codes keep their meaning.

## Retries

Retries are up to your application, for example through a job queue. A `TRANSPORT_FAILED` error from a built-in transport says whether another attempt can help:

- `retryable` is `true` when the same email may be delivered later: a rate limit or quota, a server error, a temporary SMTP rejection (4xx reply), or a lost connection or timeout.
- `retryable` is `false` when the provider rejected the email, its sender or the credentials, such as an SMTP 5xx reply or an HTTP 4xx answer from the Resend API. Another attempt fails the same way.
- `retryable` is `undefined` when the transport cannot tell, as for errors your own transport throws without it.
- `status` holds the SMTP reply code, such as `550`, or the HTTP status of the provider's API, such as `429`, when the provider answered.

```ts
import { MailerError } from '@onetodone/mailer'

try {
  await mailer.send('verifyEmail', { to: user.email, props: { verifyUrl } })
} catch (error) {
  if (error instanceof MailerError && error.code === 'TRANSPORT_FAILED' && error.retryable !== false) {
    await queue.retryLater('verifyEmail', user.id)
  } else {
    throw error
  }
}
```

Your own transport can set both fields by throwing a `MailerError`, which the mailer passes through unchanged:

```ts
import { MailerError } from '@onetodone/mailer'

const response = await fetch('https://mail-api.example.com/v1/send', { method: 'POST' })
if (!response.ok) {
  throw new MailerError('TRANSPORT_FAILED', `Mail API responded with ${response.status}`, {
    retryable: response.status === 429 || response.status >= 500,
    status: response.status,
  })
}
```

The [BullMQ recipe](recipes.md#background-jobs) shows the same check in a job queue.

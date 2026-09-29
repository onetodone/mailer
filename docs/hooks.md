# Hooks

`onSent` and `onError` let you log or count emails:

```ts
const mailer = createMailer({
  transport,
  from,
  branding,
  onSent: ({ template, to, result, durationMs }) => {
    logger.info({ template, to, messageId: result.messageId, durationMs }, 'Email sent')
  },
  onError: ({ template, to, error }) => {
    logger.error({ template, to, err: error }, 'Email failed')
  },
})
```

- `send` waits for the hooks, so async hooks finish before it settles.
- A hook never changes the outcome of `send`. When `onSent` fails, `send` still resolves. When `onError` fails, `send` still rejects with the original error.
- A failing hook is reported with `process.emitWarning` as a `MailerWarning`:

  ```ts
  process.on('warning', (warning) => {
    if (warning.name === 'MailerWarning') logger.warn(warning)
  })
  ```

- Events carry `template`, `locale`, `from`, `to`, `cc`, `bcc`, `replyTo`, `headers`, `attachments` and `durationMs`, the time from the `send` call to its outcome.
- `attachments` lists the `filename`, `contentType` and `size` in bytes of each file, never its content. It is left out when the options fail validation.
- `onSent` also gets `subject` and the transport's `result`.
- `onError` gets `subject` (or `undefined` when sending failed before rendering) and the `error`. It fires for invalid options and props too.
- Events never contain the HTML, the plain text, the props or attachment content. Links in emails usually carry tokens, so this keeps events safe to log as they are.
- Hooks run for `send` only, not for `render`.

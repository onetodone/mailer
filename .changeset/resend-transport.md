---
'@onetodone/mailer': patch
---

Add a Resend transport: `resendTransport` from `@onetodone/mailer/resend`.

- `resendTransport({ apiKey, baseUrl?, fetch? })` sends through the Resend API with the built-in `fetch` and needs no extra package.
- Every field of the email is sent, including cc, bcc, reply-to, headers and attachments. Attachments with a `cid` go out as inline images.
- `send` resolves with the Resend email ID as `messageId`.
- A failed delivery rejects with `TRANSPORT_FAILED`, with the HTTP status in `status` and Resend's error response in `cause`. `retryable` is `true` for a rate limit or quota, a conflict, a server error or a network failure, and `false` for any other 4xx.
- Invalid settings throw `INVALID_CONFIG`; the API key never appears in the message.

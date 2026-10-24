---
'@onetodone/mailer': patch
---

Add a Postmark transport that sends through the Postmark API with no extra dependencies.

- `postmarkTransport({ serverToken, messageStream?, baseUrl?, fetch? })` from `@onetodone/mailer/postmark`, with the `PostmarkTransportOptions` type. It uses the global `fetch` and runs on Node.js, Bun, Deno and edge runtimes.
- `messageStream` defaults to `outbound`, the default transactional stream.
- Attachments with a `cid` go out as inline images. The result's `messageId` is the Postmark message ID.
- Failures reject with `TRANSPORT_FAILED`, with `status` set to the HTTP status and `cause` to Postmark's error response (`ErrorCode` and `Message`). `retryable` is `true` for 429, 5xx and network failures, and `false` for other 4xx answers.

---
'@onetodone/mailer': patch
---

Add a Mailgun transport that sends through the Mailgun API with no extra dependencies.

- `mailgunTransport({ apiKey, domain, region?, baseUrl?, fetch? })` from `@onetodone/mailer/mailgun`, with the `MailgunTransportOptions` type. It uses the global `fetch` and runs on Node.js, Bun, Deno and edge runtimes.
- `region` is `us` (default) or `eu`; `baseUrl` overrides it.
- Attachments with a `cid` go out as inline images. The result's `messageId` is the Message-ID Mailgun assigned.
- Failures reject with `TRANSPORT_FAILED`, with `status` set to the HTTP status and `cause` to Mailgun's error response. `retryable` is `true` for 429, 5xx and network failures, and `false` for other 4xx answers.

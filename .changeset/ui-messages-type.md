---
'@onetodone/mailer': minor
---

Remove the `UiMessages` type from the public exports.

- No exported function or type uses it, so it described nothing users can pass or receive.
- Migration: if you import `UiMessages`, replace it with `{ readonly linkFallback: string }`.

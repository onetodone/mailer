---
'@onetodone/mailer': patch
---

Document the semver policy of the `MailerErrorCode` type: codes can be added in a minor release.

- A `switch` over `error.code` needs a `default` branch. Existing codes keep their meaning.

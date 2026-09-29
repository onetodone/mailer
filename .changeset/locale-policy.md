---
'@onetodone/mailer': patch
---

Document the semver policy of the `Locale` type: built-in locales can be added in any release.

- `Locale` lists the built-in locales and gains values whenever a built-in locale is added, in any release, so code that requires every `Locale` value (such as `Record<Locale, …>`) is not covered by semver.
- If you already use a locale through `messages` and it becomes built-in, your overrides still win; keys you did not override come from the built-in texts instead of English.

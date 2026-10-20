---
'@onetodone/mailer': patch
---

Add built-in texts in Hebrew.

- `Locale` gains `he`. The `locale` setting and the `locale` option of `send` and `render` accept it without `messages`.
- Emails in Hebrew render right to left.
- If you already send in Hebrew through `messages`, your overrides still win, and the keys you leave out come from the built-in texts instead of English.

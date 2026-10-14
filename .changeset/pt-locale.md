---
'@onetodone/mailer': patch
---

Add built-in texts in Portuguese.

- `Locale` gains `pt`. The `locale` setting and the `locale` option of `send` and `render` accept it without `messages`.
- The texts are in Brazilian Portuguese and address the reader as «você».
- If you already send in Portuguese through `messages` under `pt`, your overrides still win, and the keys you leave out come from the built-in texts instead of English. A tag such as `pt-BR` or `pt-PT` in `messages` stays a separate locale and does not use the `pt` texts.

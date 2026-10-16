---
'@onetodone/mailer': patch
---

Load built-in languages on demand, which keeps them out of the main entry.

- English is part of the main entry. Every other built-in language is a separate file that loads the first time `send` or `render` uses it, and stays cached in the mailer.
- `locale: '<code>'` keeps working with no setup, and the `Locale` type is unchanged.
- Bundlers that split code (webpack, Vite, Next.js, esbuild with `splitting`) keep the languages out of the main bundle; bundlers without code splitting still include all of them.

---
'@onetodone/mailer': patch
---

Remove source maps from the published package, which halves its unpacked size. The JavaScript and type declarations are unchanged apart from their `sourceMappingURL` comments. The JavaScript is not minified, so stack traces that point into `dist` stay readable.

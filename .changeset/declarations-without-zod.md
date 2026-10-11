---
'@onetodone/mailer': patch
---

Remove the unused `zod` import from the type declarations.

- Type checking a project that uses the package does not load zod's declarations through it. zod stays a runtime dependency.
- No exported type changes.

---
'@onetodone/mailer': patch
---

Add a NestJS module: `@onetodone/mailer/nestjs` provides the mailer as an injectable service.

- `MailerModule.forRoot(options)` takes every `createMailer` setting; `MailerModule.forRootAsync({ imports, inject, useFactory })` builds them from other providers, such as `ConfigService`. Invalid settings fail at startup with `INVALID_CONFIG`.
- The module is global by default; `isGlobal: false` makes it a regular module.
- `MailerService` has `send`, `render` and `close`, is injected by class, and closes the transport when the application shuts down. `MailerService<typeof templates, 'sk'>` types `send` and `render` for custom templates and added locales.
- Types: `MailerModuleOptions`, `MailerModuleAsyncOptions`.
- `@nestjs/common` 10 or later is an optional peer dependency, needed only for `@onetodone/mailer/nestjs`.

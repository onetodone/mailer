# Versioning and support

## Semantic versioning

The package follows [semantic versioning](https://semver.org):

- From 1.0.0 on, breaking changes come only in major releases, new features in minor releases, and fixes in patch releases.
- While the version is 0.x, a breaking change bumps the minor version and everything else is a patch, so npm's default `^0.3.0` range stays within 0.3.x.

Every release is listed in the [changelog](https://github.com/onetodone/mailer/blob/main/CHANGELOG.md) and in the [GitHub releases](https://github.com/onetodone/mailer/releases). A breaking change comes with a migration note that shows the code to change.

## Public API

The public API is everything exported from `@onetodone/mailer`, `@onetodone/mailer/smtp` and `@onetodone/mailer/resend`: functions, classes, types, options and error codes, with the behavior these docs describe. Files inside the package that these entries do not export, such as the chunks in `dist`, are internal and may change in any release.

Breaking changes include:

- removing or renaming an export, an option, a template or a template prop;
- making an optional option or prop required, or narrowing the values it accepts;
- changing the meaning of an error code;
- dropping a Node.js version or raising the lowest supported nodemailer version.

These changes are not breaking and come in minor or patch releases:

- The rendered emails: markup, styles and built-in texts may change to fix a client issue or a translation, or to improve the layout. Assert on the content that matters to you, such as the subject and the links, rather than on the whole HTML. See [testing](testing.md).
- `Locale` gains values and `Messages` gains keys when built-in locales and templates are added. Code that requires every value, such as `Record<Locale, …>` or a full dictionary typed as `Messages`, is not covered. See [texts and locales](locales.md).
- `MailerErrorCode` may gain codes in a minor release. See [errors](errors.md).

## Node.js and other runtimes

- Supported Node.js versions are the active and maintenance LTS lines. `engines.node` names the oldest one, and CI tests every supported line.
- Support for a Node.js line ends with a breaking release after the line reaches its end of life, never in a patch.
- The main entry and `@onetodone/mailer/resend` also run on Bun, Deno and edge runtimes such as Cloudflare Workers. CI runs a smoke test of the packed package on the latest Bun and Deno 2. `@onetodone/mailer/smtp` needs Node.js.

## TypeScript

- The type declarations need TypeScript 5.4 or later. They compile with `strict`, `exactOptionalPropertyTypes` and `skipLibCheck: false`.
- The minimum TypeScript version is raised only in a minor release, and the changelog says so.
- The declarations do not reference zod or nodemailer types, so the versions of those packages in your project do not affect type checking.

## Dependencies

- nodemailer is an optional peer dependency, needed only for `@onetodone/mailer/smtp`. Versions 6 and later are supported, and CI tests both 6.0.0 and the latest version. Raising the lowest supported version is a breaking change.
- zod is a regular dependency used for validation inside the package. Props schemas for your own templates can use any [Standard Schema](https://standardschema.dev) library.

## Deprecations

- An API that is going away is marked `@deprecated` in its JSDoc, which most editors show as struck-through, and the changelog names its replacement.
- A deprecated API keeps working for at least one minor release and is removed only in the next major release.

## Security fixes

Security fixes go into the latest minor release. See the [security policy](https://github.com/onetodone/mailer/blob/main/SECURITY.md) for how to report a problem.

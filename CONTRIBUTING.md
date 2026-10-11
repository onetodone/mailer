# Contributing

Thanks for helping with `@onetodone/mailer`. Bug reports, fixes, new languages and translation fixes are all welcome. For a larger change, please open an issue first, so we can agree on the approach before you write the code.

## Setup

You need Node.js 22 or later and pnpm. Corepack picks the pnpm version from `package.json`:

```sh
corepack enable
pnpm install
```

## Checks

Run these before you open a pull request. CI runs the same checks:

```sh
pnpm format:fix && pnpm lint:fix && pnpm typecheck && pnpm test && pnpm build
```

- `pnpm check:docs` checks every link and image in `README.md` and `docs/`, and compiles every TypeScript example against the packed package. Run it when you change the public API or the docs.
- `pnpm check:package` checks the package exports with publint and Are the Types Wrong.

## Seeing the emails

- `pnpm preview` renders every sample email in every built-in language to `.preview/`. Open `.preview/index.html` in a browser. `LOCALES=de,fr pnpm preview` limits it to some languages.
- `pnpm send:test` sends every sample over SMTP, by default to a local SMTP catcher such as [Mailpit](https://mailpit.axllent.org) on `localhost:1025`. `.env.example` lists the settings for real inboxes.
- `pnpm screenshots` regenerates the images in `docs/images/`. Run it when a change alters how a pictured email looks. It needs Chromium (`pnpm exec playwright install chromium`) and the Roboto and Noto fonts.

## Changesets

Every change that package users can notice needs a changeset: the public API, runtime behavior, the rendered emails, and dependencies. Create one with `pnpm changeset` and write it for package users:

- The first line says what users get, in one sentence.
- Then short bullets with the new or changed options, functions, types and error codes, by their public names.
- A breaking change gets a "Migration" bullet with the exact code change.

While the version is 0.x, a breaking change is a minor bump and everything else is a patch. Internal refactors, tests, CI and tooling need no changeset.

## Commits and pull requests

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): summary`, with the types `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci` and `chore`.
- Name the branch after the change, with the same prefixes: `fix/outlook-button-width`, `feat/team-invite-template`.
- Keep one change per pull request. Pull requests are squash-merged.
- Comments explain why, not what. Every public export has JSDoc.

## Languages

### Adding a language

1. Copy `src/i18n/en.ts` to `src/i18n/<code>.ts`, rename the export, and translate every text. Keep every `{placeholder}` exactly as it is; the tests check them. Plural texts take the forms the language uses (`one`, `few`, `many`, `other`).
2. Add the dictionary to `dictionaries` in `src/i18n/index.ts`.
3. Add the code to the locale list in `scripts/samples.ts`.
4. Flip the language's row in [`docs/locales.md`](docs/locales.md) to ✅, or add the row in alphabetical order by English name.
5. Add a patch changeset.
6. Check the emails with `LOCALES=<code> pnpm preview`.

Use the form of address that is usual for the language in product emails, and gender-neutral wording where the language marks gender on the reader. A native speaker reviews every language before it is released.

### Fixing a translation

Edit the text in `src/i18n/<code>.ts` and add a patch changeset. Explain in the pull request why the new wording is better, for a reviewer who may not speak the language.

## Security

Please report security problems privately, as described in [SECURITY.md](SECURITY.md).

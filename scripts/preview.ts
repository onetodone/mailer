import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { html, memoryTransport, raw, type SafeHtml } from '@onetodone/mailer'

import { branding, createSampleMailer, env, locales, brandLogo, samples } from './samples.ts'

const outDir = join(import.meta.dirname, '..', '.preview')
const useSampleLogo = env('LOGO_URL') === undefined
const mailer = createSampleMailer(
  memoryTransport(),
  undefined,
  useSampleLogo
    ? { ...branding, logoUrl: brandLogo.url, logoWidth: brandLogo.width, logoHeight: brandLogo.height }
    : branding,
)

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir)
if (useSampleLogo) await copyFile(brandLogo.file, join(outDir, 'logo.png'))

interface Entry {
  readonly slug: string
  readonly template: string
  readonly files: readonly { readonly name: string; readonly href: string }[]
  readonly subjects: Readonly<Record<string, string>>
}

const entries: Entry[] = []
for (const sample of samples) {
  // Browsers cannot resolve cid: references, so inline images point to the written files instead.
  const files = (sample.attachments ?? []).map((attachment) => ({
    ...attachment,
    href: `${sample.slug}/${encodeURIComponent(attachment.filename)}`,
  }))
  if (files.length > 0) await mkdir(join(outDir, sample.slug))
  for (const file of files) await writeFile(join(outDir, sample.slug, file.filename), file.content)
  const swaps = [
    ...(useSampleLogo ? [[brandLogo.url, 'logo.png'] as const] : []),
    ...files.flatMap((file) => (file.cid === undefined ? [] : [[`cid:${file.cid}`, file.href] as const])),
  ]

  const subjects: Record<string, string> = {}
  for (const locale of locales) {
    const email = await mailer.render(sample.template, { locale, props: sample.props })
    const name = `${sample.slug}.${locale}`
    const page = swaps.reduce((markup, [from, to]) => markup.replaceAll(`"${from}"`, `"${to}"`), email.html)
    await writeFile(join(outDir, `${name}.html`), page)
    await writeFile(join(outDir, `${name}.txt`), `Subject: ${email.subject}\n\n${email.text}`)
    subjects[locale] = email.subject
  }
  entries.push({
    slug: sample.slug,
    template: sample.template,
    files: files.map((file) => ({ name: file.filename, href: file.href })),
    subjects,
  })
}

const [firstLocale = 'en'] = locales
const [first] = entries
const groups = [...new Set(entries.map((entry) => entry.template))].map((template) => ({
  template,
  entries: entries.filter((entry) => entry.template === template),
}))

function variant(entry: Entry): string {
  if (entry.slug.endsWith('-minimal')) return 'Minimal props'
  return entry.template === 'media' ? 'Custom template' : 'All props'
}

const nav: SafeHtml[] = groups.map(
  (group) =>
    html`<li><span class="template">${group.template}</span><ul>${group.entries.map(
      (entry) =>
        html`<li><a href="${entry.slug}.${firstLocale}.html" target="viewer" data-slug="${entry.slug}">${variant(entry)}</a></li>`,
    )}</ul></li>`,
)
const options = locales.map((locale) => html`<option value="${locale}">${locale}</option>`)
// Inside <script>, entities are not decoded, so the JSON is inserted raw with "<" escaped.
const data = raw(JSON.stringify(entries).replaceAll('<', '\\u003c'))

const index = html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Email preview · @onetodone/mailer</title>
<style>
:root { --text: #0f172a; --muted: #64748b; --line: #e2e8f0; --panel: #f8fafc; --accent: #2563eb; --bg: #fff; }
@media (prefers-color-scheme: dark) { :root { --text: #e2e8f0; --muted: #94a3b8; --line: #334155; --panel: #0f172a; --accent: #60a5fa; --bg: #020617; } }
* { box-sizing: border-box; }
body { display: flex; flex-direction: column; height: 100vh; margin: 0; font: 15px/1.5 system-ui, sans-serif; color: var(--text); background: var(--bg); }
header { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1.5rem; padding: 1rem; border-bottom: 1px solid var(--line); }
header h1 { margin: 0; font-size: 1.15rem; }
header p { margin: 0; color: var(--muted); flex: 1 1 20rem; }
a { color: var(--accent); }
.layout { display: grid; flex: 1; min-height: 0; grid-template-columns: 16rem 1fr; }
nav { padding: 1rem; border-right: 1px solid var(--line); background: var(--panel); overflow: auto; }
nav ul { list-style: none; margin: 0; padding: 0; }
nav > ul > li { margin-bottom: 0.75rem; }
.template { font-family: ui-monospace, monospace; font-size: 0.9rem; }
nav ul ul a { display: block; padding: 0.1rem 0.75rem; border-radius: 4px; text-decoration: none; color: var(--muted); }
nav ul ul a[aria-current="true"] { background: var(--accent); color: var(--bg); }
main { display: flex; flex-direction: column; min-width: 0; }
.meta { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; padding: 0.75rem 1rem; border-bottom: 1px solid var(--line); }
.meta strong { flex: 1 1 100%; }
#files { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; }
iframe { flex: 1; width: 100%; border: 0; background: #fff; }
@media (max-width: 720px) { body { height: auto; } .layout { grid-template-columns: 1fr; } nav { border-right: 0; border-bottom: 1px solid var(--line); max-height: 40vh; } iframe { flex: none; height: 80vh; } }
</style>
</head>
<body>
<header>
<h1>Email preview</h1>
<p>Every sample email of <a href="https://www.npmjs.com/package/@onetodone/mailer">@onetodone/mailer</a> in every built-in locale, rendered with sample data.</p>
<label>Locale <select id="locale">${options}</select></label>
</header>
<div class="layout">
<nav><ul>${nav}</ul></nav>
<main>
<div class="meta"><strong id="subject">${first?.subjects[firstLocale] ?? ''}</strong><a id="html" href="${first?.slug ?? ''}.${firstLocale}.html">HTML</a><a id="text" href="${first?.slug ?? ''}.${firstLocale}.txt">Plain text</a><span id="files"></span></div>
<iframe name="viewer" title="Email" src="${first?.slug ?? ''}.${firstLocale}.html"></iframe>
</main>
</div>
<script type="application/json" id="data">${data}</script>
<script>
const entries = JSON.parse(document.getElementById('data').textContent)
const select = document.getElementById('locale')
const frame = document.querySelector('iframe')
let current = entries[0]?.slug

function show(slug, locale) {
  const entry = entries.find((item) => item.slug === slug) ?? entries[0]
  if (!entry || !(locale in entry.subjects)) return
  current = entry.slug
  select.value = locale
  const name = entry.slug + '.' + locale
  frame.src = name + '.html'
  document.getElementById('subject').textContent = entry.subjects[locale]
  document.getElementById('html').href = name + '.html'
  document.getElementById('text').href = name + '.txt'
  const files = document.getElementById('files')
  files.replaceChildren(...entry.files.map((file) => Object.assign(document.createElement('a'), { href: file.href, textContent: file.name })))
  for (const link of document.querySelectorAll('nav a')) {
    link.href = link.dataset.slug + '.' + locale + '.html'
    link.setAttribute('aria-current', String(link.dataset.slug === current))
  }
  history.replaceState(null, '', '#' + name)
}

for (const link of document.querySelectorAll('nav a')) {
  link.addEventListener('click', (event) => {
    event.preventDefault()
    show(link.dataset.slug, select.value)
  })
}
select.addEventListener('change', () => show(current, select.value))
const [slug, locale] = location.hash.slice(1).split('.')
show(slug ?? current, locale ?? select.value)
</script>
</body>
</html>
`
await writeFile(join(outDir, 'index.html'), index.toString())

console.log(`Rendered ${String(entries.length * locales.length)} emails to .preview/index.html`)

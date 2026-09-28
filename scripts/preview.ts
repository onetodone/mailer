import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { createMailer, html, memoryTransport, type SafeHtml } from '@onetodone/mailer'

import { branding, from, locales, samples } from './samples.ts'

const outDir = join(import.meta.dirname, '..', '.preview')
const mailer = createMailer({ transport: memoryTransport(), from, branding })

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir)

const rows: SafeHtml[] = []
for (const sample of samples) {
  for (const locale of locales) {
    const email = await mailer.render(sample.template, { locale, props: sample.props })
    const file = `${sample.slug}.${locale}`
    await writeFile(join(outDir, `${file}.html`), email.html)
    await writeFile(join(outDir, `${file}.txt`), `Subject: ${email.subject}\n\n${email.text}`)
    rows.push(html`<tr>
<td>${sample.slug}</td>
<td>${locale}</td>
<td>${email.subject}</td>
<td><a href="${file}.html">HTML</a> · <a href="${file}.txt">Text</a></td>
</tr>`)
  }
}

const index = html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Email preview</title>
<style>
body { font-family: system-ui, sans-serif; margin: 2rem 1rem; }
table { border-collapse: collapse; }
th, td { padding: 0.5rem 1rem; text-align: left; border-bottom: 1px solid #8886; }
</style>
</head>
<body>
<h1>Email preview</h1>
<table>
<thead><tr><th>Email</th><th>Locale</th><th>Subject</th><th>Files</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>
`
await writeFile(join(outDir, 'index.html'), index.toString())

console.log(`Rendered ${String(rows.length)} emails to .preview/index.html`)

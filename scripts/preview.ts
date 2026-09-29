import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { html, memoryTransport, type SafeHtml } from '@onetodone/mailer'

import { createSampleMailer, locales, samples } from './samples.ts'

const outDir = join(import.meta.dirname, '..', '.preview')
const mailer = createSampleMailer(memoryTransport())

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir)

const rows: SafeHtml[] = []
for (const sample of samples) {
  // Browsers cannot resolve cid: references, so inline images point to the written files instead.
  const files = (sample.attachments ?? []).map((attachment) => ({
    ...attachment,
    href: `${sample.slug}/${encodeURIComponent(attachment.filename)}`,
  }))
  if (files.length > 0) await mkdir(join(outDir, sample.slug))
  for (const file of files) await writeFile(join(outDir, sample.slug, file.filename), file.content)

  for (const locale of locales) {
    const email = await mailer.render(sample.template, { locale, props: sample.props })
    const name = `${sample.slug}.${locale}`
    const page = files.reduce(
      (markup, file) => (file.cid === undefined ? markup : markup.replaceAll(`"cid:${file.cid}"`, `"${file.href}"`)),
      email.html,
    )
    await writeFile(join(outDir, `${name}.html`), page)
    await writeFile(join(outDir, `${name}.txt`), `Subject: ${email.subject}\n\n${email.text}`)
    const links = files.map((file) => html` · <a href="${file.href}">${file.filename}</a>`)
    rows.push(html`<tr>
<td>${sample.slug}</td>
<td>${locale}</td>
<td>${email.subject}</td>
<td><a href="${name}.html">HTML</a> · <a href="${name}.txt">Text</a>${links}</td>
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

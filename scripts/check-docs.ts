import { execFileSync } from 'node:child_process'
import { access, mkdir, mkdtemp, readdir, readFile, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, posix } from 'node:path'

import ts from 'typescript'

interface CodeBlock {
  line: number
  lines: string[]
}

interface Doc {
  path: string
  slugs: Set<string>
  links: { line: number; target: string }[]
  blocks: CodeBlock[]
}

const root = join(import.meta.dirname, '..')
const repoUrl = 'https://github.com/onetodone/mailer/blob/main/'

// Names the examples use without defining them, as if they followed the quick start.
const globals = `declare const transport: import('@onetodone/mailer').MailTransport
declare const from: string
declare const branding: import('@onetodone/mailer').Branding
declare const mailer: typeof import('./context.js').mailer
declare const orderShipped: typeof import('./context.js').orderShipped
declare const cartReminder: typeof import('./context.js').cartReminder
declare const createMailer: typeof import('@onetodone/mailer').createMailer
declare const defineTemplate: typeof import('@onetodone/mailer').defineTemplate
declare const z: typeof import('zod').z
declare const expect: typeof import('vitest').expect
declare const ui: import('@onetodone/mailer').Ui
declare const props: { guideUrl: string }
declare const logger: Record<'info' | 'warn' | 'error', (...args: unknown[]) => void>
declare const signUp: (mailer: unknown, user: { email: string }) => Promise<void>
declare const queue: { retryLater(template: string, userId: string): Promise<void> }
declare const user: { id: string; email: string }
declare const verifyUrl: string
declare const qrCodePng: Buffer
`

const context = `import { createMailer, defineTemplate, memoryTransport } from '@onetodone/mailer'
import { z } from 'zod'

export const orderShipped = defineTemplate({
  name: 'orderShipped',
  schema: z.object({ orderId: z.string(), trackUrl: z.url() }),
  messages: { en: { subject: 'Order #{orderId} has shipped', intro: 'Your order is on its way.', button: 'Track order' } },
  render: ({ props, ui, t }) => ({
    subject: t('orderShipped.subject', { orderId: props.orderId }),
    body: [ui.paragraph(t('orderShipped.intro')), ui.button(t('orderShipped.button'), props.trackUrl)],
  }),
})

export const cartReminder = defineTemplate({
  name: 'cartReminder',
  schema: z.object({ items: z.number() }),
  messages: { en: { items: { one: 'You have {count} item in your cart.', other: 'You have {count} items in your cart.' } } },
  render: ({ props, ui, t }) => ({
    subject: t('cartReminder.items', { count: props.items }),
    body: [ui.paragraph(t('cartReminder.items', { count: props.items }))],
  }),
})

export const mailer = createMailer({
  transport: memoryTransport(),
  from: 'My App <no-reply@example.com>',
  branding: { companyName: 'My App', appUrl: 'https://example.com', supportEmail: 'support@example.com' },
  templates: { orderShipped },
})
`

function slugify(heading: string): string {
  return heading
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
    .replaceAll(' ', '-')
}

function parse(path: string, text: string): Doc {
  const doc: Doc = { path, slugs: new Set(), links: [], blocks: [] }
  const headingCounts = new Map<string, number>()
  let fence: { indent: string; block: CodeBlock | undefined } | undefined
  for (const [index, line] of text.split('\n').entries()) {
    if (fence !== undefined) {
      if (line.trim() === '```') fence = undefined
      else fence.block?.lines.push(line.startsWith(fence.indent) ? line.slice(fence.indent.length) : line)
      continue
    }
    const open = /^(\s*)```(\w*)/.exec(line)
    if (open !== null) {
      const block = open[2] === 'ts' || open[2] === 'typescript' ? { line: index + 2, lines: [] } : undefined
      if (block !== undefined) doc.blocks.push(block)
      fence = { indent: open[1] ?? '', block }
      continue
    }
    const heading = /^#{1,6}\s+(.+?)\s*$/.exec(line)?.[1]
    if (heading !== undefined) {
      const slug = slugify(heading)
      const count = headingCounts.get(slug) ?? 0
      headingCounts.set(slug, count + 1)
      doc.slugs.add(count === 0 ? slug : `${slug}-${String(count)}`)
    }
    for (const [, target] of line.replace(/`[^`]*`/g, '').matchAll(/\]\(([^)\s]+)/g)) {
      if (target !== undefined) doc.links.push({ line: index + 1, target })
    }
  }
  return doc
}

const cache = new Map<string, Doc>()
async function load(path: string): Promise<Doc> {
  let doc = cache.get(path)
  if (doc === undefined) {
    doc = parse(path, await readFile(join(root, path), 'utf8'))
    cache.set(path, doc)
  }
  return doc
}

function splitHash(target: string): [string, string | undefined] {
  const hash = target.indexOf('#')
  return hash === -1 ? [target, undefined] : [target.slice(0, hash), target.slice(hash + 1)]
}

async function checkLink(doc: Doc, target: string): Promise<string | undefined> {
  let path: string
  let anchor: string | undefined
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) {
    if (!target.startsWith(repoUrl)) return undefined
    ;[path, anchor] = splitHash(target.slice(repoUrl.length))
  } else {
    const [file, hash] = splitHash(target)
    // README.md is also the npm page, and docs/ is not in the package.
    if (doc.path === 'README.md' && file.startsWith('docs/')) return `use ${repoUrl}${file} instead of ${target}`
    path = file === '' ? doc.path : posix.join(posix.dirname(doc.path), file)
    anchor = hash
  }
  const exists = await access(join(root, path)).then(
    () => true,
    () => false,
  )
  if (!exists) return `${target}: ${path} does not exist`
  if (anchor === undefined) return undefined
  if (!path.endsWith('.md')) return `${target}: ${path} is not a Markdown file`
  return (await load(path)).slugs.has(anchor) ? undefined : `${target}: ${path} has no heading for #${anchor}`
}

const pages = (await readdir(join(root, 'docs')))
  .filter((file) => file.endsWith('.md'))
  .sort()
  .map((file) => `docs/${file}`)
const docs = await Promise.all(['README.md', ...pages].map(load))
const errors: string[] = []

for (const doc of docs) {
  for (const { line, target } of doc.links) {
    const problem = await checkLink(doc, target)
    if (problem !== undefined) errors.push(`${doc.path}:${String(line)}: ${problem}`)
  }
}
const readmeLinks = new Set((await load('README.md')).links.map(({ target }) => target))
for (const page of pages) {
  if (!readmeLinks.has(`${repoUrl}${page}`)) errors.push(`README.md: no link to ${repoUrl}${page}`)
}

const tmp = await mkdtemp(join(tmpdir(), 'mailer-check-docs-'))
try {
  const [pack] = JSON.parse(
    execFileSync('npm', ['pack', '--json', '--pack-destination', tmp], { cwd: root, encoding: 'utf8' }),
  ) as [{ filename: string }]
  execFileSync('tar', ['-xzf', join(tmp, pack.filename), '-C', tmp])
  await mkdir(join(tmp, 'node_modules', '@onetodone'), { recursive: true })
  await mkdir(join(tmp, 'node_modules', '@types'))
  await rename(join(tmp, 'package'), join(tmp, 'node_modules', '@onetodone', 'mailer'))
  for (const name of ['zod', 'nodemailer', 'vitest', '@types/node']) {
    await symlink(await realpath(join(root, 'node_modules', name)), join(tmp, 'node_modules', name))
  }
  await writeFile(join(tmp, 'package.json'), '{ "type": "module" }\n')
  await writeFile(join(tmp, 'globals.d.ts'), globals)
  await writeFile(join(tmp, 'context.ts'), context)

  const sources = new Map<string, { doc: string; lines: number[] }>()
  for (const doc of docs) {
    const dir = join(tmp, doc.path.replace(/\.md$/, '').replaceAll('/', '-'))
    await mkdir(dir)
    for (const [index, block] of doc.blocks.entries()) {
      const name = /^\/\/ ([\w.-]+\.ts)$/.exec(block.lines[0] ?? '')?.[1] ?? `block-${String(index + 1)}.ts`
      const code: string[] = []
      const lines: number[] = []
      for (const [offset, line] of block.lines.entries()) {
        if (line.includes('// type error')) {
          code.push(`${/^\s*/.exec(line)?.[0] ?? ''}// @ts-expect-error`)
          lines.push(block.line + offset)
        }
        // Examples import local files without an extension, as bundler projects do; nodenext needs one.
        code.push(
          line.replace(
            /(from\s+['"])(\.{1,2}\/[^'"]+?)(['"])/g,
            (match, head: string, specifier: string, tail: string) =>
              /\.[cm]?[jt]s$/.test(specifier) ? match : `${head}${specifier}.js${tail}`,
          ),
        )
        lines.push(block.line + offset)
      }
      code.push('export {}')
      lines.push(block.line + block.lines.length)
      await writeFile(join(dir, name), code.join('\n'))
      sources.set(join(dir, name), { doc: doc.path, lines })
    }
  }

  const program = ts.createProgram([join(tmp, 'globals.d.ts'), join(tmp, 'context.ts'), ...sources.keys()], {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2023.d.ts'],
    types: ['node'],
    typeRoots: [join(tmp, 'node_modules', '@types')],
    strict: true,
    exactOptionalPropertyTypes: true,
    noUncheckedIndexedAccess: true,
    skipLibCheck: false,
    noEmit: true,
  })
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    const message = `TS${String(diagnostic.code)}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
    const { file, start } = diagnostic
    const source = file === undefined ? undefined : sources.get(file.fileName)
    if (file === undefined || start === undefined) errors.push(message)
    else if (source === undefined) errors.push(`${file.fileName}: ${message}`)
    else {
      const line = source.lines[file.getLineAndCharacterOfPosition(start).line]
      errors.push(`${source.doc}:${String(line)}: ${message}`)
    }
  }
} finally {
  await rm(tmp, { recursive: true, force: true })
}

if (errors.length > 0) {
  for (const error of errors) console.error(error)
  process.exitCode = 1
} else {
  const links = docs.reduce((sum, doc) => sum + doc.links.length, 0)
  const blocks = docs.reduce((sum, doc) => sum + doc.blocks.length, 0)
  console.log(
    `Checked ${String(docs.length)} files: ${String(links)} links and ${String(blocks)} TypeScript blocks are fine.`,
  )
}

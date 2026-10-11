import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Runtime dependencies stay out of the public types, so type checking in
// consumer projects never loads their declarations.
const forbidden = ['zod']

const dist = join(import.meta.dirname, '..', 'dist')
const files = (await readdir(dist, { recursive: true })).filter((file) => /\.d\.[cm]?ts$/.test(file))
const problems: string[] = []

for (const file of files) {
  const source = await readFile(join(dist, file), 'utf8')
  for (const name of forbidden) {
    if (new RegExp(`(?:from|import)\\s*["']${name}(?:/[^"']*)?["']`).test(source)) {
      problems.push(`dist/${file} imports ${name}`)
    }
  }
}

if (files.length === 0) problems.push('dist has no declaration files; run pnpm build first')

if (problems.length > 0) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(`${String(files.length)} declaration files, no imports of ${forbidden.join(', ')}`)

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import ts from 'typescript'

// Every public export and every member of an exported interface, class or
// object type needs JSDoc, because the declarations feed IDE hints for users.
// Computed keys such as `[brand]` are internal and do not show in completions.

interface Conditions {
  import: { types: string }
  require: { types: string }
}

const root = join(import.meta.dirname, '..')
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
  exports: Record<string, Conditions>
}
const entries = Object.entries(manifest.exports).flatMap(([entry, conditions]) =>
  [conditions.import.types, conditions.require.types].map((file) => ({ entry, file: join(root, file) })),
)

const program = ts.createProgram(
  entries.map(({ file }) => file),
  { strict: true, skipLibCheck: true },
)
const checker = program.getTypeChecker()
const documented = (symbol: ts.Symbol) =>
  symbol.getDocumentationComment(checker).length > 0 || symbol.getJsDocTags(checker).length > 0

const problems = new Set<string>()
const seen = new Set<ts.Symbol>()

function membersOf(declaration: ts.Declaration): readonly (ts.ClassElement | ts.TypeElement)[] {
  if (ts.isInterfaceDeclaration(declaration) || ts.isClassDeclaration(declaration)) return declaration.members
  if (ts.isTypeAliasDeclaration(declaration) && ts.isTypeLiteralNode(declaration.type)) return declaration.type.members
  return []
}

for (const { entry, file } of entries) {
  const source = program.getSourceFile(file)
  const module = source && checker.getSymbolAtLocation(source)
  if (!module) {
    problems.add(`${file}: not found; run pnpm build first`)
    continue
  }
  for (const exported of checker.getExportsOfModule(module)) {
    const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
    if (!documented(symbol)) problems.add(`${entry}: ${exported.name} has no JSDoc`)
    if (seen.has(symbol)) continue
    seen.add(symbol)
    for (const declaration of symbol.declarations ?? []) {
      for (const member of membersOf(declaration)) {
        if (!member.name || ts.isComputedPropertyName(member.name) || ts.isPrivateIdentifier(member.name)) continue
        if (ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Private) continue
        const memberSymbol = checker.getSymbolAtLocation(member.name)
        if (memberSymbol && !documented(memberSymbol)) {
          problems.add(`${entry}: ${exported.name}.${memberSymbol.name} has no JSDoc`)
        }
      }
    }
  }
}

if (problems.size > 0) {
  console.error([...problems].join('\n'))
  process.exit(1)
}
console.log(`${String(seen.size)} exported symbols in ${String(entries.length)} declaration files have JSDoc`)

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// Deliberately narrow: CSS colors belong in primitive files. Layout lengths,
// SVG assets, metadata theme colors, and Tailwind internals are outside this check.
export function colorFindings(source, path) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
  return clean.split('\n').flatMap((line, index) => {
    const findings = []
    if (/#(?:[\da-f]{3,8})\b|\b(?:oklch|oklab|rgb|rgba|hsl|hsla|lab|lch|hwb|color)\s*\(/i.test(line)) {
      findings.push(`${path}:${index + 1}: Move the color value to styles/primitives.css and use a semantic token.`)
    }
    if (/var\(\s*--swatch-/.test(line)) {
      findings.push(`${path}:${index + 1}: Use a semantic role from styles/tokens.css instead of a raw swatch.`)
    }
    return findings
  })
}

function cssFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? cssFiles(path) : path.endsWith('.css') ? [path] : []
  })
}

export function checkDesign(root) {
  const findings = []
  for (const app of ['portal', 'site']) {
    const source = resolve(root, `apps/${app}/src`)
    for (const path of cssFiles(source)) {
      const name = relative(source, path)
      if (name === 'styles/primitives.css' || name === 'styles/tokens.css') continue
      findings.push(...colorFindings(readFileSync(path, 'utf8'), relative(root, path)))
    }
    // Raw palettes must not acquire semantic dependencies.
    const primitive = readFileSync(resolve(source, 'styles/primitives.css'), 'utf8')
    if (/var\(/.test(primitive)) findings.push(`${app}: Primitive values must not depend on semantic tokens.`)
  }
  return findings
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const findings = checkDesign(process.cwd())
  if (findings.length) {
    console.error(findings.join('\n'))
    process.exitCode = 1
  } else {
    console.log('Design token checks passed for portal and site.')
  }
}

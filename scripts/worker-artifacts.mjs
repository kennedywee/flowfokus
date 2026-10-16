import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const clean = process.argv.includes('--clean')
const appIndex = process.argv.indexOf('--app')
const apps = appIndex < 0 ? ['portal', 'site'] : [process.argv[appIndex + 1]]
if (apps.some((app) => !['portal', 'site'].includes(app))) throw new Error('Expected --app portal or --app site')
for (const app of apps) {
  const root = `apps/${app}/dist`
  let removed = 0
  function inspect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) inspect(path)
      else if (/^(\.dev\.vars|\.env)(\.|$)/.test(entry.name) || entry.name.endsWith('.env')) {
        if (!clean) throw new Error(`Local environment file in Worker output: ${path}`)
        rmSync(path)
        removed += 1
      }
    }
  }
  inspect(root)
  if (removed) console.log(`Removed ${removed} local environment file(s) from ${app} output.`)
}
console.log('Worker outputs contain no local environment files.')

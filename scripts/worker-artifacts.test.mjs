import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const script = fileURLToPath(new URL('./worker-artifacts.mjs', import.meta.url))
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'hydraflow-artifacts-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  for (const app of ['portal', 'site']) mkdirSync(join(root, `apps/${app}/dist/server`), { recursive: true })
  return root
}
function run(cwd, ...args) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' })
}

test('packaging rejects nested local configuration without printing its value', (t) => {
  const cwd = fixture(t)
  writeFileSync(join(cwd, 'apps/site/dist/server/.dev.vars'), 'PRIVATE_KEY=do-not-print-this-value')
  const result = run(cwd)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Local environment file/)
  assert.doesNotMatch(result.stdout + result.stderr, /do-not-print-this-value/)
})

test('cleanup removes local env files and preserves deployable assets', (t) => {
  const cwd = fixture(t)
  const output = join(cwd, 'apps/portal/dist/server')
  for (const name of ['.env', '.env.production', '.dev.vars', '.dev.vars.preview', 'production.env']) {
    writeFileSync(join(output, name), 'SECRET=test')
  }
  writeFileSync(join(output, 'index.js'), 'export default {}')
  writeFileSync(join(output, 'wrangler.json'), '{}')
  assert.equal(run(cwd, '--clean').status, 0)
  assert.equal(run(cwd).status, 0)
  assert.equal(existsSync(join(output, '.dev.vars')), false)
  assert.equal(existsSync(join(output, 'production.env')), false)
  assert.equal(existsSync(join(output, 'index.js')), true)
  assert.equal(existsSync(join(output, 'wrangler.json')), true)
})

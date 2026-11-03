import { test } from 'node:test'
import assert from 'node:assert/strict'
import { colorFindings } from './design-check.mjs'

test('flags literal colors and direct palette use with source locations', () => {
  assert.equal(colorFindings('.card { color: #abc; }', 'screen.css').length, 1)
  for (const color of ['oklch(0.4 0.1 150)', 'rgb(0 0 0 / .5)', 'hsl(0 0% 0%)']) {
    assert.match(colorFindings(`\n.card { color: ${color}; }`, 'screen.css')[0], /screen.css:2:/)
  }
  assert.match(colorFindings('.card { color: var(--swatch-ffffff); }', 'screen.css')[0], /semantic role/)
})

test('accepts semantic composition and ignores examples in comments', () => {
  assert.deepEqual(colorFindings(`/* Example: #fff and var(--swatch-fff) */
.card { color: var(--color-ink); background: color-mix(in oklch, var(--color-good) 20%, transparent); }`, 'screen.css'), [])
  assert.match(colorFindings('/* #fff\n#000 */\n.card { color: #abc; }', 'screen.css')[0], /:3:/)
})

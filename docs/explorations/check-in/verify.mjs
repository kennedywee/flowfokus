import { chromium } from '../../../.agents/skills/stageshow/node_modules/playwright-core/index.mjs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium' })
const url = pathToFileURL(resolve('docs/explorations/check-in/index.html')).href
const errors = []
try {
  for (const width of [728, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1400 } })
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()) })
    await page.goto(url)
    await page.evaluate(() => document.fonts.ready)
    for (const [index, name] of ['Grove', 'Studio', 'Night desk'].entries()) {
      await page.getByRole('tab', { name, exact: true }).click()
      assert.equal(await page.getByRole('tab', { name, exact: true }).getAttribute('aria-selected'), 'true')
      for (const state of ['Granted', 'Denied', 'Error']) {
        await page.getByRole('button', { name: state, exact: true }).click()
        await page.waitForTimeout(350)
        assert.equal(await page.getByRole('button', { name: state, exact: true }).getAttribute('aria-pressed'), 'true')
        const result = await page.locator('.result-lane').boundingBox()
        const stage = await page.locator('.ss-stage').boundingBox()
        assert(result && stage && result.y + result.height <= stage.y + stage.height, `${width} ${name}: result cropped`)
      }
      await page.getByRole('button', { name: 'Ready', exact: true }).click()
      const next = await page.getByRole('button', { name: 'Next member', exact: true }).boundingBox()
      const stage = await page.locator('.ss-stage').boundingBox()
      assert(next && stage && next.y + next.height <= stage.y + stage.height, `${width} ${name}: next action cropped`)
      await page.getByRole('button', { name: 'No results', exact: true }).click()
      assert.equal(await page.getByText('No member found', { exact: true }).count(), 1)
      await page.getByRole('button', { name: 'Clear search', exact: true }).click()
      await page.getByRole('button', { name: 'Select Ada Tan', exact: true }).click()
      await page.locator('[data-target=check]').click()
      await page.waitForTimeout(1400)
      assert.equal(await page.locator('.result-lane').getAttribute('data-mode'), 'granted')
      await page.screenshot({ path: `/tmp/flowfokus-${index}-${width}.png`, fullPage: true })
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} ${name}: horizontal overflow`)
    }
    // Resize the same mounted concept; compact geometry must update.
    await page.setViewportSize({ width: width === 390 ? 728 : 390, height: 1400 })
    await page.waitForTimeout(150)
    assert.equal(await page.locator('.ss-stage').getAttribute('data-layout'), width === 390 ? 'wide' : 'compact')
    await page.close()
  }
  for (const width of [728, 390]) {
    const motion = await browser.newPage({ viewport: { width, height: 1400 } })
    motion.on('pageerror', e => errors.push(e.message))
    motion.on('console', e => { if (e.type() === 'error') errors.push(e.text()) })
    await motion.goto(url + '?demo=1&look=2')
    await motion.waitForFunction(() => document.querySelector('.result-lane')?.getAttribute('data-mode') === 'granted', { timeout: 15000 })
    await motion.close()
  }
  const reduced = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 390, height: 1400 } })
  await reduced.goto(url)
  await reduced.getByRole('button', { name: 'Play check-in demo' }).click()
  assert.equal(await reduced.locator('.result-lane').getAttribute('data-mode'), 'granted')
  await reduced.close()
  assert.deepEqual(errors, [])
  console.log('All three looks passed manual-state, search, simulated-submit, crop, resize, overflow, and reduced-motion checks at 728px and 390px.')
} finally { await browser.close() }

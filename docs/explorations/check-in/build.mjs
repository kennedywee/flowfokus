import { build } from 'esbuild'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../..')
const result = await build({
  entryPoints: [resolve(here, 'lab.tsx')], bundle: true, write: false,
  outdir: resolve(here, 'generated'), minify: true, format: 'iife', jsx: 'automatic',
  target: 'chrome120', loader: { '.woff2': 'dataurl' },
  alias: { react: resolve(root, 'node_modules/react'), 'react-dom': resolve(root, 'node_modules/react-dom'), 'lucide-react': resolve(root, 'node_modules/lucide-react') },
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.DEV': 'false' },
})
const css = result.outputFiles.find(f => f.path.endsWith('.css')).text
const js = result.outputFiles.find(f => f.path.endsWith('.js')).text.replaceAll('</script', '<\\/script')
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Flowfokus component exploration</title><link rel="icon" href="data:,"><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`
writeFileSync(resolve(here, 'index.html'), html)
console.log(`Built ${resolve(here, 'index.html')} (${Math.round(Buffer.byteLength(html)/1024)} KB)`)

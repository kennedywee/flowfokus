import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const files = ['server-image.tar.gz', 'server-image.json', 'portal.tar.gz', 'site.tar.gz', 'openapi.yaml']
const image = JSON.parse(readFileSync('release/server-image.json', 'utf8'))
const manifest = {
  schema_version: 1,
  commit: process.env.GITHUB_SHA,
  ref: process.env.GITHUB_REF_NAME,
  channel: process.env.GITHUB_REF_NAME?.match(/^v\d+\.\d+\.\d+$/) ? 'stable' : 'candidate',
  deployment: 'not_deployed',
  contract: {
    base: process.env.CONTRACT_BASE || null,
    breaking_check: process.env.CONTRACT_BASE ? 'passed' : 'no_stable_release',
  },
  apps: {
    server: { build: 'success', publication: 'not_configured', image_id: image.Id, tags: image.RepoTags },
    portal: { build: 'success', publication: 'not_configured' },
    site: { build: 'success', publication: 'not_configured' },
  },
  artifacts: Object.fromEntries(files.map((file) => [file, {
    sha256: createHash('sha256').update(readFileSync(`release/${file}`)).digest('hex'),
    publication: 'workflow_artifact',
  }])),
}
if (!manifest.commit || !manifest.ref) throw new Error('GitHub commit and ref are required')
writeFileSync('release/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`)

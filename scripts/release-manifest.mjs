import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const files = ['server-image.tar.gz', 'portal.tar.gz', 'site.tar.gz', 'openapi.yaml']
const manifest = {
  schema_version: 1,
  commit: process.env.GITHUB_SHA,
  ref: process.env.GITHUB_REF_NAME,
  channel: process.env.GITHUB_REF_NAME?.match(/^v\d+\.\d+\.\d+$/) ? 'stable' : 'candidate',
  deployment: 'not_deployed',
  artifacts: Object.fromEntries(files.map((file) => [file, {
    sha256: createHash('sha256').update(readFileSync(`release/${file}`)).digest('hex'),
    publication: 'workflow_artifact',
  }])),
}
if (!manifest.commit || !manifest.ref) throw new Error('GitHub commit and ref are required')
writeFileSync('release/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`)

import assert from 'node:assert/strict'

// Configure only the project's local emulator. Live WorkOS setup stays manual.
const emulator = new URL(process.env.WORKOS_EMULATOR_URL || 'http://127.0.0.1:4100')
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(emulator.hostname), 'The WorkOS emulator must be local')
const target = new URL(process.argv[2] || 'http://server:4000/webhooks/workos')
assert.ok(['server', 'host.docker.internal'].includes(target.hostname), 'Use the Docker server or host gateway')
assert.equal(target.protocol, 'http:')
assert.equal(target.port, '4000')
assert.equal(target.pathname, '/webhooks/workos')
assert.equal(target.username + target.password + target.search + target.hash, '')

async function call(path, { method = 'GET', body } = {}) {
  const response = await fetch(new URL(path, emulator), {
    method,
    headers: { Authorization: 'Bearer sk_test_default', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10_000),
  })
  assert.ok(response.ok, `${method} ${path}: unexpected status ${response.status}`)
  return response.json()
}

// The mounted seed file creates one endpoint. Change its destination when
// switching between apps in Docker and apps running directly on the host.
const { data } = await call('/webhook_endpoints?limit=100')
const endpoint = data.find(item => [
  'http://server:4000/webhooks/workos',
  'http://host.docker.internal:4000/webhooks/workos',
].includes(item.endpoint_url))
assert.ok(endpoint, 'Restart WorkOS Emulate to load the webhook endpoint from its seed file')
await call(`/webhook_endpoints/${encodeURIComponent(endpoint.id)}`, {
  method: 'PUT', body: { endpoint_url: target.href, enabled: true },
})
console.log(`Local WorkOS webhook destination: ${target.href}`)

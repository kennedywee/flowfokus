import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { setTimeout as pause } from 'node:timers/promises'

// Local integration check. It creates a temporary fake WorkOS user and keeps
// credentials in this process. Rails retains its identity history after cleanup.
const workos = new URL(process.env.WORKOS_EMULATOR_URL || 'http://127.0.0.1:4100')
const rails = new URL(process.env.API_BASE_URL || 'http://127.0.0.1:4000')
for (const url of [workos, rails]) {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Identity smoke endpoints must be local')
}
const secret = 'whsec_flowfokus_local_only'
const apiKey = 'sk_test_default'
const organization = 'org_demo_chainsaw'
const email = `sync-${randomUUID()}@example.test`
const password = 'local-password'

async function emulator(path, { method = 'GET', body, status = 200 } = {}) {
  const response = await fetch(new URL(path, workos), {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10_000),
  })
  // Authentication and webhook endpoint responses can contain credentials.
  assert.equal(response.status, status, `${method} ${path}: unexpected status ${response.status}`)
  return response.status === 204 ? undefined : response.json()
}

async function staff(path, token) {
  const response = await fetch(new URL(path, rails), {
    headers: { Authorization: `Bearer ${token}`, 'Flowfokus-Organization': 'chainsaw' },
    signal: AbortSignal.timeout(10_000),
  })
  return { status: response.status, body: await response.json() }
}

async function eventually(label, check) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    if (await check()) return
    await pause(250)
  }
  assert.fail(`Timed out waiting for ${label}. Check the Rails event ledger and webhook configuration.`)
}

async function replay(event, { valid = true } = {}) {
  const body = JSON.stringify(event)
  const timestamp = Date.now()
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return fetch(new URL('/webhooks/workos', rails), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'WorkOS-Signature': `t=${timestamp}, v1=${valid ? digest : '0'.repeat(64)}`,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  })
}

async function userUpdateEvent(userId) {
  let after
  const cursors = new Set()
  for (let page = 0; page < 100; page++) {
    const query = new URLSearchParams({ 'events[]': 'user.updated', limit: '100', ...(after ? { after } : {}) })
    const events = await emulator(`/events?${query}`)
    const found = events.data.find(event => event.data.id === userId)
    if (found) return found
    after = events.list_metadata?.after
    if (!after) break
    assert.ok(!cursors.has(after), 'Emulator event pagination repeated a cursor')
    cursors.add(after)
  }
  assert.fail('Emulator must record the user update event within 100 pages')
}

let user
let membership
try {
  user = await emulator('/user_management/users', {
    method: 'POST', status: 201,
    body: { email, password, first_name: 'Sync', last_name: 'Before', email_verified: true },
  })
  membership = await emulator('/user_management/organization_memberships', {
    method: 'POST', status: 201,
    body: { user_id: user.id, organization_id: organization, role_slug: 'receptionist' },
  })
  const session = await emulator('/user_management/authenticate', {
    method: 'POST',
    body: {
      client_id: 'client_flowfokus_local', client_secret: apiKey, grant_type: 'password',
      email, password, organization_id: organization,
    },
  })
  const token = session.access_token
  await eventually('new staff identity without Rails seeds', async () => {
    const result = await staff('/staff/memberships', token)
    return result.status === 200 && result.body.data?.length === 1 &&
      result.body.data[0].slug === 'chainsaw' && result.body.data[0].role === 'receptionist'
  })

  await emulator(`/user_management/users/${user.id}`, {
    method: 'PUT', body: { first_name: 'Sync', last_name: 'After' },
  })
  await eventually('updated name', async () => {
    const result = await staff('/staff/organization', token)
    return result.status === 200 && result.body.data?.actor?.name === 'Sync After'
  })

  await emulator(`/user_management/organization_memberships/${membership.id}`, {
    method: 'PUT', body: { role_slug: 'owner' },
  })
  await eventually('updated membership role despite an older token', async () => {
    const result = await staff('/staff/memberships', token)
    return result.status === 200 && result.body.data?.[0]?.role === 'owner'
  })

  const update = await userUpdateEvent(user.id)
  const invalid = await replay(update, { valid: false })
  assert.ok([400, 401].includes(invalid.status), `Invalid signature accepted: ${invalid.status}`)
  for (let i = 0; i < 2; i++) {
    const duplicate = await replay(update)
    assert.ok(duplicate.ok, `Duplicate event rejected: ${duplicate.status}`)
  }

  await emulator(`/user_management/organization_memberships/${membership.id}`, { method: 'DELETE', status: 204 })
  membership = undefined
  await eventually('removed organization in navigation', async () => {
    const result = await staff('/staff/memberships', token)
    return result.status === 200 && result.body.data?.length === 0
  })
  for (let i = 0; i < 3; i++) {
    const result = await staff('/staff/memberships', token)
    assert.equal(result.status, 200)
    assert.deepEqual(result.body.data, [], 'An older access token must not restore a removed membership')
  }
  console.log('PASS: new staff without Rails seeds, name and role updates, signature rejection, duplicate delivery, and removal protected from stale token observation.')
} finally {
  if (membership) {
    await emulator(`/user_management/organization_memberships/${membership.id}`, { method: 'DELETE', status: 204 })
  }
  if (user) await emulator(`/user_management/users/${user.id}`, { method: 'DELETE', status: 204 })
}

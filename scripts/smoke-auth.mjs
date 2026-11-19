import assert from 'node:assert/strict'

// Local integration check. Tokens stay in this server-side process.
const workos = new URL(process.env.WORKOS_EMULATOR_URL || 'http://127.0.0.1:4100')
const rails = new URL(process.env.API_BASE_URL || 'http://127.0.0.1:4000')
for (const url of [workos, rails]) {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Auth smoke endpoints must be local')
}
const clientId = 'client_flowfokus_local'
const apiKey = 'sk_test_default'

async function workosCall(path, body, expected = 200) {
  const response = await fetch(new URL(path, workos), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  // Do not include authentication response bodies in failures: they hold tokens.
  assert.equal(response.status, expected, `${path}: unexpected status ${response.status}`)
  return response.status === 204 ? undefined : response.json()
}

async function authenticate(email, organizationId, selectOrganization = false) {
  const result = await workosCall('/user_management/authenticate', {
    client_id: clientId, client_secret: apiKey, grant_type: 'password',
    email, password: '123123qwe', organization_id: organizationId,
  }, selectOrganization ? 403 : 200)
  if (!selectOrganization) return result
  assert.equal(result.code, 'organization_selection_required')
  return workosCall('/user_management/authenticate', {
    client_id: clientId, client_secret: apiKey,
    grant_type: 'urn:workos:oauth:grant-type:organization-selection',
    pending_authentication_token: result.pending_authentication_token,
    organization_id: organizationId,
  })
}

function refresh(refreshToken, expected = 200, organizationId) {
  return workosCall('/user_management/authenticate', {
    client_id: clientId, client_secret: apiKey, grant_type: 'refresh_token', refresh_token: refreshToken,
    ...(organizationId ? { organization_id: organizationId } : {}),
  }, expected)
}

async function checkRails(path, token, organization, status, body) {
  const response = await fetch(new URL(path, rails), {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(organization ? { 'Flowfokus-Organization': organization } : {}),
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10_000),
  })
  assert.equal(response.status, status, `${path}: expected ${status}, got ${response.status}`)
  return response.json()
}

// Kennedy and Aiman work at Chainsaw only. Rachel owns Irongate and manages Chainsaw.
const owner = await authenticate('kennedy@flowfokus.com', 'org_chainsaw')
const receptionist = await authenticate('aiman@flowfokus.com', 'org_chainsaw')
const rachel = await authenticate('rachel@flowfokus.com', 'org_irongate', true)
const ownerMemberships = await checkRails('/staff/memberships', owner.access_token, undefined, 200)
assert.deepEqual(ownerMemberships.data.map(item => item.slug), ['chainsaw'])
const rachelMemberships = await checkRails('/staff/memberships', rachel.access_token, undefined, 200)
assert.deepEqual(rachelMemberships.data.map(item => item.slug).sort(), ['chainsaw', 'irongate'])
await checkRails('/staff/organization', undefined, 'chainsaw', 401)
await checkRails('/staff/organization', 'invalid-token', 'chainsaw', 401)
await checkRails('/staff/organization', owner.access_token, 'chainsaw', 200)
await checkRails('/staff/organization', owner.access_token, 'irongate', 403)
await checkRails('/staff/organization', receptionist.access_token, 'irongate', 403)
await checkRails('/staff/organization', rachel.access_token, 'irongate', 200)
await checkRails('/staff/organization', rachel.access_token, 'chainsaw', 403)
await checkRails('/staff/members', receptionist.access_token, 'chainsaw', 200)
await checkRails('/staff/members', receptionist.access_token, 'chainsaw', 403, { name: 'Must not be created' })

const renewed = await refresh(owner.refresh_token)
assert.notEqual(renewed.refresh_token, owner.refresh_token, 'Refresh must rotate the token')
// WorkOS allows brief refresh replay so concurrent requests converge on one token.
const replay = await refresh(owner.refresh_token)
assert.equal(replay.refresh_token, renewed.refresh_token, 'Concurrent refresh must reuse the successor')
await checkRails('/staff/organization', renewed.access_token, 'chainsaw', 200)
// Rachel switches from Irongate, where she is owner, to Chainsaw, where she is manager.
const switched = await refresh(rachel.refresh_token, 200, 'org_chainsaw')
await checkRails('/staff/organization', switched.access_token, 'chainsaw', 200)
await checkRails('/staff/organization', switched.access_token, 'irongate', 403)
await checkRails('/staff/locations', switched.access_token, 'chainsaw', 403, { name: 'Must not be created' })

// Exercise the full membership workflow with a genuine emulator-issued token.
process.env.FLOWFOKUS_ACCESS_TOKEN = renewed.access_token
await import('./smoke.mjs')
delete process.env.FLOWFOKUS_ACCESS_TOKEN

for (const session of [renewed, receptionist, switched]) {
  // Reading sid is only for cleanup. Rails performs the cryptographic verification.
  const { sid } = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString())
  await workosCall('/user_management/sessions/revoke', { session_id: sid })
  await refresh(session.refresh_token, 400)
}
console.log('PASS: signed WorkOS tokens, organization isolation and switching, role permissions, refresh rotation, membership workflow, and revoked refresh tokens.')

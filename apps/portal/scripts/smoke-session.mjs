import assert from 'node:assert/strict'
import { WorkOS } from '@workos-inc/node'
import { sessionEncryption } from '@workos/authkit-session'

// Exercise the running portal's SDK middleware, not a mocked refresh function.
// Fake credentials and sealed sessions stay in this process.
const portal = new URL(process.env.PORTAL_BASE_URL || 'http://localhost:4001')
const emulator = new URL(process.env.WORKOS_EMULATOR_URL || 'http://localhost:4100')
for (const url of [portal, emulator]) {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Session smoke endpoints must be local')
}
const password = process.env.WORKOS_COOKIE_PASSWORD || 'local-only-cookie-password-0123456789abcdef'
const workos = new WorkOS('sk_test_default', {
  apiHostname: emulator.hostname, port: Number(emulator.port || 80), https: emulator.protocol === 'https:',
})
const auth = await workos.userManagement.authenticateWithPassword({
  clientId: 'client_flowfokus_local', email: 'demo.owner@flowfokus.test', password: 'local-password',
})
const sessionId = JSON.parse(Buffer.from(auth.accessToken.split('.')[1], 'base64url').toString()).sid

async function sealStaleSession(refreshToken) {
  // A rejected access token must trigger refresh using the sealed refresh token.
  // This tests the same middleware fallback used for an expired access token.
  return sessionEncryption.sealData({
    accessToken: 'stale-access-token', refreshToken, user: auth.user,
  }, { password })
}

async function request(cookie) {
  return fetch(new URL('/chainsaw/members', portal), {
    headers: { Cookie: `hf_session=${encodeURIComponent(cookie)}` },
    redirect: 'manual', signal: AbortSignal.timeout(15_000),
  })
}

try {
  const response = await request(await sealStaleSession(auth.refreshToken))
  assert.equal(response.status, 200, 'The portal must refresh the session and render the protected page')
  const html = await response.text()
  assert.ok(html.includes('demo.owner@flowfokus.test'), 'The refreshed session must retain the staff identity')
  assert.ok(!/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(html), 'HTML must not contain a JWT')
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  const cookie = response.headers.getSetCookie().find(value => value.startsWith('hf_session='))
  assert.ok(cookie, 'The refreshed session must be saved in a response cookie')
  assert.ok(/; HttpOnly/i.test(cookie) && /; SameSite=Lax/i.test(cookie) && /; Path=\//i.test(cookie))
  assert.ok(!/; Domain=/i.test(cookie), 'The session must remain host-only')
  const sealed = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1).split(';')[0])
  const refreshed = await sessionEncryption.unsealData(sealed, { password })
  assert.ok(refreshed.refreshToken !== auth.refreshToken, 'The rotated refresh token must be saved')
  const claims = JSON.parse(Buffer.from(refreshed.accessToken.split('.')[1], 'base64url').toString())
  assert.ok(claims.exp > Date.now() / 1000 && claims.org_id === 'org_demo_chainsaw')

  const next = await request(sealed)
  assert.equal(next.status, 200, 'The next request must accept the refreshed cookie')
  await next.arrayBuffer()

  await workos.userManagement.revokeSession({ sessionId })
  const revoked = await request(await sealStaleSession(refreshed.refreshToken))
  assert.equal(revoked.status, 307, 'A rejected refresh must require sign-in')
  assert.ok(new URL(revoked.headers.get('location'), portal).pathname === '/sign-in')
  await revoked.arrayBuffer()
  console.log('PASS: portal SDK refresh, rotated session cookie, HttpOnly/host-only flags, token-free HTML, next request, and rejected revoked refresh.')
} finally {
  await workos.userManagement.revokeSession({ sessionId }).catch(() => {})
}

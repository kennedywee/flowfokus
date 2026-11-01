import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

// Local end-to-end check of the staff and member workflows, against Rails and
// WorkOS Emulate. Uses real emulator tokens. Tokens stay in this process.
// Creates records in the local database. Safe to run again.
const workos = new URL(process.env.WORKOS_EMULATOR_URL || 'http://127.0.0.1:4100')
const rails = new URL(process.env.API_BASE_URL || 'http://127.0.0.1:4000')
for (const url of [workos, rails]) {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Smoke endpoints must be local')
}
const clientId = 'client_flowfokus_local'
const apiKey = 'sk_test_default'
const run = Date.now().toString(36)
const gym = 'chainsaw'

async function authenticate(email, organizationId) {
  const response = await fetch(new URL('/user_management/authenticate', workos), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId, client_secret: apiKey, grant_type: 'password', email, password: 'local-password',
      ...(organizationId ? { organization_id: organizationId } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  })
  // Never print this body: it holds tokens.
  assert.equal(response.status, 200, `sign-in for ${email}: status ${response.status}`)
  return (await response.json()).access_token
}

async function call(method, path, { token, status = 200, body, key, organization = gym } = {}) {
  const response = await fetch(new URL(path, rails), {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(organization ? { 'Flowfokus-Organization': organization } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
  })
  const json = await response.json()
  const expected = Array.isArray(status) ? status : [status]
  assert.ok(expected.includes(response.status), `${method} ${path}: expected ${expected}, got ${response.status} ${JSON.stringify(json.error ?? {})}`)
  return json
}

function step(name) {
  console.log(`ok  ${name}`)
}

const owner = await authenticate('demo.owner@flowfokus.test', 'org_demo_chainsaw')
const receptionist = await authenticate('receptionist@example.com', 'org_demo_chainsaw')
const member = await authenticate('member@example.com')
const as = (token) => ({ token })

// Catalog
const org = (await call('GET', '/staff/organization', as(owner))).data
const location = org.locations[0]
const product = (await call('POST', '/staff/products', { ...as(owner), status: 201, body: {
  name: `Smoke Offer ${run}`, description: 'Created by the workflow smoke check', published: false,
  benefits: [{ name: 'Gym access', usage_limit: 2 }],
} })).data
let priced = (await call('POST', `/staff/products/${product.id}/prices`, { ...as(owner), status: 201,
  body: { label: 'Monthly', amount_minor: 10_000, duration_days: 30 } })).data
const price = priced.prices[0]
await call('PATCH', `/staff/products/${product.id}`, { ...as(owner), body: { name: `Smoke Offer ${run} (edited)` } })
priced = (await call('PATCH', `/staff/prices/${price.id}`, { ...as(owner), body: { available: false } })).data
assert.equal(priced.prices[0].available, false)
await call('PATCH', `/staff/prices/${price.id}`, { ...as(owner), body: { available: true } })
await call('POST', '/staff/products', { ...as(receptionist), status: 403, body: { name: 'No', benefits: [{ name: 'x' }] } })
step('catalog: create, price, edit, take off sale, and refuse a receptionist')

// Sale with early delivery, payment, and refund
const buyer = (await call('POST', '/staff/members', { ...as(owner), status: 201,
  body: { name: `Smoke Buyer ${run}`, email: `smoke.${run}@example.com` } })).data
let sale = (await call('POST', '/staff/sales', { ...as(owner), status: 201, key: randomUUID(),
  body: { member_id: buyer.id, price_id: price.id, location_id: location.id } })).data
sale = (await call('POST', `/staff/sales/${sale.id}/payments`, { ...as(owner), status: 201, key: randomUUID(),
  body: { amount_minor: 4_000, method: 'cash' } })).data
await call('POST', `/staff/sales/${sale.id}/fulfill`, { ...as(owner), status: 422 })
sale = (await call('POST', `/staff/sales/${sale.id}/fulfill`, { ...as(owner), status: 201, body: { early_reason: 'Smoke: pays the rest later' } })).data
assert.equal(sale.fulfillment.early, true)
assert.equal(sale.fulfillment.unpaid_minor, 6_000)
sale = (await call('POST', `/staff/sales/${sale.id}/payments`, { ...as(owner), status: 201, key: randomUUID(),
  body: { amount_minor: 6_000, method: 'bank_transfer', reference: `SMOKE-${run}` } })).data
assert.equal(sale.payment_status, 'paid')
sale = (await call('POST', `/staff/sales/${sale.id}/refunds`, { ...as(owner), status: 201, key: randomUUID(),
  body: { payment_id: sale.payments[0].id, amount_minor: 1_000, reason: 'Smoke: goodwill' } })).data
assert.equal(sale.refunded_minor, 1_000)
await call('POST', `/staff/sales/${sale.id}/refunds`, { ...as(owner), status: 422, key: randomUUID(),
  body: { payment_id: sale.payments[0].id, amount_minor: 3_001, reason: 'Too much' } })
step('purchase: partial payment, early delivery with a reason, full payment, refund within the payment')

// Check-in: granted, used up, denied, overridden
let checkIn = (await call('POST', '/staff/check_ins', { ...as(receptionist), status: 201, key: randomUUID(),
  body: { member_id: buyer.id, location_id: location.id } })).data
assert.equal(checkIn.result, 'granted')
await call('POST', '/staff/check_ins', { ...as(owner), status: 201, key: randomUUID(), body: { member_id: buyer.id, location_id: location.id } })
checkIn = (await call('POST', '/staff/check_ins', { ...as(owner), status: 201, key: randomUUID(),
  body: { member_id: buyer.id, location_id: location.id } })).data
assert.equal(checkIn.denial_reason, 'usage_limit_reached')
await call('POST', '/staff/check_ins', { ...as(receptionist), status: 403, key: randomUUID(),
  body: { member_id: buyer.id, location_id: location.id, override_reason: 'Not allowed' } })
checkIn = (await call('POST', '/staff/check_ins', { ...as(owner), status: 201, key: randomUUID(),
  body: { member_id: buyer.id, location_id: location.id, override_reason: 'Smoke: manager approved' } })).data
assert.equal(checkIn.result, 'granted')
assert.equal(checkIn.entitlement_id, null)
step('check-in: grant, use the last visit, deny, and override with a reason')

// Renewal at the agreed price, after the price is archived
await call('POST', `/staff/prices/${price.id}/archive`, as(owner))
let detail = (await call('GET', `/staff/members/${buyer.id}`, as(owner))).data
assert.equal(detail.renewal.amount_minor, 10_000)
let renewal = (await call('POST', `/staff/members/${buyer.id}/renewals`, { ...as(owner), status: 201, key: randomUUID(),
  body: { location_id: location.id } })).data
assert.equal(renewal.renewal, true)
assert.equal(renewal.line_item.price_id, price.id)
renewal = (await call('POST', `/staff/sales/${renewal.id}/payments`, { ...as(owner), status: 201, key: randomUUID(),
  body: { amount_minor: 10_000, method: 'cash' } })).data
renewal = (await call('POST', `/staff/sales/${renewal.id}/fulfill`, { ...as(owner), status: 201 })).data
assert.equal(renewal.fulfillment.membership_period.starts_at, sale.fulfillment.membership_period.ends_at)
step('renewal: archived price still renews at the agreed terms, and the period follows on')

// Revoke the renewal, void an empty sale
renewal = (await call('POST', `/staff/sales/${renewal.id}/revoke`, { ...as(owner), body: { reason: 'Smoke: revoke check' } })).data
assert.ok(renewal.fulfillment.revoked_at)
detail = (await call('GET', `/staff/members/${buyer.id}`, as(owner))).data
assert.equal(detail.membership.periods.filter((period) => !period.revoked_at).length, 1)
const extra = (await call('POST', '/staff/products', { ...as(owner), status: 201, body: {
  name: `Smoke Void ${run}`, benefits: [{ name: 'Gym access' }] } })).data
const extraPrice = (await call('POST', `/staff/products/${extra.id}/prices`, { ...as(owner), status: 201,
  body: { label: 'Once', amount_minor: 500, duration_days: 1 } })).data.prices[0]
const mistaken = (await call('POST', '/staff/sales', { ...as(owner), status: 201, key: randomUUID(),
  body: { member_id: buyer.id, price_id: extraPrice.id, location_id: location.id } })).data
const voided = (await call('POST', `/staff/sales/${mistaken.id}/void`, { ...as(owner), body: { reason: 'Smoke: entered twice' } })).data
assert.equal(voided.payment_status, 'void')
await call('POST', `/staff/sales/${mistaken.id}/payments`, { ...as(owner), status: 422, key: randomUUID(), body: { amount_minor: 100, method: 'cash' } })
await call('POST', `/staff/prices/${extraPrice.id}/archive`, as(owner))
step('corrections: revoke one delivery only, void an unpaid sale, refuse payment on it')

// Settings and locations
const placeName = `Smoke Room ${run}`
const place = (await call('POST', '/staff/locations', { ...as(owner), status: 201, body: { name: placeName, address: 'Test only' } })).data
await call('POST', '/staff/locations', { ...as(owner), status: 422, body: { name: placeName } })
await call('PATCH', `/staff/locations/${place.id}`, { ...as(owner), body: { address: null } })
await call('PATCH', '/staff/organization', { ...as(owner), body: { timezone: org.timezone, published: org.published } })
await call('PATCH', '/staff/organization', { ...as(receptionist), status: 403, body: { published: false } })
step('settings: add and edit a location, keep names unique, refuse a receptionist')

// Team through WorkOS
let team = (await call('GET', '/staff/team', as(owner))).data
const desk = team.members.find((person) => person.email === 'receptionist@example.com')
assert.ok(desk?.manageable, 'The owner may manage the receptionist')
team = (await call('POST', '/staff/team/invitations', { ...as(owner), status: 201,
  body: { email: `invite.${run}@example.com`, role: 'receptionist' } })).data
const invitation = team.invitations.find((item) => item.email === `invite.${run}@example.com`)
assert.ok(invitation)
await call('POST', `/staff/team/invitations/${invitation.id}/revoke`, as(owner))
team = (await call('PATCH', `/staff/team/members/${desk.id}`, { ...as(owner), body: { role: 'manager' } })).data
assert.equal(team.members.find((person) => person.id === desk.id).role, 'manager')
team = (await call('PATCH', `/staff/team/members/${desk.id}`, { ...as(owner), body: { role: 'receptionist' } })).data
assert.equal(team.members.find((person) => person.id === desk.id).role, 'receptionist')
const self = team.members.find((person) => person.you)
await call('DELETE', `/staff/team/members/${self.id}`, { ...as(owner), status: 422 })
await call('GET', '/staff/team', { ...as(receptionist), status: 403 })
step('team: invite and revoke, change a role and back through WorkOS, refuse self-removal')

// Member linking and the member area
const mei = (await call('GET', `/staff/members?q=member@example.com`, as(owner))).data.find((item) => item.email === 'member@example.com')
assert.ok(mei, 'Seeded member Mei Lim is missing. Run bin/rails db:seed.')
await call('DELETE', `/staff/members/${mei.id}/link`, as(owner))
await call('GET', '/member/account', { token: member, status: 403 })
const code = (await call('POST', `/staff/members/${mei.id}/link`, { ...as(owner), status: 201 })).data.code
await call('POST', '/member/link', { token: member, status: 422, body: { code: 'AAAA-BBBB-CCCC' } })
const account = (await call('POST', '/member/link', { token: member, status: 201, body: { code: code.toLowerCase() } })).data
assert.equal(account.email, 'member@example.com')
await call('POST', '/member/link', { token: member, status: 422, body: { code } })
await call('GET', '/member/account', { token: member })
await call('GET', '/member/account', { token: member, organization: 'ironworks', status: 403 })
await call('GET', '/staff/members', { token: member, status: 403 })
await call('GET', '/member/account', { token: owner, status: 403 })
step('member: one-time code links the sign-in, the account loads, staff and member access stay apart')

// Report
const report = (await call('GET', '/staff/report?weeks=4', as(owner))).data
assert.equal(report.weeks.length, 4)
assert.ok(report.weeks.at(-1).sale_count >= 2, 'This week includes the smoke sales')
step('report: weekly figures include this run')

console.log('Workflow smoke check passed.')

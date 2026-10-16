import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const base = new URL(process.env.API_BASE_URL || 'http://127.0.0.1:3000')
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) {
  throw new Error('This smoke workflow creates demo records. API_BASE_URL must be local.')
}
const slug = process.env.HYDRAFLOW_SMOKE_ORGANIZATION || 'chainsaw'
const headers = {
  'Content-Type': 'application/json',
  'Hydraflow-Organization': slug,
  Authorization: `Bearer ${process.env.HYDRAFLOW_DEMO_TOKEN || 'hydraflow-local-demo-token'}`,
}
async function call(path, { body, key, status, method = body ? 'POST' : 'GET' } = {}) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: { ...headers, ...(key ? { 'Idempotency-Key': key } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  const payload = await response.json()
  if (status) assert.equal(response.status, status, JSON.stringify(payload))
  else assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(payload)}`)
  return payload.data ?? payload
}

await call('/up')
await call('/ready')
const gym = await call('/public/organization')
assert.equal(gym.slug, slug)
const org = await call('/staff/organization')
assert.equal(org.actor.demo, true, 'Expected the local demo actor')
const products = await call('/staff/products')
const offer = products.find((product) => product.published && product.prices.some((price) => price.available && price.amount_minor > 1))
assert.ok(offer, 'Seed a published paid offer first')
const price = offer.prices.find((item) => item.available && item.amount_minor > 1)
const location = org.locations[0]
assert.ok(location, 'Seed a location first')
const run = randomUUID()
const member = await call('/staff/members', {
  body: { name: 'Smoke Test Member', email: `smoke-${run}@example.test` }, status: 201,
})
const checkBody = { member_id: member.id, location_id: location.id }
const denied = await call('/staff/check_ins', { body: checkBody, key: randomUUID(), status: 201 })
assert.equal(denied.result, 'denied')
const saleBody = { ...checkBody, price_id: price.id }
const saleKey = randomUUID()
const sale = await call('/staff/sales', { body: saleBody, key: saleKey, status: 201 })
const sameSale = await call('/staff/sales', { body: saleBody, key: saleKey, status: 200 })
assert.equal(sameSale.id, sale.id)
const firstAmount = Math.floor(sale.total_minor / 2)
const paymentBody = { amount_minor: firstAmount, method: 'cash' }
const paymentKey = randomUUID()
await call(`/staff/sales/${sale.id}/payments`, { body: paymentBody, key: paymentKey, status: 201 })
const partial = await call(`/staff/sales/${sale.id}/payments`, { body: paymentBody, key: paymentKey, status: 200 })
assert.equal(partial.paid_minor, firstAmount)
const unpaid = await call(`/staff/sales/${sale.id}/fulfill`, { method: 'POST', status: 422 })
assert.equal(unpaid.error.code, 'sale_not_paid')
const paid = await call(`/staff/sales/${sale.id}/payments`, {
  body: { amount_minor: sale.total_minor - firstAmount, method: 'bank_transfer', reference: `smoke-${run}` },
  key: randomUUID(), status: 201,
})
assert.equal(paid.balance_minor, 0)
const fulfilled = await call(`/staff/sales/${sale.id}/fulfill`, { method: 'POST', status: 201 })
const repeat = await call(`/staff/sales/${sale.id}/fulfill`, { method: 'POST', status: 200 })
assert.equal(repeat.fulfillment.id, fulfilled.fulfillment.id)
const checkKey = randomUUID()
const checkIn = await call('/staff/check_ins', { body: checkBody, key: checkKey, status: 201 })
assert.equal(checkIn.result, 'granted')
const replay = await call('/staff/check_ins', { body: checkBody, key: checkKey, status: 200 })
assert.equal(replay.id, checkIn.id)
const detail = await call(`/staff/members/${member.id}`)
assert.equal(detail.membership.periods.length, 1)
assert.ok(detail.entitlements.some((right) => right.used_count === 1))
console.log('PASS: public gym, member, denied access, sale retry, partial/manual payments, fulfillment retry, granted check-in, and single consumption.')
console.log(`Demo member: ${member.id}. Smoke records remain in the local database.`)

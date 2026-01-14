import assert from 'assert'

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
process.env.PSP_WEBHOOK_SECRET = process.env.PSP_WEBHOOK_SECRET || 'psp-test-secret'

function testParsePtNumber(parsePtNumber: (v: unknown) => number | null) {
  assert.strictEqual(parsePtNumber('6,50'), 6.5)
  assert.strictEqual(parsePtNumber('1.234,50'), 1234.5)
  assert.strictEqual(parsePtNumber('0'), 0)
  assert.strictEqual(parsePtNumber(''), null)
}

function testSlugify(slugifyFn: (s: string) => string) {
  assert.strictEqual(slugifyFn('Açaí (polpa)'), 'acai-polpa')
  assert.strictEqual(slugifyFn('CONST'), 'const')
}

function testJwtRoundtrip(
  signAccessToken: (u: { id: string; email: string; role: 'customer' | 'admin' }) => string,
  verifyAccessToken: (t: string) => { id: string; email: string; role: 'customer' | 'admin' },
) {
  const token = signAccessToken({ id: 'u1', email: 'x@y.com', role: 'admin' })
  const payload = verifyAccessToken(token)
  assert.strictEqual(payload.id, 'u1')
  assert.strictEqual(payload.email, 'x@y.com')
  assert.strictEqual(payload.role, 'admin')
}

function testWebhookSignatureDeterministic(signWebhookPayload: (b: Buffer) => string) {
  const body = Buffer.from('{"txid":"t1","status":"PAID"}')
  const sig1 = signWebhookPayload(body)
  const sig2 = signWebhookPayload(body)
  assert.strictEqual(sig1, sig2)
  assert.ok(sig1.length > 10)
}

async function main() {
  const { parsePtNumber } = await import('../utils/parseNumber.js')
  const { slugify } = await import('../utils/slugify.js')
  const { signAccessToken, verifyAccessToken } = await import('../utils/jwt.js')
  const { signWebhookPayload } = await import('../utils/pix.js')

  testParsePtNumber(parsePtNumber)
  testSlugify(slugify)
  testJwtRoundtrip(signAccessToken, verifyAccessToken)
  testWebhookSignatureDeterministic(signWebhookPayload)
  process.stdout.write('tests ok\n')
}

main().catch((err) => {
  process.stderr.write(`${String(err)}\n`)
  process.exit(1)
})

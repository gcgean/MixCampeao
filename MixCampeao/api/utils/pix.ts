import crypto from 'crypto'
import QRCode from 'qrcode'
import { requiredEnv } from './env.js'

export type PixCharge = {
  txid: string
  copyPaste: string
  qrCodeDataUrl: string
  expiresAt: string
}

export function generateTxid(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function signWebhookPayload(rawBody: Buffer): string {
  const secret = requiredEnv('PSP_WEBHOOK_SECRET')
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
}

export async function createMockPixCharge(txid: string, amount: number): Promise<PixCharge> {
  const copyPaste = `000201|MIXCAMPEAO|TXID:${txid}|AMOUNT:${amount.toFixed(2)}`
  const qrCodeDataUrl = await QRCode.toDataURL(copyPaste, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  })
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  return { txid, copyPaste, qrCodeDataUrl, expiresAt }
}


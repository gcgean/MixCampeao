import crypto from 'crypto'
import QRCode from 'qrcode'
import { requiredEnv } from './env.js'
// @ts-ignore
import EfiPay from 'sdk-node-apis-efi'

export type PixCharge = {
  txid: string
  copyPaste: string
  qrCodeDataUrl: string
  expiresAt: string
}

export function generateTxid(): string {
  // Pix TxID must be 26-35 characters
  return crypto.randomUUID().replace(/-/g, '')
}

export function signWebhookPayload(rawBody: Buffer): string {
  const secret = requiredEnv('PIX_WEBHOOK_SECRET')
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
}

export async function createPixCharge(txid: string, amount: number): Promise<PixCharge> {
  const provider = process.env.PIX_PROVIDER || 'mock'
  
  if (provider === 'efi') {
    return createEfiPixCharge(txid, amount)
  }
  
  return createMockPixCharge(txid, amount)
}

async function createEfiPixCharge(txid: string, amount: number): Promise<PixCharge> {
  const options = {
    sandbox: process.env.EFI_SANDBOX !== 'false', // Default to true if not strictly 'false'
    client_id: requiredEnv('EFI_CLIENT_ID'),
    client_secret: requiredEnv('EFI_CLIENT_SECRET'),
    certificate: requiredEnv('EFI_CERT_PATH'),
    validateMtls: false
  }

  const efipay = new EfiPay(options)

  const body = {
    calendario: {
      expiracao: 3600
    },
    valor: {
      original: amount.toFixed(2)
    },
    chave: requiredEnv('EFI_PIX_KEY'),
    solicitacaoPagador: 'Pagamento Mix Campeão'
  }

  const params = {
    txid: txid
  }

  try {
    const response = await efipay.pixCreateImmediateCharge(params, body)
    
    // response.pixCopiaECola is the copy-paste string
    const copyPaste = response.pixCopiaECola
    const qrCodeDataUrl = await QRCode.toDataURL(copyPaste, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
    })
    
    return {
      txid: response.txid,
      copyPaste: copyPaste,
      qrCodeDataUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
    }
  } catch (error: any) {
    console.error('Error creating Efí charge:', error)
    // Log more details if available
    if (error?.response?.data) {
      console.error('Efí Error Data:', JSON.stringify(error.response.data, null, 2))
    }
    throw new Error('Failed to create Pix charge with Efí')
  }
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

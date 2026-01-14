import Button from '@/components/Button'
import Card from '@/components/Card'
import { Copy, RefreshCcw } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PixSidebar({
  purchased,
  segmentHref,
  isLoggedIn,
  onStartPayment,
  payError,
  purchaseId,
  payStatus,
  qrCodeDataUrl,
  copyPaste,
  expiresInText,
  onCopyPix,
}: {
  purchased: boolean
  segmentHref: string
  isLoggedIn: boolean
  onStartPayment: () => void
  payError: string | null
  purchaseId: string | null
  payStatus: string | null
  qrCodeDataUrl: string | null
  copyPaste: string | null
  expiresInText: string | null
  onCopyPix: () => void
}) {
  return (
    <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
      <Card className="p-4">
        <div className="text-sm font-semibold">Passo a passo do Pix</div>
        <ol className="mt-3 space-y-2 text-sm text-white/70">
          <li className="flex gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs">1</span>
            <span>Clique em “Desbloquear por Pix”.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs">2</span>
            <span>Pague no app do seu banco (QR Code ou copia e cola).</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs">3</span>
            <span>Confirmou? O acesso libera automaticamente.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs">4</span>
            <span>Depois, é só abrir pelo “Meus acessos”.</span>
          </li>
        </ol>
        <div className="mt-3">
          {purchased ? (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
              Você já possui acesso.
              <div className="mt-2">
                <Link to={segmentHref}>
                  <Button size="sm" variant="secondary">
                    Abrir relatório
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <Button className="w-full" onClick={onStartPayment}>
              {isLoggedIn ? 'Desbloquear por Pix' : 'Entrar para desbloquear'}
            </Button>
          )}
        </div>
        {payError && <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">{payError}</div>}
      </Card>

      {!purchased && purchaseId && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Checkout Pix</div>
            <div className="text-xs text-white/60">Status: {payStatus || '—'}</div>
          </div>
          <div className="mt-3 grid gap-3">
            {qrCodeDataUrl && (
              <div className="rounded-lg bg-white p-3">
                <img src={qrCodeDataUrl} alt="QR Code Pix" className="mx-auto h-52 w-52" />
              </div>
            )}
            <div>
              <div className="text-xs text-white/60">Pix copia e cola</div>
              <div className="mt-1 rounded-md border border-white/10 bg-white/5 p-2 text-xs text-white/80 break-all">{copyPaste}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button size="sm" variant="secondary" onClick={onCopyPix}>
                  <span className="inline-flex items-center justify-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copiar
                  </span>
                </Button>
                <Button size="sm" variant="ghost" onClick={onStartPayment}>
                  <span className="inline-flex items-center justify-center gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Regerar
                  </span>
                </Button>
              </div>
              {expiresInText && <div className="mt-2 text-xs text-white/60">Expira em: {expiresInText}</div>}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="text-sm font-semibold">Garantia de acesso</div>
        <div className="mt-1 text-sm text-white/60">
          Pix confirmado e não liberou? Eu resolvo para você (libero manualmente ou estorno).
        </div>
      </Card>
    </div>
  )
}


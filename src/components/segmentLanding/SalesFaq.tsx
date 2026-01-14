import Card from '@/components/Card'

export default function SalesFaq({ segmentName }: { segmentName: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Perguntas frequentes</div>
        <div className="text-xs text-white/60">FAQ</div>
      </div>
      <div className="mt-3 grid gap-2">
        <details className="rounded-lg border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-medium">Isso é assinatura?</summary>
          <div className="mt-2 text-sm text-white/70">Não. Você paga uma vez e o acesso fica vinculado à sua conta.</div>
        </details>
        <details className="rounded-lg border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-medium">O que eu recebo ao desbloquear?</summary>
          <div className="mt-2 text-sm text-white/70">
            Um relatório completo do segmento {segmentName}: itens por seção, quantidades ideais, valor médio e total estimado.
          </div>
        </details>
        <details className="rounded-lg border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-medium">Quando libera?</summary>
          <div className="mt-2 text-sm text-white/70">Assim que o Pix for confirmado. A liberação é automática.</div>
        </details>
        <details className="rounded-lg border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-medium">E se eu trocar de celular?</summary>
          <div className="mt-2 text-sm text-white/70">Sem problema. É só entrar com seu email/senha e acessar em “Meus acessos”.</div>
        </details>
        <details className="rounded-lg border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-medium">Posso ver uma amostra antes?</summary>
          <div className="mt-2 text-sm text-white/70">Sim — a página mostra uma prévia Top 3 por seção.</div>
        </details>
      </div>
    </Card>
  )
}


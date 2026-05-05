import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-bg-base text-ink relative overflow-hidden">
      {/*
        Apple-style background: vibrant gradient orbs translúcidos.
        Sem watermarks tipográficos editoriais.
      */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute -top-32 -left-32 size-[480px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute top-1/4 -right-40 size-[520px] rounded-full bg-positive/10 blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 size-[440px] rounded-full bg-warning/8 blur-[160px]" />
      </div>

      <div className="relative z-10 grid lg:grid-cols-[1fr_1fr] min-h-screen">
        {/* Coluna esquerda: brand + manifesto Apple-style */}
        <aside className="hidden lg:flex flex-col justify-between p-12 xl:p-16">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer w-fit">
            <div className="grid place-items-center size-8 rounded-lg bg-accent text-ink-inverse shadow-elev-1">
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M3 4.2 L3 11.8" />
                <path d="M7 6.5 L7 9.5" />
                <path d="M11 3 L13 8 L11 13" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="text-md font-semibold tracking-tight">Ad Manager</span>
          </Link>

          <div className="max-w-lg">
            <h1 className="font-display text-6xl font-bold leading-[1.02] tracking-tight text-ink balance">
              Tráfego pago,<br />
              <span className="bg-gradient-to-r from-accent to-positive bg-clip-text text-transparent">
                simples.
              </span>
            </h1>
            <p className="mt-7 text-lg text-ink-muted leading-relaxed pretty max-w-md">
              Gerencie todas as suas contas Meta Ads em um lugar. Suba 100 anúncios em 5 minutos. Reconcilie vendas reais com UTMs do Hotmart, Kiwify e mais.
            </p>

            <div className="mt-12 grid grid-cols-3 gap-8 max-w-md">
              <Stat n="100+" label="anúncios em 5 min" />
              <Stat n="< 5 min" label="latência da Graph" />
              <Stat n="0" label="erros de upload" />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-ink-dim">
            <span>Versão 0.1 beta</span>
            <span className="size-1 rounded-full bg-positive" />
            <span>São Paulo, Brasil</span>
          </div>
        </aside>

        {/* Coluna direita: formulário em card flutuante */}
        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="bg-bg-surface rounded-2xl shadow-elev-3 p-8 sm:p-10">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold text-ink tracking-tight">{n}</div>
      <div className="text-xs text-ink-dim mt-1.5 leading-snug">{label}</div>
    </div>
  );
}

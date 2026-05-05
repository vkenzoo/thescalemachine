import { ConnectForm } from "@/components/connect/connect-form";
import { Tutorial } from "@/components/connect/tutorial";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { DisconnectButton } from "@/components/connect/disconnect-button";
import type { Metadata } from "next";
import { CheckCircle2, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Conectar Meta",
};

interface ConnectionRow {
  id: string;
  business_manager_name: string | null;
  business_manager_id: string;
  status: string;
  last_synced_at: string | null;
  last_healthcheck_at: string | null;
  ad_accounts_count: number;
}

export default async function ConnectPage() {
  const supabase = await createClient();

  const { data: connections } = await supabase
    .from("meta_connections")
    .select("id, business_manager_name, business_manager_id, status, last_synced_at, last_healthcheck_at, ad_accounts(count)")
    .order("created_at", { ascending: false });

  const rows: ConnectionRow[] = (connections ?? []).map((c: any) => ({
    id: c.id,
    business_manager_name: c.business_manager_name,
    business_manager_id: c.business_manager_id,
    status: c.status,
    last_synced_at: c.last_synced_at,
    last_healthcheck_at: c.last_healthcheck_at,
    ad_accounts_count: c.ad_accounts?.[0]?.count ?? 0,
  }));

  const isFirstConnection = rows.length === 0;

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">
      {/* Hero */}
      <header className="space-y-3">
        <p className="eyebrow text-accent">Conectar Meta</p>
        <h1 className="font-display text-4xl font-bold text-ink tracking-tight balance">
          {isFirstConnection
            ? "Vamos conectar sua conta Meta em 3 passos."
            : "Adicionar mais contas Meta."}
        </h1>
        <p className="text-md text-ink-muted max-w-2xl leading-relaxed pretty">
          Sem espera, sem app review. Você gera um código de acesso vitalício
          dentro do seu Business Manager, cola aqui, e a gente importa todas as
          suas contas em segundos.
        </p>
      </header>

      {/* Wizard progress — só na primeira conexão */}
      {isFirstConnection && (
        <ProgressBar />
      )}

      {/* Existing connections */}
      {rows.length > 0 && (
        <section className="space-y-3">
          <p className="eyebrow">Conexões já ativas</p>
          <div className="space-y-2">
            {rows.map((conn) => (
              <ConnectionCard key={conn.id} conn={conn} />
            ))}
          </div>
        </section>
      )}

      {/* Wizard: tutorial à esquerda, formulário à direita */}
      <section className="grid lg:grid-cols-[minmax(0,440px)_1fr] gap-8 lg:gap-12">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">① Pegar credenciais</p>
            <span className="text-2xs text-ink-dim">~2 min</span>
          </div>
          <Tutorial />
        </div>

        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">② Colar e importar</p>
            <span className="text-2xs text-ink-dim flex items-center gap-1">
              <Zap className="size-3 text-warning" />
              Validação automática
            </span>
          </div>
          <div className="rounded-lg border border-line bg-bg-surface p-6 shadow-elev-1">
            <ConnectForm />
          </div>

          <div className="flex items-center gap-2 text-2xs text-ink-dim justify-center pt-2">
            <Sparkles className="size-3" />
            <span>
              Em breve: <span className="text-ink-muted font-medium">login com 1 clique</span> via OAuth.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProgressBar() {
  const steps = [
    { n: 1, label: "Pegar credenciais", desc: "~2 min no Business Manager" },
    { n: 2, label: "Colar e validar", desc: "~10 segundos" },
    { n: 3, label: "Importar contas", desc: "Pronto pra usar" },
  ];

  return (
    <div className="rounded-xl border border-line bg-bg-surface p-5">
      <div className="flex items-stretch gap-2">
        {steps.map((step, idx) => (
          <div key={step.n} className="flex-1 flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                "size-7 rounded-full grid place-items-center text-2xs font-mono font-bold shrink-0",
                idx === 0
                  ? "bg-accent text-ink-inverse"
                  : "bg-bg-inset text-ink-muted border border-line"
              )}>
                {step.n}
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 w-px bg-line my-1" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <p className={cn(
                "text-sm font-medium leading-tight",
                idx === 0 ? "text-ink" : "text-ink-muted"
              )}>
                {step.label}
              </p>
              <p className="text-2xs text-ink-dim mt-0.5">{step.desc}</p>
            </div>
            {idx < steps.length - 1 && (
              <div className="hidden md:block w-12 h-px bg-line self-center" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionCard({ conn }: { conn: ConnectionRow }) {
  const tone = conn.status === "active" ? "positive" : conn.status === "invalid" ? "warning" : "negative";
  const label =
    conn.status === "active" ? "Saudável" :
    conn.status === "invalid" ? "Token inválido" :
    "Revogado";

  const lastCheck = conn.last_healthcheck_at
    ? new Date(conn.last_healthcheck_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <div className="rounded-lg border border-line bg-bg-surface p-4 flex items-center gap-4">
      <div className="size-10 rounded-md bg-accent-subtle text-accent grid place-items-center shrink-0">
        <MetaIcon className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-ink">
            {conn.business_manager_name ?? `BM ${conn.business_manager_id}`}
          </span>
          <Badge tone={tone} dot size="xs">{label}</Badge>
        </div>
        <div className="mt-1 text-2xs text-ink-dim flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="size-3 text-positive" />
            {conn.ad_accounts_count} conta{conn.ad_accounts_count === 1 ? "" : "s"} de anúncio importada{conn.ad_accounts_count === 1 ? "" : "s"}
          </span>
          {lastCheck && (
            <>
              <span className="opacity-40">·</span>
              <span>Verificado {lastCheck}</span>
            </>
          )}
        </div>
      </div>
      <DisconnectButton connectionId={conn.id} />
    </div>
  );
}

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.5 7.5c-.83 0-1.5.67-1.5 1.5v.75h2.5v2H16v6h-2.5v-6H12v-2h1.5V11c0-1.93 1.57-3.5 3.5-3.5h1v2h-.5z" />
    </svg>
  );
}

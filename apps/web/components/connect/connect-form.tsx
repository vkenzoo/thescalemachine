"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  ShieldCheck,
  XCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

type ValidationState =
  | { kind: "idle" }
  | { kind: "validating" }
  | {
      kind: "ok";
      fbUserName: string;
      bmName: string;
      adAccounts: { id: string; name: string; currency: string; status: "active" | "disabled" }[];
    }
  | { kind: "error"; code: ErrorCode; hint?: string };

type ErrorCode =
  | "invalid_token"
  | "wrong_bm"
  | "missing_scope"
  | "no_accounts"
  | "rate_limited"
  | "network";

const ERROR_COPY: Record<ErrorCode, { title: string; body: string; step: number; action: string }> = {
  invalid_token: {
    title: "Código de acesso não funcionou",
    body: "Pode ter sido copiado incompleto, ou já foi revogado. Volte ao Business Manager e gere um novo.",
    step: 3,
    action: "Ver passo 3",
  },
  wrong_bm: {
    title: "ID do Business Manager não confere",
    body: "Esse ID não corresponde ao código de acesso. Confira o número no canto superior em business.facebook.com → Configurações.",
    step: 1,
    action: "Ver passo 1",
  },
  missing_scope: {
    title: "Faltam permissões no código",
    body: "O token foi criado sem as permissões necessárias. Gere um novo marcando ads_management e business_management.",
    step: 3,
    action: "Ver passo 3",
  },
  no_accounts: {
    title: "Nenhuma conta de anúncio liberada",
    body: "Você precisa atribuir suas contas ao Usuário do Sistema no Business Manager. Sem isso, não temos o que importar.",
    step: 2,
    action: "Ver passo 2",
  },
  rate_limited: {
    title: "Aguarde um momento",
    body: "A Meta limitou as consultas temporariamente. Espera 1 minuto e tenta de novo — não é problema com você.",
    step: 0,
    action: "Tentar de novo",
  },
  network: {
    title: "Falha de conexão",
    body: "Não consegui falar com a Meta. Verifique sua internet e tente de novo.",
    step: 0,
    action: "Tentar de novo",
  },
};

export function ConnectForm() {
  const { push } = useToast();
  const [appId, setAppId] = React.useState("");
  const [appSecret, setAppSecret] = React.useState("");
  const [bmId, setBmId] = React.useState("");
  const [token, setToken] = React.useState("");
  const [showToken, setShowToken] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);
  const [v, setV] = React.useState<ValidationState>({ kind: "idle" });
  const [saving, setSaving] = React.useState(false);

  const canValidate =
    /^\d{8,}$/.test(appId) &&
    appSecret.length >= 20 &&
    /^\d{8,}$/.test(bmId) &&
    token.length > 30;

  // Validação em tempo real (debounced 700ms) — chama /api/meta/connect/validate de verdade.
  // O endpoint server-side roda /me, /me/permissions, /{bm}, /me/adaccounts contra a Graph API.
  React.useEffect(() => {
    if (!canValidate) {
      setV({ kind: "idle" });
      return;
    }
    setV({ kind: "validating" });

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/meta/connect/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: token,
            business_manager_id: bmId,
            app_id: appId,
            app_secret: appSecret,
          }),
          signal: ctrl.signal,
        });
        const data = await res.json();

        if (!res.ok || data.ok === false) {
          setV({ kind: "error", code: (data.error ?? "network") as ErrorCode });
          return;
        }

        setV({
          kind: "ok",
          fbUserName: data.fb_user_name,
          bmName: data.business_manager_name,
          adAccounts: data.ad_accounts.map((a: any) => ({
            id: a.id,
            name: a.name,
            currency: a.currency,
            status: a.account_status === 1 ? "active" : "disabled",
          })),
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setV({ kind: "error", code: "network" });
      }
    }, 700);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [token, bmId, appId, appSecret, canValidate]);

  const handleSave = async () => {
    if (v.kind !== "ok") return;
    setSaving(true);

    try {
      const res = await fetch("/api/meta/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: token,
          business_manager_id: bmId,
          app_id: appId,
          app_secret: appSecret,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.ok === false) {
        push({
          tone: "error",
          title: "Erro ao salvar conexão",
          description: data.detail ?? data.error ?? "Tente novamente",
        });
        return;
      }

      push({
        tone: "success",
        title: "Conexão salva",
        description: `${data.accounts_count} ad accounts importadas de ${data.business_manager_name}.`,
      });

      // Limpa o form depois de salvar
      setAppId("");
      setAppSecret("");
      setBmId("");
      setToken("");
      setV({ kind: "idle" });

      // Reload pra refrescar a lista de conexões existentes
      setTimeout(() => window.location.reload(), 800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5">
        {/* App ID + App Secret — do app que o cliente criou */}
        <Field
          step={1}
          label="App ID"
          hint="Aparece no topo da página do seu app em developers.facebook.com, em Configurações → Básico."
          example="123456789012345"
          filled={/^\d{8,}$/.test(appId)}
        >
          <Input
            value={appId}
            onChange={(e) => setAppId(e.target.value.replace(/\D/g, ""))}
            placeholder="Cole aqui o App ID"
            inputMode="numeric"
            mono
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        <Field
          step={2}
          label="App Secret"
          hint="Na mesma tela do App ID. Clique em 'Mostrar' e digite sua senha do Facebook pra revelar."
          example="abcdef1234567890abcdef1234567890"
          filled={appSecret.length >= 20}
        >
          <div className="relative">
            <Input
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value.trim())}
              type={showSecret ? "text" : "password"}
              placeholder="Cole aqui o App Secret"
              mono
              autoComplete="off"
              spellCheck={false}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-1 top-1 size-7 inline-flex items-center justify-center rounded text-ink-dim hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer"
              aria-label={showSecret ? "Ocultar secret" : "Mostrar secret"}
            >
              {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
        </Field>

        {/* BM ID */}
        <Field
          step={3}
          label="ID do Business Manager"
          hint="Número de 15+ dígitos em business.facebook.com → Configurações do Negócio."
          example="166952352663250"
          filled={/^\d{8,}$/.test(bmId)}
        >
          <Input
            value={bmId}
            onChange={(e) => setBmId(e.target.value.replace(/\D/g, ""))}
            placeholder="Cole aqui o ID do BM"
            inputMode="numeric"
            mono
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        {/* Token */}
        <Field
          step={4}
          label="Código de acesso"
          hint="O token vitalício que você gerou no Usuário do Sistema. Começa com EAA…"
          example="EAABwzLixnjYBO7ZB..."
          filled={token.length > 30}
        >
          <div className="relative">
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value.trim())}
              type={showToken ? "text" : "password"}
              placeholder="Cole aqui o código de acesso"
              mono
              autoComplete="off"
              spellCheck={false}
              className="pr-20"
            />
            <div className="absolute right-1 top-1 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => navigator.clipboard.readText().then((t) => setToken(t.trim())).catch(() => {})}
                className="size-7 inline-flex items-center justify-center rounded text-ink-dim hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer"
                aria-label="Colar do clipboard"
                title="Colar do clipboard"
              >
                <Copy className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="size-7 inline-flex items-center justify-center rounded text-ink-dim hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer"
                aria-label={showToken ? "Ocultar código" : "Mostrar código"}
                title={showToken ? "Ocultar" : "Mostrar"}
              >
                {showToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
        </Field>
      </div>

      {/* Validation feedback */}
      <ValidationPanel state={v} hasInput={canValidate} />

      {/* Action */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-2xs text-ink-dim flex items-center gap-1.5 leading-snug">
          <ShieldCheck className="size-3.5 shrink-0" />
          Seu código fica criptografado no banco — só nosso servidor consegue usar.
        </p>
        <Button
          variant="primary"
          size="lg"
          loading={saving}
          disabled={v.kind !== "ok"}
          onClick={handleSave}
        >
          {!saving && <Sparkles />}
          {v.kind === "ok"
            ? `Importar ${v.adAccounts.filter(a => a.status === "active").length} conta${v.adAccounts.filter(a => a.status === "active").length === 1 ? "" : "s"}`
            : "Conectar"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  step,
  label,
  hint,
  example,
  filled,
  children,
}: {
  step?: number;
  label: string;
  hint: string;
  example?: string;
  filled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          {step !== undefined && (
            <span className={cn(
              "size-5 rounded-full grid place-items-center text-[10px] font-mono font-semibold shrink-0",
              filled
                ? "bg-positive text-ink-inverse"
                : "bg-bg-inset text-ink-muted border border-line"
            )}>
              {filled ? <CheckCircle2 className="size-3" /> : step}
            </span>
          )}
          <Label>{label}</Label>
        </div>
        {example && (
          <span className="font-mono text-2xs text-ink-dim tracking-tight">
            ex: {example}
          </span>
        )}
      </div>
      {children}
      <p className="text-2xs text-ink-dim leading-snug">{hint}</p>
    </div>
  );
}

function ValidationPanel({ state, hasInput }: { state: ValidationState; hasInput: boolean }) {
  if (state.kind === "idle" && !hasInput) {
    return (
      <div className="rounded-md border border-dashed border-line bg-bg-inset/50 px-4 py-3.5">
        <p className="text-xs text-ink-dim leading-relaxed">
          Assim que você colar os dois campos acima, verificamos na hora se está tudo certo.
        </p>
      </div>
    );
  }

  if (state.kind === "validating") {
    return (
      <div className="rounded-md border border-line bg-bg-inset px-4 py-3.5 flex items-center gap-3 animate-fade-in">
        <Loader2 className="size-4 text-ink-muted animate-spin shrink-0" />
        <div>
          <p className="text-sm font-medium text-ink">Verificando suas credenciais com a Meta…</p>
          <p className="text-2xs text-ink-dim mt-0.5">Isso leva uns 2 segundos.</p>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    const err = ERROR_COPY[state.code];
    return (
      <div className="rounded-md border border-negative/30 bg-negative-subtle/40 px-4 py-3.5 flex items-start gap-3 animate-slide-up">
        <XCircle className="size-4 text-negative shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-negative leading-tight">{err.title}</p>
          <p className="text-xs text-ink-muted mt-1 leading-relaxed">{err.body}</p>
          {err.step > 0 && (
            <a
              href={`#step-${err.step}`}
              className="mt-2 inline-flex items-center gap-1 text-2xs font-medium text-negative hover:underline"
              onClick={(e) => {
                // Scroll suave + flash de destaque no passo
                e.preventDefault();
                const el = document.getElementById(`step-${err.step}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.click();
                }
              }}
            >
              {err.action}
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    );
  }

  if (state.kind === "ok") {
    const activeCount = state.adAccounts.filter((a) => a.status === "active").length;
    return (
      <div className="rounded-md border border-positive/30 bg-positive-subtle/30 overflow-hidden animate-slide-up">
        <div className="flex items-start gap-3 px-4 py-3.5 border-b border-positive/15">
          <CheckCircle2 className="size-4 text-positive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink leading-tight">
              Tudo certo, <span className="text-positive">{state.fbUserName}</span>!
            </p>
            <p className="text-xs text-ink-muted mt-1">
              Encontramos suas contas em <strong className="text-ink">{state.bmName}</strong>.
              Confere e clica em Importar:
            </p>
          </div>
          <Badge tone="positive" dot>
            {activeCount} ativa{activeCount === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="max-h-56 overflow-y-auto bg-bg-inset/50">
          {state.adAccounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center gap-3 px-4 py-2 border-b border-line last:border-b-0 text-xs"
            >
              <span
                className={cn(
                  "size-1.5 rounded-full shrink-0",
                  acc.status === "active" ? "bg-positive" : "bg-ink-dim"
                )}
              />
              <span className="text-ink truncate flex-1">{acc.name}</span>
              <span className="font-mono text-2xs text-ink-dim tracking-tight">{acc.id}</span>
              <span className="font-mono text-2xs text-ink-muted w-10 text-right">{acc.currency}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

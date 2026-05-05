"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

/**
 * /reset — destino do link clicado no e-mail de "Recuperar senha".
 * Supabase já consumiu o token via URL hash e criou uma sessão temporária —
 * basta chamar updateUser({ password }) e mandar pro app.
 */
export default function ResetPage() {
  const router = useRouter();
  const { push } = useToast();
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [pwd, setPwd] = React.useState("");

  const checks = {
    length: pwd.length >= 8,
    case: /[A-Z]/.test(pwd) && /[a-z]/.test(pwd),
    digit: /\d/.test(pwd),
  };
  const allChecksPass = checks.length && checks.case && checks.digit;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allChecksPass) {
      push({ tone: "warning", title: "Senha não atende os critérios" });
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pwd });

    setLoading(false);

    if (error) {
      push({ tone: "error", title: "Erro ao trocar senha", description: error.message });
      return;
    }

    push({ tone: "success", title: "Senha atualizada", description: "Você já está logado." });
    router.push("/");
  };

  return (
    <div className="space-y-7 animate-slide-up">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Nova senha
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Defina uma senha segura. Você será logado automaticamente após salvar.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password">Nova senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
              autoFocus
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded inline-flex items-center justify-center text-ink-dim hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer"
              aria-label={showPwd ? "Ocultar" : "Mostrar"}
            >
              {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          <ul className="text-2xs text-ink-dim space-y-0.5 pt-1.5">
            <Check passed={checks.length}>Pelo menos 8 caracteres</Check>
            <Check passed={checks.case}>Maiúscula e minúscula</Check>
            <Check passed={checks.digit}>Pelo menos um número</Check>
          </ul>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          disabled={!allChecksPass}
          className="w-full"
        >
          {!loading && <Lock />}
          Salvar nova senha
          {!loading && <ArrowRight />}
        </Button>
      </form>

      <p className="text-center text-xs text-ink-muted">
        <Link href="/login" className="text-accent font-medium hover:underline">
          Voltar pro login
        </Link>
      </p>
    </div>
  );
}

function Check({ passed, children }: { passed: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`size-3.5 rounded-full grid place-items-center ${passed ? "bg-positive/15 text-positive" : "bg-bg-inset text-ink-dim border border-line"}`}>
        {passed && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={passed ? "text-positive" : ""}>{children}</span>
    </li>
  );
}

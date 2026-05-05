"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

export default function SignupPage() {
  const router = useRouter();
  const { push } = useToast();
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pwd, setPwd] = React.useState("");

  const checks = {
    length: pwd.length >= 8,
    case: /[A-Z]/.test(pwd) && /[a-z]/.test(pwd),
    digit: /\d/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const allChecksPass = checks.length && checks.case && checks.digit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allChecksPass) {
      push({ tone: "warning", title: "Senha não atende os critérios" });
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pwd,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      push({ tone: "error", title: "Falha no cadastro", description: error.message });
      return;
    }

    push({
      tone: "success",
      title: "Conta criada",
      description: "Verifique seu e-mail pra confirmar e entrar.",
    });
    router.push("/login");
  };

  return (
    <div className="space-y-7 animate-slide-up">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Criar conta
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          7 dias grátis no plano Pro. Sem cartão.
        </p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="João Silva"
            autoComplete="name"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail profissional</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="new-password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded inline-flex items-center justify-center text-ink-dim hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer"
              aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {/* Strength indicator */}
          <div className="pt-1.5 space-y-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-0.5 flex-1 rounded transition-colors ${
                    i < score
                      ? score === 1
                        ? "bg-negative"
                        : score === 2
                        ? "bg-warning"
                        : "bg-positive"
                      : "bg-line"
                  }`}
                />
              ))}
            </div>
            <ul className="text-2xs text-ink-dim space-y-0.5">
              <Check passed={checks.length}>Pelo menos 8 caracteres</Check>
              <Check passed={checks.case}>Maiúscula e minúscula</Check>
              <Check passed={checks.digit}>Pelo menos um número</Check>
            </ul>
          </div>
        </div>

        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
          Criar conta
          {!loading && <ArrowRight />}
        </Button>

        <p className="text-2xs text-ink-dim leading-relaxed">
          Ao criar conta você aceita os{" "}
          <Link href="/terms" className="text-ink-muted hover:text-accent underline-offset-4 hover:underline">
            Termos
          </Link>{" "}
          e a{" "}
          <Link href="/privacy" className="text-ink-muted hover:text-accent underline-offset-4 hover:underline">
            Política de Privacidade
          </Link>
          .
        </p>
      </form>

      <p className="text-center text-xs text-ink-muted">
        Já tem conta?{" "}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

function Check({ passed, children }: { passed: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className={`size-3.5 rounded-full grid place-items-center ${
          passed ? "bg-positive/15 text-positive" : "bg-bg-inset text-ink-dim border border-line"
        }`}
      >
        {passed && <CheckIcon />}
      </span>
      <span className={passed ? "text-positive" : ""}>{children}</span>
    </li>
  );
}
function CheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

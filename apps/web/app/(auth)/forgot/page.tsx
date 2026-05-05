"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

export default function ForgotPasswordPage() {
  const { push } = useToast();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset`,
    });

    setLoading(false);

    if (error) {
      push({ tone: "error", title: "Erro ao enviar e-mail", description: error.message });
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-6 animate-slide-up text-center">
        <div className="size-14 rounded-2xl bg-positive-subtle text-positive grid place-items-center mx-auto">
          <CheckCircle2 className="size-7" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Verifique seu e-mail
          </h1>
          <p className="mt-2 text-sm text-ink-muted leading-relaxed pretty">
            Enviamos um link de redefinição de senha para{" "}
            <strong className="text-ink font-medium">{email}</strong>. Verifique também a caixa de spam.
          </p>
        </div>
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="w-full"
          >
            Tentar com outro e-mail
          </Button>
          <Link
            href="/login"
            className="text-xs text-ink-dim hover:text-accent inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="size-3" />
            Voltar pro login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-slide-up">
      <header>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-ink-dim hover:text-accent transition-colors mb-5"
        >
          <ArrowLeft className="size-3" />
          Voltar
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Recuperar senha
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Digite seu e-mail e enviamos um link pra você criar uma nova senha.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail da conta</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            autoComplete="email"
            required
            autoFocus
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          disabled={!email}
          className="w-full"
        >
          {!loading && <Mail />}
          Enviar link de redefinição
          {!loading && <ArrowRight />}
        </Button>
      </form>

      <p className="text-center text-xs text-ink-muted">
        Lembrou a senha?{" "}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

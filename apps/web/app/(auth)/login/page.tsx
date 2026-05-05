"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const next = searchParams.get("next") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      push({
        tone: "error",
        title: "Falha no login",
        description: error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message,
      });
      return;
    }

    push({ tone: "success", title: "Bem-vindo de volta" });
    router.push(next);
    router.refresh();
  };

  return (
    <div className="space-y-7 animate-slide-up">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Bem-vindo
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Entre na sua conta para continuar.
        </p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              href="/forgot"
              className="text-2xs text-ink-dim hover:text-accent transition-colors font-medium tracking-wide"
            >
              Esqueci minha senha
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
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
        </div>

        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
          Entrar
          {!loading && <ArrowRight />}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-2xs uppercase tracking-widest">
          <span className="bg-bg-base px-3 text-ink-dim">ou</span>
        </div>
      </div>

      <Button variant="secondary" size="lg" className="w-full">
        <GoogleIcon />
        Continuar com Google
      </Button>

      <p className="text-center text-xs text-ink-muted">
        Ainda não tem conta?{" "}
        <Link href="/signup" className="text-accent font-medium hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 11v3.7h5.2c-.2 1.3-1.5 3.7-5.2 3.7-3.1 0-5.7-2.6-5.7-5.7s2.6-5.7 5.7-5.7c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.6 4.5 14.5 3.5 12 3.5 7.3 3.5 3.5 7.3 3.5 12s3.8 8.5 8.5 8.5c4.9 0 8.2-3.4 8.2-8.3 0-.6 0-1-.1-1.2H12z" />
    </svg>
  );
}

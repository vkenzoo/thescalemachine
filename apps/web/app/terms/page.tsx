import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Termos de Uso",
};

export default function TermsPage() {
  return (
    <LegalShell title="Termos de Uso" updatedAt="03 de maio de 2026">
      <Section title="1. Aceitação">
        <p>
          Ao criar uma conta no Ad Manager você concorda integralmente com estes Termos de Uso e
          com a Política de Privacidade. Se você não concorda, não use o serviço.
        </p>
      </Section>

      <Section title="2. Descrição do serviço">
        <p>
          O Ad Manager é uma plataforma de gestão de tráfego pago para Meta Ads, oferecendo edição em
          massa, regras automatizadas, monitoramento de saldo, atribuição UTM cruzada com plataformas
          de checkout brasileiras e relatórios compartilháveis.
        </p>
      </Section>

      <Section title="3. Conta e responsabilidades">
        <p>
          Você é responsável por manter a segurança das suas credenciais e por toda atividade
          realizada pela sua conta. Tokens de acesso à Meta API são criptografados em repouso, mas
          o cuidado com phishing e compartilhamento indevido é seu.
        </p>
      </Section>

      <Section title="4. Conteúdo de campanhas">
        <p>
          Você mantém todos os direitos sobre seus criativos, textos, segmentações e dados. O Ad
          Manager funciona como ferramenta de operação — não armazena criativos além do necessário
          para upload e processamento via Graph API.
        </p>
      </Section>

      <Section title="5. Cancelamento e reembolso">
        <p>
          Você pode cancelar a assinatura a qualquer momento sem multa. O acesso continua até o fim
          do período já pago. Em planos anuais, devolvemos proporcionalmente os meses não utilizados.
        </p>
      </Section>

      <Section title="6. Limitações de responsabilidade">
        <p>
          O Ad Manager é uma camada de operação sobre a Meta API. Não nos responsabilizamos por
          interrupções da própria Meta, mudanças de política da plataforma ou sub-reporting do Pixel.
          Faturamento de campanhas é cobrado diretamente pela Meta — nós não tocamos nesse fluxo
          financeiro.
        </p>
      </Section>

      <Section title="7. Mudanças nestes termos">
        <p>
          Podemos atualizar estes termos quando necessário. Mudanças relevantes são comunicadas por
          e-mail e dentro do app na seção Novidades. O uso continuado após uma atualização equivale
          a aceitação.
        </p>
      </Section>

      <Section title="8. Contato">
        <p>
          Dúvidas? Entre em contato:{" "}
          <a href="mailto:contato@admanager.com.br" className="text-accent hover:underline">
            contato@admanager.com.br
          </a>
        </p>
      </Section>
    </LegalShell>
  );
}

// =============================================================
// Legal page shell
// =============================================================
export function LegalShell({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-base text-ink">
      {/* Top bar minimal */}
      <div className="border-b border-line bg-bg-surface/40">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid place-items-center size-7 rounded-md bg-accent text-ink-inverse">
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M3 4.2 L3 11.8" />
                <path d="M7 6.5 L7 9.5" />
                <path d="M11 3 L13 8 L11 13" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">Ad Manager</span>
          </Link>
          <Link
            href="/login"
            className="text-xs text-ink-dim hover:text-accent inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="size-3" />
            Voltar
          </Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <header>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink balance">
            {title}
          </h1>
          <p className="text-xs text-ink-dim mt-3 font-mono">Atualizado em {updatedAt}</p>
        </header>

        <article className="prose prose-sm max-w-none space-y-7">
          {children}
        </article>

        <footer className="pt-10 mt-10 border-t border-line flex items-center justify-between text-xs text-ink-dim">
          <Link href="/terms" className="hover:text-accent transition-colors">Termos de Uso</Link>
          <Link href="/privacy" className="hover:text-accent transition-colors">Política de Privacidade</Link>
          <a href="mailto:contato@admanager.com.br" className="hover:text-accent transition-colors">
            contato@admanager.com.br
          </a>
        </footer>
      </main>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-md font-semibold text-ink">{title}</h2>
      <div className="text-sm text-ink-muted leading-relaxed pretty">{children}</div>
    </section>
  );
}

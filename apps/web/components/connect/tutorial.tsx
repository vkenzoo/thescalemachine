"use client";

import * as React from "react";
import { ExternalLink, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface Step {
  n: number;
  title: string;
  hint: string;
  body: React.ReactNode;
  cta?: { label: string; href: string };
  illustration: React.ReactNode;
}

const STEPS: Step[] = [
  {
    n: 1,
    title: "Crie um app no Meta for Developers",
    hint: "3 minutos",
    body: (
      <>
        Acesse{" "}
        <span className="font-mono text-ink">developers.facebook.com</span> →{" "}
        <strong className="text-ink">Meus Apps</strong> → botão{" "}
        <strong className="text-ink">Criar App</strong>. Escolha o tipo{" "}
        <strong className="text-ink">Empresarial</strong>. Dê um nome qualquer (ex:{" "}
        <span className="font-mono text-ink">"Meu Gestor de Tráfego"</span>) — é só pra você.
        Depois adicione o produto <strong className="text-ink">Marketing API</strong>.
        Em <strong className="text-ink">Configurações → Básico</strong>, copie o{" "}
        <strong className="text-ink">App ID</strong> e o{" "}
        <strong className="text-ink">App Secret</strong> (clica em Mostrar).
      </>
    ),
    cta: { label: "Abrir Meta for Developers", href: "https://developers.facebook.com/apps" },
    illustration: <CreateAppMockup />,
  },
  {
    n: 2,
    title: "Encontre o ID do seu Business Manager",
    hint: "30 segundos",
    body: (
      <>
        Acesse{" "}
        <span className="font-mono text-ink">business.facebook.com</span> →{" "}
        <strong className="text-ink">Configurações do Negócio</strong>. O ID
        aparece no canto superior, abaixo do nome do BM. É um número de 15+
        dígitos.
      </>
    ),
    cta: { label: "Abrir Business Manager", href: "https://business.facebook.com/settings" },
    illustration: <BmIdMockup />,
  },
  {
    n: 3,
    title: "Crie um Usuário do Sistema com permissão de Admin",
    hint: "1 minuto",
    body: (
      <>
        No menu esquerdo:{" "}
        <strong className="text-ink">Usuários → Usuários do Sistema</strong> →{" "}
        botão <strong className="text-ink">Adicionar</strong>. Dê um nome (ex:
        "Ad Manager") e marque <strong className="text-ink">Admin</strong>.
        Depois clique em{" "}
        <strong className="text-ink">Adicionar Ativos</strong> → marque suas
        contas de anúncio com permissão{" "}
        <strong className="text-ink">Gerenciar conta de anúncios</strong>.
      </>
    ),
    cta: { label: "Abrir Usuários do Sistema", href: "https://business.facebook.com/settings/system-users" },
    illustration: <SystemUserMockup />,
  },
  {
    n: 4,
    title: "Gere o token vitalício do Usuário do Sistema",
    hint: "1 minuto",
    body: (
      <>
        <p>
          Ainda na tela <strong className="text-ink">Usuários do Sistema</strong>,
          com o usuário selecionado, siga 2 etapas dentro desse painel:
        </p>
        <p className="mt-2">
          <strong className="text-ink">A) Atribua suas contas de anúncios ao usuário</strong>
          <br />
          Clica em <strong className="text-ink">Adicionar ativos</strong> →{" "}
          <strong className="text-ink">Contas de Anúncios</strong> → marca todas que
          você quer gerenciar → permissão <strong className="text-ink">Acesso total</strong>{" "}
          → Salvar. <span className="text-warning">Sem isso o token não enxerga as contas.</span>
        </p>
        <p className="mt-2">
          <strong className="text-ink">B) Clica no botão "Gerar novo token"</strong>
          <br />
          Preenche assim:
        </p>
        <ul className="mt-1 ml-4 list-disc text-2xs space-y-0.5 text-ink-muted">
          <li><strong className="text-ink">App:</strong> o app que você criou no passo 1</li>
          <li><strong className="text-ink">Validade:</strong> Nunca</li>
          <li><strong className="text-ink">Permissões:</strong> marca os 4 →{" "}
            <span className="font-mono text-ink">ads_management</span>,{" "}
            <span className="font-mono text-ink">ads_read</span>,{" "}
            <span className="font-mono text-ink">business_management</span>,{" "}
            <span className="font-mono text-ink">read_insights</span>
          </li>
        </ul>
        <p className="mt-2 text-warning">
          ⚠ Aparece a string longa começando com <span className="font-mono">EAA…</span> →{" "}
          <strong>copia agora</strong>. O Meta NÃO mostra de novo. Se perder, gera outro.
        </p>
      </>
    ),
    illustration: <TokenMockup />,
  },
  {
    n: 5,
    title: "Cole tudo aqui no formulário",
    hint: "10 segundos",
    body: (
      <>
        Cole os <strong className="text-ink">4 dados</strong> nos campos ao lado:
        App ID, App Secret, ID do BM e código de acesso. Verificamos tudo na
        hora e mostramos suas contas antes de importar.
      </>
    ),
    illustration: <PasteMockup />,
  },
];

export function Tutorial() {
  const [active, setActive] = React.useState(1);

  return (
    <div className="space-y-2">
      {STEPS.map((step) => (
        <StepCard
          key={step.n}
          step={step}
          isActive={active === step.n}
          onActivate={() => setActive(step.n)}
        />
      ))}
    </div>
  );
}

function StepCard({
  step,
  isActive,
  onActivate,
}: {
  step: Step;
  isActive: boolean;
  onActivate: () => void;
}) {
  return (
    <div
      id={`step-${step.n}`}
      className={cn(
        "rounded-lg border transition-all",
        isActive
          ? "border-accent/30 bg-accent-subtle/15 shadow-elev-1"
          : "border-line bg-bg-surface hover:border-line-strong"
      )}
    >
      <button
        type="button"
        onClick={onActivate}
        className="w-full text-left p-3 flex items-start gap-3 cursor-pointer"
      >
        <span
          className={cn(
            "size-7 rounded-full grid place-items-center text-2xs font-mono font-semibold shrink-0 mt-0.5",
            isActive ? "bg-accent text-ink-inverse" : "bg-bg-inset text-ink-muted border border-line"
          )}
        >
          {step.n}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn(
              "text-sm font-medium leading-tight",
              isActive ? "text-ink" : "text-ink-muted"
            )}>
              {step.title}
            </p>
            <span className="text-2xs text-ink-dim">· {step.hint}</span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 mt-1 text-ink-dim transition-transform",
            isActive && "rotate-180 text-accent"
          )}
        />
      </button>

      {isActive && (
        <div className="px-3 pb-4 pt-0 space-y-3 animate-fade-in">
          <div className="text-xs text-ink-muted leading-relaxed pretty pl-10">
            {step.body}
          </div>
          <div className="pl-10">{step.illustration}</div>
          {step.cta && (
            <div className="pl-10">
              <a
                href={step.cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-2xs text-accent hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {step.cta.label}
                <ExternalLink className="size-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================
// Mini-screenshots em SVG (estilizados, sem bater logos)
// =============================================================

function CreateAppMockup() {
  return (
    <div className="rounded-md border border-line bg-bg-base p-3 text-2xs space-y-2">
      <div className="font-medium text-ink-muted text-[10px] uppercase tracking-wider">
        Configurações → Básico
      </div>
      <div className="rounded border border-line bg-bg-elevated p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-ink-dim">App ID</span>
          <span className="text-accent font-mono font-medium">1541435410963706</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-ink-dim">App Secret</span>
          <span className="text-accent font-mono font-medium">cebc0f3b7fc6a410…</span>
        </div>
      </div>
      <div className="text-ink-dim italic text-[10px]">
        ↑ Esses 2 campos vão pro form
      </div>
    </div>
  );
}

function BmIdMockup() {
  return (
    <div className="rounded-md border border-line bg-bg-base p-3 text-2xs space-y-2">
      <div className="flex items-center gap-2">
        <div className="size-6 rounded bg-accent-subtle text-accent grid place-items-center font-bold">
          F
        </div>
        <div className="flex-1">
          <div className="font-medium text-ink">Sua Empresa LTDA</div>
          <div className="text-ink-dim font-mono flex items-center gap-1.5">
            ID: <span className="text-accent font-medium">1194498027652250</span>
            <span className="size-3.5 rounded bg-accent/20 grid place-items-center text-[8px] text-accent">
              ↗
            </span>
          </div>
        </div>
      </div>
      <div className="text-ink-dim italic text-[10px]">
        ↑ Esse número é o que você vai colar
      </div>
    </div>
  );
}

function SystemUserMockup() {
  return (
    <div className="rounded-md border border-line bg-bg-base p-3 text-2xs space-y-2">
      <div className="font-medium text-ink-muted text-[10px] uppercase tracking-wider">
        Usuários do Sistema
      </div>
      <div className="rounded border border-accent/30 bg-accent-subtle/30 p-2 flex items-center gap-2">
        <div className="size-5 rounded-full bg-accent grid place-items-center text-ink-inverse text-[9px] font-bold">
          A
        </div>
        <div className="flex-1">
          <div className="font-medium text-ink">Ad Manager Token</div>
          <div className="text-ink-dim text-[10px]">Função: Admin</div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-ink-muted">
          <Check className="size-3 text-positive" /> FC - 01 (Gerenciar)
        </div>
        <div className="flex items-center gap-1.5 text-ink-muted">
          <Check className="size-3 text-positive" /> FC - 02 (Gerenciar)
        </div>
        <div className="flex items-center gap-1.5 text-ink-muted">
          <Check className="size-3 text-positive" /> FC - 03 (Gerenciar)
        </div>
      </div>
    </div>
  );
}

function TokenMockup() {
  return (
    <div className="rounded-md border border-line bg-bg-base p-3 text-2xs space-y-2">
      <div className="font-medium text-ink-muted text-[10px] uppercase tracking-wider">
        Gerar token
      </div>
      <div className="rounded border border-line bg-bg-elevated p-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-ink-dim">App</span>
          <span className="text-ink font-medium">Ad Manager</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-dim">Validade</span>
          <span className="text-positive font-medium">Nunca</span>
        </div>
        <div className="border-t border-line/50 pt-1.5 space-y-0.5">
          <div className="flex items-center gap-1.5 text-ink-muted text-[10px]">
            <Check className="size-3 text-positive" />
            <span className="font-mono">ads_management</span>
          </div>
          <div className="flex items-center gap-1.5 text-ink-muted text-[10px]">
            <Check className="size-3 text-positive" />
            <span className="font-mono">business_management</span>
          </div>
        </div>
      </div>
      <div className="rounded bg-warning-subtle/40 border border-warning/20 p-1.5 text-[10px] text-warning leading-tight">
        ⚠ Copie o token agora — ele só aparece uma vez
      </div>
    </div>
  );
}

function PasteMockup() {
  return (
    <div className="rounded-md border border-line bg-bg-base p-3 text-2xs space-y-1.5">
      {[
        { label: "App ID", value: "1541435410963706" },
        { label: "App Secret", value: "cebc0f3b7fc6a410..." },
        { label: "ID do BM", value: "1194498027652250" },
        { label: "Código de acesso", value: "EAAV57WYdXPo...lbdPM" },
      ].map((row) => (
        <div key={row.label} className="space-y-0.5">
          <div className="text-[9px] uppercase tracking-wider font-medium text-ink-dim">
            {row.label}
          </div>
          <div className="rounded border border-positive/30 bg-positive-subtle/30 px-2 py-0.5 font-mono text-positive truncate text-[11px]">
            {row.value}
            <span className="ml-2 text-positive">✓</span>
          </div>
        </div>
      ))}
      <div className="text-ink-dim text-[10px] italic pt-1">
        ↑ Validamos automaticamente em ~2 segundos
      </div>
    </div>
  );
}

import { LegalShell, Section } from "../terms/page";

export const metadata = {
  title: "Política de Privacidade",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Política de Privacidade" updatedAt="03 de maio de 2026">
      <Section title="1. O que coletamos">
        <p>
          <strong className="text-ink">Dados de cadastro:</strong> nome, e-mail, telefone, IP da
          sessão e logs de acesso.
        </p>
        <p>
          <strong className="text-ink">Dados de uso:</strong> ações realizadas no app (qual conta
          selecionou, quais regras criou, quando rodou um relatório). Usamos para melhorar a
          ferramenta — nunca vendemos.
        </p>
        <p>
          <strong className="text-ink">Dados da Meta:</strong> via System User Token, lemos
          campanhas, conjuntos, anúncios, métricas de performance e estrutura de Ad Accounts. Você
          autoriza esse acesso e pode revogar a qualquer momento no Business Manager.
        </p>
        <p>
          <strong className="text-ink">Webhooks UTM:</strong> recebemos eventos de venda das
          plataformas de checkout que você conectar (Hotmart, Kiwify, Eduzz, Guru, Hubla). Apenas
          UTMs e identificadores da venda — nunca dados pessoais do comprador final.
        </p>
      </Section>

      <Section title="2. Como armazenamos">
        <p>
          Tokens de acesso à Meta API são <strong className="text-ink">criptografados em repouso</strong>{" "}
          com AES-256-GCM antes de ir pro banco. A chave fica em variável de ambiente, separada do
          banco. Mesmo um vazamento de DB não expõe os tokens em texto claro.
        </p>
        <p>
          Toda comunicação é HTTPS/TLS 1.3. Senhas são hashadas com bcrypt (12 rounds).
        </p>
      </Section>

      <Section title="3. Quem tem acesso">
        <p>
          Apenas você e os membros da sua equipe que você convidar explicitamente. Nosso time
          interno só acessa dados quando você abre um ticket de suporte e autoriza, em sessão
          temporária com expiração automática.
        </p>
      </Section>

      <Section title="4. Compartilhamento">
        <p>
          Não vendemos, alugamos, nem compartilhamos seus dados com terceiros. Exceções:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Provedores de infraestrutura (Vercel, Supabase, Railway, Asaas) — apenas o necessário pra rodar o serviço, sob NDA</li>
          <li>Obrigação legal — se houver ordem judicial brasileira válida</li>
        </ul>
      </Section>

      <Section title="5. Cookies">
        <p>
          Usamos cookies de sessão (auth) e analytics agregados (sem PII). Não rastreamos você
          fora do app.
        </p>
      </Section>

      <Section title="6. Seus direitos (LGPD)">
        <p>
          Você pode solicitar a qualquer momento:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Cópia completa dos seus dados (portabilidade)</li>
          <li>Correção de informações</li>
          <li>Exclusão da conta — apaga tudo, incluindo tokens, em 30 dias</li>
          <li>Opt-out de e-mails de marketing (transacionais permanecem)</li>
        </ul>
      </Section>

      <Section title="7. Retenção">
        <p>
          Mantemos seus dados enquanto sua conta estiver ativa. Após cancelamento, dados são
          removidos em 30 dias, exceto registros que precisamos manter por obrigação fiscal (NFs).
        </p>
      </Section>

      <Section title="8. Crianças">
        <p>
          O Ad Manager é uma ferramenta profissional B2B. Não direcionamos o serviço a menores de
          18 anos.
        </p>
      </Section>

      <Section title="9. Mudanças nesta política">
        <p>
          Notificamos por e-mail e dentro do app quando houver mudança relevante. Você pode revisar
          o histórico em /novidades.
        </p>
      </Section>

      <Section title="10. Encarregado de proteção de dados (DPO)">
        <p>
          <a href="mailto:dpo@admanager.com.br" className="text-accent hover:underline">
            dpo@admanager.com.br
          </a>
        </p>
      </Section>
    </LegalShell>
  );
}

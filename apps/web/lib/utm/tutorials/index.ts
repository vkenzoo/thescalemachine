/**
 * Tutoriais por plataforma — onde o user encontra Hottok/signing_secret e
 * onde ele cola a URL única do webhook.
 *
 * Texto curto, instruções acionáveis. Cada step pode ter "where" (caminho UI)
 * + "tip" (dica) + screenshotHint (descrição textual do que esperar ver).
 */

export interface TutorialStep {
  title: string;
  body: string;
  tip?: string;
}

export interface PlatformTutorial {
  /** onde achar o signing secret (Hottok / token) */
  secret: {
    label: string;        // ex: "Hottok do produto"
    description: string;
    steps: TutorialStep[];
    docs_url?: string;
  };
  /** onde cadastrar a URL única do webhook */
  webhook: {
    label: string;
    description: string;
    steps: TutorialStep[];
    docs_url?: string;
  };
}

export const PLATFORM_TUTORIALS: Record<string, PlatformTutorial> = {
  hotmart: {
    secret: {
      label: "Hottok do produto",
      description: "É um código de segurança que a Hotmart gera por produto. Sem ele, descartamos webhooks fakes.",
      steps: [
        { title: "Entre no painel Hotmart", body: "Vá em https://app-vlc.hotmart.com/products" },
        { title: "Abra o produto", body: "Clique no produto que você quer atribuir vendas." },
        { title: "Vá em Ferramentas → Webhook (Postback)", body: "Menu lateral esquerdo do produto." },
        {
          title: "Copie o Hottok",
          body: 'Aparece um campo "Hottok" com um código tipo "ABC123…". Copie e cole aqui no Ad Manager.',
          tip: "Cada produto tem um Hottok diferente. Se você tem 3 produtos, faz 3 projetos UTM aqui.",
        },
      ],
      docs_url: "https://help.hotmart.com/pt-BR/article/como-utilizar-a-ferramenta-postback/360042753793",
    },
    webhook: {
      label: "URL de Postback",
      description: "É onde a Hotmart vai disparar uma notificação a cada venda. A URL é única deste projeto.",
      steps: [
        { title: "Mesmo lugar do Hottok", body: "Painel Hotmart → produto → Ferramentas → Webhook (Postback)." },
        {
          title: 'Cole a URL única no campo "URL"',
          body: "Use o botão Copiar do passo 3 aqui no Ad Manager.",
        },
        {
          title: "Marque os eventos",
          body: 'Selecione no mínimo: "Compra Aprovada", "Compra Reembolsada", "Compra Cancelada", "Compra Chargeback".',
          tip: "Quanto mais eventos, mais preciso o ROAS — refunds entram automáticos.",
        },
        { title: "Salve", body: "Clique em Salvar. A Hotmart vai testar a URL — esperar status 200." },
      ],
    },
  },

  kiwify: {
    secret: {
      label: "Token de Webhook",
      description: "A Kiwify dá um token único de assinatura HMAC pra validar que o evento veio dela.",
      steps: [
        { title: "Entre no painel Kiwify", body: "Vá em https://dashboard.kiwify.com.br" },
        { title: "Apps → Webhooks", body: "Menu superior, Apps. Depois clique em Webhooks." },
        { title: "Criar webhook", body: 'Clique em "Criar Webhook".' },
        {
          title: "Copie o Token",
          body: 'Ao criar, a Kiwify mostra um campo "Token" com o secret. Copie ANTES de fechar — só aparece uma vez.',
          tip: "Se você fechou e perdeu, regere o webhook. Não tem 'mostrar de novo'.",
        },
      ],
      docs_url: "https://docs.kiwify.com.br/api-reference/webhooks/create",
    },
    webhook: {
      label: "URL de Webhook",
      description: "Cole a URL única no momento de criar o webhook na Kiwify.",
      steps: [
        { title: "No painel Kiwify → Apps → Webhooks → Criar Webhook", body: "" },
        { title: 'Cole a URL única no campo "URL"', body: "Use o botão Copiar do passo 3 aqui." },
        {
          title: "Selecione os eventos",
          body: 'Marque ao menos: "Compra Aprovada", "Compra Reembolsada", "Chargeback".',
        },
        { title: "Vincule aos produtos", body: "Selecione todos os produtos que você quer atribuir." },
        { title: "Salve", body: "Clique em Criar Webhook. Pronto." },
      ],
    },
  },

  hubla: {
    secret: {
      label: "Token de assinatura",
      description: "Token que a Hubla envia no header `x-hubla-token` em cada webhook.",
      steps: [
        { title: "Entre no painel Hubla", body: "https://hub.la — login com sua conta." },
        { title: "Configurações → Integrações → Webhooks", body: "" },
        { title: "Adicionar webhook", body: 'Clique "Novo webhook".' },
        {
          title: "Defina e copie o token",
          body: "Você define o token (qualquer string longa) e cola o mesmo aqui no Ad Manager.",
          tip: "Use openssl rand -base64 32 ou um gerador de senha forte.",
        },
      ],
      docs_url: "https://docs.hub.la/api/webhooks",
    },
    webhook: {
      label: "URL de Webhook",
      description: "Mesmo formulário de criação do webhook na Hubla.",
      steps: [
        { title: "Configurações → Integrações → Webhooks → Novo webhook", body: "" },
        { title: 'Cole a URL única no campo "URL do endpoint"', body: "Use o botão Copiar do passo 3." },
        {
          title: "Selecione os eventos",
          body: "Marque: invoice.payment_succeeded, invoice.refunded, subscription.* (se você usa assinatura).",
        },
        { title: "Salve", body: "Pronto. A Hubla começa a disparar imediatamente." },
      ],
    },
  },

  assiny: {
    secret: {
      label: "Signing secret",
      description: "Token usado pra assinar os webhooks via HMAC-SHA256.",
      steps: [
        { title: "Entre no painel Assiny", body: "https://app.assiny.com.br" },
        { title: "Configurações → Webhooks", body: "Menu lateral, seção integrações." },
        { title: "Criar webhook", body: 'Botão "Novo webhook".' },
        {
          title: "Defina e copie o secret",
          body: "Você cria o secret (string longa) e usa o mesmo valor aqui no Ad Manager.",
          tip: "Mesma chave nos dois lados — é assim que validamos a assinatura.",
        },
      ],
    },
    webhook: {
      label: "URL de Webhook",
      description: "Mesma tela de criação do webhook na Assiny.",
      steps: [
        { title: "Configurações → Webhooks → Novo webhook", body: "" },
        { title: 'Cole a URL única no campo "URL"', body: "Use o botão Copiar do passo 3." },
        {
          title: "Selecione os eventos",
          body: "Marque: purchase.approved, purchase.refunded, purchase.chargeback, cart.abandoned (opcional).",
        },
        { title: "Salve", body: "A Assiny faz um teste de conexão e ativa o webhook." },
      ],
    },
  },
};

# PLANO — Ads Editor (clone app.adseditor.com.br)

> 1 hora de planejamento economiza 10 horas de debug.

**Versão:** 1.0
**Data:** 2026-05-04
**Escopo:** Sistema completo (frontend SPA + backend API + workers + banco)
**MVP:** Auth + Conexão Meta (OAuth 2.0) + Gerenciador Meta Ads

---

## 1. Objetivo

Construir um SaaS brasileiro de gestão de tráfego pago que centralize várias contas Meta Ads e Google Ads em uma interface mais ágil que os gerenciadores nativos, com upload em massa de criativos, regras automatizadas, relatórios white-label, e atribuição cruzada com checkouts BR (Hotmart, Kiwify, Eduzz, Guru, Hubla).

**Critério de sucesso do MVP:** Um gestor de tráfego consegue logar, conectar uma conta Meta via OAuth, ver suas campanhas/conjuntos/anúncios numa tabela com filtros e métricas configuráveis, e executar ações individuais (pausar, ativar, alterar orçamento) — tudo persistido e refletido no Meta.

**Quem usa:** Gestores de tráfego, agências, infoprodutores. Persona técnica intermediária; não é desenvolvedor mas entende KPIs de mídia paga.

---

## 2. Decisões técnicas tomadas

| Decisão | Escolha | Por quê |
|---|---|---|
| **Stack frontend** | Next.js 15 + React + TypeScript + Tailwind + shadcn/ui | SPA com tema escuro/claro, i18n nativo, deploy fácil na Vercel |
| **Stack backend** | Node.js + Fastify + TypeScript (monorepo Turborepo) | Tipos compartilhados com o frontend, ecossistema rico de SDKs Meta/Google |
| **Banco** | PostgreSQL + Prisma | Relacional, JSONB para snapshots de campanhas, migrations versionadas |
| **Cache + Queue** | Redis + BullMQ | Sessões, rate-limit cache da Graph API, filas de upload/regras/alertas |
| **Storage** | Cloudflare R2 (S3-compatible) | Custo de egress zero — crítico para vídeos >100MB |
| **Auth** | E-mail/senha + JWT (access curto + refresh) + 2FA opcional | Padrão; Facebook Login é só para autorizar acesso a ads, não para login |
| **Pagamento** | Asaas (cartão até 12x + PIX) | Brasileiro, suporta recorrência, webhooks confiáveis |
| **E-mail** | Resend | Templates React, deliverability boa, API simples |
| **Hosting** | Vercel (frontend) + Coolify em VPS (backend + workers + Postgres + Redis) | Frontend serverless; backend stateful com workers precisa de máquina dedicada |
| **Observabilidade** | Sentry + Axiom (logs) + UptimeRobot | Erros de produção, logs estruturados, monitoring de endpoints |
| **Criptografia de tokens Meta/Google** | AES-256-GCM com chave em variável de ambiente | Tokens de OAuth são credenciais; nunca em texto puro no banco |

**Decisões deixadas para depois (não bloqueiam MVP):**
- IA para Escala de Orçamento (plano Business) — fase tardia
- Domínio whitelabel próprio para relatórios — fase 7
- Mobile app — fora do escopo v1

---

## 3. Mapa de partes

### Frontend (Next.js)
- **Telas:** `/login`, `/signup`, `/connect` (OAuth Meta), `/connect-google`, `/` (Gerenciador Meta), `/gerenciador-google`, `/central`, `/saldo`, `/editor`, `/audiences`, `/integracoes`, `/reports`, `/regras`, `/alerts`, `/equipe`, `/tutoriais`, `/billing`, `/afiliado`, `/callback` (OAuth return).
- **Componentes-chave:** Sidebar, AccountSelector, DateRangePicker, MetricsCardGrid, AdsTable (virtualizada — pode ter 1000+ linhas), BulkActionsMenu, RuleBuilder (componente mais complexo — 28 métricas × 4 operadores × programação), UploadDropzone, QueuePanel.
- **Estado:** TanStack Query para cache de dados da API; Zustand para UI state global (tema, idioma, conta selecionada).
- **i18n:** next-intl com PT/EN/ES.

### Backend (Fastify)
- **Rotas auth:** `/auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`.
- **Rotas OAuth Meta:** `/auth/facebook` (gera URL), `/callback` (recebe code, troca por token, persiste).
- **Rotas Meta Ads:** `/api/meta/accounts`, `/api/meta/campaigns`, `/api/meta/adsets`, `/api/meta/ads`, `/api/meta/insights`, `/api/meta/actions/*` (pause, activate, budget, duplicate, delete).
- **Rotas Google Ads:** análogas em `/api/google/*`.
- **Rotas de domínio:** `/api/rules`, `/api/alerts`, `/api/reports`, `/api/audiences`, `/api/integrations`, `/api/webhooks/{platform}`, `/api/billing`, `/api/affiliates`, `/api/teams`.
- **Middlewares:** auth (JWT), rate-limit, idempotência (header `Idempotency-Key` para POSTs financeiros), audit log.

### Workers (BullMQ)
1. **`creative-upload-worker`** — recebe criativo do storage, faz upload para Meta Marketing API, atualiza status na fila.
2. **`rules-worker`** — cron de 1 em 1 minuto; consulta regras com `next_run_at <= now()`, avalia condição contra Graph API, executa ação, atualiza `last_run_at`.
3. **`alerts-worker`** — análogo ao rules-worker mas só dispara notificação.
4. **`token-sync-worker`** — diário; renova tokens long-lived antes dos 60 dias, marca conexões expiradas.
5. **`balance-sync-worker`** — a cada 5 min; sincroniza saldo e gasto das contas conectadas.
6. **`webhook-processor`** — processa eventos de checkout (Hotmart/Kiwify/etc), faz match com UTMs e atualiza tabela de atribuição.
7. **`billing-worker`** — processa eventos do Asaas (pagamento confirmado, falha, cancelamento) e atualiza assinatura.

### Banco — entidades principais
```
users(id, email, password_hash, name, locale, theme, created_at, ...)
sessions(id, user_id, refresh_token_hash, expires_at)
subscriptions(id, user_id, plan, status, asaas_subscription_id, current_period_end, ...)
meta_connections(id, user_id, fb_user_id, access_token_encrypted, expires_at, scopes, ...)
google_connections(id, user_id, email, refresh_token_encrypted, ...)
ad_accounts(id, user_id, provider, external_id, name, currency, status, balance, ...)
account_groups(id, user_id, name)
account_group_members(group_id, account_id)
column_presets(id, user_id, account_id, name, columns_json)
account_notes(account_id, user_id, body)
rules(id, user_id, name, scope_json, action_json, conditions_json, schedule_json, frequency, daily_limit, status, last_run_at, next_run_at)
rule_executions(id, rule_id, executed_at, target_id, before_json, after_json, status, error)
alerts(id, user_id, metric, operator, value, scope_json, last_check_at, last_triggered_at)
reports(id, user_id, name, accounts_json, sections_json, metrics_json, password_hash, share_slug, public)
report_templates(id, user_id, name, config_json)
audiences(id, user_id, ad_account_id, type, source_json, meta_audience_id, status)
webhook_integrations(id, user_id, platform, name, ad_account_id, slug, secret)
webhook_events(id, integration_id, raw_payload, utms_json, matched_ad_id, status, received_at)
affiliate_referrals(referrer_user_id, referred_user_id, status, first_payment_at)
team_members(account_owner_id, member_user_id, role, invited_at, accepted_at)
tutorials_watched(user_id, tutorial_id, watched_at)
```
Índices críticos: `(user_id, provider)` em ad_accounts; `(next_run_at)` em rules onde status='active'; `(integration_id, received_at)` em webhook_events.

### Integrações externas
| Serviço | Onde entra |
|---|---|
| Meta Marketing API (Graph v23.0+) | Núcleo de Meta Ads, todos os módulos relacionados |
| Google Ads API | Gerenciador Google, relatórios |
| Asaas | Checkout de assinatura, webhooks de cobrança |
| Hotmart/Kiwify/Eduzz/Guru/Hubla | Webhooks inbound de venda |
| Resend | E-mails transacionais (welcome, alertas, faturas) |
| Cloudflare R2 | Upload de criativos |

---

## 4. Sequência de implementação

> Cada fase é testável de ponta a ponta antes da próxima começar.

### 🚨 Fase 0 — Pré-trabalho crítico (DIA 1, em paralelo com Fase 1)

**Bloqueante para produção. Sem isso, MVP não vai pra fora dos testers.**

- [ ] Criar app no Meta for Developers (categoria Business)
- [ ] Habilitar produto Facebook Login for Business
- [ ] Iniciar Business Verification (envio de contrato social, comprovante)
- [ ] Redigir Política de Privacidade e Termos de Uso públicos
- [ ] Configurar redirect_uri (domínio definitivo)
- [ ] Preparar gravação de vídeo demo para App Review (mostrando uso de `ads_management` e `business_management`)
- [ ] Submeter App Review assim que o MVP estiver funcional para os testers internos
- [ ] Em paralelo: criar projeto no Google Cloud Console + habilitar Google Ads API + obter Developer Token (também tem aprovação manual)

**Risco:** App Review leva 2 a 8 semanas. Se atrasar, MVP fica preso aos contas de desenvolvedores cadastradas.

### Fase 1 — Fundação (semana 1-2)

- [ ] Setup monorepo Turborepo: `apps/web`, `apps/api`, `apps/workers`, `packages/db`, `packages/types`
- [ ] Schema Prisma inicial: `users`, `sessions`, `subscriptions` (stub)
- [ ] Auth: signup, login, refresh, logout, JWT com cookie httpOnly
- [ ] Frontend: rotas `/login`, `/signup`, layout com sidebar (placeholders)
- [ ] Tema escuro/claro persistido em localStorage
- [ ] i18n PT/EN/ES com next-intl
- [ ] Deploy: Vercel (web) + Coolify VPS (api + Postgres + Redis)
- [ ] CI/CD: GitHub Actions rodando typecheck + lint + tests em PR
- [ ] Sentry conectado em web e api

**Critério de pronto:** usuário consegue se cadastrar, logar, ver sidebar vazia, alternar tema/idioma. Erros vão para Sentry.

### Fase 2 — MVP CORE: Conexão Meta + Gerenciador (semana 3-5)

- [ ] Migrations: `meta_connections`, `ad_accounts`, `column_presets`, `account_notes`
- [ ] Backend OAuth Meta: `/auth/facebook` (gera URL com state CSRF), `/callback` (troca code por short token, troca por long token, criptografa AES-256-GCM, persiste)
- [ ] Worker `token-sync-worker` (renovação)
- [ ] Backend Meta Ads: endpoints proxy para Graph API (campaigns, adsets, ads, insights) com cache Redis (TTL 60s) e respeito a rate limits
- [ ] Frontend `/connect`: card de status, botão "Conectar Meta Ads"
- [ ] Frontend `/`: AccountSelector, DateRangePicker (com presets), tabela com 3 abas (Campanhas/Conjuntos/Anúncios)
- [ ] Filtros: rápidos (Ativos, Tiveram veiculação) + por nome com sintaxe `+` (OR) e `;` (AND)
- [ ] Personalização de colunas: 23 colunas opcionais + persistência por conta
- [ ] Resumo do Período: até 12 cards de métricas
- [ ] Botão "Copiar Relatório" (formata texto pronto pra WhatsApp)
- [ ] Ações individuais: editar orçamento (presets +10/15/25/35% + livre), pausar, ativar, duplicar, excluir
- [ ] Botão "Privacidade" (oculta nomes), "Notas da conta", "Abrir no Meta Ads"
- [ ] Edições em massa básicas: pausar/ativar/orçamento/excluir

**Critério de pronto:** tester (não desenvolvedor) consegue conectar conta Meta, ver campanhas reais, filtrar, configurar colunas, e pausar/ativar uma campanha — refletido no Meta Ads.

### Fase 3 — Editor de Massa (semana 6-7)

- [ ] Storage Cloudflare R2 + presigned URLs para upload direto do navegador
- [ ] Tabela `creative_queue` (id, user_id, batch_id, account_id, campaign_id, adset_id, creative_url, name, status, error)
- [ ] Worker `creative-upload-worker`: lê fila, faz upload no Meta, cria anúncio
- [ ] Frontend `/editor`: seleção múltipla de contas/campanhas/conjuntos, campos de criativo, upload dropzone, painel de fila em tempo real (Server-Sent Events)
- [ ] Toggles: nome do arquivo como nome do anúncio, complemento, manter sufixo
- [ ] Suporte a Links do Instagram (publicações já existentes)
- [ ] Múltiplas remessas antes de publicar tudo

**Critério de pronto:** subir 50 anúncios em vídeo (>100MB cada) numa fila, fechar a aba, voltar e ver tudo publicado.

### Fase 4 — Edições em massa avançadas + Central + Saldo (semana 8)

- [ ] Edições em massa restantes: editar nome (com Localizar/Substituir), texto, URL, WhatsApp, idade, gênero, duplicar (mesma conta ou outra conta — copia estrutura inteira)
- [ ] Sufixos automáticos `(1)`, `(2)` em duplicações de mesmo nome
- [ ] `/central`: visão consolidada, criação de grupos, colunas configuráveis
- [ ] `/saldo`: 4 cards (Ativas, Crítico, Baixo, Gasto Hoje), tabelas Meta + Google, indicador de saúde por cores, cálculo de Dias Restantes
- [ ] Worker `balance-sync-worker` (5 min)

**Critério de pronto:** gestor que cuida de 30 contas vê de relance quais estão prestes a ficar sem saldo.

### Fase 5 — Automação: Regras + Alertas + Públicos (semana 9-11)

- [ ] Schema `rules`, `rule_executions`, `alerts`
- [ ] Frontend RuleBuilder: 28 métricas, 4 operadores, 7 períodos de cálculo, programação (Continuamente/Data/Personalizado), 8 frequências, limite diário 1-8
- [ ] Worker `rules-worker` (cron 1 min, mas só dispara regra quando `next_run_at <= now()`)
- [ ] Worker `alerts-worker` análogo
- [ ] Notificações: in-app (sino) + e-mail (Resend)
- [ ] `/audiences`: criar Custom Audience e Lookalike na Meta API
- [ ] Limites por plano: Pro=10 regras, Business+=ilimitado

**Critério de pronto:** regra "se CPA > R$50 nas últimas 24h, pausar campanha" executa sozinha e registra histórico.

### Fase 6 — Google Ads (semana 12-13)

- [ ] OAuth Google Ads (refresh token longo)
- [ ] Endpoints proxy Google Ads API
- [ ] `/gerenciador-google` espelha Meta com aba extra **Termos de Pesquisa**
- [ ] Palavras-chave negativas (Exata/Frase/Ampla, nível Campanha/Grupo)
- [ ] Estratégias de lance: Maximizar Conversões, Maximizar Valor, CPA Desejado, ROAS Desejado, Maximizar Cliques, Parcela de Impressões, CPC Manual, CPC Otimizado
- [ ] Edição de Responsive Search Ads (3-15 headlines, 1-5 long, 2-4 desc)
- [ ] Mensagem específica para Performance Max ("não suporta edição de headlines")

**Critério de pronto:** mesma experiência do Meta, agora para Google.

### Fase 7 — Relatórios + UTMs (semana 14-16)

- [ ] Webhooks inbound: `/api/webhooks/hotmart`, `/kiwify`, `/eduzz`, `/guru`, `/hubla` com validação de assinatura
- [ ] Worker `webhook-processor`: parsing de UTMs, match com anúncios, persistência em `webhook_events`
- [ ] Frontend `/integracoes`: criar projeto, gerar URL única, tabela de comparação Conv. Meta vs Conv. UTM
- [ ] Janela de atribuição configurável (7/14/30 dias)
- [ ] `/reports`: builder com 5 seções (Funil, Performance, Pizza, Top Campanhas, Top Anúncios), métricas Meta + Google, templates reutilizáveis
- [ ] Compartilhamento público com slug + senha opcional
- [ ] Página pública de relatório (rota fora do auth)

**Critério de pronto:** cliente recebe link, abre, vê dashboard com sua marca e dados reais.

### Fase 8 — Comercial: Billing + Afiliados + Equipe (semana 17-18)

- [ ] Asaas: criar customer, criar subscription, listar invoices
- [ ] 4 planos (Starter R$97, Pro R$197, Business R$397, Enterprise R$797) + toggle Mensal/Anual (-17%, parcelado 12x)
- [ ] Worker `billing-worker` processa webhooks Asaas (idempotente)
- [ ] Pro-rata em upgrade/downgrade
- [ ] Limites por plano aplicados em runtime (contas conectadas, regras, equipe)
- [ ] `/afiliado`: link `/ref/CODIGO`, cookie 30 dias, comissão 20% recorrente, saldo, saque PIX (mín R$50)
- [ ] `/equipe`: convidar membros, papéis, limite por plano

**Critério de pronto:** usuário assina Pro, paga no cartão, sai do tier de testes, depois faz upgrade pra Business com pro-rata correto.

### Fase 9 — Operação e polimento (semana 19-20)

- [ ] `/tutoriais` (9 vídeos catalogados) + botão Tutorial contextual em cada módulo
- [ ] Modal Minha Conta (editar dados, trocar senha, gerador de senha, excluir conta)
- [ ] Modal Feedback, Novidades
- [ ] Auditoria de ações sensíveis (mudança de billing, exclusão de conta)
- [ ] LGPD: exportação de dados, exclusão completa
- [ ] Terms/Privacy/Cookies banners
- [ ] Documentação de onboarding pra Enterprise
- [ ] Load testing das filas (cenário: 100 usuários × 50 anúncios em paralelo)

---

## 5. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| **App Review da Meta demora 2-8 semanas** | Alto — bloqueia produção | Iniciar Fase 0 no dia 1, em paralelo com dev. Submeter assim que MVP estiver testável |
| **Token Meta long-lived expira em 60 dias** | Alto — usuário perde conexão silenciosamente | Worker de renovação + e-mail 7 dias antes do vencimento |
| **Rate limit da Graph API** | Médio — UI fica lenta ou trava | Cache Redis 60s para reads; backoff exponencial; quota por usuário |
| **Vídeos >100MB falhando no upload** | Alto — diferencial técnico do produto | Upload resumível (TUS) direto pra R2 + worker de envio para Meta separado |
| **Webhooks de checkout duplicados ou fora de ordem** | Médio — atribuição errada | Idempotência por `event_id` + UPSERT na tabela de eventos |
| **Asaas webhook entrega pagamento mas serviço cai antes de processar** | Alto — usuário paga e não tem acesso | Idempotency-Key + retry; reconciliação noturna comparando subscriptions ativas com Asaas |
| **Custo de infra escala mal** (sync de 5min × milhares de contas) | Médio | Filas particionadas por usuário; sync sob demanda quando usuário abre o app; full sync apenas para contas com regras ativas |
| **Vazamento de tokens criptografados** | Crítico — credenciais de OAuth de clientes | Chave de cifra em variável de ambiente, não em código; rotação documentada; logs nunca imprimem token |
| **LGPD: dados pessoais de clientes finais nos webhooks de checkout** | Alto — multa | Política clara, opt-out, retenção limitada, DPO designado |
| **Concorrência interna em Edições em Massa** | Médio — duas pessoas da equipe pausam ao mesmo tempo | Lock otimista por versão; UI mostra quem mexeu por último |
| **Custo de App Review reprovado** | Alto — retrabalho | Vídeo demo claro, política de privacidade detalhada, mostrar só os scopes pedidos |

---

## 6. Checklist de testes

### Auth & MVP
- [ ] Cadastro → e-mail de boas vindas chega
- [ ] Login com senha errada → erro genérico (sem dizer se e-mail existe)
- [ ] Token expira → refresh automático
- [ ] Logout → invalida refresh

### OAuth Meta
- [ ] Estado CSRF: requisição sem `state` válido é rejeitada
- [ ] Token criptografado em repouso (verificar no DB)
- [ ] Renovação automática 7 dias antes do vencimento
- [ ] Revogação no Facebook → app detecta e marca conexão como expirada

### Gerenciador
- [ ] Filtro `black + branco` retorna `OR`; `black ; video` retorna `AND`
- [ ] Privacidade oculta nomes em todas as células
- [ ] Colunas persistem por conta entre sessões
- [ ] Pausar campanha → reflete no Meta Ads em <10s
- [ ] Editar orçamento +25% calcula corretamente em moedas diferentes (BRL/USD)

### Editor de Massa
- [ ] Vídeo de 200MB sobe sem erro
- [ ] Fechar aba e voltar: fila continua processando
- [ ] Múltiplas remessas antes de publicar
- [ ] Erro em 1 anúncio não para os outros

### Regras
- [ ] Regra "CPA > 50, pausar" executa exatamente uma vez quando condição vira true
- [ ] Limite diário de execuções respeitado
- [ ] Histórico de execução mostra antes/depois

### Webhooks
- [ ] Evento duplicado (mesmo `event_id`) é ignorado
- [ ] UTMs casam com anúncio correto na janela de 7/14/30 dias

### Billing
- [ ] Asaas confirma pagamento → assinatura ativa em <30s
- [ ] Upgrade Starter→Pro no meio do ciclo cobra pro-rata correto
- [ ] Cancelamento mantém acesso até fim do período pago

### Carga
- [ ] 100 usuários × 50 anúncios em fila paralela: nenhuma perda
- [ ] 1000 regras ativas: latência média de execução <2 min do horário programado

---

## 7. Próximos passos imediatos

1. **Hoje:** Criar app no Meta for Developers e iniciar Business Verification (Fase 0).
2. **Esta semana:** Setup do monorepo, deploy do "hello world" em Vercel + Coolify (Fase 1).
3. **Próxima semana:** Auth completo + sidebar funcional (fim da Fase 1).
4. **Semana 3:** Atacar OAuth Meta — a parte mais arriscada do MVP.

---

**Resumo executivo:** 20 semanas (~5 meses) para paridade funcional completa com o app de referência, com MVP testável em 5 semanas. O caminho crítico fora do código é o App Review da Meta — comece o protocolo no mesmo dia em que iniciar o desenvolvimento.

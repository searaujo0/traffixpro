
O usuário quer integrar Facebook Ads (Meta Marketing API) pra puxar as contas de anúncio que ele já gerencia no BM dele e ver os dados (gasto, impressões, conversões, etc) direto no app.

**Viabilidade**: Sim, totalmente viável. Mas tem algumas coisas importantes que ele precisa entender antes:

1. **Não existe connector nativo de Facebook/Meta Ads no Lovable** (chequei a lista — tem Slack, HubSpot, Resend, etc, mas Meta Ads não). Então tem que ser integração manual via OAuth + Marketing API.

2. **Precisa de um App no Meta for Developers** — ele cria uma vez (developers.facebook.com), pega `App ID` + `App Secret`, e o app precisa do produto "Marketing API" habilitado.

3. **Modo do app**:
   - **Development mode**: funciona só pra ele mesmo (o dono do app) e usuários de teste. Pra começar, isso já basta — ele loga com o Facebook dele e vê as contas de anúncio que tem acesso.
   - **Production mode (App Review)**: pra outros usuários logarem, precisa passar por revisão da Meta (pedindo permissões `ads_read`, `ads_management`, `business_management`). Isso leva dias/semanas. Mas pelo caso dele (ele é o único usuário que vai gerir), **development mode resolve**.

4. **Permissões necessárias**: `ads_read` (ver dados), `business_management` (listar BMs/contas), e opcionalmente `ads_management` (pra pausar/editar campanhas no futuro).

## Plano de implementação

### Etapa 1 — Setup no Meta for Developers (você faz, eu te guio)
- Criar app em developers.facebook.com → tipo "Business"
- Adicionar produto "Facebook Login" e "Marketing API"
- Configurar OAuth Redirect URI: `https://id-preview--f1cf2d28-4d77-42ef-ab84-d931ce6691a0.lovable.app/auth/facebook/callback` (e a URL final quando publicar)
- Pegar `App ID` (público) e `App Secret` (privado)

### Etapa 2 — Backend (eu codo)
**Tabelas novas:**
- `meta_connections` — guarda `user_id`, `meta_user_id`, `access_token` (long-lived, válido ~60 dias), `expires_at`
- `ad_accounts` — `id` (act_xxx da Meta), `connection_id`, `client_id` (link opcional pro cliente do CRM), `name`, `currency`, `status`
- `ad_insights` — cache diário de gasto/impressões/cliques/conversões por conta de anúncio (pra não bater na API toda hora)

**Server functions:**
- `connectMeta()` — gera URL de OAuth com state token
- `metaCallback()` — recebe code, troca por short-lived token, troca por long-lived token (60 dias), salva
- `listAdAccounts()` — chama `/me/adaccounts` da Graph API e retorna contas
- `linkAccountToClient()` — vincula uma conta de anúncio a um cliente do CRM
- `syncInsights()` — puxa insights (spend, impressions, clicks, actions) por dia da Marketing API, salva em cache

### Etapa 3 — Frontend (eu codo)
- Nova página `/integracoes/meta` com botão "Conectar Facebook" e lista das contas vinculadas
- Em cada conta: dropdown pra vincular a um cliente do CRM existente
- Página do cliente (`/clientes/$id`) puxa dados reais dessas contas em vez (ou junto) dos dados manuais

### Etapa 4 — Sincronização
- Botão "Sincronizar agora" manual no MVP
- Depois: cron diário (TanStack Start não tem cron nativo no Cloudflare Worker, então a opção é Cloudflare Cron Triggers — dá pra configurar no `wrangler.jsonc`)

## Secrets necessários
- `META_APP_ID` (público, vai como `VITE_META_APP_ID`)
- `META_APP_SECRET` (privado, server-only)

## O que preciso de você antes de começar a codar

Confirma 3 coisas:

**1. Você tem ou consegue criar conta no Meta for Developers?** (developers.facebook.com — qualquer Facebook pessoal serve, é grátis)

**2. Modo de uso**: você é o único que vai logar com Facebook pra puxar as contas, ou outros membros da sua equipe também? (Se for só você, ficamos em development mode e pula App Review. Se for equipe, precisa adicionar eles como "test users" do app — também resolve sem App Review.)

**3. Por onde começamos?** 
   - **A)** Faço tudo o que dá agora (tabelas + server functions + UI), e você só preenche os secrets quando criar o app
   - **B)** Você cria o app primeiro, me passa App ID + Secret, e aí eu codo

Recomendo **A** — assim você vê a cara da feature enquanto cria o app em paralelo.

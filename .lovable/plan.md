

## Correções no TraffixPro

### 1. De onde vêm os números (transparência)

Os dados de **gasto, impressões, cliques e conversões** vêm da **Graph API do Meta** (`/insights`), salvos na tabela `ad_insights`. O dashboard **soma os dias** do período escolhido.

**Por que aparecem 63 leads na M1D quando o Facebook mostra menos:**

Hoje o sistema conta como "lead/conversão" praticamente **todo evento de conversão** que o Meta retorna, incluindo:

- `lead`, `purchase`, `complete_registration` ✅ (corretos)
- `onsite_conversion.*` (várias subcategorias)
- `messaging_conversation_started_7d`
- `add_to_cart`, `initiate_checkout`, `subscribe`, `start_trial`, `contact`

**O problema:** o Meta retorna o mesmo lead em **vários action_types ao mesmo tempo** (ex.: um lead aparece como `lead` + `onsite_conversion.lead_grouped` + `offsite_conversion.fb_pixel_lead`). Ao somar tudo, o número fica inflado — daí os 63.

### 2. O que vou ajustar

**A. Corrigir contagem de leads (mais fiel ao Meta)**

Em `src/server/meta-integration.ts`, mudar a regra de conversão para:

- Priorizar **um único action_type por linha**, na ordem: `offsite_conversion.fb_pixel_lead` → `lead` → `onsite_conversion.lead_grouped` → `complete_registration` → `purchase`.
- Não somar tipos sobrepostos.
- Salvar também um campo `conversions_breakdown` no `raw` para auditoria.

Resultado: o número passa a bater com o "Resultados" da coluna de leads no Gerenciador de Anúncios.

**B. Botão "Ver relatório" que não abre**

A rota `/clientes/$id` existe, mas o `<Link>` no card pode estar perdendo o clique por causa de outros elementos sobrepostos no card. Vou:

- Garantir que o link funciona como botão claro.
- Adicionar fallback de `onClick` com `navigate({ to: "/clientes/$id", params: { id } })`.
- Verificar se a rota carrega mesmo quando a conta ainda não tem dados (mostrar empty state em vez de tela em branco).

**C. Editar e excluir cliente**

Adicionar no card de cada cliente em `/clientes`:

- Botão **Editar** → abre dialog com nome, segmento, status (ativo/inativo).
- Botão **Excluir** → dialog de confirmação. Ao confirmar:
  - Desvincula contas de anúncio (`ad_accounts.client_id = null`).
  - Apaga vendas do cliente (`sales`).
  - Apaga o cliente.
  - Não apaga o usuário de acesso (mantém na auth para histórico).

**D. Pequenas melhorias de UX**

- Mostrar no card quantos leads vêm de quais contas vinculadas.
- Tooltip explicando "Leads = soma das conversões registradas pelo Meta no período".

### 3. Arquivos que serão alterados

- `src/server/meta-integration.ts` — nova lógica de contagem de leads.
- `src/routes/clientes.tsx` — botões editar/excluir + corrigir link "ver relatório".
- `src/routes/clientes.$id.tsx` — empty state quando não houver dados.
- Nova migration: nada estrutural, só re-sync vai recalcular.

### 4. O que você precisa fazer depois

1. Após o deploy, ir em **Integrações → Meta** e clicar em **Sincronizar** novamente na conta M1D.
2. Os números de leads vão diminuir e bater com o Facebook.
3. Testar Editar/Excluir cliente em `/clientes`.

### 5. Tutorial rápido do fluxo correto

1. **Login** como admin.
2. **Clientes** → criar cliente (ex.: "Empresa X").
3. **Integrações → Meta** → Conectar Facebook → Importar contas.
4. Na lista de contas, escolher o cliente no dropdown e **Salvar vínculo**.
5. Clicar em **Sincronizar** (escolhe período: hoje / 7d / 30d).
6. Voltar em **Clientes** → **Ver relatório** → ver KPIs reais.
7. Para o cliente acessar sozinho: card do cliente → **Criar acesso** (email + senha).
8. Cliente entra em `/auth`, faz login, vê apenas `/meu-painel` com seus dados.


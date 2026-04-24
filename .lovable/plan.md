

## Painel do Cliente — Métricas, Relatórios e Período Personalizado

Reformular `/meu-painel` para ser uma central completa de acompanhamento do cliente, com métricas diárias, período flexível, escolha de métricas visíveis, registro de vendas e ROI calculado.

### 1. Período flexível

Hoje só existem botões "hoje / 7d / 30d". Vou substituir por um seletor mais completo:

- Botões rápidos: **Hoje**, **7 dias**, **30 dias**, **Este mês**, **Mês passado**
- Opção **Personalizado** com dois campos de data (date pickers `react-day-picker` já presentes no projeto)
- A data selecionada vira a base de TODAS as métricas, gráficos e ROI da tela

Tecnicamente: `fetchDashboard` em `src/lib/dashboard.ts` ganha versão que aceita `since`/`until` diretos, em vez de apenas `Period`.

### 2. Métricas principais sempre visíveis

Cards fixos no topo, na ordem pedida:

1. Valor investido
2. CPM
3. Cliques
4. CPC (custo por clique)
5. CTR
6. Mensagens no WhatsApp
7. Custo por mensagem
8. Vendas (somatório do valor)
9. ROI = (Vendas − Investido) / Investido × 100

Para "Mensagens no WhatsApp" e "Custo por mensagem" vou ampliar o parser do Meta em `src/server/meta-integration.ts` para extrair também:

- `onsite_conversion.messaging_conversation_started_7d`
- `onsite_conversion.total_messaging_connection`

E salvar essas contagens em uma nova coluna `messages` na tabela `ad_insights` (migration nova). Sem essa coluna não dá pra ter custo por mensagem real.

### 3. Métricas extras opcionais

Botão **Personalizar métricas** abre um popover com checkboxes:

- Impressões
- Alcance
- Conversões totais
- CPL (custo por lead)
- Frequência (impressões / alcance)
- ROAS

Seleção salva em `localStorage` por usuário, então da próxima vez já volta como ele deixou.

### 4. Métricas e gráfico diário

Abaixo dos cards:

- Gráfico de área diário (já existe) — adicionar toggle de métrica: investimento, cliques, mensagens, vendas
- **Tabela diária** com uma linha por dia do período, colunas: data, investimento, cliques, CTR, mensagens, custo por mensagem, vendas do dia, ROI do dia
- Botão **Exportar PDF** (usa `exportElementToPDF` que já existe em `src/lib/pdf.ts`) e **Exportar CSV**

### 5. Registro de vendas pelo próprio cliente

Já existe form básico. Vou melhorar:

- Campos: **Data da venda** (date picker), **Valor da venda** (R$), **Quantidade** (default 1), **Observação** opcional
- Lista das últimas 10 vendas com botão excluir
- Vendas entram automaticamente no cálculo de ROI do período selecionado

RLS já permite cliente inserir/ver/excluir as próprias vendas (policy "Clients insert own sales" e "Clients view own sales"). Vou adicionar policy de DELETE para o cliente.

### 6. ROI no período

Cálculo direto:

```
ROI = ((soma de vendas no período) − (soma de gasto no período)) / gasto × 100
```

Mostrado como card destacado e também por dia na tabela.

### 7. Mudanças técnicas resumidas

**Migration nova:**
- adicionar coluna `messages bigint default 0` em `ad_insights`
- policy DELETE em `sales` para o próprio cliente

**`src/server/meta-integration.ts`:**
- extrair contagem de mensagens do WhatsApp/Messenger e gravar em `messages`

**`src/lib/dashboard.ts`:**
- aceitar `{ since, until }` arbitrário
- retornar `messages` e `costPerMessage` no summary
- retornar `daily` com `messages` e `salesValue` por dia

**`src/routes/meu-painel.tsx`:**
- novo seletor de período (rápido + personalizado)
- 9 cards principais
- popover "Personalizar métricas" com persistência em `localStorage`
- gráfico com toggle de métrica
- tabela diária
- exportar PDF/CSV
- form de venda melhorado + lista de vendas com excluir

**Sem mudança visual no admin** — só o painel do cliente é afetado.

### 8. O que você precisa fazer depois

1. Ir em **Integrações → Meta** e clicar em **Sincronizar** novamente para popular a coluna `messages` com os dados de WhatsApp.
2. Entrar como cliente em `/meu-painel` para ver as novas métricas.
3. Registrar vendas pela própria tela do cliente para ver o ROI fechar.


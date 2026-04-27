## Problema

As métricas exibidas no app (página `/campanhas`, painel do cliente, dashboard) usam **nomes diferentes** dos que aparecem no Facebook Ads Manager, e em alguns casos **calculam coisas diferentes** com o mesmo nome. Exemplos do que está errado hoje:

| Hoje no app | No Facebook Ads Manager |
|---|---|
| "Leads" | **Resultados** (depende do objetivo da campanha — pode ser Leads, Conversas, Compras, Cadastros…) |
| "CPL" | **Custo por resultado** |
| "Cliques" | **Cliques no link** (já está certo no número, mas o rótulo não diz isso) |
| "CTR" | **CTR (taxa de cliques no link)** |
| "Conversas" | **Conversas iniciadas por mensagens** |
| "Custo por conversa" | **Custo por conversa iniciada por mensagens** |

Além disso, hoje a gente força "lead" como o tipo de conversão, mas se a campanha é de Compra ou de Mensagens o número fica zerado ou errado.

## O que vai mudar

### 1. Capturar o "tipo de resultado" real de cada conta/campanha

No `syncInsights` (server), além de já priorizar leads, vou:
- Manter o mapa completo de `actions` (já fazemos)
- **Detectar e salvar qual foi o "action_type" escolhido** como resultado principal (já temos `conversion_source` no raw — vou promover isso pra um campo só)
- Salvar também o **rótulo legível em PT-BR** desse action_type (ex.: `offsite_conversion.fb_pixel_lead` → "Leads", `onsite_conversion.messaging_conversation_started_7d` → "Conversas iniciadas")

Para isso, uma mudança simples no banco: adicionar duas colunas em `ad_insights`:
- `result_type text` — o action_type bruto do Facebook
- `result_label text` — o nome amigável em português (igual ao Ads Manager)

### 2. Renomear as métricas em todo o app para bater com o Ads Manager

Criar um arquivo central `src/lib/metaLabels.ts` com:
- O **dicionário oficial** de action_type → label PT-BR (mesmos nomes do Ads Manager)
- Constantes com os rótulos das métricas padrão: `"Valor usado"` (não "Investimento"), `"Impressões"`, `"Alcance"`, `"Cliques no link"`, `"CTR (cliques no link)"`, `"CPC (custo por clique no link)"`, `"CPM"`, `"Frequência"`, `"Resultados"`, `"Custo por resultado"`, etc.

Depois, substituir os textos em:
- `src/routes/campanhas.tsx` ("Investimento" → "Valor usado", "Leads" → "Resultados", "CPL" → "Custo por resultado", "Cliques" → "Cliques no link")
- `src/routes/meu-painel.tsx` (mesma coisa)
- `src/routes/clientes.$id.tsx` e o PDF gerado em `src/lib/clientReportPdf.ts`
- `src/routes/insights.tsx` e `src/routes/relatorios.tsx`
- Tipos em `src/lib/dashboard.ts` ganham `resultLabel` para a UI saber o que mostrar

### 3. Corrigir o cálculo do "Resultado" para respeitar o objetivo

Hoje a prioridade é fixa: lead → registration → purchase. Vou trocar por uma lógica que:
- Olha o **objetivo** da conta/campanha quando disponível
- Se o objetivo é Mensagens → resultado = conversas iniciadas
- Se é Conversões com pixel de Lead → resultado = leads
- Se é Vendas → resultado = compras
- Fallback: pega o action_type mais relevante encontrado no período

Isso resolve o caso "M1D" onde os números vinham errados — provavelmente a campanha é de mensagens mas estava sendo lida como leads (ou vice-versa).

### 4. Mostrar o tipo de resultado na UI

Em cada card/linha que mostra "Resultados: 123", colocar abaixo em cinza o que é (ex.: "Conversas iniciadas por mensagens" ou "Leads do pixel"), igual o Ads Manager faz no cabeçalho da coluna.

## Arquivos afetados

- **Migração**: adicionar `result_type`, `result_label` em `ad_insights`
- **Novo**: `src/lib/metaLabels.ts` — dicionário central de rótulos PT-BR
- **Editar**: `src/server/meta-integration.ts` (`syncInsights` salva os novos campos com lógica nova)
- **Editar**: `src/lib/dashboard.ts` (expor `resultLabel` agregado por conta/cliente)
- **Editar**: `src/routes/campanhas.tsx`, `src/routes/meu-painel.tsx`, `src/routes/clientes.$id.tsx`, `src/routes/insights.tsx`, `src/routes/relatorios.tsx`, `src/lib/clientReportPdf.ts` — trocar os textos das métricas

## O que **não** vou fazer (a menos que você peça)

- Não vou puxar dados a nível de campanha individual (continua agregado por conta) — se quiser ver campanha por campanha eu faço numa próxima rodada
- Não vou mudar a moeda nem formato numérico (continua BRL)
- Não vou re-sincronizar automaticamente o histórico — depois de aplicar, você clica em "Sincronizar" nas contas pra repopular com a lógica nova

## Pergunta antes de seguir

Confirma uma coisa: você quer os rótulos em **português igual o Ads Manager BR** (ex.: "Valor usado", "Resultados", "Custo por resultado", "Cliques no link"), certo? Se preferir os termos em inglês (igual o Ads Manager em inglês: "Amount spent", "Results", "Cost per result", "Link clicks"), me avisa que eu ajusto.
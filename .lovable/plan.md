
Objetivo: transformar o fluxo Meta Ads em um processo confiável e guiado, para que o sistema deixe de depender de tabelas legadas e passe a mostrar relatórios reais para admin e cliente.

1. Diagnóstico do que está quebrando hoje
- A integração Meta já importa contas para `ad_accounts` e sincroniza métricas para `ad_insights`.
- O problema principal é que parte do app ainda lê a tabela antiga `campaigns`:
  - `/clientes`
  - `/clientes/$id`
  - `src/lib/data.ts -> fetchCampaigns()/aggregate()`
- Resultado: mesmo com contas importadas e sincronizadas, esses relatórios continuam vazios ou desatualizados.
- A área do cliente (`/meu-painel`) já usa `ad_insights`, mas só mostra dados se:
  1. a conta importada estiver vinculada ao cliente
  2. a sincronização tiver rodado com sucesso
- O fluxo de Meta ainda está pouco guiado: importar conta não garante vínculo nem sync, então o usuário acha que “não puxou nada”.
- Ainda existem resquícios de dados/UX de exemplo, como o card lateral “5 clientes ativos”.

2. O que vou implementar
- Unificar a fonte de verdade dos relatórios:
  - usar `ad_accounts + ad_insights + sales`
  - parar de depender de `campaigns` para dashboards e relatórios
- Reestruturar a tela de integração Meta para virar um fluxo claro:
  1. Conectar Facebook
  2. Importar contas
  3. Vincular conta a cliente
  4. Sincronizar dados
- Melhorar a área do cliente para mostrar relatório real completo:
  - investimento
  - cliques
  - impressões
  - leads/conversões
  - CPL
  - ROI
  - ROAS
  - gráfico por período
- Melhorar o painel admin para mostrar:
  - contas importadas
  - status do vínculo com cliente
  - status da última sincronização
  - erros de sincronização com mensagem clara
- Remover o que ainda estiver estático/fake no app.

3. Mudanças estruturais no backend
- Criar uma camada única de métricas reais em `src/lib/dashboard.ts` e/ou funções auxiliares novas para:
  - resumo por cliente
  - evolução diária por cliente
  - resumo por conta de anúncio
- Adicionar metadados de sincronização nas contas importadas, por exemplo:
  - `last_sync_at`
  - `last_sync_status`
  - `last_sync_error`
- Se necessário para evitar timeout em várias contas, implementar fila de sincronização:
  - tabela de jobs de sync
  - botão “Sincronizar tudo” cria jobs
  - processamento em background
  - UI acompanha status
- Manter RLS atual e reforçar a leitura por cliente apenas via vínculo `clients.owner_user_id`.

4. Mudanças no frontend
- `/integracoes/meta`
  - transformar em checklist visual
  - mostrar contas importadas com:
    - cliente vinculado
    - botão salvar vínculo
    - botão sincronizar
    - status da última sync
  - impedir sync “cego” sem vínculo quando o objetivo for alimentar painel do cliente
  - adicionar feedbacks:
    - carregando
    - sucesso
    - erro da API Meta
- `/clientes`
  - trocar agregação baseada em `campaigns` por agregação real de `ad_insights`
  - mostrar quais clientes já têm conta vinculada e dados sincronizados
- `/clientes/$id`
  - refazer relatório completo usando `ad_insights` reais
  - gráfico diário real
  - tabela de contas vinculadas / desempenho real
- `/meu-painel`
  - manter dados reais
  - acrescentar gráfico e relatório mais completo
  - empty state claro quando faltar:
    - vínculo de conta
    - sincronização
    - vendas
- `/campanhas`
  - incluir período
  - mostrar última sincronização
  - destacar contas sem cliente vinculado
- `AppLayout`
  - remover placeholders estáticos
  - manter nome dinâmico do usuário

5. Ajustes de lógica Meta Ads
- Ampliar o mapeamento de conversões do Meta, porque hoje o parser está restrito e pode deixar leads zerados em contas reais.
- Considerar eventos comuns além de `purchase|lead|complete_registration`, cobrindo cenários de lead/conversa usados em tráfego pago.
- Garantir mensagens claras quando:
  - a conta foi importada mas não vinculada
  - a sync falhou
  - a conta não retornou insights
  - o token expirou

6. Fluxo ideal do sistema após a melhoria
- Admin entra no app
- Clica em Meta Ads
- Conecta a conta
- Importa as contas de anúncio
- Vincula cada conta a um cliente
- Clica em sincronizar
- O sistema busca os dados reais do Meta e salva no banco
- Dashboard admin passa a mostrar tudo consolidado
- Cliente entra com seu login
- Cliente vê apenas os próprios relatórios reais

7. Passo a passo de uso que a interface vai suportar
- Passo 1: Conectar Facebook
- Passo 2: Importar contas
- Passo 3: Escolher o cliente no dropdown
- Passo 4: Salvar vínculo
- Passo 5: Escolher período (hoje, 7 dias, 30 dias)
- Passo 6: Sincronizar dados
- Passo 7: Conferir relatório no painel admin e no painel do cliente

8. Arquivos principais que serão ajustados
- `src/routes/integracoes.meta.tsx`
- `src/server/meta-integration.ts`
- `src/lib/dashboard.ts`
- `src/lib/data.ts`
- `src/routes/clientes.tsx`
- `src/routes/clientes.$id.tsx`
- `src/routes/meu-painel.tsx`
- `src/routes/campanhas.tsx`
- `src/routes/index.tsx`
- `src/components/AppLayout.tsx`
- migration nova para status/fila de sincronização

9. Observações de escopo
- Vou manter apenas os papéis `admin` e `cliente`, conforme sua decisão anterior.
- O cadastro continua sem signup público: só admin cria acessos.
- O sistema vai trabalhar com dados reais ou vazio, sem fallback fake.

10. Ordem de implementação
- Etapa 1: remover dependência de `campaigns` dos relatórios
- Etapa 2: refazer relatório admin e cliente com `ad_insights`
- Etapa 3: melhorar fluxo de vínculo + sync na integração Meta
- Etapa 4: adicionar status/erros de sincronização
- Etapa 5: opcionalmente subir sync em fila para ficar confiável em múltiplas contas

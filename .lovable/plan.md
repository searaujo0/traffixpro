# M1 Digital como App de Equipe — Papéis, Permissões e Contratos

## Papéis finais

| Papel | O que enxerga |
|---|---|
| **admin** (você) | Tudo. Único que cadastra usuários, define permissões e atribui clientes. |
| **financeiro** | Financeiro, Comissões, Clientes (ficha + dados de contrato). Cadastra/edita contratos. Não vê campanhas/criativos. |
| **social_media** | Só os clientes atribuídos a ele. Vê Clientes (sem dinheiro), Campanhas, Relatórios, Insights. **Sem** Spend, Faturamento, Comissão, Valor de contrato. |
| **cliente** | Próprio painel (já existe). |

## Contratos (novo)

Hoje cada cliente tem um único `contract_value` solto. Vou criar uma tabela `client_contracts` pra registrar o ciclo de vida real do contrato:

Campos: `id, client_id, monthly_value, start_date, end_date (nullable), is_indeterminate (bool), payment_day (1-31), status (ativo/encerrado/suspenso), notes, created_at, updated_at, created_by`.

Regras:
- Um cliente pode ter vários contratos ao longo do tempo (renovação, reajuste).
- Apenas **um contrato ativo por vez** por cliente (validação por trigger).
- Se `is_indeterminate = true`, `end_date` é ignorado.
- O Financeiro é responsável por cadastrar/editar; Admin também pode.
- O `contract_value` antigo na tabela `clients` continua como fallback/atalho (sincronizado pelo contrato ativo via trigger), pra não quebrar Comissões nem o resto que já lê dele.

Tela nova **Contratos** (dentro de Financeiro, ou aba na ficha do cliente):
- Lista por cliente: contratos vigentes, encerrados, próximos do fim.
- Aviso visual quando faltam ≤30 dias pro `end_date`.
- Botão "Renovar" duplica o contrato com novas datas.

## Atribuição por cliente

Tabela `client_assignments (id, client_id, user_id, assigned_at, assigned_by)`. Único por par `(client_id, user_id)`.

- Admin vê todos os clientes sempre.
- Financeiro vê todos os clientes (precisa pra cobrar todo mundo).
- Social media vê **só** clientes onde `client_assignments.user_id = ele`.
- Na tela de Usuários, ao editar um social_media: multi-select de clientes atribuídos.
- Na ficha do cliente: lista quem atende aquele cliente (com botão pra adicionar/remover).

## Mascaramento de valores pra social_media

Componente `<Money value={...} />` que renderiza `R$ 1.234,56` pra quem pode ver e `—` pra social_media. Aplicado em:
- Lista e ficha de Clientes (contract_value, marketing_team_cost, commission_pct).
- Dashboard, Campanhas, Relatórios, Insights, Meu Painel: spend, faturamento, ROAS absoluto, lucro, comissão.
- CTR, cliques, mensagens, alcance, impressões, ROAS relativo (%) **continuam visíveis**.

Menus escondidos pra social_media: Financeiro, Comissões, Usuários, Meta Ads (integrações).

## Banco — mudanças

```sql
-- 1. Novos papéis
ALTER TYPE app_role ADD VALUE 'financeiro';
ALTER TYPE app_role ADD VALUE 'social_media';

-- 2. Atribuições
CREATE TABLE client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  UNIQUE(client_id, user_id)
);
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;

-- 3. Contratos
CREATE TABLE client_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  monthly_value numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date,
  is_indeterminate boolean NOT NULL DEFAULT false,
  payment_day int CHECK (payment_day BETWEEN 1 AND 31),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','encerrado','suspenso')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;

-- 4. Funções helper (security definer)
-- has_any_role(_user_id, _roles app_role[]) -> bool
-- is_assigned_to_client(_user_id, _client_id) -> bool

-- 5. Triggers
-- - garantir um único contrato 'ativo' por cliente
-- - sincronizar clients.contract_value com o monthly_value do contrato ativo
-- - validar end_date >= start_date quando não indeterminado
```

## RLS atualizada

- **clients**: SELECT permitido a admin, financeiro (todos), social_media (só atribuídos via `is_assigned_to_client`), cliente dono. Mutations: admin + financeiro.
- **client_contracts**: SELECT/ALL admin + financeiro. Cliente dono pode SELECT só os seus.
- **client_assignments**: ALL admin. SELECT para o próprio user_id (pra saber a que está atribuído).
- **campaigns / ad_accounts / ad_insights**: SELECT admin (todos), social_media (clientes atribuídos), financeiro **não vê** (não precisa), cliente dono (já existe).
- **client_payments / sales**: admin + financeiro full. Social media não vê.

## Frontend — mudanças

- `AuthContext`: além de `role`, carregar `assignedClientIds` quando role = social_media.
- Novo helper `usePermissions()`: `canSeeMoney`, `canManageUsers`, `canManageContracts`, `canSeeClient(id)`, `visibleNav`.
- `AppLayout`: filtra `navItems` pelo papel.
- `RoleGuard`: aceita os novos papéis nos `allow`.
- Componente `<Money>` substitui `brl(...)` em telas compartilhadas.
- `/admin/usuarios`:
  - Botão "Novo usuário de equipe" → form (email, nome, senha inicial, role, `clientIds[]` se social_media).
  - Coluna "Clientes" mostra contagem; botão abre dialog multi-select.
- Nova rota `/contratos` (acessível a admin + financeiro): lista global de contratos com filtros (vigentes, próximos do fim, encerrados).
- Aba "Contratos" dentro de `/clientes/$id` com CRUD completo.
- Setup inicial (`/setup`) continua igual — primeiro user vira admin.

## Servidor — endpoints novos

`src/server/team-users.ts`:
- `createTeamUser({ email, password, fullName, role, clientIds[] })`
- `setUserAssignments({ userId, clientIds[] })`
- estende `setUserRole` pra aceitar os novos papéis

`src/server/contracts-manage.ts`:
- `createContract`, `updateContract`, `endContract`, `listContractsByClient`, `listAllContracts`

## Fora do escopo desta fase
- Email automático de boas-vindas (segue pendente, depende de domínio).
- Logs de auditoria.
- Permissões por usuário individual (continua só por papel + atribuição).
- Notificação automática 30 dias antes do fim do contrato (posso adicionar numa próxima).

Tudo aprovado pra implementar?

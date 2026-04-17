

O usuário (admin) não consegue se cadastrar porque a tela `/auth` só tem login — não há signup, e a decisão arquitetural foi "só Admin convida" (sem cadastro público). Isso cria um problema de bootstrap: não existe nenhum admin ainda, então ninguém pode convidar ninguém.

## Solução proposta: Bootstrap do primeiro admin

Crio uma rota `/setup` pública que só funciona **enquanto não houver nenhum admin no sistema**. Depois que o primeiro admin for criado, ela trava automaticamente e redireciona para `/auth`.

### Como vai funcionar

1. Você acessa `/setup`
2. Preenche email + senha
3. O sistema:
   - Cria a conta via `supabase.auth.signUp`
   - Insere `role = 'admin'` em `user_roles` para esse usuário
   - Faz login automático
   - Redireciona para `/` (dashboard admin)
4. Próximos acessos a `/setup` mostram "Setup já concluído" e mandam para `/auth`

### Mudanças necessárias

**1. Configuração de Auth (Lovable Cloud)**
- Ativar auto-confirm de email (caso contrário você precisa clicar em link no email antes de logar — atrito desnecessário no bootstrap)

**2. Nova rota `src/routes/setup.tsx`**
- Verifica se já existe algum admin via `select count from user_roles where role='admin'`
- Se sim → tela "já configurado" + link para `/auth`
- Se não → formulário email/senha → signUp → insert role admin → signIn → redirect `/`

**3. Como criar **outros usuários** depois (clientes e novos admins)**
   - Como decidimos "só Admin convida", o admin precisa de uma UI para criar contas. Proponho uma seção simples em `/clientes`:
     - Botão "Criar acesso" no card de cada cliente
     - Modal pede email + senha temporária
     - Cria o usuário (`signUp`), insere `role='cliente'` em `user_roles`, e atualiza `clients.owner_user_id`
   - **Limitação técnica:** `supabase.auth.signUp` desloga o admin atual e loga o novo usuário. Para evitar isso de forma limpa, o ideal seria uma Edge Function usando `service_role` que cria o usuário sem afetar a sessão. Incluo isso no plano.

### Escopo desta entrega

1. Rota `/setup` para criar o primeiro admin (resolve o bloqueio imediato)
2. Auto-confirm de email ativado
3. Edge Function `admin-create-user` (usa service role) — chamada por uma UI em `/clientes` para criar contas de cliente sem deslogar o admin
4. Botão "Criar login" nos cards de cliente em `/clientes.tsx` que chama essa função e vincula `owner_user_id`

### Arquivos afetados

- **Criar** `src/routes/setup.tsx`
- **Criar** `supabase/functions/admin-create-user/index.ts` (+ entrada no `supabase/config.toml`)
- **Editar** `src/routes/clientes.tsx` — adicionar modal "Criar acesso do cliente"
- **Configurar** auto-confirm via tool de auth

### Observação sobre comunicação

Após criar o primeiro admin via `/setup`, recomendo (opcional) remover/proteger essa rota em produção, mas como ela já se auto-trava quando existe admin, é seguro deixar.


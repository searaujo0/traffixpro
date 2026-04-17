

O bootstrap do admin está funcionando. Agora o sistema tem:
- `/setup` (bloqueado após primeiro admin)
- `/auth` (login)
- Admin pode criar clientes e gerar acessos em `/clientes`
- Cliente loga e vai pra `/meu-painel`

## Próximos passos sugeridos (escolha um)

**Opção A — Página de gestão de usuários** (`/admin/usuarios`)
Hoje você só consegue criar acesso de cliente pelo card em `/clientes`. Não tem como:
- Listar todos os usuários do sistema
- Ver quem é admin / quem é cliente
- Promover um cliente a admin (ou vice-versa)
- Resetar senha de alguém
- Remover acesso

Construo uma página simples no menu admin com tabela de usuários + ações (mudar role, enviar reset de senha, deletar). Usa server functions com service_role pra não esbarrar em RLS.

**Opção B — Recuperação de senha**
Fluxo `/forgot-password` → email com link → `/reset-password`. Útil quando um cliente esquecer a senha temporária que você definiu.

**Opção C — Reforço de segurança**
- Ativar HIBP (bloqueia senhas vazadas em vazamentos públicos)
- Desativar signup público no Supabase (agora que o admin já existe, ninguém mais precisa se cadastrar — só via convite do admin)
- Opcional: travar a rota `/setup` definitivamente

**Opção D — Melhorias funcionais no produto** (fora de auth)
Ex: relatórios PDF, gráficos no painel do cliente, notificações, etc. — depende do que você quer priorizar no negócio.

## Minha recomendação

Faria nesta ordem: **C (rápido, fecha brechas) → A (te dá controle total) → B (qualidade de vida)**.

Qual você quer atacar primeiro?


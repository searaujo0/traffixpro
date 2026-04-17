

Olhando o que foi feito: a página `/admin/usuarios` e o backend (`admin-users-manage.ts`) já estão criados, e o link no sidebar foi adicionado. Em teoria, está pronto pra usar — só falta validar.

## Próximo passo: testar end-to-end

Não tem nada pra codar agora. O que precisa acontecer:

1. **Recarregue o app** (a rota `/admin/usuarios` foi adicionada agora; se não tiver feito reload desde então, o `routeTree.gen.ts` precisa ser regenerado pelo dev server).
2. **No menu lateral**, clique em **Usuários** (ícone novo, só aparece pra admin).
3. **Verifique** que:
   - A tabela lista todos os usuários (você + clientes que já criou).
   - Você aparece marcado como "você" e com badge admin.
   - Pode mudar o papel de um cliente no dropdown.
   - O botão "Senha" abre o modal e redefine.
   - O botão de lixeira fica desabilitado pra você mesmo, mas funciona pra outros.
   - Busca filtra por email/cliente/papel.

## Se algo falhar

Me diga exatamente o que aconteceu (mensagem de erro, comportamento estranho, tela em branco, etc.) que eu corrijo. Cenários prováveis:

- **Link "Usuários" não aparece no sidebar** → checar `AppLayout.tsx` (condicional por role).
- **Tabela vazia ou erro 401/403** → checar se `assertAdmin` está reconhecendo seu user_id.
- **Erro ao mudar role de você mesmo pra cliente** → você se trava fora do admin; vou adicionar proteção pra não permitir auto-rebaixamento.
- **Erro de RLS em `clients` ao desvincular no delete** → o service_role bypassa RLS, então não deve dar, mas se der eu investigo.

## Depois que validar

Sigo pra **Opção B (recuperação de senha por email)** ou outra coisa que você priorizar.


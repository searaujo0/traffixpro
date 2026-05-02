---
name: Email automático de pré-cadastro pendente
description: Falta configurar domínio de email e enviar senha temporária ao cadastrar novo cliente
type: feature
---
# Pendente — Email automático de pré-cadastro

**Status:** adiado pelo usuário (aguardando momento de configurar domínio).

**O que falta:**
1. Configurar domínio de email da M1 Digital (ex: notify.m1digital.com.br) via Lovable Emails — exige acesso ao DNS do domínio.
2. Scaffold de auth email templates com branding M1 (cor #2B73BB, logo src/assets/m1-logo.png).
3. Scaffold de transactional email com template "Boas-vindas / Pré-cadastro do cliente".
4. Plugar envio automático no src/server/clients-manage.ts -> createClientFull (após criar usuário no Auth, enviar email com senha temporária + link do painel).

**Quando o usuário voltar ao tópico de email:** perguntar qual domínio usar e se tem acesso ao DNS, então rodar setup de domínio -> setup_email_infra -> scaffold_auth_email_templates -> scaffold_transactional_email -> criar template de pré-cadastro -> editar createClientFull.

## Outras pendências do roadmap M1 Digital
- Integração Instagram (também adiada por escolha do usuário).

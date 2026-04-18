
User precisa das URLs de OAuth Redirect válidas pra colar no Meta App. Já tenho a preview URL via project_urls. Só preciso passar as URLs corretas.

URLs que precisa configurar no Meta:
1. Preview: `https://id-preview--f1cf2d28-4d77-42ef-ab84-d931ce6691a0.lovable.app/auth/facebook/callback`
2. Quando publicar (subdomínio padrão): `https://f1cf2d28-4d77-42ef-ab84-d931ce6691a0.lovable.app/auth/facebook/callback`
3. Domínio customizado (se vier a ter): adicionar depois

Também preciso lembrar do **App Domain** (sem path) que o Meta pede separadamente em App Settings → Basic.

Sem mudança de código — é só guia de configuração. Plano curto.

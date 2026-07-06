# Deploy das Edge Functions

## Funcao: admin-create-student

Esta funcao cria o usuario no Supabase Auth e cria/atualiza o registro em `students`.

Ela nao libera cursos.

## Pelo painel do Supabase

1. Va em `Edge Functions`.
2. Crie uma funcao chamada `admin-create-student`.
3. Cole o conteudo de `supabase-admin-create-student.ts`.
4. Salve/deploy.
5. Confirme que a funcao tem acesso aos secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

Esses secrets normalmente ja existem no ambiente de Edge Functions do Supabase. A `service_role` nunca deve ir para HTML ou JavaScript publico.

## Teste esperado

Na tela `admin-supabase.html`:

1. Entre como admin.
2. Cadastre nome, e-mail e senha temporaria.
3. A funcao cria o usuario no Auth.
4. A tabela `students` recebe/atualiza o aluno.
5. Nenhum curso e liberado automaticamente.

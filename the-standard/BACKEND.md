# Backend da Area do Aluno

Base proposta para sair do prototipo estatico e migrar para uma area real com acesso por aluno.

## Objetivo

- Autenticar aluno por e-mail/senha.
- Mostrar somente os cursos liberados para aquele aluno.
- Permitir que o administrador libere cursos manualmente por uma estacao administrativa.
- Liberar materiais por permissao, sem gravar links privados no frontend.
- Manter financeiro, certificados e progresso em tabelas separadas.

## Caminho sugerido

1. Criar projeto Supabase.
2. Rodar `supabase-schema.sql`.
3. Criar o usuario administrador no Supabase Auth.
4. Rodar `supabase-seed-admin-template.sql` com o UID do administrador.
5. Usar `admin.html` como prototipo da estacao de liberacao manual.
6. Fazer deploy da Edge Function usando `supabase-material-access.ts`.
7. Trocar o prototipo mockado por chamadas autenticadas.

## Operacao manual

O painel administrativo deve ser a estacao de trabalho para liberar cursos:

1. O aluno paga e informa a FlowCore.
2. O administrador entra no painel.
3. Busca ou cadastra o aluno.
4. Clica em liberar curso.
5. A plataforma cria ou atualiza `course_access`.

Assim, a operacao diaria nao depende de SQL.

## Regra para videos

Nao salve links do Google Drive no codigo do site.

Para o prototipo real do Celso, os registros das aulas devem ficar no banco como materiais privados. O frontend deve conhecer apenas `material_id`, titulo, descricao e status. A URL real deve ser resolvida pelo backend depois da autenticacao.

Se a URL final for entregue diretamente ao navegador, ela pode aparecer nas ferramentas de rede do browser. Para esconder tambem da rede, sera necessario servir o arquivo via backend/proxy ou migrar os videos para um storage com URLs assinadas e expiracao curta.

## Arquivos

- `supabase-schema.sql`: estrutura inicial do banco e politicas RLS.
- `supabase-material-access.ts`: funcao protegida para validar acesso a um material.
- `supabase-admin-create-student.ts`: funcao protegida para criar login do aluno sem liberar curso.
- `supabase-seed-admin-template.sql`: promove um usuario Auth a administrador.
- `admin.html` e `admin.js`: prototipo da estacao administrativa.

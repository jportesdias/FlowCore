# Área do Aluno FlowCore Academy

Protótipo visual estático, pronto para GitHub Pages, sem backend real nesta fase.

## Telas

- Login mockado, sem cadastro público.
- Dashboard "Meus Cursos" com cursos liberados.
- Página do curso com documentos, vídeos, simulador e certificado.
- Biblioteca FlowCore com acervo técnico mockado.
- Financeiro com status de pagamentos e comprovantes mockados.
- Comprar cursos com vitrine de produtos, preços e CTA comercial.
- Player de vídeo placeholder.
- Estado vazio para aluno sem cursos.
- Perfil com dados do aluno e certificados.

## Como abrir

Abra `index.html` diretamente no navegador.

## Como trocar mock por Supabase

Os dados estão isolados em `mock-data.js`. Na fase seguinte, substitua o conteúdo desse arquivo, ou carregue os dados em `app.js`, mantendo a estrutura:

- `aluno`
- `cursos`
- `cursos[].materiais`

Os pontos de integração futura estão marcados com `// SUPABASE:` em `mock-data.js` e `app.js`.

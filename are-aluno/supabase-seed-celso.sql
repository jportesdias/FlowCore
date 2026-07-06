-- Seed do aluno Celso Graciano de Almeida Junior.
-- Rodar depois de `supabase-schema.sql`.

-- Garante compatibilidade se a tabela `materials` ja existia no projeto com outro formato.
alter table public.materials add column if not exists course_id text;
alter table public.materials add column if not exists type text;
alter table public.materials add column if not exists title text;
alter table public.materials add column if not exists description text not null default '';
alter table public.materials add column if not exists format text;
alter table public.materials add column if not exists duration text;
alter table public.materials add column if not exists sort_order integer not null default 0;
alter table public.materials add column if not exists is_private boolean not null default true;
alter table public.materials add column if not exists public_url text;
alter table public.materials add column if not exists secure_provider text;
alter table public.materials add column if not exists secure_ref text;
alter table public.materials add column if not exists created_at timestamptz not null default now();

insert into public.courses (id, title, description, cover_path)
values (
  'medidores-vazao',
  'Medidores de Vazao com Enfase em Manutencao e Operacao',
  'Principios, operacao, manutencao e interpretacao de medidores de vazao em producao.',
  'assets/capa-medidores.png'
)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    cover_path = excluded.cover_path;

insert into public.materials (id, course_id, type, title, description, duration, sort_order, is_private)
values
  ('medidores-aula-1', 'medidores-vazao', 'video', 'Aula 1', 'Fundamentos dos medidores de vazao, principios de medicao e aplicacoes na rotina operacional.', 'Video liberado', 10, true),
  ('medidores-aula-2-parte-1', 'medidores-vazao', 'video', 'Aula 2 - Parte 1', 'Operacao, comportamento dos instrumentos e leitura critica de sinais em sistemas de medicao.', 'Video liberado', 20, true),
  ('medidores-aula-2-parte-2', 'medidores-vazao', 'video', 'Aula 2 - Parte 2', 'Continuacao da Aula 2, com interpretacao de condicoes de campo e analise de desempenho.', 'Video liberado', 30, true),
  ('medidores-aula-3', 'medidores-vazao', 'video', 'Aula 3', 'Manutencao, falhas comuns, diagnostico e boas praticas para decisao tecnica.', 'Video liberado', 40, true),
  ('medidores-aula-4', 'medidores-vazao', 'video', 'Aula 4', 'Fechamento do treinamento, revisao aplicada e consolidacao dos pontos criticos de operacao.', 'Video liberado', 50, true)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    duration = excluded.duration,
    sort_order = excluded.sort_order,
    is_private = excluded.is_private;

insert into public.students (auth_user_id, name, email)
values (
  '83650db8-d3af-4e53-aa50-8afc6287e277',
  'Celso Graciano de Almeida Junior',
  'celsoalmeidajunior@gmail.com'
)
on conflict (email) do update
set auth_user_id = excluded.auth_user_id,
    name = excluded.name;

insert into public.course_access (student_id, course_id, valid_until, source)
select id, 'medidores-vazao', '2027-06-04', 'manual'
from public.students
where email = 'celsoalmeidajunior@gmail.com'
on conflict (student_id, course_id) do update
set valid_until = excluded.valid_until,
    source = excluded.source;

insert into public.payments (
  student_id,
  course_id,
  description,
  amount,
  status,
  paid_at,
  valid_from,
  valid_until,
  validation
)
select
  id,
  'medidores-vazao',
  'Medidores de Vazao com Enfase em Manutencao e Operacao',
  550,
  'paid',
  '2026-06-04',
  '2026-06-04',
  '2027-06-04',
  'manual'
from public.students
where email = 'celsoalmeidajunior@gmail.com'
and not exists (
  select 1
  from public.payments payments
  where payments.student_id = students.id
    and payments.course_id = 'medidores-vazao'
    and payments.paid_at = '2026-06-04'
);

insert into public.certificates (
  student_id,
  course_id,
  title,
  issued_at,
  certificate_url,
  status
)
select
  id,
  'medidores-vazao',
  'Certificado de conclusao - Medidores de Vazao',
  '2026-06-04',
  '../relatorio-certificacao-exemplo.html',
  'issued'
from public.students
where email = 'celsoalmeidajunior@gmail.com'
and not exists (
  select 1
  from public.certificates certificates
  where certificates.student_id = students.id
    and certificates.course_id = 'medidores-vazao'
    and certificates.title = 'Certificado de conclusao - Medidores de Vazao'
);

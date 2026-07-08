-- Backend inicial da Area do Aluno FlowCore Academy.
-- Rodar no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id text primary key,
  title text not null,
  description text not null default '',
  cover_path text,
  status text not null default 'published',
  created_at timestamptz not null default now()
);

create table if not exists public.course_access (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  granted_at timestamptz not null default now(),
  valid_until date,
  source text not null default 'manual',
  unique (student_id, course_id)
);

create table if not exists public.materials (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  type text not null check (type in ('documento', 'video', 'simulador', 'certificado')),
  title text not null,
  description text not null default '',
  format text,
  duration text,
  sort_order integer not null default 0,
  is_private boolean not null default true,
  public_url text,
  secure_provider text,
  secure_ref text,
  created_at timestamptz not null default now()
);

-- Caso a tabela `materials` ja exista no projeto com outro formato,
-- estes ajustes completam a estrutura sem apagar dados.
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

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  description text not null,
  amount numeric(10,2) not null,
  status text not null default 'paid',
  paid_at date,
  valid_from date,
  valid_until date,
  validation text not null default 'manual',
  receipt_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.material_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  material_id text not null references public.materials(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, material_id)
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  title text not null,
  issued_at date,
  certificate_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;
alter table public.admin_users enable row level security;
alter table public.courses enable row level security;
alter table public.course_access enable row level security;
alter table public.materials enable row level security;
alter table public.payments enable row level security;
alter table public.material_progress enable row level security;
alter table public.certificates enable row level security;

drop policy if exists "students can read own profile" on public.students;
create policy "students can read own profile"
on public.students for select
using (auth_user_id = auth.uid());

drop policy if exists "admins can manage students" on public.students;
create policy "admins can manage students"
on public.students for all
using (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
);

drop policy if exists "admins can read admin users" on public.admin_users;
drop policy if exists "admin users can read own row" on public.admin_users;
create policy "admin users can read own row"
on public.admin_users for select
using (auth_user_id = auth.uid());

drop policy if exists "students can read accessible courses" on public.courses;
create policy "students can read accessible courses"
on public.courses for select
using (
  exists (
    select 1
    from public.course_access access
    where access.course_id = courses.id
      and access.student_id = (
        select students.id
        from public.students
        where students.auth_user_id = auth.uid()
        limit 1
      )
      and (access.valid_until is null or access.valid_until >= current_date)
  )
);

drop policy if exists "admins can manage courses" on public.courses;
create policy "admins can manage courses"
on public.courses for all
using (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
);

drop policy if exists "students can read own access" on public.course_access;
create policy "students can read own access"
on public.course_access for select
using (
  student_id = (
    select students.id
    from public.students
    where students.auth_user_id = auth.uid()
    limit 1
  )
  and (valid_until is null or valid_until >= current_date)
);

drop policy if exists "admins can manage course access" on public.course_access;
create policy "admins can manage course access"
on public.course_access for all
using (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
);

drop policy if exists "students can read accessible material metadata" on public.materials;
create policy "students can read accessible material metadata"
on public.materials for select
using (
  exists (
    select 1
    from public.course_access access
    where access.course_id = materials.course_id
      and access.student_id = (
        select students.id
        from public.students
        where students.auth_user_id = auth.uid()
        limit 1
      )
      and (access.valid_until is null or access.valid_until >= current_date)
  )
);

drop policy if exists "admins can manage materials" on public.materials;
create policy "admins can manage materials"
on public.materials for all
using (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
);

drop policy if exists "students can read own payments" on public.payments;
create policy "students can read own payments"
on public.payments for select
using (
  student_id = (
    select students.id
    from public.students
    where students.auth_user_id = auth.uid()
    limit 1
  )
);

drop policy if exists "admins can manage payments" on public.payments;
create policy "admins can manage payments"
on public.payments for all
using (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
);

drop policy if exists "students can read own progress" on public.material_progress;
create policy "students can read own progress"
on public.material_progress for select
using (
  student_id = (
    select students.id
    from public.students
    where students.auth_user_id = auth.uid()
    limit 1
  )
);

drop policy if exists "admins can read progress" on public.material_progress;
create policy "admins can read progress"
on public.material_progress for select
using (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
);

drop policy if exists "students can upsert own progress" on public.material_progress;
create policy "students can upsert own progress"
on public.material_progress for insert
with check (
  student_id = (
    select students.id
    from public.students
    where students.auth_user_id = auth.uid()
    limit 1
  )
);

drop policy if exists "students can update own progress" on public.material_progress;
create policy "students can update own progress"
on public.material_progress for update
using (
  student_id = (
    select students.id
    from public.students
    where students.auth_user_id = auth.uid()
    limit 1
  )
)
with check (
  student_id = (
    select students.id
    from public.students
    where students.auth_user_id = auth.uid()
    limit 1
  )
);

drop policy if exists "students can read own certificates" on public.certificates;
create policy "students can read own certificates"
on public.certificates for select
using (
  student_id = (
    select students.id
    from public.students
    where students.auth_user_id = auth.uid()
    limit 1
  )
);

drop policy if exists "admins can manage certificates" on public.certificates;
create policy "admins can manage certificates"
on public.certificates for all
using (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users admins
    where admins.auth_user_id = auth.uid()
  )
);

-- Seed sem links privados. Inserir URLs/referencias privadas somente no banco,
-- nunca no repositorio.
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

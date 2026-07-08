-- Reparo geral da plataforma FlowCore Academy.
-- Rode este arquivo uma vez no SQL Editor do Supabase.
--
-- Ele nao libera curso para um e-mail especifico.
-- Ele prepara o banco para qualquer aluno criado pela tela admin:
-- - aluno le o proprio perfil;
-- - aluno le os proprios acessos;
-- - aluno ve apenas cursos liberados para ele;
-- - admin consegue gerenciar alunos, cursos e acessos;
-- - a tabela materials antiga recebe colunas esperadas sem apagar dados.

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
  id text primary key
);

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

alter table public.students enable row level security;
alter table public.admin_users enable row level security;
alter table public.courses enable row level security;
alter table public.course_access enable row level security;
alter table public.materials enable row level security;
alter table public.payments enable row level security;

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

drop policy if exists "admin users can read own row" on public.admin_users;
create policy "admin users can read own row"
on public.admin_users for select
using (auth_user_id = auth.uid());

drop policy if exists "students can read own access" on public.course_access;
create policy "students can read own access"
on public.course_access for select
using (
  exists (
    select 1
    from public.students students
    where students.id = course_access.student_id
      and students.auth_user_id = auth.uid()
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

drop policy if exists "students can read accessible courses" on public.courses;
create policy "students can read accessible courses"
on public.courses for select
using (
  exists (
    select 1
    from public.course_access access
    join public.students students on students.id = access.student_id
    where access.course_id = courses.id
      and students.auth_user_id = auth.uid()
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

drop policy if exists "students can read accessible material metadata" on public.materials;
create policy "students can read accessible material metadata"
on public.materials for select
using (
  course_id is not null
  and exists (
    select 1
    from public.course_access access
    join public.students students on students.id = access.student_id
    where access.course_id = materials.course_id
      and students.auth_user_id = auth.uid()
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
  exists (
    select 1
    from public.students students
    where students.id = payments.student_id
      and students.auth_user_id = auth.uid()
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

insert into public.courses (id, title, description, cover_path, status)
values
  ('medidores-vazao', 'Medidores de Vazao com Enfase em Manutencao e Operacao', 'Curso de medidores de vazao para alunos liberados manualmente.', 'assets/capa-medidores.png', 'published'),
  ('provadores-compactos', 'Provadores Compacto', 'Operacao, prova e interpretacao com provadores compactos.', 'assets/capa-provadores.png', 'published'),
  ('computadores-vazao', 'Computadores de Vazao', 'Configuracao, operacao e interpretacao de computadores de vazao.', 'assets/computador-vazao2.png', 'published'),
  ('ia-dominio-tecnico', 'IA para Dominio Tecnico', 'Uso pratico de IA para estudo e documentacao tecnica.', 'assets/IA-domnio.png', 'published')
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    cover_path = excluded.cover_path,
    status = excluded.status;

select
  students.id as student_id,
  students.email,
  count(course_access.course_id) as access_count,
  string_agg(course_access.course_id, ', ' order by course_access.course_id) as course_ids
from public.students students
left join public.course_access course_access on course_access.student_id = students.id
group by students.id, students.email
order by students.email;

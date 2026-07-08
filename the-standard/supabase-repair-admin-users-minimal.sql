-- Reparo minimo: cria apenas a tabela de administradores.
-- Rode este arquivo primeiro. Depois rode `supabase-seed-admin-template.sql`.

create table if not exists public.admin_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin users can read own row" on public.admin_users;
create policy "admin users can read own row"
on public.admin_users for select
using (auth_user_id = auth.uid());

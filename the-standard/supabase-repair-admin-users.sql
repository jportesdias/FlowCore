-- Reparo para adicionar a tabela de administradores ao projeto ja criado.
-- Rode antes de `supabase-seed-admin-template.sql`.

create table if not exists public.admin_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admins can read admin users" on public.admin_users;
drop policy if exists "admin users can read own row" on public.admin_users;
create policy "admin users can read own row"
on public.admin_users for select
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

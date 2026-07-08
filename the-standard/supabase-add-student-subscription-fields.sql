-- Adiciona campos de assinatura usados pela Area do Aluno.
-- Rode uma vez no SQL Editor do Supabase.

alter table public.students
add column if not exists subscription_start_date date,
add column if not exists subscription_active boolean not null default true;

-- Para alunos ja existentes sem data de assinatura, usa a data de criacao do perfil.
update public.students
set subscription_start_date = created_at::date
where subscription_start_date is null;

select
  id,
  email,
  subscription_start_date,
  subscription_active
from public.students
order by email;

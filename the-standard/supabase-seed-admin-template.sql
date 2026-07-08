-- Promover um usuario existente do Supabase Auth para administrador da Area do Aluno.
-- Versao recomendada: busca o UID diretamente pelo e-mail no auth.users.

insert into public.admin_users (auth_user_id, email)
select
  id,
  email
from auth.users
where email = 'flowcore.academy@gmail.com'
on conflict (auth_user_id) do update
set email = excluded.email;

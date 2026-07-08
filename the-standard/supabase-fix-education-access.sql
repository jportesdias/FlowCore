-- Reparo pontual para o aluno education@flowcoreacademy.com.
-- Objetivo:
-- 1. Garantir que alunos conseguem ler o proprio perfil e os proprios acessos.
-- 2. Liberar todos os cursos cadastrados para este aluno.
-- 3. Mostrar uma conferencia final do que ficou gravado.

alter table public.students enable row level security;
alter table public.course_access enable row level security;
alter table public.courses enable row level security;
alter table public.materials enable row level security;
alter table public.payments enable row level security;

drop policy if exists "students can read own profile" on public.students;
create policy "students can read own profile"
on public.students for select
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

drop policy if exists "students can read accessible material metadata" on public.materials;
create policy "students can read accessible material metadata"
on public.materials for select
using (
  exists (
    select 1
    from public.course_access access
    join public.students students on students.id = access.student_id
    where access.course_id = materials.course_id
      and students.auth_user_id = auth.uid()
      and (access.valid_until is null or access.valid_until >= current_date)
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

insert into public.course_access (student_id, course_id, valid_until, source)
select students.id, courses.id, (current_date + interval '1 year')::date, 'manual'
from public.students students
cross join public.courses courses
where lower(students.email) = lower('education@flowcoreacademy.com')
on conflict (student_id, course_id) do update
set valid_until = excluded.valid_until,
    source = excluded.source;

select
  students.id as student_id,
  students.email,
  count(course_access.course_id) as access_count,
  string_agg(course_access.course_id, ', ' order by course_access.course_id) as course_ids
from public.students students
left join public.course_access course_access on course_access.student_id = students.id
where lower(students.email) = lower('education@flowcoreacademy.com')
group by students.id, students.email;

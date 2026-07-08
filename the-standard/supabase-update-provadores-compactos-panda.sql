-- Cria ou atualiza as aulas do curso de Provadores Compacto com player Panda.
-- Rode este arquivo no SQL Editor do projeto Supabase usado pela Area do Aluno.

insert into public.materials (
  id,
  course_id,
  type,
  title,
  description,
  format,
  duration,
  sort_order,
  is_private,
  public_url
)
values
  (
    'provadores-aula-1',
    'provadores-compactos',
    'video',
    'Aula 1',
    'Fundamentos de provadores compactos, operacao e aplicacoes na rotina de calibracao.',
    'video',
    'Video liberado',
    10,
    true,
    'https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=bc71d81e-d946-4e5d-a04c-78bfd3a76707'
  ),
  (
    'provadores-aula-2',
    'provadores-compactos',
    'video',
    'Aula 2',
    'Procedimentos operacionais, corridas de prova e interpretacao dos resultados.',
    'video',
    'Video liberado',
    20,
    true,
    'https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=4958dc8a-5948-457a-bbad-41ea1be8f2da'
  ),
  (
    'provadores-aula-3',
    'provadores-compactos',
    'video',
    'Aula 3',
    'Fechamento do treinamento com revisao aplicada e consolidacao dos pontos operacionais.',
    'video',
    'Video liberado',
    30,
    true,
    'https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=bcdcaeab-87b9-453f-9af0-1944bc247de1'
  ),
  (
    'provadores-exercicios-calculo',
    'provadores-compactos',
    'documento',
    'Exercícios de Cálculo',
    'Lista de exercícios de cálculo para prática do curso de Provadores Compacto.',
    'pdf',
    'Material de apoio',
    40,
    true,
    'https://drive.google.com/file/d/11t6bbrvsbaCLO1oElwBClw8sXBLXX8BX/view?usp=drive_link'
  )
on conflict (id) do update
set
  course_id = excluded.course_id,
  type = excluded.type,
  title = excluded.title,
  description = excluded.description,
  format = excluded.format,
  duration = excluded.duration,
  sort_order = excluded.sort_order,
  is_private = excluded.is_private,
  public_url = excluded.public_url;

select id, course_id, title, public_url
from public.materials
where id in ('provadores-aula-1', 'provadores-aula-2', 'provadores-aula-3', 'provadores-exercicios-calculo')
  and course_id = 'provadores-compactos'
order by sort_order;

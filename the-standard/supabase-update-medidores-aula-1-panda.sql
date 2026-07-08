-- Atualiza as aulas do curso de Medidores para usar o player Panda.
-- Rode este arquivo no SQL Editor do projeto Supabase usado pela Area do Aluno.

update public.materials
set
  public_url = case id
    when 'medidores-aula-1' then 'https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=f60b1b63-c079-49fc-867b-f97beccb0f02'
    when 'medidores-aula-2-parte-1' then 'https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=71e94ef6-e84b-47cb-a486-c95e350e607e'
    when 'medidores-aula-2-parte-2' then 'https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=558a32d5-471f-4429-8e17-81e55858b297'
    when 'medidores-aula-3' then 'https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=ff5a52bd-03a6-4ff3-bb17-f1e6c9044488'
    when 'medidores-aula-4' then 'https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=a89f78bc-3397-48a0-b671-b833a63220f5'
    else public_url
  end
where id in ('medidores-aula-1', 'medidores-aula-2-parte-1', 'medidores-aula-2-parte-2', 'medidores-aula-3', 'medidores-aula-4')
  and course_id = 'medidores-vazao';

select id, course_id, title, public_url
from public.materials
where id in ('medidores-aula-1', 'medidores-aula-2-parte-1', 'medidores-aula-2-parte-2', 'medidores-aula-3', 'medidores-aula-4')
  and course_id = 'medidores-vazao';

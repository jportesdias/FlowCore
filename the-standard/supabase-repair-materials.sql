-- Reparo para projeto onde a tabela `materials` ja existia sem as colunas do portal do aluno.
-- Rodar uma vez antes do seed do Celso.

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

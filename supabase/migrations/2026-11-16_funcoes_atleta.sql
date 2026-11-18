-- =============================================================================
-- Funções novas do atleta (16/11/2026)
--
-- Rodar UMA vez no SQL Editor do Supabase (produção). Pode rodar de novo sem
-- medo: tudo usa "if not exists" / "drop policy if exists".
--
-- O site funciona sem isto (as telas novas só ficam vazias ou escondidas),
-- então a ordem não quebra nada — mas repetições, esforço, conversa, provas e
-- marcas só passam a gravar depois que este arquivo rodar.
-- =============================================================================

-- 1) Repetições por série -----------------------------------------------------
alter table public.exercise_logs
  add column if not exists reps integer check (reps is null or (reps between 1 and 200));

-- 1b) Peso corporal ------------------------------------------------------------
-- Nova métrica "corporal" (exercício sem carga; o valor é o número de
-- repetições). Troca a regra que lista as métricas aceitas.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.exercise_logs'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%metrica%'
  loop
    execute format('alter table public.exercise_logs drop constraint %I', c);
  end loop;
end $$;

alter table public.exercise_logs
  add constraint exercise_logs_metrica_check
  check (metrica in ('kg', 'distancia', 'tempo', 'pace', 'corporal'));

-- 2) Esforço e bem-estar por sessão -------------------------------------------
create table if not exists public.session_feedback (
  id               uuid primary key default gen_random_uuid(),
  athlete_id       uuid not null references public.athletes (id) on delete cascade,
  training_plan_id uuid not null references public.training_plans (id) on delete cascade,
  session_key      text not null check (char_length(session_key) <= 60),
  esforco          integer not null check (esforco between 1 and 10),
  sono             integer check (sono is null or (sono between 1 and 5)),
  dor              integer check (dor is null or (dor between 0 and 10)),
  data             date not null default current_date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (training_plan_id, session_key)
);
create index if not exists session_feedback_athlete_data_idx on public.session_feedback (athlete_id, data);

alter table public.session_feedback enable row level security;
alter table public.session_feedback force row level security;

drop policy if exists session_feedback_select_athlete_own on public.session_feedback;
create policy session_feedback_select_athlete_own on public.session_feedback for select to authenticated
  using (athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid()));

drop policy if exists session_feedback_select_coach_linked on public.session_feedback;
create policy session_feedback_select_coach_linked on public.session_feedback for select to authenticated
  using (athlete_id in (select ca.athlete_id from public.coach_athletes ca where ca.coach_id = auth.uid()));

drop policy if exists session_feedback_insert_athlete_own on public.session_feedback;
create policy session_feedback_insert_athlete_own on public.session_feedback for insert to authenticated
  with check (
    athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid())
    and training_plan_id in (
      select tp.id from public.training_plans tp
      join public.athletes a on a.id = tp.athlete_id
      where a.user_id = auth.uid()
    )
  );

drop policy if exists session_feedback_update_athlete_own on public.session_feedback;
create policy session_feedback_update_athlete_own on public.session_feedback for update to authenticated
  using (athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid()))
  with check (athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid()));

drop policy if exists session_feedback_delete_athlete_own on public.session_feedback;
create policy session_feedback_delete_athlete_own on public.session_feedback for delete to authenticated
  using (athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid()));

-- 3) Conversa: respostas aos recados (observations) ---------------------------
-- Quem pode ler e responder: o atleta dono do recado e o treinador vinculado
-- a esse atleta. author_id é sempre o usuário logado.
create table if not exists public.observation_replies (
  id             uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.observations (id) on delete cascade,
  author_id      uuid not null references auth.users (id) on delete cascade,
  texto          text not null check (char_length(trim(texto)) > 0 and char_length(texto) <= 2000),
  created_at     timestamptz not null default now()
);
create index if not exists observation_replies_obs_idx on public.observation_replies (observation_id, created_at);

alter table public.observation_replies enable row level security;
alter table public.observation_replies force row level security;

drop policy if exists observation_replies_select_participants on public.observation_replies;
create policy observation_replies_select_participants on public.observation_replies for select to authenticated
  using (
    observation_id in (
      select o.id from public.observations o
      where o.athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid())
         or o.athlete_id in (select ca.athlete_id from public.coach_athletes ca where ca.coach_id = auth.uid())
    )
  );

drop policy if exists observation_replies_insert_participants on public.observation_replies;
create policy observation_replies_insert_participants on public.observation_replies for insert to authenticated
  with check (
    author_id = auth.uid()
    and observation_id in (
      select o.id from public.observations o
      where o.athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid())
         or o.athlete_id in (select ca.athlete_id from public.coach_athletes ca where ca.coach_id = auth.uid())
    )
  );

drop policy if exists observation_replies_delete_own on public.observation_replies;
create policy observation_replies_delete_own on public.observation_replies for delete to authenticated
  using (author_id = auth.uid());

-- 4) Provas (competições) ------------------------------------------------------
create table if not exists public.competitions (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  nome       text not null check (char_length(trim(nome)) > 0 and char_length(nome) <= 120),
  data       date not null,
  local      text check (local is null or char_length(local) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists competitions_athlete_data_idx on public.competitions (athlete_id, data);

alter table public.competitions enable row level security;
alter table public.competitions force row level security;

drop policy if exists competitions_select_athlete_own on public.competitions;
create policy competitions_select_athlete_own on public.competitions for select to authenticated
  using (athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid()));

drop policy if exists competitions_select_coach_linked on public.competitions;
create policy competitions_select_coach_linked on public.competitions for select to authenticated
  using (athlete_id in (select ca.athlete_id from public.coach_athletes ca where ca.coach_id = auth.uid()));

drop policy if exists competitions_insert_athlete_own on public.competitions;
create policy competitions_insert_athlete_own on public.competitions for insert to authenticated
  with check (athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid()));

drop policy if exists competitions_delete_athlete_own on public.competitions;
create policy competitions_delete_athlete_own on public.competitions for delete to authenticated
  using (athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid()));

-- 5) Marcas de competição ------------------------------------------------------
-- unidade: 's' = tempo em segundos (menor é melhor); 'm' = distância/altura em
-- metros e 'pts' = pontos (maior é melhor).
create table if not exists public.marks (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  prova      text not null check (char_length(trim(prova)) > 0 and char_length(prova) <= 60),
  valor      numeric not null check (valor > 0),
  unidade    text not null check (unidade in ('s', 'm', 'pts')),
  data       date not null check (data <= current_date),
  competicao text check (competicao is null or char_length(competicao) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists marks_athlete_prova_idx on public.marks (athlete_id, prova, data);

alter table public.marks enable row level security;
alter table public.marks force row level security;

drop policy if exists marks_select_athlete_own on public.marks;
create policy marks_select_athlete_own on public.marks for select to authenticated
  using (athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid()));

drop policy if exists marks_select_coach_linked on public.marks;
create policy marks_select_coach_linked on public.marks for select to authenticated
  using (athlete_id in (select ca.athlete_id from public.coach_athletes ca where ca.coach_id = auth.uid()));

drop policy if exists marks_insert_athlete_own on public.marks;
create policy marks_insert_athlete_own on public.marks for insert to authenticated
  with check (athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid()));

drop policy if exists marks_delete_athlete_own on public.marks;
create policy marks_delete_athlete_own on public.marks for delete to authenticated
  using (athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid()));

-- =============================================================================
-- Plataforma de Treinamento — schema + RLS + validação
-- NÃO RODAR EM PRODUÇÃO SEM CONFIRMAÇÃO. Este arquivo é a proposta a ser
-- revisada. Rodar no SQL Editor do Supabase somente depois de aprovado.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. TABELAS
-- -----------------------------------------------------------------------------

-- profiles: um registro por usuário logado (atleta OU treinador), define o papel.
create table if not exists public.profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  nome       text not null,
  papel      text not null check (papel in ('athlete', 'coach')),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists avatar_url text;

-- athletes: entidade "atleta" usada como FK em todo o resto do schema.
-- 1 atleta = 1 usuário logado (user_id), mas mantido como tabela própria
-- (em vez de reusar profiles.id) para isolar o vínculo de dados de treino
-- do vínculo de autenticação/papel.
create table if not exists public.athletes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  nome       text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.athletes add column if not exists avatar_url text;

-- coach_athletes: vínculo treinador <-> atleta. Gerenciado manualmente pelo
-- Ariel (via SQL Editor/service role) — não há policy de INSERT/UPDATE/DELETE
-- para authenticated, então nenhum usuário comum consegue criar vínculos.
-- (Ver "Suposições" — confirmar se isso deve virar uma tela self-service.)
create table if not exists public.coach_athletes (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references auth.users (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coach_id, athlete_id)
);

-- training_plans: metadados de cada planilha .xlsx gerada para um atleta.
create table if not exists public.training_plans (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.athletes (id) on delete cascade,
  arquivo_url   text not null,
  nome_arquivo  text not null,
  data_criacao  date not null default current_date,
  created_at    timestamptz not null default now(),
  -- nome_arquivo deve ser só o nome do arquivo, nunca um path com ../ etc.
  constraint nome_arquivo_sem_path check (nome_arquivo !~ '[\\/]' )
);

-- modo_treino: formato detectado pelo parser (semana = grade semanal de
-- academia, blocos = sessão de pista, generico = nenhum dos dois) — usado
-- só para escolher o ícone certo na lista de treinos.
alter table public.training_plans
  add column if not exists modo_treino text check (modo_treino in ('semana', 'blocos', 'generico'));

-- Permite reimportar o mesmo arquivo (mesmo atleta + mesmo nome) sem duplicar
-- linha — o script de import (Etapa 4) faz upsert nessa chave.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'training_plans_athlete_arquivo_unique'
  ) then
    alter table public.training_plans
      add constraint training_plans_athlete_arquivo_unique unique (athlete_id, nome_arquivo);
  end if;
end $$;

-- training_data: as séries numéricas extraídas de cada planilha.
-- Convenção para não misturar distância e pace na mesma coluna (item 4):
--   corrida/bicicleta por distância -> variavel = 'distancia', unidade = 'km'
--   corrida/bicicleta por tempo     -> variavel = 'pace',      unidade = 'min/km'
--   academia (volume load)          -> variavel = 'volume_carga', unidade = 'kg'
--   cardio (tempo)                  -> variavel = 'tempo',      unidade = 'min'
create table if not exists public.training_data (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  data       date not null,
  tipo       text not null check (tipo in ('academia', 'corrida', 'bicicleta', 'cardio')),
  variavel   text not null check (variavel in ('volume_carga', 'distancia', 'pace', 'tempo')),
  valor      numeric not null,
  unidade    text not null check (unidade in ('kg', 'km', 'min/km', 'min')),
  created_at timestamptz not null default now(),

  -- valor sempre positivo (item 4: "rejeite valores negativos")
  constraint valor_positivo check (valor > 0),

  -- data nunca no futuro (item 4)
  constraint data_nao_futura check (data <= current_date),

  -- combinação (tipo, variavel, unidade) tem que fazer sentido semântico:
  -- não deixa gravar, por exemplo, tipo='cardio' com variavel='distancia'.
  constraint combinacao_valida check (
    (tipo = 'academia'  and variavel = 'volume_carga' and unidade = 'kg') or
    (tipo in ('corrida', 'bicicleta') and variavel = 'distancia' and unidade = 'km') or
    (tipo in ('corrida', 'bicicleta') and variavel = 'pace'       and unidade = 'min/km') or
    (tipo = 'cardio'    and variavel = 'tempo'       and unidade = 'min')
  )
);

-- Permite reimportar a aba "Registro" sem duplicar: mesmo atleta + mesma
-- data + mesmo tipo + mesma variável vira upsert (atualiza o valor).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'training_data_athlete_data_tipo_variavel_unique'
  ) then
    alter table public.training_data
      add constraint training_data_athlete_data_tipo_variavel_unique
      unique (athlete_id, data, tipo, variavel);
  end if;
end $$;

create index if not exists training_data_athlete_data_idx
  on public.training_data (athlete_id, data);

-- observations: texto livre do atleta sobre um treino específico.
create table if not exists public.observations (
  id                uuid primary key default gen_random_uuid(),
  training_plan_id  uuid not null references public.training_plans (id) on delete cascade,
  athlete_id        uuid not null references public.athletes (id) on delete cascade,
  texto             text not null,
  data              date not null default current_date,
  created_at        timestamptz not null default now(),

  -- item 5: limite de tamanho para evitar abuso (o texto em si é tratado
  -- como conteúdo puro, nunca como HTML/código — isso é reforçado na
  -- renderização React, que escapa por padrão; ver nota no final do arquivo)
  constraint texto_nao_vazio check (char_length(trim(texto)) > 0),
  constraint texto_tamanho_maximo check (char_length(texto) <= 2000)
);

-- training_completions: marca que uma sessão específica (um dia da grade
-- semanal ou um bloco de pista) de um plano foi concluída pelo atleta.
-- session_key é a chave estável gerada pelo parser (ex.: 's0-d1', 'b3').
create table if not exists public.training_completions (
  id                uuid primary key default gen_random_uuid(),
  training_plan_id  uuid not null references public.training_plans (id) on delete cascade,
  athlete_id        uuid not null references public.athletes (id) on delete cascade,
  session_key       text not null,
  completed_at      timestamptz not null default now(),
  unique (training_plan_id, session_key),
  constraint session_key_tamanho check (char_length(session_key) <= 60)
);

create index if not exists training_completions_plan_idx
  on public.training_completions (training_plan_id);

-- strava_connections: vínculo OAuth de um atleta com o Strava. Guarda os
-- tokens (só usados no servidor). O escopo pedido é apenas leitura de
-- atividades (activity:read), então mesmo que o dono veja o próprio token
-- via RLS, o risco é baixo — e nenhum outro usuário alcança a linha.
create table if not exists public.strava_connections (
  athlete_id        uuid primary key references public.athletes (id) on delete cascade,
  strava_athlete_id bigint not null,
  access_token      text not null,
  refresh_token     text not null,
  expires_at        timestamptz not null,
  scope             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. TRIGGER: cria profile (+ athletes, se for atleta) no cadastro
-- -----------------------------------------------------------------------------
-- Roda com privilégio do dono da função (security definer), então o cliente
-- NUNCA insere diretamente em profiles/athletes — o papel vem do
-- raw_user_meta_data que o app manda no signUp(), mas quem grava é o
-- servidor (Postgres trigger), não uma escrita direta do cliente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_papel text := coalesce(new.raw_user_meta_data ->> 'papel', 'athlete');
  v_nome  text := coalesce(new.raw_user_meta_data ->> 'nome', '');
begin
  if v_papel not in ('athlete', 'coach') then
    v_papel := 'athlete';
  end if;

  insert into public.profiles (user_id, nome, papel)
  values (new.id, v_nome, v_papel);

  if v_papel = 'athlete' then
    insert into public.athletes (user_id, nome)
    values (new.id, v_nome);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY — ativar em TODAS as tabelas, sem exceção
-- -----------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.athletes       enable row level security;
alter table public.coach_athletes enable row level security;
alter table public.training_plans enable row level security;
alter table public.training_data  enable row level security;
alter table public.observations   enable row level security;
alter table public.training_completions enable row level security;
alter table public.strava_connections   enable row level security;

-- Trava adicional: mesmo que alguém rode "ALTER TABLE ... DISABLE ROW LEVEL
-- SECURITY" por engano depois, FORCE garante que o dono da tabela também
-- respeita RLS (só bypassa quem usa BYPASSRLS, ou seja, o service_role).
alter table public.profiles       force row level security;
alter table public.athletes       force row level security;
alter table public.coach_athletes force row level security;
alter table public.training_plans force row level security;
alter table public.training_data  force row level security;
alter table public.observations   force row level security;
alter table public.training_completions force row level security;
alter table public.strava_connections   force row level security;

-- -----------------------------------------------------------------------------
-- 4. POLICIES
-- -----------------------------------------------------------------------------

-- profiles: cada usuário só vê/edita o próprio perfil. Papel (papel) não é
-- editável pelo cliente (ver GRANT column-level abaixo).
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sem policy de INSERT/DELETE para authenticated: a única via de criação é o
-- trigger handle_new_user (security definer). Sem policy = acesso negado por
-- padrão em RLS, então nenhuma outra via de escrita existe.

-- Restringe quais colunas o client pode de fato alterar num UPDATE, mesmo
-- que a policy acima permita a linha inteira: papel fica de fora.
revoke update on public.profiles from authenticated;
grant update (nome, avatar_url) on public.profiles to authenticated;

-- athletes: o próprio atleta vê/edita seu registro. O treinador só LÊ os
-- atletas vinculados a ele (nunca escreve).
drop policy if exists athletes_select_own on public.athletes;
create policy athletes_select_own
  on public.athletes for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists athletes_select_coach_linked on public.athletes;
create policy athletes_select_coach_linked
  on public.athletes for select
  to authenticated
  using (
    id in (
      select ca.athlete_id
      from public.coach_athletes ca
      where ca.coach_id = auth.uid()
    )
  );

drop policy if exists athletes_update_own on public.athletes;
create policy athletes_update_own
  on public.athletes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- coach_athletes: o treinador só enxerga os próprios vínculos. Nenhuma
-- policy de INSERT/UPDATE/DELETE para authenticated — vínculos são criados
-- manualmente pelo Ariel via SQL Editor (service_role bypassa RLS).
drop policy if exists coach_athletes_select_own on public.coach_athletes;
create policy coach_athletes_select_own
  on public.coach_athletes for select
  to authenticated
  using (coach_id = auth.uid());

-- training_plans: atleta lê os próprios; treinador lê os dos atletas
-- vinculados. Sem policy de INSERT/UPDATE/DELETE para authenticated — a
-- única via de escrita é o script de importação com service_role (Etapa 4).
drop policy if exists training_plans_select_athlete_own on public.training_plans;
create policy training_plans_select_athlete_own
  on public.training_plans for select
  to authenticated
  using (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  );

drop policy if exists training_plans_select_coach_linked on public.training_plans;
create policy training_plans_select_coach_linked
  on public.training_plans for select
  to authenticated
  using (
    athlete_id in (
      select ca.athlete_id
      from public.coach_athletes ca
      where ca.coach_id = auth.uid()
    )
  );

-- training_data: mesma lógica de training_plans.
--
-- Por que a policy do treinador não vaza dados de atleta não vinculado,
-- linha por linha:
--   1. `athlete_id in (...)`            -> só libera a linha se o athlete_id
--                                          dela aparecer no resultado da subquery.
--   2. `select ca.athlete_id`           -> a subquery só produz athlete_id,
--                                          nunca dados de outra tabela.
--   3. `from public.coach_athletes ca`  -> a fonte é exclusivamente a tabela
--                                          de vínculo, não training_data nem
--                                          nenhuma tabela de terceiros.
--   4. `where ca.coach_id = auth.uid()` -> filtra pelo UID do JWT da sessão
--                                          atual (não é um valor enviado pelo
--                                          cliente, é o claim assinado pelo
--                                          Supabase Auth) — o treinador não
--                                          pode forjar "ser" outro coach_id.
--   5. RLS roda por linha, então mesmo um `select *` sem WHERE do cliente
--      só devolve linhas cujo athlete_id passou no filtro acima — não existe
--      caminho para ler athlete_id de fora do conjunto vinculado a esse
--      auth.uid() específico.
drop policy if exists training_data_select_athlete_own on public.training_data;
create policy training_data_select_athlete_own
  on public.training_data for select
  to authenticated
  using (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  );

drop policy if exists training_data_select_coach_linked on public.training_data;
create policy training_data_select_coach_linked
  on public.training_data for select
  to authenticated
  using (
    athlete_id in (
      select ca.athlete_id
      from public.coach_athletes ca
      where ca.coach_id = auth.uid()
    )
  );

-- O próprio atleta escreve seus dados (formulário de registro manual no site
-- e sincronização do Strava, ambos rodando com a sessão do atleta). O
-- treinador continua só lendo (sem policy de escrita para ele). O script de
-- import segue usando service_role, que ignora RLS.
drop policy if exists training_data_insert_athlete_own on public.training_data;
create policy training_data_insert_athlete_own
  on public.training_data for insert
  to authenticated
  with check (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  );

drop policy if exists training_data_update_athlete_own on public.training_data;
create policy training_data_update_athlete_own
  on public.training_data for update
  to authenticated
  using (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  )
  with check (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  );

-- observations: atleta lê/escreve as próprias. Treinador só LÊ as dos
-- atletas vinculados (nunca escreve, nunca apaga).
drop policy if exists observations_select_athlete_own on public.observations;
create policy observations_select_athlete_own
  on public.observations for select
  to authenticated
  using (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  );

drop policy if exists observations_select_coach_linked on public.observations;
create policy observations_select_coach_linked
  on public.observations for select
  to authenticated
  using (
    athlete_id in (
      select ca.athlete_id
      from public.coach_athletes ca
      where ca.coach_id = auth.uid()
    )
  );

drop policy if exists observations_insert_athlete_own on public.observations;
create policy observations_insert_athlete_own
  on public.observations for insert
  to authenticated
  with check (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
    -- a observação tem que ser sobre um treino que é realmente do próprio
    -- atleta (não dá pra grafar training_plan_id de outro atleta e "colar"
    -- o texto lá)
    and training_plan_id in (
      select tp.id from public.training_plans tp
      join public.athletes a on a.id = tp.athlete_id
      where a.user_id = auth.uid()
    )
  );

drop policy if exists observations_update_athlete_own on public.observations;
create policy observations_update_athlete_own
  on public.observations for update
  to authenticated
  using (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  )
  with check (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  );

-- Sem policy de DELETE para observations por padrão (atleta não apaga
-- histórico). Confirmar se isso é o desejado — ver "Suposições".

-- training_completions: atleta marca/desmarca (insert + delete) as próprias
-- sessões; treinador só LÊ as dos atletas vinculados.
drop policy if exists training_completions_select_athlete_own on public.training_completions;
create policy training_completions_select_athlete_own
  on public.training_completions for select
  to authenticated
  using (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  );

drop policy if exists training_completions_select_coach_linked on public.training_completions;
create policy training_completions_select_coach_linked
  on public.training_completions for select
  to authenticated
  using (
    athlete_id in (
      select ca.athlete_id
      from public.coach_athletes ca
      where ca.coach_id = auth.uid()
    )
  );

drop policy if exists training_completions_insert_athlete_own on public.training_completions;
create policy training_completions_insert_athlete_own
  on public.training_completions for insert
  to authenticated
  with check (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
    -- a conclusão tem que ser de um plano que é realmente do próprio atleta
    and training_plan_id in (
      select tp.id from public.training_plans tp
      join public.athletes a on a.id = tp.athlete_id
      where a.user_id = auth.uid()
    )
  );

drop policy if exists training_completions_delete_athlete_own on public.training_completions;
create policy training_completions_delete_athlete_own
  on public.training_completions for delete
  to authenticated
  using (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  );

-- strava_connections: só o próprio atleta lê/grava/apaga a própria conexão.
-- O treinador NÃO acessa os tokens — ele já enxerga os dados sincronizados
-- via as policies de training_data.
drop policy if exists strava_connections_all_own on public.strava_connections;
create policy strava_connections_all_own
  on public.strava_connections for all
  to authenticated
  using (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  )
  with check (
    athlete_id in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 5. STORAGE (planilhas .xlsx)
-- -----------------------------------------------------------------------------
-- Bucket privado (não público). Convenção de path OBRIGATÓRIA:
--   training-plans/{athlete_id}/{nome_arquivo}.xlsx
-- O athlete_id no path é decidido pelo script de import (service_role,
-- roda só localmente), nunca por um valor que o navegador do atleta manda —
-- por isso não há policy de INSERT para authenticated/anon neste bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-plans',
  'training-plans',
  false,
  10485760, -- 10 MB
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

drop policy if exists storage_training_plans_select_athlete_own on storage.objects;
create policy storage_training_plans_select_athlete_own
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'training-plans'
    and (storage.foldername(name))[1]::uuid in (
      select a.id from public.athletes a where a.user_id = auth.uid()
    )
  );

drop policy if exists storage_training_plans_select_coach_linked on storage.objects;
create policy storage_training_plans_select_coach_linked
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'training-plans'
    and (storage.foldername(name))[1]::uuid in (
      select ca.athlete_id
      from public.coach_athletes ca
      where ca.coach_id = auth.uid()
    )
  );

-- Sem policy de INSERT/UPDATE/DELETE em storage.objects para
-- authenticated/anon: só o script de import (service_role) escreve.

-- -----------------------------------------------------------------------------
-- 6. STORAGE (fotos de perfil)
-- -----------------------------------------------------------------------------
-- Bucket público (foto de perfil não é dado sensível). Convenção de path
-- OBRIGATÓRIA: avatars/{auth.uid()}/foto.<ext> — cada usuário só grava
-- dentro da própria pasta (nome da pasta = o próprio auth.uid(), não um
-- valor que o cliente escolhe livremente).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists storage_avatars_write_own on storage.objects;
create policy storage_avatars_write_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists storage_avatars_update_own on storage.objects;
create policy storage_avatars_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists storage_avatars_delete_own on storage.objects;
create policy storage_avatars_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- FIM. Ver mensagem de acompanhamento para: suposições assumidas, testes de
-- vazamento e o que falta para eu rodá-los de verdade.
-- =============================================================================

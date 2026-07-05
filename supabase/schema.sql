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

-- FEED SOCIAL: posts, curtidas e comentários. Diferente do resto do schema,
-- o feed é COMPARTILHADO — qualquer usuário logado vê todos os posts (decisão
-- explícita do produto). Os dados de TREINO seguem isolados; só o feed é
-- coletivo. A escrita é sempre do próprio autor (author_id/user_id = auth.uid()).
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references auth.users (id) on delete cascade,
  texto      text,
  image_url  text,
  created_at timestamptz not null default now(),
  constraint post_tem_conteudo check (coalesce(trim(texto), '') <> '' or image_url is not null),
  constraint post_texto_max check (char_length(coalesce(texto, '')) <= 1000)
);
create index if not exists posts_created_idx on public.posts (created_at desc);

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  texto      text not null,
  created_at timestamptz not null default now(),
  constraint comment_texto_tamanho check (char_length(texto) between 1 and 500)
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

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
alter table public.posts          enable row level security;
alter table public.post_likes     enable row level security;
alter table public.post_comments  enable row level security;

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
alter table public.posts          force row level security;
alter table public.post_likes     force row level security;
alter table public.post_comments  force row level security;

-- -----------------------------------------------------------------------------
-- 4. POLICIES
-- -----------------------------------------------------------------------------

-- profiles: cada usuário só vê/edita o próprio perfil. Papel (papel) não é
-- editável pelo cliente (ver GRANT column-level abaixo).
-- Qualquer usuário logado lê os perfis (nome + foto) — necessário para o feed
-- social mostrar quem postou/comentou/curtiu. Só expõe identidade pública
-- (nome, avatar, papel); os DADOS de treino continuam protegidos nas outras
-- tabelas. A edição segue restrita ao dono (policy de update abaixo).
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (true);

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

-- FEED: leitura compartilhada por todos os logados; escrita só do próprio autor.
drop policy if exists posts_select_all on public.posts;
create policy posts_select_all on public.posts for select to authenticated using (true);

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts for delete to authenticated
  using (author_id = auth.uid());

drop policy if exists post_likes_select_all on public.post_likes;
create policy post_likes_select_all on public.post_likes for select to authenticated using (true);

drop policy if exists post_likes_insert_own on public.post_likes;
create policy post_likes_insert_own on public.post_likes for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists post_likes_delete_own on public.post_likes;
create policy post_likes_delete_own on public.post_likes for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists post_comments_select_all on public.post_comments;
create policy post_comments_select_all on public.post_comments for select to authenticated using (true);

drop policy if exists post_comments_insert_own on public.post_comments;
create policy post_comments_insert_own on public.post_comments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists post_comments_delete_own on public.post_comments;
create policy post_comments_delete_own on public.post_comments for delete to authenticated
  using (user_id = auth.uid());

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

-- Bucket público das fotos do feed. Path: feed-images/{auth.uid()}/arquivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feed-images',
  'feed-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists storage_feed_write_own on storage.objects;
create policy storage_feed_write_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'feed-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists storage_feed_delete_own on storage.objects;
create policy storage_feed_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'feed-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 7. FEEDBACK (ideias/sugestões de melhoria do site)
-- -----------------------------------------------------------------------------
-- Qualquer usuário logado (atleta ou treinador) envia sugestões. Cada usuário
-- só lê as PRÓPRIAS sugestões (policy de select por user_id). O Ariel/coach lê
-- tudo pelo SQL Editor / service_role (que bypassa RLS) — não há necessidade de
-- expor o feedback de todo mundo para todo mundo.
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  mensagem   text not null,
  categoria  text check (categoria in ('ideia', 'problema', 'elogio', 'outro')),
  created_at timestamptz not null default now(),
  constraint feedback_mensagem_tamanho check (char_length(trim(mensagem)) between 1 and 2000)
);
create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;
alter table public.feedback force row level security;

drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own
  on public.feedback for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own
  on public.feedback for insert
  to authenticated
  with check (user_id = auth.uid());

-- Sem policy de UPDATE/DELETE para authenticated: sugestão enviada não é
-- editável nem apagável pelo cliente (histórico preservado; ajustes via
-- service_role, se preciso).

-- =============================================================================
-- FIM. Ver mensagem de acompanhamento para: suposições assumidas, testes de
-- vazamento e o que falta para eu rodá-los de verdade.
-- =============================================================================

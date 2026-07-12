-- ============================================================
-- PROJETO SILÊNCIO — Schema Supabase
-- Sistema tático de treinamento (preparação TAF / PPMG)
-- ============================================================

-- ------------------------------------------------------------
-- 1. PERFIL DO OPERADOR
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  codename text not null default 'OPERADOR',
  rank text not null default 'RECRUTA',           -- RECRUTA, SOLDADO, OPERADOR_TATICO, OPERADOR_ESPECIAL, ELITE_GIR, OPERADOR_ROTA
  total_xp integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  warnings_count integer not null default 0,
  last_log_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Operador vê o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Operador atualiza o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Operador cria o próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);


-- ------------------------------------------------------------
-- 2. CONFIGURAÇÃO DAS MISSÕES (metas ajustáveis manualmente)
-- ------------------------------------------------------------
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,               -- 'flexoes' | 'abdominais' | 'barras' | 'salto' | 'corrida_livre' | 'corrida_12min'
  label text not null,             -- nome de exibição
  target numeric not null,         -- valor alvo (ex: 50, 10, 1.85, 3, 2.5)
  unit text not null,              -- 'reps' | 'm' | 'km' | 'sessoes'
  weekly_frequency integer,        -- null = diário; ex. corrida_livre = 3x/semana
  xp_value integer not null default 10,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (profile_id, key)
);

alter table public.missions enable row level security;

create policy "Operador vê as próprias missões"
  on public.missions for select
  using (auth.uid() = profile_id);

create policy "Operador gerencia as próprias missões"
  on public.missions for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);


-- ------------------------------------------------------------
-- 3. REGISTROS DIÁRIOS (execução de cada missão)
-- ------------------------------------------------------------
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  mission_key text not null,
  target numeric not null,
  achieved numeric not null default 0,
  completed boolean not null default false,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now(),
  unique (profile_id, log_date, mission_key)
);

alter table public.daily_logs enable row level security;

create policy "Operador vê os próprios registros"
  on public.daily_logs for select
  using (auth.uid() = profile_id);

create policy "Operador gerencia os próprios registros"
  on public.daily_logs for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);


-- ------------------------------------------------------------
-- 4. LIVRO-RAZÃO DE XP (histórico de ganhos e perdas — alimenta os gráficos)
-- ------------------------------------------------------------
create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_date date not null default current_date,
  delta integer not null,           -- positivo (missão cumprida) ou negativo (penalidade)
  reason text not null,             -- 'missao_cumprida' | 'falha_parcial' | 'falha_total' | 'ajuste_manual'
  created_at timestamptz not null default now()
);

alter table public.xp_events enable row level security;

create policy "Operador vê o próprio histórico de XP"
  on public.xp_events for select
  using (auth.uid() = profile_id);

create policy "Operador registra o próprio histórico de XP"
  on public.xp_events for insert
  with check (auth.uid() = profile_id);


-- ------------------------------------------------------------
-- 5. ADVERTÊNCIAS (ficha disciplinar — falha total do dia)
-- ------------------------------------------------------------
create table if not exists public.warnings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  warning_date date not null default current_date,
  reason text not null default 'Nenhuma missão cumprida no dia',
  led_to_demotion boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.warnings enable row level security;

create policy "Operador vê as próprias advertências"
  on public.warnings for select
  using (auth.uid() = profile_id);

create policy "Operador registra as próprias advertências"
  on public.warnings for insert
  with check (auth.uid() = profile_id);


-- ------------------------------------------------------------
-- 6. TRIGGER: mantém updated_at em dia
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_missions_updated_at
  before update on public.missions
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 7. TRIGGER: cria perfil + missões padrão automaticamente no cadastro
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, codename)
  values (new.id, 'OPERADOR');

  insert into public.missions (profile_id, key, label, target, unit, weekly_frequency, xp_value) values
    (new.id, 'flexoes',        'Flexões',                50,   'reps',    null, 15),
    (new.id, 'abdominais',     'Abdominais',              50,   'reps',    null, 15),
    (new.id, 'barras',         'Barras',                  10,   'reps',    null, 20),
    (new.id, 'salto',          'Salto (3x 1.85m)',        3,    'saltos',  null, 15),
    (new.id, 'corrida_livre',  'Corrida livre 3km',       3,    'km',      3,    15),
    (new.id, 'corrida_12min',  'Corrida 2.500m / 12min',  2.5,  'km',      1,    20);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ------------------------------------------------------------
-- 8. TABELA DE REFERÊNCIA — RANKS (usada pela UI, não precisa RLS restrita)
-- ------------------------------------------------------------
create table if not exists public.rank_thresholds (
  rank text primary key,
  min_xp integer not null,
  display_order integer not null,
  display_label text not null
);

insert into public.rank_thresholds (rank, min_xp, display_order, display_label) values
  ('RECRUTA',           0,    1, 'Recruta'),
  ('SOLDADO',           300,  2, 'Soldado'),
  ('OPERADOR_TATICO',   800,  3, 'Operador Tático'),
  ('OPERADOR_ESPECIAL', 1600, 4, 'Operador Especial'),
  ('ELITE_GIR',         2800, 5, 'Elite GIR'),
  ('OPERADOR_ROTA',     4500, 6, 'Operador ROTA')
on conflict (rank) do nothing;

alter table public.rank_thresholds enable row level security;

create policy "Qualquer operador autenticado vê os ranks"
  on public.rank_thresholds for select
  using (auth.role() = 'authenticated');

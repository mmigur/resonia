-- Resonia: схема базы данных для Supabase.
-- Выполни целиком: Supabase Dashboard → SQL Editor → New query → вставить → Run.

-- 1. Профили (1:1 с пользователем из auth.users)
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text        not null default '',
  avatar       text        not null default 'mic',
  goal         text        not null default 'Петь чище',
  voice_type   text        not null default 'Не знаю',
  baseline     jsonb,                                   -- результат стартового теста
  xp           integer     not null default 0 check (xp >= 0),
  created_at   timestamptz not null default now()
);

-- 2. Попытки упражнений
create table if not exists public.sessions (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id text        not null,
  score       smallint    not null check (score between 0 and 100),
  stability   smallint    not null check (stability between 0 and 100),
  start_midi  smallint    not null,
  metrics     jsonb,
  created_at  timestamptz not null default now()
);
alter table public.sessions add column if not exists metrics jsonb;
create index if not exists sessions_user_created_idx on public.sessions (user_id, created_at desc);

-- 3. Достижения
create table if not exists public.achievements (
  user_id        uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  achievement_id text        not null,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- 4. Row Level Security: каждый видит и меняет только свои строки
alter table public.profiles     enable row level security;
alter table public.sessions     enable row level security;
alter table public.achievements enable row level security;

drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "sessions: read own"   on public.sessions;
drop policy if exists "sessions: insert own" on public.sessions;
create policy "sessions: read own"   on public.sessions for select to authenticated using (user_id = (select auth.uid()));
create policy "sessions: insert own" on public.sessions for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "achievements: read own"   on public.achievements;
drop policy if exists "achievements: insert own" on public.achievements;
create policy "achievements: read own"   on public.achievements for select to authenticated using (user_id = (select auth.uid()));
create policy "achievements: insert own" on public.achievements for insert to authenticated with check (user_id = (select auth.uid()));

-- 5. Автосоздание профиля при регистрации
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. Удаление собственного аккаунта (кнопка «Удалить аккаунт» в профиле)
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = public, auth
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

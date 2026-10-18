-- Schéma databáze pro aplikaci Angličtina Rožná.
-- Spusťte celé v Supabase: SQL Editor → New query → vložit → Run.

-- Profil uživatele: role 'teacher' (učitel) nebo 'student' (žák, připraveno na další krok).
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'teacher' check (role in ('teacher', 'student')),
  grade int,               -- u žáka: ročník, jehož sdílené materiály vidí
  display_name text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profil vidi jen vlastnik" on public.profiles;
create policy "profil vidi jen vlastnik" on public.profiles for select using (id = auth.uid());

-- Nový uživatel dostane profil automaticky (role teacher – žáky později přepnete na student).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher');
$$;

create or replace function public.student_grade() returns int
language sql stable security definer set search_path = public as $$
  select grade from profiles where id = auth.uid() and role = 'student';
$$;

-- Uživatelé založení ještě před spuštěním tohoto skriptu dostanou profil také.
insert into public.profiles (id) select id from auth.users on conflict do nothing;

-- Datové tabulky mají stejný tvar; obsah je v poli data (jsonb).
do $$
declare t text;
begin
  foreach t in array array['lessons', 'vocab', 'resources', 'topics'] loop
    execute format($f$
      create table if not exists public.%1$I (
        id uuid primary key default gen_random_uuid(),
        owner uuid not null default auth.uid() references auth.users on delete cascade,
        grade int,
        visible_to_students boolean not null default false,
        data jsonb not null default '{}'::jsonb,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
      alter table public.%1$I enable row level security;

      drop policy if exists "ucitel spravuje sva data" on public.%1$I;
      create policy "ucitel spravuje sva data" on public.%1$I for all
        using (owner = auth.uid() and public.is_teacher())
        with check (owner = auth.uid() and public.is_teacher());

      -- Další krok: žák vidí jen to, co učitel označí „vidí děti“, a jen pro svůj ročník.
      drop policy if exists "zak vidi sdilene" on public.%1$I;
      create policy "zak vidi sdilene" on public.%1$I for select
        using (visible_to_students and (grade is null or grade = public.student_grade()));
    $f$, t);
  end loop;
end $$;

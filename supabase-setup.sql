-- =====================================================
-- TrustiQR - Run this in Supabase SQL Editor
-- =====================================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  institution text,
  team text default 'Registrar',
  avatar_url text,
  settings jsonb default '{"darkMode": false, "emailAlerts": true, "multiUser": true, "roleAccess": false, "securityLock": true}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create table public.certificates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  cert_id text not null,
  recipient_name text,
  email text,
  program text,
  certificate_title text,
  template text default 'Academic Degree',
  completion_date date,
  unique_hash text unique,
  status text default 'Issued',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.certificates enable row level security;
create policy "Users can manage own certificates" on public.certificates for all using (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('certificates', 'certificates', true) on conflict do nothing;
update storage.buckets set public = true where id = 'certificates';

create policy "Users can upload own files" on storage.objects for insert with check (auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can view own files" on storage.objects for select using (auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can delete own files" on storage.objects for delete using (auth.uid()::text = (storage.foldername(name))[1]);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, institution)
  values (new.id, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'institution');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

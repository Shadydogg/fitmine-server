-- Включение RLS на таблице users
alter table users enable row level security;

-- Удаление всех предыдущих политик
drop policy if exists "Allow read for everyone" on users;
drop policy if exists "Allow upsert for service role" on users;
drop policy if exists "Allow insert for service role" on users;
drop policy if exists "Allow update for service role" on users;

-- Разрешить вставку только от service_role
create policy "Allow insert for service role"
on users
for insert
with check (auth.role() = 'service_role');

-- Разрешить обновление только от service_role
create policy "Allow update for service role"
on users
for update
using (auth.role() = 'service_role');

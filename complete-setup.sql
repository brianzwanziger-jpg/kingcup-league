-- Additional table required by KingCup League web app.
-- Run this AFTER the previously successful SQL. Do not rerun the old setup.
create table if not exists public.league_state (
  id integer primary key check (id = 1),
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.league_state enable row level security;
drop policy if exists "KingCup public read" on public.league_state;
create policy "KingCup public read" on public.league_state
for select to anon, authenticated using (true);
drop policy if exists "KingCup commissioner update" on public.league_state;
create policy "KingCup commissioner update" on public.league_state
for update to authenticated
using ((select public.is_kingcup_admin()))
with check ((select public.is_kingcup_admin()));
grant select on public.league_state to anon, authenticated;
grant update(state, updated_at) on public.league_state to authenticated;
insert into public.league_state (id, state)
values (1, '{"season":"2026","members":[],"events":[{"id":"e0","name":"Fantasy Football","status":"Upcoming","weight":1,"results":{}},{"id":"e1","name":"Bowl Pick’em","status":"Upcoming","weight":1,"results":{}},{"id":"e2","name":"March Madness","status":"Upcoming","weight":1,"results":{}},{"id":"e3","name":"Champion of Champions","status":"Upcoming","weight":1,"results":{}},{"id":"e4","name":"KingCup","status":"Upcoming","weight":1,"results":{}},{"id":"e5","name":"Big 12","status":"Upcoming","weight":1,"results":{}}],"points":[10,8,6,5,4,3,2,1],"updated":null}'::jsonb)
on conflict (id) do nothing;

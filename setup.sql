-- Run in your Supabase project's SQL Editor.
-- Replace YOUR_COMMISSIONER_EMAIL before running. Create this user in Authentication > Users.
create table if not exists public.league_state (
 id integer primary key check (id = 1),
 state jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.league_state enable row level security;
create policy "Everyone can read standings" on public.league_state for select to anon, authenticated using (true);
create policy "Only commissioner can edit" on public.league_state for update to authenticated
 using ((auth.jwt() ->> 'email') = 'YOUR_COMMISSIONER_EMAIL')
 with check ((auth.jwt() ->> 'email') = 'YOUR_COMMISSIONER_EMAIL');
insert into public.league_state(id,state) values (1, '{"season":"2026","members":[],"events":[{"id":"e0","name":"Fantasy Football","status":"Upcoming","weight":1,"results":{}},{"id":"e1","name":"Bowl Pick’em","status":"Upcoming","weight":1,"results":{}},{"id":"e2","name":"March Madness","status":"Upcoming","weight":1,"results":{}},{"id":"e3","name":"Champion of Champions","status":"Upcoming","weight":1,"results":{}},{"id":"e4","name":"KingCup","status":"Upcoming","weight":1,"results":{}},{"id":"e5","name":"Big 12","status":"Upcoming","weight":1,"results":{}}],"points":[10,8,6,5,4,3,2,1],"updated":null}'::jsonb) on conflict(id) do nothing;

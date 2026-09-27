-- Run ONCE in the existing Supabase SQL Editor. Does not alter league_state or historical picks.
create extension if not exists pgcrypto;
create table if not exists public.gameday_private_weeks (
 week integer primary key check (week > 0), away text not null, home text not null,
 kickoff timestamptz not null, created_at timestamptz not null default now(),
 check (away <> home)
);
create table if not exists public.gameday_private_invites (
 week integer not null references public.gameday_private_weeks(week) on delete cascade,
 member_id text not null, member_name text not null,
 token_hash text not null unique, pick text, submitted_at timestamptz,
 primary key(week,member_id)
);
alter table public.gameday_private_weeks enable row level security;
alter table public.gameday_private_invites enable row level security;
revoke all on public.gameday_private_weeks, public.gameday_private_invites from anon, authenticated;
-- Security definer functions expose only the fields needed by each caller.
create or replace function public.gd_create_week(p_week integer,p_away text,p_home text,p_kickoff timestamptz,p_members jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m jsonb; tok text; links jsonb:='[]'::jsonb;
begin
 if not public.is_kingcup_admin() then raise exception 'Not authorized'; end if;
 if p_week is null or p_week<1 or nullif(trim(p_away),'') is null or nullif(trim(p_home),'') is null or trim(p_away)=trim(p_home) or p_kickoff<=now() then raise exception 'Invalid week, teams or future kickoff'; end if;
 if jsonb_typeof(p_members)<>'array' or jsonb_array_length(p_members)<1 or jsonb_array_length(p_members)>100 then raise exception 'Invalid members'; end if;
 if exists(select 1 from public.gameday_private_weeks where week=p_week) then raise exception 'Week already exists; existing invitations preserved'; end if;
 insert into public.gameday_private_weeks(week,away,home,kickoff) values(p_week,trim(p_away),trim(p_home),p_kickoff);
 for m in select value from jsonb_array_elements(p_members) loop
  if nullif(m->>'id','') is null or nullif(m->>'name','') is null then raise exception 'Invalid member'; end if;
  tok=encode(gen_random_bytes(32),'hex');
  insert into public.gameday_private_invites(week,member_id,member_name,token_hash)
  values(p_week,m->>'id',m->>'name',encode(digest(tok,'sha256'),'hex'));
  links=links||jsonb_build_array(jsonb_build_object('id',m->>'id','name',m->>'name','token',tok));
 end loop;
 return links;
end $$;
create or replace function public.gd_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v record;
begin
 select w.week,w.away,w.home,w.kickoff,i.member_name,i.pick into v
 from public.gameday_private_invites i join public.gameday_private_weeks w using(week)
 where i.token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex');
 if not found then raise exception 'Invalid invitation'; end if;
 return jsonb_build_object('week',v.week,'away',v.away,'home',v.home,'kickoff',v.kickoff,'name',v.member_name,'pick',v.pick,'locked',now()>=v.kickoff);
end $$;
create or replace function public.gd_submit(p_token text,p_pick text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v record;
begin
 select w.week,w.away,w.home,w.kickoff,i.member_id into v
 from public.gameday_private_invites i join public.gameday_private_weeks w using(week)
 where i.token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex') for update of i;
 if not found then raise exception 'Invalid invitation'; end if;
 if now()>=v.kickoff then raise exception 'Picks are locked at kickoff'; end if;
 if p_pick is distinct from v.away and p_pick is distinct from v.home then raise exception 'Invalid team'; end if;
 update public.gameday_private_invites set pick=p_pick,submitted_at=now() where week=v.week and member_id=v.member_id;
 return jsonb_build_object('saved',true,'week',v.week);
end $$;
create or replace function public.gd_public_weeks()
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('week',w.week,'away',w.away,'home',w.home,'kickoff',w.kickoff,'locked',now()>=w.kickoff,'picks',
 case when now()>=w.kickoff then
 (select coalesce(jsonb_object_agg(i.member_id,i.pick) filter(where i.pick is not null),'{}'::jsonb) from public.gameday_private_invites i where i.week=w.week)
 else '{}'::jsonb end) order by w.week),'[]'::jsonb)
 from public.gameday_private_weeks w
$$;
create or replace function public.gd_admin_status()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_kingcup_admin() then raise exception 'Not authorized'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('week',w.week,'away',w.away,'home',w.home,'kickoff',w.kickoff,'members',
 (select coalesce(jsonb_agg(jsonb_build_object('id',i.member_id,'name',i.member_name,'submitted',i.submitted_at is not null,'pick',i.pick) order by i.member_name),'[]'::jsonb) from public.gameday_private_invites i where i.week=w.week)) order by w.week),'[]'::jsonb) from public.gameday_private_weeks w);
end $$;
revoke all on function public.gd_create_week(integer,text,text,timestamptz,jsonb),public.gd_admin_status() from public,anon;
grant execute on function public.gd_create_week(integer,text,text,timestamptz,jsonb),public.gd_admin_status() to authenticated;
revoke all on function public.gd_invitation(text),public.gd_submit(text,text),public.gd_public_weeks() from public;
grant execute on function public.gd_invitation(text),public.gd_submit(text,text),public.gd_public_weeks() to anon,authenticated;
-- Existing publicly stored historical picks remain public. New submissions stay private until kickoff.

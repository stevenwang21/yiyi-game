-- 每日挑戰排行榜（貼到 Supabase 的 SQL Editor 按 Run 就好，重複執行也沒關係）
-- 規則：同一天、同一台裝置只記第一次玩完的成績。
-- 排名：越早破億越前面；都沒破億（或同歲破億）就比最後身價。

create table if not exists public.daily_scores (
  id bigint generated always as identity primary key,
  day date not null,
  device uuid not null,
  nick text not null check (char_length(nick) between 1 and 12),
  nw bigint not null,
  yi_age smallint,
  end_age smallint not null,
  title text check (title is null or char_length(title) <= 20),
  gender text check (gender is null or gender in ('male', 'female')),
  created_at timestamptz not null default now(),
  unique (day, device)
);

create index if not exists daily_scores_rank on public.daily_scores (day, yi_age asc nulls last, nw desc);

alter table public.daily_scores enable row level security;

-- 大家都可以看排行榜，但不能直接寫進去（只能透過下面的 submit_daily）
drop policy if exists "daily read" on public.daily_scores;
create policy "daily read" on public.daily_scores for select to anon, authenticated using (true);
-- device（每台手機的代號）不公開，只能看名字和成績
revoke all on public.daily_scores from anon, authenticated;
grant select (id, day, nick, nw, yi_age, end_age, title, gender, created_at) on public.daily_scores to anon, authenticated;

-- 交成績：檢查日期和數字合不合理，回傳「你是今天第幾名」
create or replace function public.submit_daily(
  p_day date, p_device uuid, p_nick text, p_nw bigint, p_yi_age int, p_end_age int, p_title text, p_gender text
) returns json
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Taipei')::date;
  me public.daily_scores;
  r int;
  total int;
begin
  if p_day is null or p_day < today - 1 or p_day > today then raise exception 'bad day'; end if;
  if p_nw is null or p_nw < -100000000000 or p_nw > 1000000000000 then raise exception 'bad nw'; end if;
  if p_end_age is null or p_end_age < 1 or p_end_age > 120 then raise exception 'bad end age'; end if;
  if p_yi_age is not null and (p_yi_age < 5 or p_yi_age > p_end_age or p_nw < 0) then raise exception 'bad yi age'; end if;

  insert into public.daily_scores (day, device, nick, nw, yi_age, end_age, title, gender)
  values (p_day, p_device, coalesce(nullif(left(btrim(p_nick), 12), ''), '無名氏'), p_nw, p_yi_age, p_end_age,
          left(p_title, 20), case when p_gender in ('male', 'female') then p_gender end)
  on conflict (day, device) do nothing;

  select * into me from public.daily_scores where day = p_day and device = p_device;
  select count(*) + 1 into r from public.daily_scores d
   where d.day = p_day and (
     (d.yi_age is not null and me.yi_age is null)
     or (d.yi_age < me.yi_age)
     or (d.yi_age is not distinct from me.yi_age and d.nw > me.nw));
  select count(*) into total from public.daily_scores where day = p_day;
  return json_build_object('rank', r, 'total', total, 'nw', me.nw, 'yi_age', me.yi_age, 'nick', me.nick);
end $$;

revoke all on function public.submit_daily(date, uuid, text, bigint, int, int, text, text) from public;
grant execute on function public.submit_daily(date, uuid, text, bigint, int, int, text, text) to anon, authenticated;

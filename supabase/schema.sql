-- ============================================================================
-- 세계희망연대 홈페이지 — Supabase 스키마
-- 사용법: Supabase 대시보드 > SQL Editor 에 전체를 붙여 넣고 실행 (여러 번 실행해도 안전)
-- 실행 후: Authentication 에서 관리자 계정 생성 → 맨 아래 '관리자 등록' 쿼리 실행
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 관리자
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 공지·소식 게시판
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'notice' check (category in ('notice', 'news', 'press')),
  title_ko text not null check (char_length(title_ko) between 1 and 200),
  title_en text check (char_length(title_en) <= 300),
  body_ko text check (char_length(body_ko) <= 50000),
  body_en text check (char_length(body_en) <= 50000),
  cover_url text,
  pinned boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_list_idx on public.posts (published, pinned desc, created_at desc);
alter table public.posts enable row level security;

drop policy if exists "posts public read" on public.posts;
create policy "posts public read" on public.posts for select using (published or public.is_admin());
drop policy if exists "posts admin write" on public.posts;
create policy "posts admin write" on public.posts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 갤러리
-- ---------------------------------------------------------------------------
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  album text not null default 'events',
  title_ko text check (char_length(title_ko) <= 200),
  title_en text check (char_length(title_en) <= 300),
  image_url text not null,
  storage_path text,
  sort int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists gallery_list_idx on public.gallery (published, sort, created_at desc);
alter table public.gallery enable row level security;

drop policy if exists "gallery public read" on public.gallery;
create policy "gallery public read" on public.gallery for select using (published or public.is_admin());
drop policy if exists "gallery admin write" on public.gallery;
create policy "gallery admin write" on public.gallery for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 문의·참여 신청 (누구나 접수, 관리자만 열람)
-- ---------------------------------------------------------------------------
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'general' check (type in ('general', 'join', 'donation', 'partnership', 'press')),
  name text not null check (char_length(name) between 1 and 40),
  phone text not null check (char_length(phone) between 9 and 20),
  email text check (char_length(email) <= 80),
  org text check (char_length(org) <= 60),
  message text not null check (char_length(message) between 1 and 3000),
  lang text default 'ko',
  status text not null default 'new' check (status in ('new', 'done')),
  admin_memo text,
  created_at timestamptz not null default now()
);
alter table public.inquiries enable row level security;

drop policy if exists "inquiries public insert" on public.inquiries;
create policy "inquiries public insert" on public.inquiries for insert to anon, authenticated with check (status = 'new' and admin_memo is null);
drop policy if exists "inquiries admin all" on public.inquiries;
create policy "inquiries admin all" on public.inquiries for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 정기·일시 후원 신청 (계좌번호·주민번호는 받지 않음)
-- ---------------------------------------------------------------------------
create table if not exists public.donation_applications (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'regular' check (kind in ('regular', 'once')),
  name text not null check (char_length(name) between 1 and 40),
  phone text not null check (char_length(phone) between 9 and 20),
  email text check (char_length(email) <= 80),
  amount int check (amount is null or amount between 1000 and 100000000),
  withdraw_day text check (char_length(withdraw_day) <= 4),
  receipt boolean not null default false,
  memo text check (char_length(memo) <= 1000),
  lang text default 'ko',
  status text not null default 'new' check (status in ('new', 'done')),
  admin_memo text,
  created_at timestamptz not null default now()
);
alter table public.donation_applications enable row level security;

drop policy if exists "applications public insert" on public.donation_applications;
create policy "applications public insert" on public.donation_applications for insert to anon, authenticated with check (status = 'new' and admin_memo is null);
drop policy if exists "applications admin all" on public.donation_applications;
create policy "applications admin all" on public.donation_applications for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 온라인 후원 결제 내역 (Edge Function 이 service role 로만 기록)
-- ---------------------------------------------------------------------------
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null unique,
  status text not null,
  amount int not null,
  currency text not null default 'KRW',
  order_name text,
  name text,
  phone text,
  email text,
  method text,
  paid_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now()
);
alter table public.donations enable row level security;

drop policy if exists "donations admin read" on public.donations;
create policy "donations admin read" on public.donations for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 희망 응원 메시지 (승인된 것만 공개)
-- ---------------------------------------------------------------------------
create table if not exists public.cheers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 20),
  region text check (char_length(region) <= 20),
  message text not null check (char_length(message) between 1 and 300),
  lang text default 'ko',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists cheers_list_idx on public.cheers (approved, created_at desc);
alter table public.cheers enable row level security;

drop policy if exists "cheers public read" on public.cheers;
create policy "cheers public read" on public.cheers for select using (approved or public.is_admin());
drop policy if exists "cheers public insert" on public.cheers;
create policy "cheers public insert" on public.cheers for insert to anon, authenticated with check (approved = false);
drop policy if exists "cheers admin all" on public.cheers;
create policy "cheers admin all" on public.cheers for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 방문자 통계 (테이블 직접 접근 불가, 함수로만 기록·조회)
-- ---------------------------------------------------------------------------
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  path text not null,
  visitor text not null,
  created_at timestamptz not null default now()
);
create index if not exists page_views_created_idx on public.page_views (created_at);
create index if not exists page_views_visitor_idx on public.page_views (visitor, created_at);
alter table public.page_views enable row level security;

drop policy if exists "page_views admin read" on public.page_views;
create policy "page_views admin read" on public.page_views for select to authenticated using (public.is_admin());

create or replace function public.track_visit(p_path text, p_visitor text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_path is null or p_visitor is null or length(p_path) > 200 or length(p_visitor) > 64 then
    return;
  end if;
  -- 같은 방문자가 같은 페이지를 30분 안에 다시 열면 중복 집계하지 않음
  if exists (
    select 1 from public.page_views
    where visitor = p_visitor and path = p_path and created_at > now() - interval '30 minutes'
  ) then
    return;
  end if;
  insert into public.page_views (path, visitor) values (p_path, p_visitor);
end;
$$;
grant execute on function public.track_visit(text, text) to anon, authenticated;

-- 공개 집계: 오늘 / 전체 방문자 수 (한국시간 기준, 방문자 수 = 하루 단위 고유 방문자)
create or replace function public.visit_stats()
returns json
language sql stable security definer set search_path = public
as $$
  with d as (
    select (created_at at time zone 'Asia/Seoul')::date as day, visitor from public.page_views
  )
  select json_build_object(
    'today', (select count(distinct visitor) from d where day = (now() at time zone 'Asia/Seoul')::date),
    'total', (select count(*) from (select distinct day, visitor from d) t),
    'today_views', (select count(*) from d where day = (now() at time zone 'Asia/Seoul')::date),
    'total_views', (select count(*) from d)
  );
$$;
grant execute on function public.visit_stats() to anon, authenticated;

-- 관리자용: 최근 N일 일별 방문자 / 인기 페이지
create or replace function public.visit_daily(p_days int default 14)
returns table (day date, visitors bigint, views bigint)
language sql stable security definer set search_path = public
as $$
  select (created_at at time zone 'Asia/Seoul')::date as day, count(distinct visitor), count(*)
  from public.page_views
  where public.is_admin() and created_at > now() - make_interval(days => greatest(1, least(p_days, 365)))
  group by 1 order by 1;
$$;
grant execute on function public.visit_daily(int) to authenticated;

create or replace function public.visit_top_pages(p_days int default 30)
returns table (path text, views bigint)
language sql stable security definer set search_path = public
as $$
  select path, count(*) from public.page_views
  where public.is_admin() and created_at > now() - make_interval(days => greatest(1, least(p_days, 365)))
  group by 1 order by 2 desc limit 10;
$$;
grant execute on function public.visit_top_pages(int) to authenticated;

-- ---------------------------------------------------------------------------
-- 사진 저장소 (공개 읽기, 관리자만 업로드/삭제)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ---------------------------------------------------------------------------
-- API 권한 (실제 허용 범위는 위의 RLS 정책이 결정)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.posts, public.gallery, public.cheers to anon;
grant insert on public.inquiries, public.donation_applications, public.cheers to anon;
grant select, insert, update, delete on public.posts, public.gallery, public.cheers,
  public.inquiries, public.donation_applications to authenticated;
grant select on public.donations, public.page_views, public.admins to authenticated;

-- ---------------------------------------------------------------------------
-- 첫 게시글 (홈사이트 오픈 공지) — 이미 있으면 건너뜀
-- ---------------------------------------------------------------------------
insert into public.posts (category, pinned, title_ko, title_en, body_ko, body_en)
select 'notice', true,
  '세계희망연대 홈사이트를 엽니다',
  'The World Hope Alliance Website Is Now Open',
  E'선악을 아는 지식을 미혹으로 받아 머리에 장착하고 사는 사람들은 그 지식으로 인해 지금 같은 유토피아도 만들었지만, 다툼과 반목과 이기로 가득한 전쟁터를 만든 현실의 이중성을 꼬집으며, 그 속에 종속된 인간을 수평의 사상과 중심진리인 사랑의 속성을 되찾아 하나님 나라로 귀화하는 인생 시나리오를 세상에 구체적으로 펼쳐가는 대장정의 선교행진이랍니다.\n\n그 시작을 대중 속에서 함께 이어가기 위해 오늘 이 홈사이트를 엽니다.\n\n세계희망연대',
  E'Today we open this website to carry the beginning of our mission march of hope forward together with the public.\n\nWorld Hope Alliance'
where not exists (select 1 from public.posts);

-- ---------------------------------------------------------------------------
-- 관리자 등록 (Authentication > Users 에서 계정 생성 후, 이메일을 바꿔 실행)
-- ---------------------------------------------------------------------------
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'admin@example.org'
-- on conflict do nothing;

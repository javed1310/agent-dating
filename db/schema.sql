create extension if not exists vector;
create table if not exists people(id uuid primary key default gen_random_uuid(), name text, linkedin_url text not null, instagram_url text not null, interested_in text, status text default 'new', created_at timestamptz default now());
create table if not exists raw_data(person_id uuid references people on delete cascade, source text check(source in ('linkedin','instagram','manual')), payload jsonb, error text, scraped_at timestamptz default now(), primary key(person_id,source));
create table if not exists profiles(person_id uuid primary key references people on delete cascade, profile jsonb not null, embedding vector(768), confidence real, model text);
create table if not exists runs(id uuid primary key default gen_random_uuid(), is_demo boolean default false, created_at timestamptz default now());
create table if not exists run_people(run_id uuid references runs on delete cascade, person_id uuid references people on delete cascade, primary key(run_id,person_id));
create table if not exists dates(id uuid primary key default gen_random_uuid(), run_id uuid references runs, a_id uuid references people, b_id uuid references people, similarity real default 0, transcript jsonb default '[]', status text default 'pending', unique(run_id,a_id,b_id));
create table if not exists scores(date_id uuid references dates on delete cascade, from_id uuid references people, to_id uuid references people, interest int check(interest between 0 and 100), chemistry int check(chemistry between 0 and 100), values_fit int check(values_fit between 0 and 100), lifestyle int check(lifestyle between 0 and 100), red_flags int check(red_flags between 0 and 10), overall int check(overall between 0 and 100), reason text, primary key(date_id,from_id));
create table if not exists rankings(run_id uuid references runs, person_id uuid references people, rank int, match_id uuid references people, final_score real, reason text, date_id uuid references dates, primary key(run_id,person_id,rank));
create table if not exists jobs(id uuid primary key default gen_random_uuid(), type text not null, payload jsonb not null default '{}', status text default 'pending', attempts int default 0, error text, run_after timestamptz default now(), created_at timestamptz default now(), updated_at timestamptz default now());
create index if not exists jobs_ready on jobs(status,run_after);
alter table people enable row level security; alter table raw_data enable row level security; alter table profiles enable row level security;
create or replace function claim_job() returns setof jobs language plpgsql security definer as $$
declare selected jobs;
begin
  update jobs set status='pending', error='Recovered stale running job', run_after=now(), updated_at=now() where status='running' and updated_at<now()-interval '2 minutes';
  select * into selected from jobs where status='pending' and run_after<=now() order by created_at for update skip locked limit 1;
  if selected.id is null then return; end if;
  update jobs set status='running',attempts=attempts+1,updated_at=now() where id=selected.id returning * into selected;
  return next selected;
end $$;

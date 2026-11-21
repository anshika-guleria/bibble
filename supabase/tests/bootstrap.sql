-- EMPTY disposable PostgreSQL database only. Auth/storage are local test stubs.
create role anon;
create role authenticated;
create schema auth;
create schema storage;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id text, bucket_id text, name text);
create function storage.foldername(text) returns text[] language sql immutable as
  $$ select string_to_array($1, '/') $$;
\ir ../migrations/20261026000000_learning_maps.sql

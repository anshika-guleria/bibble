-- Compare-and-swap map writes. Apply after the base learning_maps migration.
alter table public.learning_maps add column if not exists version integer not null default 1 check (version > 0);

-- Old clients must not silently bypass revision checks with a blind header upsert.
create or replace function public.guard_learning_map_version()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.version <> old.version + 1 then
    raise exception 'CONCURRENCY_CONFLICT' using errcode = 'PT409';
  end if;
  return new;
end;
$$;
drop trigger if exists learning_map_version_guard on public.learning_maps;
create trigger learning_map_version_guard before update on public.learning_maps
for each row execute function public.guard_learning_map_version();

create or replace function public.save_learning_map_versioned(
  p_map jsonb, p_bibbles jsonb, p_edges jsonb, p_expected_version integer
) returns integer language plpgsql security invoker set search_path = public as $$
declare
  v_map_id text := p_map->>'id';
  v_version integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_map) is distinct from 'object'
     or jsonb_typeof(p_bibbles) is distinct from 'array'
     or jsonb_typeof(p_edges) is distinct from 'array'
     or coalesce(length(trim(v_map_id)), 0) = 0 then
    raise exception 'Invalid map payload' using errcode = '22023';
  end if;
  if p_expected_version is null then
    insert into public.learning_maps (id, user_id, title, description, category, accent, version)
    values (v_map_id, auth.uid(), p_map->>'title', coalesce(p_map->>'description',''),
      coalesce(p_map->>'category','Personal growth'), coalesce(p_map->>'accent','lavender'), 1)
    on conflict (id) do nothing returning version into v_version;
  else
    -- UPDATE locks the row and rechecks this predicate after any competing writer.
    update public.learning_maps set title = p_map->>'title',
      description = coalesce(p_map->>'description',''), category = coalesce(p_map->>'category','Personal growth'),
      accent = coalesce(p_map->>'accent','lavender'), version = version + 1
    where id = v_map_id and user_id = auth.uid() and version = p_expected_version
    returning version into v_version;
  end if;
  if v_version is null then
    raise exception 'CONCURRENCY_CONFLICT' using errcode = 'PT409';
  end if;
  delete from public.map_edges where map_id = v_map_id;
  delete from public.map_bibbles where map_id = v_map_id;
  insert into public.map_bibbles (id,map_id,title,description,status,progress,position_x,position_y,resources,notes)
  select b->>'id',v_map_id,b->>'title',coalesce(b->>'description',''),coalesce(b->>'status','not-started'),
    coalesce((b->>'progress')::integer,0),coalesce((b->>'position_x')::double precision,0),
    coalesce((b->>'position_y')::double precision,0),coalesce(b->'resources','[]'::jsonb),coalesce(b->>'notes','')
  from jsonb_array_elements(p_bibbles) b;
  insert into public.map_edges (id,map_id,source_id,target_id)
  select e->>'id',v_map_id,e->>'source_id',e->>'target_id' from jsonb_array_elements(p_edges) e;
  return v_version;
end;
$$;
revoke all on function public.save_learning_map_versioned(jsonb,jsonb,jsonb,integer) from public, anon;
grant execute on function public.save_learning_map_versioned(jsonb,jsonb,jsonb,integer) to authenticated;

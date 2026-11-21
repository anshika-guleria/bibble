-- EMPTY disposable database only. All test setup is rolled back.
\set ON_ERROR_STOP on
begin;
\ir bootstrap.sql
insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into public.learning_maps (id,user_id,title) values ('legacy','00000000-0000-0000-0000-000000000001','Legacy map');
\ir ../migrations/20261121000000_map_versions.sql
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

do $$
declare v integer;
begin
  assert (select version = 1 from public.learning_maps where id = 'legacy');
  v := public.save_learning_map_versioned('{"id":"legacy","title":"Tab A"}',
    '[{"id":"a","title":"A","progress":100},{"id":"b","title":"B"}]',
    '[{"id":"a-b","source_id":"a","target_id":"b"}]',1);
  assert v = 2;
  raise notice 'PASS: legacy map defaults to 1; successful save returns 2';
  begin
    perform public.save_learning_map_versioned('{"id":"legacy","title":"Stale Tab B"}', '[]','[]',1);
    raise exception 'Stale writer was accepted';
  exception when sqlstate 'PT409' then null;
  end;
  assert (select title = 'Tab A' and version = 2 from public.learning_maps where id = 'legacy');
  assert (select count(*) = 2 from public.map_bibbles where map_id = 'legacy');
  assert (select count(*) = 1 from public.map_edges where map_id = 'legacy');
  raise notice 'PASS: stale writer rejected; winner graph and version preserved';
  begin
    perform public.save_learning_map_versioned('{"id":"legacy","title":"Invalid update"}',
      '[{"id":"a","title":"Bad","progress":101}]','[]',2);
    raise exception 'Invalid progress was accepted';
  exception when check_violation then null;
  end;
  assert (select title = 'Tab A' and version = 2 from public.learning_maps where id = 'legacy');
  assert (select count(*) = 2 from public.map_bibbles where map_id = 'legacy');
  raise notice 'PASS: invalid graph rolls back the revision increment';
  begin
    update public.learning_maps set title = 'Old blind upsert' where id = 'legacy';
    raise exception 'Blind update bypassed OCC';
  exception when sqlstate 'PT409' then null;
  end;
  raise notice 'PASS: legacy clients cannot bypass revision checks';
  v := public.save_learning_map_versioned('{"id":"legacy","title":"Explicit overwrite"}', '[]','[]',2);
  assert v = 3;
  raise notice 'PASS: explicit overwrite succeeds only with the latest revision';
  v := public.save_learning_map_versioned('{"id":"new-map","title":"Fresh map"}', '[]','[]',null);
  assert v = 1;
  begin
    perform public.save_learning_map_versioned('{"id":"new-map","title":"Duplicate create"}', '[]','[]',null);
    raise exception 'Duplicate creation was accepted';
  exception when sqlstate 'PT409' then null;
  end;
  raise notice 'PASS: new maps start at 1; duplicate creation is a conflict';
end $$;

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$
begin
  assert (select count(*) = 0 from public.learning_maps);
  begin
    perform public.save_learning_map_versioned('{"id":"legacy","title":"Wrong owner"}', '[]','[]',3);
    raise exception 'Wrong account was accepted';
  exception when sqlstate 'PT409' then null;
  end;
  raise notice 'PASS: RLS blocks cross-account versioned writes';
end $$;
reset role;
do $$
begin
  assert not has_function_privilege('anon','public.save_learning_map_versioned(jsonb,jsonb,jsonb,integer)','execute');
  raise notice 'PASS: anonymous RPC execution is denied';
end $$;
rollback;

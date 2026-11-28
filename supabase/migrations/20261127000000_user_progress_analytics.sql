-- Authenticated cross-roadmap progress aggregation RPC
-- Returns structured JSON summary of total roadmaps, concepts mastered, and average completion.

create or replace function public.get_user_progress_analytics(
  p_user_id uuid default null
) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  v_target_user uuid;
  v_result jsonb;
begin
  v_target_user := coalesce(p_user_id, auth.uid());
  if v_target_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if auth.uid() is not null and auth.uid() <> v_target_user then
    raise exception 'Access denied to target user progress analytics' using errcode = '42501';
  end if;

  with user_maps as (
    select
      m.id,
      m.title,
      m.category,
      coalesce(totals.total_bibbles, 0) as total_bibbles,
      coalesce(totals.completed_bibbles, 0) as completed_bibbles,
      coalesce(totals.avg_progress, 0) as map_progress
    from public.learning_maps m
    cross join lateral (
      select
        count(*) as total_bibbles,
        count(*) filter (where b.status = 'completed' or b.progress >= 100) as completed_bibbles,
        coalesce(round(avg(b.progress)), 0) as avg_progress
      from public.map_bibbles b
      where b.map_id = m.id
    ) totals
    where m.user_id = v_target_user
  ),
  aggregated as (
    select
      count(*) as total_maps,
      count(*) filter (where map_progress >= 100 or (total_bibbles > 0 and completed_bibbles = total_bibbles)) as completed_maps,
      count(*) filter (where map_progress > 0 and map_progress < 100) as in_progress_maps,
      coalesce(sum(total_bibbles), 0) as total_concepts,
      coalesce(sum(completed_bibbles), 0) as concepts_mastered,
      coalesce(round(avg(map_progress), 1), 0.0) as average_progress
    from user_maps
  ),
  categories as (
    select
      category,
      count(*) as map_count,
      sum(completed_bibbles) as mastered_count
    from user_maps
    group by category
  )
  select jsonb_build_object(
    'userId', v_target_user,
    'totalMaps', a.total_maps,
    'completedMaps', a.completed_maps,
    'inProgressMaps', a.in_progress_maps,
    'totalConcepts', a.total_concepts,
    'conceptsMastered', a.concepts_mastered,
    'averageProgress', a.average_progress,
    'categories', coalesce((select jsonb_object_agg(c.category, jsonb_build_object('mapCount', c.map_count, 'masteredCount', c.mastered_count)) from categories c), '{}'::jsonb),
    'computedAt', now()
  ) into v_result
  from aggregated a;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.get_user_progress_analytics(uuid) from public, anon;
grant execute on function public.get_user_progress_analytics(uuid) to authenticated;

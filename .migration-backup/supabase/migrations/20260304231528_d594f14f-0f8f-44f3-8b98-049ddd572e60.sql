alter table public.user_roles enable row level security;

create or replace function public.hard_delete_auth_user(target_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() != target_user_id then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;
  delete from public.user_roles where user_id = target_user_id;
  delete from public.profiles where id = target_user_id;
  delete from auth.users where id = target_user_id;
  return json_build_object('status', 'success', 'message', 'User completely deleted');
exception when others then
  return json_build_object('status', 'error', 'message', sqlerrm);
end;
$$;

create or replace function public.update_page_content_data(p_page_key text, p_content jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  update public.page_content
  set content = p_content,
      updated_at = now()
  where page_key = p_page_key;

  select json_build_object(
    'success', true,
    'page_key', page_key,
    'content', content,
    'updated_at', updated_at
  )
  into v_result
  from public.page_content
  where page_key = p_page_key;

  return coalesce(v_result, json_build_object('success', false, 'error', 'Not found'));
end;
$$;
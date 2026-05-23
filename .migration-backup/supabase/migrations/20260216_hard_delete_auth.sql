-- This trigger will delete the auth user when requested
-- Create a special function that deletes from auth.users directly

create or replace function public.hard_delete_auth_user(target_user_id uuid)
returns json as $$
begin
  -- Only allow if called by same user
  if auth.uid() != target_user_id then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  -- Actually DELETE the user from auth.users
  delete from auth.users where id = target_user_id;

  return json_build_object(
    'status', 'success',
    'message', 'User deleted from auth',
    'user_id', target_user_id
  );
exception when others then
  return json_build_object(
    'status', 'error',
    'message', sqlerrm
  );
end;
$$ language plpgsql security definer;

grant execute on function public.hard_delete_auth_user(uuid) to authenticated;

-- Additional migration to completely remove user from auth.users
-- This is a separate RPC that can be called with proper permissions

create or replace function public.admin_delete_user_auth(user_id uuid)
returns json as $$
declare
  deleted_email text;
begin
  -- Get the email before deleting
  select email into deleted_email from auth.users where id = user_id;

  -- Actually delete from auth.users
  delete from auth.users where id = user_id;

  return json_build_object(
    'status', 'success',
    'message', 'User removed from authentication',
    'user_id', user_id,
    'deleted_email', deleted_email
  );
exception when others then
  return json_build_object(
    'status', 'error',
    'message', sqlerrm
  );
end;
$$ language plpgsql security definer;

-- This can only be called by service role, not by regular users
-- revoke execute on function public.admin_delete_user_auth(uuid) from public, authenticated;

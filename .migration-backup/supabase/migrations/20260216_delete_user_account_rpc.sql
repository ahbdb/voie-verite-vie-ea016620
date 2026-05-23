-- Create function to delete current user account completely
-- This function deletes from both auth.users and all related data

create or replace function public.delete_current_user_account()
returns json as $$
declare
  current_user_id uuid;
  result json;
  deleted_email text;
begin
  -- Get the current user ID from the auth context
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  if current_user_id is null then
    return json_build_object(
      'status', 'error',
      'message', 'User not authenticated'
    );
  end if;

  -- Get the email before deleting (for logging)
  select email into deleted_email from auth.users where id = current_user_id;

  -- Delete from user_roles
  delete from public.user_roles where user_id = current_user_id;

  -- Delete from profiles
  delete from public.profiles where id = current_user_id;

  -- Delete from notifications if exists
  begin
    delete from public.notifications where user_id = current_user_id;
  exception when undefined_table then
    null;
  end;

  -- Delete from ai_messages if exists
  begin
    delete from public.ai_messages where user_id = current_user_id;
  exception when undefined_table then
    null;
  end;

  -- Delete from ai_conversations if exists
  begin
    delete from public.ai_conversations where user_id = current_user_id;
  exception when undefined_table then
    null;
  end;

  -- Delete the actual auth user - change email to make account inaccessible
  -- Then delete from auth.users directly
  update auth.users 
  set 
    email = concat('deleted_', current_user_id, '@deleted.local'),
    encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf')),
    email_confirmed_at = null,
    phone_confirmed_at = null,
    confirmation_token = null,
    recovery_token = null,
    email_change_token_new = null,
    email_change_confirm_token = null,
    phone_change_token = null,
    aud = null,
    is_super_admin = false,
    raw_user_meta_data = null,
    raw_app_meta_data = null
  where id = current_user_id;

  return json_build_object(
    'status', 'success',
    'message', 'User account deleted successfully',
    'user_id', current_user_id,
    'deleted_email', deleted_email
  );
exception when others then
  return json_build_object(
    'status', 'error',
    'message', sqlerrm
  );
end;
$$ language plpgsql security definer;

-- Grant access to authenticated users
grant execute on function public.delete_current_user_account() to authenticated;

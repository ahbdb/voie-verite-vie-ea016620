-- ⚠️ COPY-PASTE THIS INTO SUPABASE SQL EDITOR AND RUN IT
-- Go to: https://supabase.com/dashboard → SQL Editor → New Query
-- Paste all of this and click RUN

-- Step 1: Create function to delete auth user
create or replace function public.hard_delete_auth_user(target_user_id uuid)
returns json as $$
begin
  if auth.uid() != target_user_id then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;
  
  delete from public.user_roles where user_id = target_user_id;
  delete from public.profiles where id = target_user_id;
  delete from auth.users where id = target_user_id;
  
  return json_build_object(
    'status', 'success',
    'message', 'User completely deleted'
  );
exception when others then
  return json_build_object('status', 'error', 'message', sqlerrm);
end;
$$ language plpgsql security definer;

grant execute on function public.hard_delete_auth_user(uuid) to authenticated;

-- Done! Now account deletion will work.

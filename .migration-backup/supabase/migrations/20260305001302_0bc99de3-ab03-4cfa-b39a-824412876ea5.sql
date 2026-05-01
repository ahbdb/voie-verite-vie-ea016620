DROP POLICY IF EXISTS "Users submit contacts" ON public.contact_messages;
CREATE POLICY "Users submit contacts"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(name)) > 0
  AND position('@' in email) > 1
  AND length(btrim(type)) > 0
  AND length(btrim(subject)) > 0
  AND length(btrim(message)) > 0
);

DROP POLICY IF EXISTS "Anyone can create donations" ON public.donations;
CREATE POLICY "Anyone can create donations"
ON public.donations
FOR INSERT
TO anon, authenticated
WITH CHECK (
  amount > 0
  AND coalesce(currency, 'XAF') <> ''
);
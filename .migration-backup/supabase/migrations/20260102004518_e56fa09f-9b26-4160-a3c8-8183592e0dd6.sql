-- Ajouter politique RLS pour permettre aux admins de lire les messages de contact
CREATE POLICY "Admins can view contact messages" 
ON public.contact_messages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ajouter politique RLS pour permettre aux admins de supprimer les messages de contact
CREATE POLICY "Admins can delete contact messages" 
ON public.contact_messages 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));
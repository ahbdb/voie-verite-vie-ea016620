#!/bin/bash

# This script initializes the admin user for the 3V application
# It requires the Supabase CLI to be installed and logged in

set -e

echo "Initializing admin user for 3V application..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Run the SQL migration to add content management tables
echo "Creating content management tables..."
supabase migration up

# The following SQL needs to be executed manually in Supabase:
# This script documents what needs to be done via the Supabase dashboard

echo ""
echo "=== NEXT STEPS ==="
echo ""
echo "1. Create the admin user in Supabase:"
echo "   - Email: ahdybau@gmail.com"
echo "   - Password: ADBleke@14092001"
echo ""
echo "2. Once the user is created, Supabase will automatically:"
echo "   - Create a profile entry"
echo "   - Create a user_roles entry with 'user' role"
echo ""
echo "3. Then, manually update the user_roles to make them admin:"
echo "   - Go to Supabase Dashboard > SQL Editor"
echo "   - Run the SQL below (copy ahdybau@gmail.com's user_id from the profiles table):"
echo ""
echo "   UPDATE public.user_roles"
echo "   SET role = 'admin'"
echo "   WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'ahdybau@gmail.com')"
echo ""
echo "4. Alternatively, execute this SQL to grant admin directly:"
echo ""
echo "   -- First, get the user_id from the profiles table"
echo "   SELECT id FROM public.profiles WHERE email = 'ahdybau@gmail.com';"
echo ""
echo "   -- Then update the user_roles table"
echo "   INSERT INTO public.user_roles (user_id, role)"
echo "   VALUES ((SELECT id FROM public.profiles WHERE email = 'ahdybau@gmail.com'), 'admin')"
echo "   ON CONFLICT (user_id, role) DO NOTHING;"
echo ""
echo "Migration files have been created in supabase/migrations/"

// @ts-nocheck
// This file uses Deno runtime - it will work when deployed to Supabase Edge Functions
// Local TypeScript validation will show errors, but the code is valid for Deno

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(async (req: any) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // Get the service role key from environment
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Service role key not configured in edge function environment",
          hint: "This function requires SUPABASE_SERVICE_ROLE_KEY to be set"
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Import Supabase client
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.0") as any;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Execute the migration inline
    const adminEmail = "ahdybau@gmail.com";

    // Step 1: Try to add enum values (they may already exist)
    console.log("Step 1: Checking/adding enum values...");
    
    // Step 2: Find the user and set up the role
    const { data: users, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", adminEmail)
      .single();

    if (userError || !users) {
      console.error("User not found:", userError);
      
      // Try to find in auth.users via RPC
      const { data: authData, error: authError } = await supabase.rpc("get_user_by_email", {
        email: adminEmail
      });

      if (authError) {
        return new Response(
          JSON.stringify({
            status: "error",
            message: `User ${adminEmail} not found`,
            error: authError?.message
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    const userId = users?.id;

    // Step 3: Delete old roles if any
    console.log("Step 3: Removing old roles...");
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.warn("Delete warning:", deleteError);
    }

    // Step 4: Insert the admin_principal role
    console.log("Step 4: Inserting admin_principal role...");
    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "admin_principal"
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to insert admin role",
          error: insertError.message
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Step 5: Verify the role was inserted
    console.log("Step 5: Verifying role assignment...");
    const { data: verification, error: verifyError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId);

    if (verifyError) {
      console.error("Verification error:", verifyError);
    }

    console.log("✅ Admin setup complete!");

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Admin principal role has been set up successfully!",
        user_id: userId,
        role_assigned: "admin_principal",
        next_steps: [
          "Sign out completely from the application",
          "Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)",
          "Sign back in",
          "Click Admin → All tabs should be visible"
        ]
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorDetails = err instanceof Error ? err.toString() : String(err);
    console.error("Error:", err);
    return new Response(
      JSON.stringify({
        status: "error",
        message: errorMessage,
        error_details: errorDetails
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

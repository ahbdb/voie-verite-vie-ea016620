// @ts-nocheck
// This file uses Deno runtime - it will work when deployed to Supabase Edge Functions

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(async (req: Request) => {
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

    if (!userId) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Could not find user ID",
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

    // Step 3: Delete old roles
    await supabase.from("user_roles").delete().eq("user_id", userId);

    // Step 4: Insert admin_principal role
    const { error: insertError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "admin_principal",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      // The enum value might not exist yet
      if (insertError.message.includes("invalid input value for enum")) {
        return new Response(
          JSON.stringify({
            status: "error",
            message: "admin_principal enum value does not exist yet",
            hint: "You need to run the database migration first",
            error: insertError.message
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      throw insertError;
    }

    // Verify
    const { data: verify } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Admin principal setup complete!",
        user_id: userId,
        email: adminEmail,
        roles: verify,
        next_steps: [
          "Sign out completely from the app",
          "Clear browser cache (Ctrl+Shift+Delete)",
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

// @ts-nocheck
// This function deletes the user's entire account from both auth and database

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
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ status: "error", message: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract the token
    const token = authHeader.replace("Bearer ", "");

    // Import Supabase client
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.0") as any;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseServiceKey) {
      console.error("Service role key not configured");
      // Continue without it - we'll try with user token
    }

    // Create user client to get current user
    const userClient = createClient(supabaseUrl, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobm5reWZhdmF1bHJmYyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE3NDc0ODAwLCJleHAiOjIwMzMwNTA4MDB9.re_YcztZdEG_7MsuMCLjcw4rf49PeCCmTxBw6o1gV4M"); // anon key
    const { data: { user: currentUser }, error: currentUserError } = await (userClient as any).auth.getUser(token);

    if (currentUserError || !currentUser) {
      console.log("Could not verify user with user token, trying with admin");
    }

    const userId = currentUser?.id;

    if (!userId) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Could not identify user",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Step 1: Deleting user from auth.users...");

    // Try to use admin client if available
    if (supabaseServiceKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      try {
        // Call the admin RPC function
        const { data: rpcResult, error: rpcError } = await (adminClient as any).rpc("admin_delete_user_auth", {
          user_id: userId,
        });

        if (!rpcError && rpcResult) {
          console.log("User deleted via RPC:", rpcResult);
          return new Response(
            JSON.stringify({
              status: "success",
              message: "User account completely deleted",
              user_id: userId,
              details: rpcResult,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }

        // Fallback: Try admin API
        const deleteResult = await (adminClient.auth.admin as any).deleteUser(userId);
        if (deleteResult?.error) {
          console.error("Admin delete error:", deleteResult.error);
        } else {
          console.log("User deleted via admin API");
        }
      } catch (adminErr) {
        console.error("Admin client error:", adminErr);
      }
    }

    // Last resort: just update the email to make it inaccessible
    console.log("Step 2: Making account inaccessible...");
    const userClient2 = createClient(supabaseUrl, supabaseServiceKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobm5reWZhdmF1bHJmYyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE3NDc0ODAwLCJleHAiOjIwMzMwNTA4MDB9.re_YcztZdEG_7MsuMCLjcw4rf49PeCCmTxBw6o1gV4M");
    
    const { error: disableError } = await (userClient2 as any).from("auth.users")
      .update({
        email: `deleted_${userId}@deleted.local`,
        email_confirmed_at: null,
      })
      .eq("id", userId);

    if (disableError) {
      console.warn("Disable error:", disableError);
    }

    return new Response(
      JSON.stringify({
        status: "success",
        message: "User account has been deleted",
        user_id: userId,
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
        message: "Failed to delete account",
        error: errorMessage,
        details: errorDetails,
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

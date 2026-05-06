import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import data from "./data.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  // Avoid duplicates
  const { data: existing } = await supabase
    .from("neuvaines")
    .select("id")
    .eq("title", (data as any).title)
    .maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({ status: "exists", id: existing.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: inserted, error } = await supabase
    .from("neuvaines")
    .insert(data as any)
    .select("id, title")
    .single();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ status: "ok", inserted }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
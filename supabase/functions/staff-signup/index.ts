// Staff signup with invite codes (chef / owner)
// Public endpoint — no JWT required
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, role, invite_code } = await req.json();

    if (!email || !password || !full_name || !role || !invite_code) {
      return json({ error: "All fields are required" }, 400);
    }
    if (role !== "owner" && role !== "chef") {
      return json({ error: "Invalid role" }, 400);
    }

    const expected =
      role === "owner"
        ? Deno.env.get("OWNER_INVITE_CODE")
        : Deno.env.get("CHEF_INVITE_CODE");

    if (!expected || invite_code !== expected) {
      return json({ error: "Invalid invite code" }, 403);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Create user (auto-confirmed)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "Could not create user" }, 400);
    }

    // Insert role (profile auto-created by trigger)
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: created.user.id, role });
    if (roleErr) {
      return json({ error: roleErr.message }, 400);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("staff-signup error", e);
    return json({ error: "Unexpected error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

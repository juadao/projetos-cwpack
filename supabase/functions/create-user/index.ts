import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { username, password, name, role } = await req.json();

    if (!username || !password || !name) {
      return new Response(
        JSON.stringify({ error: "Nome, usuário e senha são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedUsername = username.toLowerCase().replace(/\s/g, "");

    // Generate a fake email from username for Supabase Auth
    // (Supabase Auth requires email, but users log in with username)
    const fakeEmail = `${normalizedUsername.replace(/[^a-z0-9]/g, "")}@cwpack.local`;
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: "Este nome de usuário já está em uso." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: fakeEmail,
      password,
      email_confirm: true,
      user_metadata: { username: normalizedUsername, name },
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const newUserId = authData.user.id;

    const { error: profileError } = await adminClient.from("profiles").upsert({
      user_id: newUserId,
      email: fakeEmail,
      username: normalizedUsername,
      name,
      role: role || "Representante",
    }, { onConflict: "user_id" });

    if (profileError) {
      return new Response(
        JSON.stringify({ error: "Usuário criado na autenticação, mas erro ao criar perfil: " + profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUserId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno do servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

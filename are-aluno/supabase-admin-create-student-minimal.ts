import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return response({ ok: true });
  }

  if (request.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return response({ error: "Backend not configured" }, 500);
  }

  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "").trim();

  if (!token) {
    return response({ error: "Missing authorization token" }, 401);
  }

  const body = await request.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!name || !email || !password) {
    return response({ error: "Nome, e-mail e senha temporária são obrigatórios." }, 400);
  }

  if (password.length < 6) {
    return response({ error: "A senha temporária precisa ter pelo menos 6 caracteres." }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const caller = await supabase.auth.getUser(token);

  if (caller.error || !caller.data.user) {
    return response({ error: "Sessão inválida." }, 401);
  }

  const adminCheck = await supabase
    .from("admin_users")
    .select("auth_user_id")
    .eq("auth_user_id", caller.data.user.id)
    .maybeSingle();

  if (adminCheck.error || !adminCheck.data) {
    return response({ error: "Usuário sem permissão administrativa." }, 403);
  }

  const created = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { name: name }
  });

  if (created.error) {
    return response({ error: created.error.message }, 400);
  }

  const authUser = created.data.user;

  const student = await supabase
    .from("students")
    .upsert({
      auth_user_id: authUser.id,
      name: name,
      email: email
    }, { onConflict: "email" })
    .select("id,name,email,auth_user_id")
    .single();

  if (student.error) {
    return response({ error: student.error.message }, 400);
  }

  return response({
    student: student.data,
    auth_user_id: authUser.id
  });
});

function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status: status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

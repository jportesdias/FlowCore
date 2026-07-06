import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Backend not configured" }, 500);
  }

  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return json({ error: "Missing authorization token" }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!name || !email || !password) {
    return json({ error: "Nome, e-mail e senha temporária são obrigatórios." }, 400);
  }

  if (password.length < 6) {
    return json({ error: "A senha temporária precisa ter pelo menos 6 caracteres." }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: callerData, error: callerError } = await supabase.auth.getUser(token);
  if (callerError || !callerData.user) {
    return json({ error: "Sessão inválida." }, 401);
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("auth_user_id")
    .eq("auth_user_id", callerData.user.id)
    .maybeSingle();

  if (adminError || !admin) {
    return json({ error: "Usuário sem permissão administrativa." }, 403);
  }

  const { data: existingAuthUser, error: lookupError } = await findAuthUserByEmail(supabase, email);
  if (lookupError) {
    return json({ error: lookupError }, 500);
  }

  let authUser = existingAuthUser;

  if (authUser) {
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (updateError) {
      return json({ error: updateError.message }, 400);
    }

    authUser = updated.user;
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (createError) {
      return json({ error: createError.message }, 400);
    }

    authUser = created.user;
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .upsert({
      auth_user_id: authUser.id,
      name: name,
      email: email
    }, { onConflict: "email" })
    .select("id,name,email,auth_user_id")
    .single();

  if (studentError) {
    return json({ error: studentError.message }, 400);
  }

  return json({
    student,
    auth_user_id: authUser.id,
    created_auth_user: !existingAuthUser
  });
});

async function findAuthUserByEmail(supabase: any, email: string) {
  const perPage = 100;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) return { data: null, error: error.message };

    const user = data.users.find((item) => String(item.email || "").toLowerCase() === email);
    if (user) return { data: user, error: null };
    if (data.users.length < perPage) return { data: null, error: null };
  }

  return { data: null, error: "Limite de busca de usuários atingido." };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

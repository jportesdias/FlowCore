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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return response({ error: "Backend not configured" }, 500);
    }

    const token = (request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!token) {
      return response({ error: "Missing authorization token" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const caller = await supabase.auth.getUser(token);
    if (caller.error || !caller.data.user) {
      return response({ error: "Sessao invalida." }, 401);
    }

    const adminCheck = await supabase
      .from("admin_users")
      .select("auth_user_id")
      .eq("auth_user_id", caller.data.user.id)
      .maybeSingle();

    if (adminCheck.error || !adminCheck.data) {
      return response({ error: "Usuario sem permissao administrativa." }, 403);
    }

    const body = await request.json();
    const action = String(body.action || "create").trim().toLowerCase();

    if (action === "create") return createStudent(supabase, body);
    if (action === "update") return updateStudent(supabase, body);
    if (action === "delete") return deleteStudent(supabase, body);

    return response({ error: "Acao invalida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno.";
    return response({ error: message }, 500);
  }
});

async function createStudent(supabase: any, body: any) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "") || generateTemporaryPassword();
  const subscriptionStartDate = String(body.subscription_start_date || "").trim();
  const subscriptionActive = Boolean(body.subscription_active);

  if (!name || !email) {
    return response({ error: "Nome e e-mail sao obrigatorios." }, 400);
  }

  if (password.length < 6) {
    return response({ error: "A senha temporaria precisa ter pelo menos 6 caracteres." }, 400);
  }

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });

  if (created.error) {
    return response({ error: created.error.message }, 400);
  }

  const authUser = created.data.user;
  const student = await supabase
    .from("students")
    .upsert({
      auth_user_id: authUser.id,
      name,
      email,
      subscription_start_date: subscriptionStartDate || null,
      subscription_active: subscriptionActive
    }, { onConflict: "email" })
    .select("id,name,email,auth_user_id")
    .single();

  if (student.error) {
    await supabase.auth.admin.deleteUser(authUser.id);
    return response({ error: student.error.message }, 400);
  }

  return response({
    student: student.data,
    auth_user_id: authUser.id
  });
}

async function updateStudent(supabase: any, body: any) {
  const studentId = String(body.studentId || "").trim();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const subscriptionStartDate = String(body.subscription_start_date || "").trim();
  const subscriptionActive = Boolean(body.subscription_active);

  if (!studentId || !name || !email) {
    return response({ error: "Aluno, nome e e-mail sao obrigatorios." }, 400);
  }

  if (password && password.length < 6) {
    return response({ error: "A nova senha precisa ter pelo menos 6 caracteres." }, 400);
  }

  const current = await supabase
    .from("students")
    .select("id,name,email,auth_user_id,subscription_start_date,subscription_active")
    .eq("id", studentId)
    .maybeSingle();

  if (current.error) return response({ error: current.error.message }, 400);
  if (!current.data) return response({ error: "Aluno nao encontrado." }, 404);

  const authPayload: Record<string, unknown> = {
    email,
    email_confirm: true,
    user_metadata: { name }
  };

  if (password) authPayload.password = password;

  if (current.data.auth_user_id) {
    const authUpdate = await supabase.auth.admin.updateUserById(current.data.auth_user_id, authPayload);
    if (authUpdate.error) return response({ error: authUpdate.error.message }, 400);
  }

  const updated = await supabase
    .from("students")
    .update({
      name,
      email,
      subscription_start_date: subscriptionStartDate || null,
      subscription_active: subscriptionActive
    })
    .eq("id", studentId)
    .select("id,name,email,auth_user_id,subscription_start_date,subscription_active")
    .single();

  if (updated.error) return response({ error: updated.error.message }, 400);

  return response({ student: updated.data });
}

async function deleteStudent(supabase: any, body: any) {
  const studentId = String(body.studentId || "").trim();
  if (!studentId) return response({ error: "Aluno obrigatorio." }, 400);

  const current = await supabase
    .from("students")
    .select("id,email,auth_user_id")
    .eq("id", studentId)
    .maybeSingle();

  if (current.error) return response({ error: current.error.message }, 400);
  if (!current.data) return response({ error: "Aluno nao encontrado." }, 404);

  if (current.data.auth_user_id) {
    const authDelete = await supabase.auth.admin.deleteUser(current.data.auth_user_id);
    if (authDelete.error) return response({ error: authDelete.error.message }, 400);
  }

  const deleted = await supabase
    .from("students")
    .delete()
    .eq("id", studentId);

  if (deleted.error) return response({ error: deleted.error.message }, 400);

  return response({ ok: true, studentId });
}

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function generateTemporaryPassword() {
  return crypto.randomUUID().replace(/-/g, "") + "Aa1!";
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type MaterialAccessResponse = {
  material: {
    id: string;
    title: string;
    type: string;
    description: string;
    duration: string | null;
  };
  access: {
    allowed: boolean;
    mode: "public_url" | "secure_backend_required";
    url?: string;
  };
};

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
  const materialId = String(body.material_id || "").trim();
  if (!materialId) {
    return json({ error: "Missing material_id" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return json({ error: "Invalid session" }, 401);
  }

  const { data: material, error: materialError } = await supabase
    .from("materials")
    .select("id, course_id, type, title, description, duration, is_private, public_url, secure_provider, secure_ref")
    .eq("id", materialId)
    .single();

  if (materialError || !material) {
    return json({ error: "Material not found" }, 404);
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (studentError || !student) {
    return json({ error: "Student profile not found" }, 403);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: access, error: accessError } = await supabase
    .from("course_access")
    .select("id")
    .eq("student_id", student.id)
    .eq("course_id", material.course_id)
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .maybeSingle();

  if (accessError || !access) {
    return json({ error: "Access denied" }, 403);
  }

  const response: MaterialAccessResponse = {
    material: {
      id: material.id,
      title: material.title,
      type: material.type,
      description: material.description,
      duration: material.duration
    },
    access: {
      allowed: true,
      mode: material.public_url ? "public_url" : "secure_backend_required"
    }
  };

  if (material.public_url) {
    response.access.url = material.public_url;
  }

  return json(response);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

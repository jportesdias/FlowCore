const adminStorageKey = "flowcore-student-admin-prototype";
const crmLeadPaths = [
  "../crm/leads.json",
  "/crm/leads.json",
  "crm/leads.json"
];

const defaultCourses = [
  { id: "medidores-vazao", title: "Medidores de Vazão com Ênfase em Manutenção e Operação", description: "Curso comprado pelo Celso no protótipo real.", cover_path: "assets/capa-medidores.png" },
  { id: "provadores-compactos", title: "Provadores Compacto", description: "Operação, prova e interpretação com provadores compactos.", cover_path: "assets/capa-provadores.png" },
  { id: "computadores-vazao", title: "Computadores de Vazão", description: "Configuração, operação e interpretação de computadores de vazão.", cover_path: "assets/computador-vazao2.png" },
  { id: "ia-dominio-tecnico", title: "IA para Domínio Técnico", description: "Uso prático de IA para estudo e documentação técnica.", cover_path: "assets/IA-domnio.png" }
];

const client = window.supabase?.createClient(FLOWCORE_SUPABASE_URL, FLOWCORE_SUPABASE_ANON_KEY, {
  auth: { storageKey: "flowcore-admin-session" }
});
const studentFunctionUrl = `${FLOWCORE_SUPABASE_URL}/functions/v1/clever-responder`;

let state = {
  selectedStudentId: "",
  studentSearch: "",
  students: [],
  courses: defaultCourses,
  access: []
};
let crmLeads = [];

const loginScreen = document.querySelector("#adminLogin");
const adminShell = document.querySelector("#adminShell");
const loginForm = document.querySelector("#adminLoginForm");
const studentForm = document.querySelector("#studentForm");
const studentSearch = document.querySelector("#studentSearch");
const logoutButton = document.querySelector("#adminLogoutButton");
const editStudentModal = document.querySelector("#editStudentModal");
const editStudentForm = document.querySelector("#editStudentForm");
const crmOpenButton = document.querySelector("#crmOpenButton");
const crmSearch = document.querySelector("#crmSearch");
const crmFileInput = document.querySelector("#crmFileInput");

boot();

async function boot() {
  loginForm.addEventListener("submit", loginAdmin);
  studentForm.addEventListener("submit", addStudent);
  if (crmOpenButton) crmOpenButton.addEventListener("click", focusCrmImport);
  if (crmSearch) {
    crmSearch.addEventListener("input", () => renderCrmResults(crmSearch.value));
  }
  if (crmFileInput) {
    crmFileInput.addEventListener("change", loadCrmFile);
  }
  if (editStudentForm) editStudentForm.addEventListener("submit", saveEditedStudent);
  document.querySelectorAll("[data-close-edit-modal]").forEach(button => {
    button.addEventListener("click", closeEditStudentModal);
  });
  if (editStudentModal) {
    editStudentModal.addEventListener("click", event => {
      if (event.target === editStudentModal) closeEditStudentModal();
    });
  }
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && editStudentModal?.classList.contains("is-visible")) {
      closeEditStudentModal();
    }
  });
  if (studentSearch) {
    studentSearch.addEventListener("input", () => {
      state.studentSearch = studentSearch.value;
      renderStudents();
    });
  }
  const subscriptionStartInput = studentForm.querySelector('[name="subscription_start_date"]');
  if (subscriptionStartInput && !subscriptionStartInput.value) {
    subscriptionStartInput.value = new Date().toISOString().slice(0, 10);
  }
  logoutButton.addEventListener("click", logoutAdmin);

  if (!client) {
    showLogin("Biblioteca Supabase não carregou. Verifique a conexão e recarregue.", true);
    return;
  }

  const { data } = await client.auth.getSession();
  if (data.session) await openAdmin();
  else showLogin();
}

async function loginAdmin(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  setLoginStatus("Entrando...");

  const { error } = await client.auth.signInWithPassword({
    email: String(data.email || "").trim(),
    password: String(data.password || "")
  });

  if (error) {
    setLoginStatus(error.message || "Não foi possível entrar.", true);
    return;
  }

  await openAdmin();
}

async function logoutAdmin() {
  await client.auth.signOut();
  state = { selectedStudentId: "", students: [], courses: defaultCourses, access: [] };
  showLogin();
}

async function openAdmin() {
  try {
    await assertAdmin();
    loginScreen.classList.remove("is-visible");
    adminShell.style.display = "grid";
  } catch (error) {
    await client.auth.signOut();
    showLogin(error.message || "Usuário sem permissão administrativa.", true);
    return;
  }

  try {
    await loadRemoteState();
    await loadCrmLeads();
    await ensureDefaultCourses();
    await loadRemoteState();
    render();
    setStatus("Conectado ao Supabase. Liberações feitas aqui gravam no banco.");
  } catch (error) {
    setStatus(error.message || "Erro ao carregar dados administrativos.", true);
  }
}

async function assertAdmin() {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData?.user) throw new Error("Sessão inválida. Entre novamente.");

  const { data, error } = await client
    .from("admin_users")
    .select("auth_user_id,email")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (error) throw new Error(adminErrorMessage(error));
  if (!data) throw new Error("Este usuário não está em admin_users.");
}

async function ensureDefaultCourses() {
  const rows = defaultCourses.map(course => ({
    id: course.id,
    title: course.title,
    description: course.description,
    cover_path: course.cover_path,
    status: "published"
  }));

  const { error } = await client.from("courses").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(adminErrorMessage(error));
}

async function loadRemoteState() {
  const [studentsResult, coursesResult, accessResult] = await Promise.all([
    client.from("students").select("id,name,email,subscription_start_date,subscription_active").order("created_at", { ascending: false }),
    client.from("courses").select("id,title,description,cover_path,status").order("title", { ascending: true }),
    client.from("course_access").select("student_id,course_id,valid_until,source")
  ]);

  const firstError = studentsResult.error || coursesResult.error || accessResult.error;
  if (firstError) throw new Error(adminErrorMessage(firstError));

  state.students = studentsResult.data || [];
  state.courses = (coursesResult.data || []).map(course => ({
    id: course.id,
    title: course.title,
    description: course.description,
    cover_path: course.cover_path,
    status: course.status
  }));
  state.access = (accessResult.data || []).map(item => ({
    studentId: item.student_id,
    courseId: item.course_id,
    validUntil: item.valid_until,
    source: item.source
  }));

  if (!state.selectedStudentId || !state.students.some(student => student.id === state.selectedStudentId)) {
    state.selectedStudentId = state.students[0]?.id || "";
  }

  savePrototypeMirror();
}

async function addStudent(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());
  const email = String(data.email || "").trim().toLowerCase();
  const name = String(data.name || "").trim();
  const subscriptionStartDate = String(data.subscription_start_date || "");
  const subscriptionActive = data.subscription_active === "on";

  setStatus("Criando aluno...");
  if (submitButton) submitButton.disabled = true;

  try {
    const result = await createStudentRecord({
      name,
      email,
      subscription_start_date: subscriptionStartDate,
      subscription_active: subscriptionActive
    });

    state.selectedStudentId = result.student?.id || state.selectedStudentId;
    form.reset();
    const subscriptionStartInput = form.querySelector('[name="subscription_start_date"]');
    if (subscriptionStartInput) subscriptionStartInput.value = new Date().toISOString().slice(0, 10);
    await loadRemoteState();
    render();
    setStatus("Aluno criado. Nenhum curso foi liberado automaticamente.");
  } catch (error) {
    if (error.name === "AbortError") {
      setStatus("A criacao demorou mais de 20 segundos. Confira os logs da Edge Function no Supabase e tente novamente.", true);
      return;
    }

    setStatus(error.message || "Erro de comunicacao com a Edge Function.", true);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function createStudentRecord(payload) {
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessao expirada. Entre novamente.");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  const response = await fetch(studentFunctionUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: controller.signal
  }).finally(() => window.clearTimeout(timeout));

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Nao foi possivel criar o aluno.");
  }

  return result;
}

async function loadCrmLeads() {
  const status = document.querySelector("#crmStatus");
  if (!status) return;

  for (const path of crmLeadPaths) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) continue;

      const leads = await response.json();
      setCrmLeads(leads, `CRM carregado automaticamente de ${path}.`);
      return;
    } catch (error) {
      // Tenta o proximo caminho antes de mostrar erro ao admin.
    }
  }

  crmLeads = [];
  document.querySelector("#crmFileFallback")?.classList.add("is-visible");
  status.textContent = "Nao foi possivel carregar o CRM automaticamente. Selecione o arquivo crm/leads.json abaixo.";
}

function loadCrmFile(event) {
  const file = event.currentTarget.files?.[0];
  const status = document.querySelector("#crmStatus");
  if (!file || !status) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const leads = JSON.parse(String(reader.result || "[]"));
      setCrmLeads(leads, `CRM carregado do arquivo ${file.name}.`);
    } catch (error) {
      status.textContent = "Arquivo inválido. Selecione o crm/leads.json exportado pelo CRM.";
    }
  };
  reader.onerror = () => {
    status.textContent = "Nao foi possivel ler o arquivo selecionado.";
  };
  reader.readAsText(file, "utf-8");
}

function setCrmLeads(leads, message) {
  const status = document.querySelector("#crmStatus");
  const fallback = document.querySelector("#crmFileFallback");
  crmLeads = Array.isArray(leads) ? leads : [];
  if (fallback) fallback.classList.remove("is-visible");
  if (status) status.textContent = `${message} ${crmLeads.length} contato(s) disponivel(is).`;
  renderCrmResults(crmSearch?.value || "");
}

function renderCrmResults(term) {
  const results = document.querySelector("#crmResults");
  const status = document.querySelector("#crmStatus");
  if (!results || !status || !crmLeads.length) return;

  const query = normalizeSearch(term);
  const matches = crmLeads
    .filter(lead => {
      if (!query) return true;
      return normalizeSearch([
        lead.name,
        lead.email,
        lead.phone,
        lead.phoneRaw,
        lead.interest,
        lead.status,
        lead.stage,
        lead.priority,
        lead.origin
      ].join(" ")).includes(query);
    })
    .slice(0, 8);

  status.textContent = query
    ? `${matches.length} resultado(s) exibido(s) para a busca.`
    : `${crmLeads.length} contato(s) carregado(s) do CRM.`;

  results.innerHTML = matches.map(lead => `
    <article class="crm-result-card">
      <div>
        <strong>${escapeHtml(lead.name || "Contato sem nome")}</strong><br>
        <span>${escapeHtml(lead.email || "Sem e-mail")} ${lead.phone ? `· ${escapeHtml(lead.phone)}` : ""}</span>
      </div>
      <div class="crm-result-meta">
        ${escapeHtml(lead.status || lead.stage || "Status nao informado")} · ${escapeHtml(lead.priority || "Sem prioridade")}<br>
        Interesse: ${escapeHtml(lead.interest || "Nao informado")}
      </div>
      <button class="primary-button" type="button" data-import-lead="${escapeHtml(lead.id)}">Criar aluno</button>
    </article>
  `).join("");

  results.querySelectorAll("[data-import-lead]").forEach(button => {
    button.addEventListener("click", () => importCrmLead(button.dataset.importLead));
  });
}

async function importCrmLead(leadId) {
  const lead = crmLeads.find(item => item.id === leadId);
  const form = document.querySelector("#studentForm");
  if (!lead || !form) return;

  if (!lead.email) {
    form.elements.name.value = lead.name || "";
    form.elements.email.focus();
    setStatus("Contato do CRM sem e-mail. Complete o cadastro manualmente.", true);
    return;
  }

  const email = String(lead.email || "").trim().toLowerCase();
  const existing = state.students.find(student => String(student.email || "").toLowerCase() === email);

  if (existing) {
    state.selectedStudentId = existing.id;
    render();
    setStatus(`${existing.name} ja estava cadastrado. Aluno selecionado para liberar cursos.`);
    return;
  }

  setStatus("Criando aluno a partir do CRM...");
  try {
    const result = await createStudentRecord({
      name: lead.name || lead.email,
      email,
      subscription_start_date: new Date().toISOString().slice(0, 10),
      subscription_active: true,
      crm_lead_id: lead.id,
      crm_interest: lead.interest || "",
      crm_status: lead.status || lead.stage || ""
    });

    state.selectedStudentId = result.student?.id || state.selectedStudentId;
    await loadRemoteState();
    render();
    setStatus(`${lead.name || lead.email} foi criado no Supabase. Agora libere os cursos a direita.`);
  } catch (error) {
    setStatus(error.message || "Nao foi possivel criar o aluno a partir do CRM.", true);
  }
}

function focusCrmImport() {
  const box = document.querySelector("#crmImportBox");
  const search = document.querySelector("#crmSearch");
  if (!box || !search) return;

  box.scrollIntoView({ behavior: "smooth", block: "start" });
  box.classList.add("is-highlighted");
  search.focus();
  window.setTimeout(() => box.classList.remove("is-highlighted"), 1800);
}

function render() {
  renderStudents();
  renderAccess();
}

async function callStudentFunction(payload) {
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("SessÃ£o expirada. Entre novamente.");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  const response = await fetch(studentFunctionUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: controller.signal
  }).finally(() => window.clearTimeout(timeout));

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `OperaÃ§Ã£o nÃ£o concluÃ­da. Status ${response.status}.`);
  }

  return result;
}

function renderStudents() {
  const list = document.querySelector("#studentList");
  const filteredStudents = getFilteredStudents();

  if (!state.students.length) {
    list.innerHTML = '<p class="muted">Nenhum aluno cadastrado.</p>';
    return;
  }

  if (!filteredStudents.length) {
    list.innerHTML = '<p class="muted">Nenhum aluno encontrado para essa busca.</p>';
    return;
  }

  list.innerHTML = filteredStudents.map(student => `
    <article class="student-row ${student.id === state.selectedStudentId ? "is-active" : ""}">
      <div>
        <strong>${escapeHtml(student.name)}</strong><br>
        <span>${escapeHtml(student.email)}</span><br>
        <span>Assinatura: ${student.subscription_active ? "ativa" : "inativa"}${student.subscription_start_date ? ` desde ${formatDate(student.subscription_start_date)}` : ""}</span><br>
        <span>ID: ${escapeHtml(student.id)}</span>
      </div>
      <div class="student-actions">
        <button class="secondary-button" type="button" data-select-student="${student.id}">Selecionar</button>
        <button class="secondary-button" type="button" data-edit-student="${student.id}">Editar</button>
        <button class="danger-button" type="button" data-delete-student="${student.id}">Excluir</button>
      </div>
    </article>
  `).join("");

  list.querySelectorAll("[data-select-student]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedStudentId = button.dataset.selectStudent;
      render();
    });
  });

  list.querySelectorAll("[data-edit-student]").forEach(button => {
    button.addEventListener("click", () => editStudent(button.dataset.editStudent));
  });

  list.querySelectorAll("[data-delete-student]").forEach(button => {
    button.addEventListener("click", () => deleteStudent(button.dataset.deleteStudent));
  });
}

function getFilteredStudents() {
  const term = normalizeSearch(state.studentSearch);
  if (!term) return state.students;

  return state.students.filter(student => {
    const haystack = normalizeSearch(`${student.name} ${student.email} ${student.id}`);
    return haystack.includes(term);
  });
}

async function editStudent(studentId) {
  const student = state.students.find(item => item.id === studentId);
  if (!student) return;

  const name = window.prompt("Nome do aluno", student.name);
  if (name === null) return;

  const email = window.prompt("E-mail do aluno", student.email);
  if (email === null) return;

  const password = window.prompt("Nova senha temporÃ¡ria, deixe em branco para manter a atual", "");

  try {
    setStatus("Atualizando aluno...");
    const result = await callStudentFunction({
      action: "update",
      studentId,
      name: String(name || "").trim(),
      email: String(email || "").trim().toLowerCase(),
      password: String(password || "")
    });

    state.selectedStudentId = result.student?.id || studentId;
    await loadRemoteState();
    render();
    setStatus("Aluno atualizado.");
  } catch (error) {
    setStatus(error.message || "NÃ£o foi possÃ­vel atualizar o aluno.", true);
  }
}

function editStudent(studentId) {
  const student = state.students.find(item => item.id === studentId);
  if (!student || !editStudentForm || !editStudentModal) return;

  editStudentForm.elements.student_id.value = student.id;
  editStudentForm.elements.name.value = student.name || "";
  editStudentForm.elements.email.value = student.email || "";
  editStudentForm.elements.subscription_start_date.value = student.subscription_start_date || new Date().toISOString().slice(0, 10);
  editStudentForm.elements.subscription_active.checked = Boolean(student.subscription_active);

  editStudentModal.classList.add("is-visible");
  editStudentModal.setAttribute("aria-hidden", "false");
  editStudentForm.elements.name.focus();
}

function closeEditStudentModal() {
  if (!editStudentModal) return;
  editStudentModal.classList.remove("is-visible");
  editStudentModal.setAttribute("aria-hidden", "true");
  if (editStudentForm) editStudentForm.reset();
}

async function saveEditedStudent(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    setStatus("Atualizando aluno...");
    if (submitButton) submitButton.disabled = true;

    const result = await callStudentFunction({
      action: "update",
      studentId: String(data.student_id || "").trim(),
      name: String(data.name || "").trim(),
      email: String(data.email || "").trim().toLowerCase(),
      subscription_start_date: String(data.subscription_start_date || ""),
      subscription_active: data.subscription_active === "on"
    });

    state.selectedStudentId = result.student?.id || String(data.student_id || "").trim();
    await loadRemoteState();
    render();
    closeEditStudentModal();
    setStatus("Aluno atualizado.");
  } catch (error) {
    setStatus(error.message || "Nao foi possivel atualizar o aluno.", true);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function deleteStudent(studentId) {
  const student = state.students.find(item => item.id === studentId);
  if (!student) return;

  const confirmed = window.confirm(`Excluir ${student.name}?\n\nIsso remove o aluno, os acessos e o login dele no Supabase Auth.`);
  if (!confirmed) return;

  try {
    setStatus("Excluindo aluno...");
    await callStudentFunction({ action: "delete", studentId });

    if (state.selectedStudentId === studentId) state.selectedStudentId = "";
    await loadRemoteState();
    render();
    setStatus("Aluno excluÃ­do.");
  } catch (error) {
    setStatus(error.message || "NÃ£o foi possÃ­vel excluir o aluno.", true);
  }
}

function renderAccess() {
  const student = state.students.find(item => item.id === state.selectedStudentId);
  const title = document.querySelector("#accessTitle");
  const grid = document.querySelector("#accessGrid");

  if (!student) {
    title.textContent = "Acessos do aluno";
    grid.innerHTML = '<p class="muted">Cadastre ou selecione um aluno para liberar cursos.</p>';
    return;
  }

  title.textContent = `Acessos de ${student.name}`;
  grid.innerHTML = state.courses.map(course => {
    const granted = state.access.find(item => item.studentId === student.id && item.courseId === course.id);
    return `
      <article class="access-card ${granted ? "is-granted" : ""}">
        <div>
          <strong>${escapeHtml(course.title)}</strong><br>
          <span>${escapeHtml(course.description)}</span><br>
          <span>${granted ? `Liberado até ${formatDate(granted.validUntil)}` : "Sem acesso"}</span>
        </div>
        <button class="${granted ? "secondary-button" : "primary-button"}" type="button" data-toggle-course="${course.id}">
          ${granted ? "Remover acesso" : "Liberar acesso"}
        </button>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-toggle-course]").forEach(button => {
    button.addEventListener("click", () => toggleAccess(student.id, button.dataset.toggleCourse));
  });
}

async function toggleAccess(studentId, courseId) {
  const existing = state.access.find(item => item.studentId === studentId && item.courseId === courseId);

  if (existing) {
    setStatus("Removendo acesso...");
    const { error } = await client.from("course_access").delete().eq("student_id", studentId).eq("course_id", courseId);
    if (error) {
      setStatus(adminErrorMessage(error), true);
      return;
    }
  } else {
    setStatus("Liberando acesso...");
    const { error } = await client.from("course_access").upsert({
      student_id: studentId,
      course_id: courseId,
      valid_until: nextYearDate(),
      source: "manual"
    }, { onConflict: "student_id,course_id" });

    if (error) {
      setStatus(adminErrorMessage(error), true);
      return;
    }
  }

  await loadRemoteState();
  render();
  setStatus(existing ? "Acesso removido." : "Curso liberado para o aluno.");
}

function savePrototypeMirror() {
  localStorage.setItem(adminStorageKey, JSON.stringify({
    selectedStudentId: state.selectedStudentId,
    students: state.students,
    courses: state.courses,
    access: state.access
  }));
}

function showLogin(message = "", isError = false) {
  adminShell.style.display = "none";
  loginScreen.classList.add("is-visible");
  setLoginStatus(message, isError);
}

function setLoginStatus(message = "", isError = false) {
  const status = document.querySelector("#adminLoginStatus");
  status.style.display = message ? "block" : "none";
  status.textContent = message;
  status.classList.toggle("is-error", Boolean(isError));
}

function setStatus(message = "", isError = false) {
  const status = document.querySelector("#adminStatus");
  status.style.display = message ? "block" : "none";
  status.textContent = message;
  status.classList.toggle("is-error", Boolean(isError));
}

function adminErrorMessage(error) {
  if (!error) return "Erro desconhecido.";
  if (/row-level security|permission denied|violates row-level security/i.test(error.message || "")) {
    return "Sem permissão no Supabase. Rode o reparo de políticas admin e confirme que seu usuário está em admin_users.";
  }
  return error.message || "Erro ao acessar o Supabase.";
}

function nextYearDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}

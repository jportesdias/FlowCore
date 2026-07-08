const adminStorageKey = "flowcore-student-admin-prototype";
const crmLeadsPath = "../crm/leads.json";

const defaultCourses = [
  {
    id: "medidores-vazao",
    title: "Medidores de Vazão com Ênfase em Manutenção e Operação",
    description: "Curso comprado pelo Celso no protótipo real."
  },
  {
    id: "provadores-compactos",
    title: "Provadores Compacto",
    description: "Operação, prova e interpretação com provadores compactos."
  },
  {
    id: "computadores-vazao",
    title: "Computadores de Vazão",
    description: "Configuração, operação e interpretação de computadores de vazão."
  },
  {
    id: "ia-dominio-tecnico",
    title: "IA para Domínio Técnico",
    description: "Uso prático de IA para estudo e documentação técnica."
  }
];

const defaultState = {
  selectedStudentId: "stu_celso_graciano",
  students: [
    {
      id: "stu_celso_graciano",
      name: "Celso Graciano de Almeida Junior",
      email: "celsoalmeidajunior@gmail.com"
    }
  ],
  courses: defaultCourses,
  access: [
    {
      studentId: "stu_celso_graciano",
      courseId: "medidores-vazao",
      validUntil: "2027-06-04",
      source: "manual"
    }
  ]
};

let state = loadState();
let crmLeads = [];

document.querySelector("#studentForm").addEventListener("submit", addStudent);
document.querySelector("#crmSearch")?.addEventListener("input", event => {
  renderCrmResults(event.currentTarget.value);
});
document.querySelector("#crmOpenButton")?.addEventListener("click", focusCrmImport);
loadCrmLeads();
render();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(adminStorageKey));
    if (saved?.students?.length) return saved;
  } catch (error) {
    localStorage.removeItem(adminStorageKey);
  }

  localStorage.setItem(adminStorageKey, JSON.stringify(defaultState));
  return structuredClone(defaultState);
}

function saveState() {
  localStorage.setItem(adminStorageKey, JSON.stringify(state));
}

function addStudent(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const email = String(data.email || "").trim().toLowerCase();
  const name = String(data.name || "").trim();
  upsertStudent({ name, email });

  form.reset();
  saveState();
  render();
}

function upsertStudent(data) {
  const email = String(data.email || "").trim().toLowerCase();
  const name = String(data.name || "").trim();
  const existing = state.students.find(student => student.email.toLowerCase() === email);

  if (existing) {
    existing.name = name || existing.name;
    existing.crm = data.crm || existing.crm;
    state.selectedStudentId = existing.id;
    return existing;
  } else {
    const student = {
      id: "stu_" + Date.now().toString(36),
      name,
      email,
      crm: data.crm || null
    };
    state.students.unshift(student);
    state.selectedStudentId = student.id;
    return student;
  }
}

function render() {
  renderStudents();
  renderAccess();
}

function renderStudents() {
  const list = document.querySelector("#studentList");
  list.innerHTML = state.students.map(student => `
    <article class="student-row ${student.id === state.selectedStudentId ? "is-active" : ""}">
      <div>
        <strong>${escapeHtml(student.name)}</strong><br>
        <span>${escapeHtml(student.email)}</span>
        ${student.crm?.leadId ? `<br><small>CRM: ${escapeHtml(student.crm.status || "contato")} · ${escapeHtml(student.crm.interest || "sem interesse informado")}</small>` : ""}
      </div>
      <button class="secondary-button" type="button" data-select-student="${student.id}">Selecionar</button>
    </article>
  `).join("");

  list.querySelectorAll("[data-select-student]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedStudentId = button.dataset.selectStudent;
      saveState();
      render();
    });
  });
}

async function loadCrmLeads() {
  const status = document.querySelector("#crmStatus");
  try {
    const response = await fetch(crmLeadsPath, { cache: "no-store" });
    if (!response.ok) throw new Error("CRM indisponivel.");

    crmLeads = await response.json();
    status.textContent = `${crmLeads.length} contato(s) carregado(s) do CRM.`;
    renderCrmResults("");
  } catch (error) {
    crmLeads = [];
    status.textContent = "Nao foi possivel carregar o CRM. Valide abrindo por servidor local ou pelo dominio.";
  }
}

function renderCrmResults(term) {
  const results = document.querySelector("#crmResults");
  const status = document.querySelector("#crmStatus");
  if (!results || !crmLeads.length) return;

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

function importCrmLead(leadId) {
  const lead = crmLeads.find(item => item.id === leadId);
  if (!lead) return;

  const form = document.querySelector("#studentForm");
  if (!lead.email) {
    form.elements.name.value = lead.name || "";
    form.elements.email.focus();
    document.querySelector("#crmStatus").textContent = "Contato sem e-mail. Complete o cadastro manualmente.";
    return;
  }

  upsertStudent({
    name: lead.name || lead.email,
    email: lead.email,
    crm: {
      leadId: lead.id,
      phone: lead.phone || lead.phoneRaw || "",
      interest: lead.interest || "",
      status: lead.status || lead.stage || "",
      priority: lead.priority || "",
      origin: lead.origin || ""
    }
  });
  saveState();
  render();
  document.querySelector("#crmStatus").textContent = `${lead.name || lead.email} foi criado/selecionado como aluno. Agora libere os cursos à direita.`;
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

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function renderAccess() {
  const student = state.students.find(item => item.id === state.selectedStudentId);
  const title = document.querySelector("#accessTitle");
  const grid = document.querySelector("#accessGrid");

  if (!student) {
    title.textContent = "Acessos do aluno";
    grid.innerHTML = '<p class="muted">Selecione um aluno para liberar cursos.</p>';
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

function toggleAccess(studentId, courseId) {
  const existingIndex = state.access.findIndex(item => item.studentId === studentId && item.courseId === courseId);

  if (existingIndex >= 0) {
    state.access.splice(existingIndex, 1);
  } else {
    state.access.push({
      studentId,
      courseId,
      validUntil: nextYearDate(),
      source: "manual"
    });
  }

  saveState();
  render();
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

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}

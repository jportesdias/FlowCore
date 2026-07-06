const adminStorageKey = "flowcore-student-admin-prototype";

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

document.querySelector("#studentForm").addEventListener("submit", addStudent);
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
  const existing = state.students.find(student => student.email.toLowerCase() === email);

  if (existing) {
    state.selectedStudentId = existing.id;
  } else {
    const student = {
      id: "stu_" + Date.now().toString(36),
      name,
      email
    };
    state.students.unshift(student);
    state.selectedStudentId = student.id;
  }

  form.reset();
  saveState();
  render();
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

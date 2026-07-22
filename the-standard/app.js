const app = document.querySelector("#app");
const sidebar = document.querySelector(".sidebar");
const logoutButton = document.querySelector("#logoutButton");
const client = window.supabase?.createClient(FLOWCORE_SUPABASE_URL, FLOWCORE_SUPABASE_ANON_KEY, {
  auth: { storageKey: "flowcore-student-session" }
});
const institutionalVideoSeenPrefix = "flowcore-institutional-video-seen";
const institutionalVideoUrl = "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=66c1df47-f33e-42bd-978d-b38c0e60b7eb";
const materialCompletionPrefix = "flowcore-material-completion";
let pendingOtpEmail = "";

let state = {
  isAuthenticated: false,
  aluno: null,
  cursos: [],
  debug: {
    authUserId: "",
    studentId: "",
    accessCount: 0,
    courseIds: []
  },
  biblioteca: MOCK.biblioteca,
  financeiro: { lancamentos: [] },
  catalogoCursos: MOCK.catalogoCursos,
  cart: {
    items: [],
    status: "",
    error: ""
  }
};

const materialLabels = {
  documento: "Documentos",
  video: "Vídeos",
  simulador: "Simuladores",
  certificado: "Certificados"
};

const supplementalMaterialsByCourse = {
  "provadores-compactos": [
    {
      id: "provadores-aula-4",
      tipo: "video",
      formato: "video",
      titulo: "Aula 4 - Simulador e Certificação",
      descricao: "Aplicação prática no simulador e orientações para a etapa de certificação do curso.",
      duracao: "Vídeo liberado",
      url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=d35c5c0e-6e66-42d0-a2f5-34cd9ac55d9a"
    },
    {
      id: "provadores-apostila-completa",
      tipo: "documento",
      formato: "pdf",
      titulo: "Apostila Completa do Curso",
      descricao: "Apostila completa para acompanhamento e revisão do curso de Provadores Compacto.",
      url: "https://drive.google.com/file/d/1izmaQo9z7dDgkzzz5ROxaBMB7_n4ZZO2/view?usp=drive_link"
    },
    {
      id: "provadores-exercicios-calculo",
      tipo: "documento",
      formato: "pdf",
      titulo: "Exercícios de Cálculo",
      descricao: "Lista de exercícios de cálculo para prática do curso de Provadores Compacto.",
      url: "https://drive.google.com/file/d/11t6bbrvsbaCLO1oElwBClw8sXBLXX8BX/view?usp=drive_link"
    }
  ]
};

async function boot() {
  if (!client) {
    renderLogin("Supabase nao carregou. Recarregue a pagina.", true);
    return;
  }

  const { data } = await client.auth.getSession();
  if (data.session) await openStudentSession();
  else renderLogin();

  window.addEventListener("hashchange", renderRoute);
  logoutButton.addEventListener("click", async () => {
    await client.auth.signOut();
    state.isAuthenticated = false;
    state.aluno = null;
    state.cursos = [];
    state.debug = { authUserId: "", studentId: "", accessCount: 0, courseIds: [] };
    state.financeiro = { lancamentos: [] };
    window.location.hash = "";
    renderLogin();
  });
}

function renderLogin(message = "", isError = false) {
  sidebar.classList.add("is-hidden");
  const template = document.querySelector("#loginTemplate");
  app.replaceChildren(template.content.cloneNode(true));
  setLoginStatus(message, isError);
  document.querySelector("#loginForm").addEventListener("submit", requestLoginCode);
  document.querySelector("#otpForm").addEventListener("submit", verifyLoginCode);
  bindOtpInputs();
  document.querySelector("#changeEmailButton").addEventListener("click", () => {
    pendingOtpEmail = "";
    renderLogin();
  });
}

async function requestLoginCode(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const email = String(data.email || "").trim().toLowerCase();
    setLoginStatus("Enviando codigo...");

    try {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false
        }
      });

      if (error) {
        console.error("Erro ao enviar codigo OTP:", error);
        setLoginStatus(getAuthErrorMessage(error, "Nao foi possivel enviar o codigo."), true);
        return;
      }
    } catch (error) {
      console.error("Falha inesperada ao enviar codigo OTP:", error);
      setLoginStatus(getAuthErrorMessage(error, "Erro de comunicacao ao enviar o codigo."), true);
      return;
    }

    pendingOtpEmail = email;
    document.querySelector("#loginForm").style.display = "none";
    document.querySelector("#otpForm").style.display = "grid";
    document.querySelector(".otp-box")?.focus();
    setLoginStatus("Codigo enviado. Verifique seu e-mail.");
}

function bindOtpInputs() {
    const boxes = [...document.querySelectorAll(".otp-box")];
    const hidden = document.querySelector("#otpToken");
    if (!hidden) return;

    const syncToken = () => {
      hidden.value = boxes.map(input => input.value).join("");
    };

    boxes.forEach((input, index) => {
      input.addEventListener("input", () => {
        const digits = input.value.replace(/\D/g, "");
        input.value = digits.slice(-1);
        syncToken();
        if (input.value && boxes[index + 1]) boxes[index + 1].focus();
      });

      input.addEventListener("keydown", event => {
        if (event.key === "Backspace" && !input.value && boxes[index - 1]) {
          boxes[index - 1].focus();
        }
      });

      input.addEventListener("paste", event => {
        event.preventDefault();
        const pasted = (event.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6);
        pasted.split("").forEach((digit, digitIndex) => {
          if (boxes[digitIndex]) boxes[digitIndex].value = digit;
        });
        syncToken();
        boxes[Math.min(pasted.length, boxes.length) - 1]?.focus();
      });
    });
}

async function verifyLoginCode(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const token = String(data.token || "").replace(/\D/g, "");

    if (!pendingOtpEmail) {
      setLoginStatus("Informe o e-mail novamente para receber um novo codigo.", true);
      return;
    }

    if (token.length !== 6) {
      setLoginStatus("Digite o codigo de 6 digitos.", true);
      return;
    }

    setLoginStatus("Validando codigo...");
    try {
      const { error } = await client.auth.verifyOtp({
        email: pendingOtpEmail,
        token,
        type: "email"
      });

      if (error) {
        console.error("Erro ao validar codigo OTP:", error);
        setLoginStatus(getAuthErrorMessage(error, "Codigo invalido ou expirado."), true);
        return;
      }
    } catch (error) {
      console.error("Falha inesperada ao validar codigo OTP:", error);
      setLoginStatus(getAuthErrorMessage(error, "Erro de comunicacao ao validar o codigo."), true);
      return;
    }

    await openStudentSession();
}

async function openStudentSession() {
  try {
    await loadStudentState();
    state.isAuthenticated = true;
    sidebar.classList.remove("is-hidden");
    window.location.hash = window.location.hash || "#dashboard";
    renderRoute();
    showInstitutionalVideoWelcomeOnce();
  } catch (error) {
    await client.auth.signOut();
    state.isAuthenticated = false;
    state.aluno = null;
    state.cursos = [];
    state.debug = { authUserId: "", studentId: "", accessCount: 0, courseIds: [] };
    state.financeiro = { lancamentos: [] };
    renderLogin(error.message || "Nao foi possivel carregar sua area do aluno.", true);
  }
}

async function loadStudentState() {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData?.user) throw new Error("Sessao expirada. Entre novamente.");

  const { data: student, error: studentError } = await client
    .from("students")
    .select("id,name,email,auth_user_id,subscription_start_date,subscription_active")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (studentError) throw new Error(studentError.message);
  if (!student) throw new Error("Este login ainda nao possui perfil de aluno.");

  const { data: accessRows, error: accessError } = await client
    .from("course_access")
    .select("course_id,valid_until,granted_at,source")
    .eq("student_id", student.id);

  if (accessError) throw new Error(accessError.message);

  const courseIds = [...new Set((accessRows || []).map(item => item.course_id).filter(Boolean))];

  state.debug = {
    authUserId: userData.user.id,
    studentId: student.id,
    accessCount: accessRows?.length || 0,
    courseIds
  };

  const [coursesResult, materialsResult, paymentsResult] = await Promise.all([
    courseIds.length
      ? client.from("courses").select("id,title,description,cover_path,status").in("id", courseIds)
      : Promise.resolve({ data: [], error: null }),
    courseIds.length
      ? client.from("materials").select("id,course_id,type,title,description,format,duration,sort_order,public_url").in("course_id", courseIds).order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    client.from("payments").select("id,course_id,description,amount,status,paid_at,valid_from,valid_until,validation,receipt_url").eq("student_id", student.id)
  ]);

  const firstError = paymentsResult.error;
  if (firstError) throw new Error(firstError.message);

  const accessByCourse = new Map((accessRows || []).map(item => [item.course_id, item]));
  const materialsByCourse = groupRowsBy((materialsResult.error ? [] : materialsResult.data || []), "course_id");
  const remoteCourses = new Map((coursesResult.data || []).map(course => [course.id, course]));
  const fallbackCourses = new Map(MOCK.cursos.map(course => [course.id, course]));
  const catalogCourses = new Map(MOCK.catalogoCursos.map(course => [course.id, course]));

  state.aluno = {
    id: student.id,
    nome: student.name,
    email: student.email,
    subscriptionStartDate: student.subscription_start_date || "",
    subscriptionActive: Boolean(student.subscription_active)
  };

  state.cursos = courseIds.map(courseId => {
    const course = remoteCourses.get(courseId);
    const fallbackCourse = fallbackCourses.get(courseId);
    const catalogCourse = catalogCourses.get(courseId);
    const access = accessByCourse.get(courseId);
    const remoteMaterials = (materialsByCourse.get(courseId) || []).map(mapRemoteMaterial);
    const baseMaterials = remoteMaterials.length ? remoteMaterials : fallbackCourse?.materiais || [];

    return {
      id: courseId,
      titulo: course?.title || fallbackCourse?.titulo || catalogCourse?.titulo || courseId,
      capa: course?.cover_path || fallbackCourse?.capa || catalogCourse?.capa || "assets/spoiler-breve.png",
      descricao: course?.description || fallbackCourse?.descricao || catalogCourse?.descricao || "Curso liberado manualmente.",
      liberado_em: (access?.granted_at || "").slice(0, 10),
      validade_ate: access?.valid_until || "",
      materiais: mergeCourseMaterials(courseId, baseMaterials)
        .filter(material => material.tipo !== "certificado")
    };
  });
  updateCourseProgress();

  state.financeiro = {
    lancamentos: (paymentsResult.data || []).map(payment => ({
      id: payment.id,
      curso_id: payment.course_id,
      descricao: payment.description,
      valor: Number(payment.amount || 0),
      status: payment.status,
      pago_em: payment.paid_at,
      validade_inicio: payment.valid_from,
      validade_ate: payment.valid_until,
      validacao: payment.validation,
      comprovante_url: payment.receipt_url || "#"
    }))
  };

  await loadCommerceCatalog();
}

async function loadCommerceCatalog() {
  const fallbackCatalog = MOCK.catalogoCursos.map(course => ({
    ...course,
    priceId: course.priceId || course.id,
    offerId: course.offerId || course.id,
    accessDays: course.accessDays || 365,
    checkoutEnabled: course.valor !== null
  }));

  state.catalogoCursos = fallbackCatalog;

  try {
    const { data, error } = await client
      .from("commerce_offers")
      .select("id, product_id, course_id, title, description, cover_path, amount, currency, access_days, status, sort_order")
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    if (error || !data?.length) return;

    state.catalogoCursos = data.map(offer => {
      const fallback = fallbackCatalog.find(course => course.id === offer.course_id) || {};
      return {
        id: offer.course_id || offer.product_id || offer.id,
        offerId: offer.id,
        priceId: offer.id,
        titulo: offer.title || fallback.titulo || offer.id,
        capa: offer.cover_path || fallback.capa || "assets/spoiler-breve.png",
        descricao: offer.description || fallback.descricao || "",
        valor: Number(offer.amount || 0),
        currency: offer.currency || "BRL",
        accessDays: Number(offer.access_days || 365),
        status: "Disponivel",
        cta: "Adicionar",
        url: "#",
        checkoutEnabled: true
      };
    });
  } catch (error) {
    console.warn("Catalogo comercial indisponivel; usando fallback local.", error);
  }
}

function mapRemoteMaterial(item) {
  return {
    id: item.id,
    tipo: item.type,
    formato: item.format || item.type,
    titulo: item.title,
    descricao: item.description,
    duracao: item.duration,
    url: item.public_url || "#",
    emitido: item.type === "certificado" && Boolean(item.public_url)
  };
}

function mergeCourseMaterials(courseId, materials) {
  const merged = [...(materials || [])];
  const existingIds = new Set(merged.map(material => material.id));
  (supplementalMaterialsByCourse[courseId] || []).forEach(material => {
    if (!existingIds.has(material.id)) merged.push(material);
  });
  return merged;
}

function groupRowsBy(rows, key) {
  return rows.reduce((groups, row) => {
    const value = row[key];
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row);
    return groups;
  }, new Map());
}

function setLoginStatus(message = "", isError = false) {
  const status = document.querySelector("#loginStatus");
  if (!status) return;
  status.style.display = message ? "block" : "none";
  status.textContent = message;
  status.classList.toggle("is-error", Boolean(isError));
}

function getAuthErrorMessage(error, fallback) {
  const raw = [
    error?.message,
    error?.error_description,
    error?.error,
    error?.name,
    typeof error === "string" ? error : ""
  ].filter(Boolean).join(" ").trim();

  const message = raw && raw !== "{}" ? raw : fallback;

  if (/rate limit|too many|email rate/i.test(message)) {
    return "Limite de envio de e-mail atingido. Aguarde alguns minutos ou confirme o SMTP proprio no Supabase.";
  }

  if (/AuthRetryableFetchError|retryable|fetch/i.test(message)) {
    return "Falha ao enviar o e-mail pelo Supabase Auth. Confira SMTP Host, porta, usuario, senha e remetente no Supabase.";
  }

  if (/smtp|email provider|mail|send/i.test(message)) {
    return "Nao foi possivel enviar o e-mail. Confira host, porta, usuario, senha e remetente do SMTP no Supabase.";
  }

  if (/signup|not allowed|user not found|invalid login/i.test(message)) {
    return "Este e-mail ainda nao esta cadastrado como aluno.";
  }

  return message || fallback;
}

function renderRoute() {
  if (!state.isAuthenticated) {
    renderLogin();
    return;
  }

  const hash = window.location.hash.replace("#", "") || "dashboard";
  const [view, id] = hash.split("/");
  updateActiveNav(view);

  if (view === "curso" && id) renderCourse(id);
  else if (view === "biblioteca") renderLibrary();
  else if (view === "video-institucional") renderInstitutionalVideoCleanPage();
  else if (view === "especialista") renderUnderConstruction("FlowCore Specialist");
  else if (view === "flowcore-tools") renderFlowCoreTools(id);
  else if (view === "financeiro") renderUnderConstruction("Financeiro");
  else if (view === "comprar") renderStore();
  else if (view === "perfil") renderProfile();
  else if (view === "creditos") renderCredits();
  else if (view === "vazio") renderEmptyState();
  else renderDashboard();

}

function updateActiveNav(view) {
  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.toggle("is-active", link.dataset.nav === view);
  });
}

function renderUnderConstruction(sectionName) {
  app.innerHTML = `
    <section class="empty-state">
      <p class="eyebrow">${escapeHtml(sectionName)}</p>
      <h1>Em construção</h1>
      <p>Estamos preparando esta área. Em breve, novas funcionalidades estarão disponíveis por aqui.</p>
    </section>
  `;
}

function renderDashboard() {
  const cursos = getAccessibleCourses();
  const completedCount = cursos.filter(curso => Number(curso.progresso || 0) >= 100).length;
  const nextCourse = cursos.find(curso => Number(curso.progresso || 0) < 100) || cursos[0];
  app.innerHTML = `
    <section class="academy-cockpit">
      <div>
        <p class="eyebrow">Portal FlowCore Academy</p>
        <h1>COCKPIT DO ALUNO</h1>
        <div class="student-identity">
          <span>Aluno conectado</span>
          <strong>${escapeHtml(state.aluno.nome)}</strong>
          <p>Este é o seu espaço de formação técnica na FlowCore Academy. Acompanhe suas trilhas, aulas, certificados e evolução em um painel único de formação operacional.</p>
        </div>
        <div class="cockpit-actions">
          ${nextCourse ? `<a class="primary-button" href="#curso/${nextCourse.id}">Continuar trilha</a>` : ""}
          <a class="secondary-button" href="#biblioteca">Abrir acervo técnico</a>
        </div>
      </div>
      <div class="cockpit-status-panel" aria-label="Resumo técnico do aluno">
        <div class="ihm-panel-top">
          <span>Student IHM</span>
          <b>${cursos.length ? "ONLINE" : "STANDBY"}</b>
        </div>
        <strong>${cursos.length ? "Acesso operacional" : "Aguardando liberação"}</strong>
        <div class="ihm-status-grid" aria-label="Indicadores rápidos">
          <div><span>Trilhas</span><b>${String(cursos.length).padStart(2, "0")}</b></div>
          <div><span>Cert.</span><b>${String(completedCount).padStart(2, "0")}</b></div>
        </div>
        <div class="ihm-signal" aria-label="Progresso da próxima trilha">
          <span>Progress bus</span>
          <i style="width: ${nextCourse ? nextCourse.progresso : 0}%"></i>
        </div>
        <p>${cursos.length} trilha(s) liberada(s) · ${completedCount} concluída(s)</p>
      </div>
    </section>

    <section class="cockpit-metrics" aria-label="Indicadores da formação">
      <article><span>Trilhas liberadas</span><strong>${cursos.length}</strong><p>Conteúdo com acesso ativo</p></article>
      <article><span>Certificação</span><strong>${completedCount}</strong><p>Trilhas com progresso completo</p></article>
      <article><span>Próxima ação</span><strong>${nextCourse ? `${nextCourse.progresso}%` : "0%"}</strong><p>${nextCourse ? escapeHtml(nextCourse.titulo) : "Sem trilha ativa"}</p></article>
    </section>

    <section class="section-heading premium-heading">
      <div>
        <p class="eyebrow">Trilhas técnicas</p>
        <h2>Área de operação do aluno</h2>
      </div>
      <span>FlowCore Academy · Fase 1</span>
    </section>
    ${cursos.length ? renderCourseGrid(cursos) : renderEmptyContent()}
  `;
}

function renderInstitutionalVideoPage() {
  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">FlowCore Academy</p>
      <h1>VÃ­deo institucional</h1>
      <p>Assista novamente quando quiser para revisar a apresentaÃ§Ã£o da FlowCore Academy.</p>
    </section>
    ${renderInstitutionalVideoBlock()}
  `;
}

function renderInstitutionalVideoBlock() {
  return `
    <section class="institutional-video" aria-label="Vídeo institucional FlowCore Academy">
      <div class="institutional-video-header">
        <span class="type-chip">FlowCore Academy</span>
        <h2>Vídeo institucional</h2>
      </div>
      <div class="institutional-video-frame">
        <iframe src="${institutionalVideoUrl}" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture" allowfullscreen fetchpriority="high"></iframe>
      </div>
    </section>
  `;
}

function showInstitutionalVideoOnce() {
  if (!state.aluno?.id) return;
  const storageKey = `${institutionalVideoSeenPrefix}:${state.aluno.id}`;
  if (localStorage.getItem(storageKey)) return;
  localStorage.setItem(storageKey, new Date().toISOString());

  const modal = document.createElement("div");
  modal.className = "video-modal-backdrop";
  modal.innerHTML = `
    <section class="video-modal" role="dialog" aria-modal="true" aria-labelledby="institutionalVideoTitle">
      <div class="video-modal-header">
        <div>
          <span class="type-chip">Boas-vindas</span>
          <h2 id="institutionalVideoTitle">VÃ­deo institucional</h2>
        </div>
        <button class="video-modal-close" type="button" aria-label="Fechar vÃ­deo institucional">Fechar</button>
      </div>
      <div class="institutional-video-frame">
        <iframe src="${institutionalVideoUrl}" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture" allowfullscreen fetchpriority="high"></iframe>
      </div>
    </section>
  `;

  const closeModal = () => modal.remove();
  modal.querySelector(".video-modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", function closeOnEscape(event) {
    if (event.key !== "Escape") return;
    closeModal();
    document.removeEventListener("keydown", closeOnEscape);
  });
  document.body.appendChild(modal);
}

function renderCourseGrid(cursos) {
  return `
    <section class="course-grid" aria-label="Cursos liberados">
      ${cursos.map(curso => `
        <article class="course-card track-card">
          <img src="${curso.capa}" alt="" />
          <div class="course-card-body">
            <span class="status-pill">Trilha liberada</span>
            <h2>${curso.titulo}</h2>
            <p>${curso.descricao}</p>
            <div class="progress-row">
              <span>Progresso</span>
              <strong>${curso.progresso}%</strong>
            </div>
            <div class="progress-bar" aria-label="Progresso de ${curso.progresso}%">
              <span style="width: ${curso.progresso}%"></span>
            </div>
            <a class="primary-button" href="#curso/${curso.id}">Acessar</a>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

function renderCourse(id) {
  const curso = getAccessibleCourses().find(item => item.id === id);
  if (!curso) {
    renderEmptyState();
    return;
  }

  const groups = groupByType(curso.materiais);
  const videos = groups.video || [];
  app.innerHTML = `
    <section class="course-hero">
      <div>
        <a class="text-link" href="#dashboard">Voltar para meus cursos</a>
        <p class="eyebrow">Trilha técnica</p>
        <h1>${curso.titulo}</h1>
        <p>${curso.descricao}</p>
      </div>
      <img src="${curso.capa}" alt="" />
    </section>
    ${renderCourseVideoStation(curso, videos)}
    ${renderCourseMaterials(groups)}
  `;
  bindVideoButtons(curso);
  bindCoursePlaylist(curso);
  bindCompletionControls();
}

function renderCourseMaterials(groups) {
  const content = Object.keys(materialLabels)
    .filter(type => type !== "video")
    .map(type => renderMaterialGroup(type, groups[type] || []))
    .join("");

  if (!content.trim()) return "";

  return `
    <section class="course-materials" id="materiais-do-curso">
      <div class="section-heading compact-heading">
        <div>
          <p class="eyebrow">Acesso aos materiais</p>
          <h2>Materiais do curso</h2>
        </div>
      </div>
      <div class="materials-stack">
        ${content}
      </div>
    </section>
  `;
}

function renderMaterialGroup(type, items) {
  if (!items.length) return "";

  return `
    <section class="material-group">
      <h2>${materialLabels[type]}</h2>
      <div class="material-list">
        ${items.map(renderMaterialItem).join("")}
      </div>
    </section>
  `;
}

function renderCourseVideoFrame(video) {
  return `<iframe src="${escapeAttribute(video.url)}" title="${escapeAttribute(video.titulo)}" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture" allowfullscreen fetchpriority="high"></iframe>`;
}

function renderCourseVideoStation(curso, videos) {
  if (!videos.length) {
    return `
      <section class="video-station">
        <div class="video-placeholder">
          <span>Estação de aulas</span>
          <strong>Vídeos em preparação</strong>
          <small>As aulas desta trilha aparecerão aqui quando forem liberadas.</small>
        </div>
      </section>
    `;
  }

  const activeVideo = videos.find(video => video.url && video.url !== "#") || videos[0];
  return `
    <section class="video-station" aria-label="Aulas da trilha ${escapeAttribute(curso.titulo)}">
      <div class="video-main">
        <div class="video-main-frame" id="courseVideoFrame">
          ${activeVideo?.url && activeVideo.url !== "#" ? renderCourseVideoFrame(activeVideo) : `
            <div class="video-placeholder compact">
              <span>Player</span>
              <strong>Fonte do vídeo pendente</strong>
              <small>O backend definirá a URL segura do vídeo.</small>
            </div>
          `}
        </div>
        <div class="video-main-copy">
          <span class="type-chip">Aula em destaque</span>
          <h2 id="courseVideoTitle">${escapeHtml(activeVideo.titulo)}</h2>
          <p id="courseVideoDescription">${escapeHtml(activeVideo.descricao || activeVideo.duracao || "Selecione uma aula na playlist para continuar.")}</p>
          <div id="courseVideoCompletion">${renderMaterialCompletionControl(activeVideo)}</div>
        </div>
      </div>
      <aside class="video-playlist" aria-label="Playlist de aulas">
        <div class="video-playlist-head">
          <span>Playlist</span>
          <strong>${videos.length} aula(s)</strong>
        </div>
        <div class="video-playlist-list">
          ${videos.map((video, index) => renderVideoPlaylistItem(video, curso, index, video.id === activeVideo.id)).join("")}
        </div>
      </aside>
    </section>
  `;
}

function renderVideoPlaylistItem(video, curso, index, isActive) {
  const checked = isMaterialCompleted(video.id);
  return `
    <button class="video-thumb ${isActive ? "is-active" : ""}" type="button" data-playlist-video="${escapeAttribute(video.id)}">
      <span class="video-thumb-image">
        <img src="${escapeAttribute(curso.capa)}" alt="">
        <b>${String(index + 1).padStart(2, "0")}</b>
      </span>
      <span class="video-thumb-copy">
        <strong>${escapeHtml(video.titulo)}</strong>
        <small>${escapeHtml(video.duracao || video.formato || "Aula técnica")}</small>
        <em data-playlist-status="${escapeAttribute(video.id)}">${checked ? "Concluído" : "Pendente"}</em>
      </span>
    </button>
  `;
}

function bindCoursePlaylist(curso) {
  document.querySelectorAll("[data-playlist-video]").forEach(button => {
    button.addEventListener("click", () => {
      const video = (curso.materiais || []).find(item => item.id === button.dataset.playlistVideo);
      if (!video) return;

      document.querySelectorAll("[data-playlist-video]").forEach(item => {
        item.classList.toggle("is-active", item === button);
      });

      const frame = document.querySelector("#courseVideoFrame");
      const title = document.querySelector("#courseVideoTitle");
      const description = document.querySelector("#courseVideoDescription");
      const completion = document.querySelector("#courseVideoCompletion");
      if (frame) {
        frame.innerHTML = video.url && video.url !== "#"
          ? renderCourseVideoFrame(video)
          : `<div class="video-placeholder compact"><span>Player</span><strong>Fonte do vídeo pendente</strong><small>O backend definirá a URL segura do vídeo.</small></div>`;
      }
      if (title) title.textContent = video.titulo;
      if (description) description.textContent = video.descricao || video.duracao || "Aula técnica da trilha.";
      if (completion) {
        completion.innerHTML = renderMaterialCompletionControl(video);
        bindCompletionControls();
      }
    });
  });
}

function bindVideoButtons(curso) {
  document.querySelectorAll("[data-video-material]").forEach(button => {
    button.addEventListener("click", () => {
      const video = (curso.materiais || []).find(item => item.id === button.dataset.videoMaterial);
      if (!video?.url || video.url === "#") {
        showVideoNotice();
        return;
      }

      openCourseVideoModal(video);
    });
  });
}

function openCourseVideoModal(video) {
  const modal = document.createElement("div");
  modal.className = "video-modal-backdrop";
  modal.innerHTML = `
    <section class="video-modal" role="dialog" aria-modal="true" aria-labelledby="courseVideoTitle">
      <div class="video-modal-header">
        <div>
          <span class="type-chip">Aula</span>
          <h2 id="courseVideoTitle">${escapeHtml(video.titulo)}</h2>
        </div>
        <button class="video-modal-close" type="button" aria-label="Fechar aula">Fechar</button>
      </div>
      <div class="course-video-modal-frame">
        ${renderCourseVideoFrame(video)}
      </div>
    </section>
  `;

  const closeModal = () => modal.remove();
  modal.querySelector(".video-modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", function closeOnEscape(event) {
    if (event.key !== "Escape") return;
    closeModal();
    document.removeEventListener("keydown", closeOnEscape);
  });
  document.body.appendChild(modal);
}

function renderMaterialItem(item) {
  const meta = [item.formato, item.duracao].filter(Boolean).join(" · ");
  const completionControl = renderMaterialCompletionControl(item);
  const doneClass = isMaterialCompleted(item.id) ? " is-completed" : "";

  if (item.tipo === "video") {
    return `
      <article class="material-item${doneClass}" data-material-card="${escapeAttribute(item.id)}">
        <div>
          <span class="type-chip">Vídeo</span>
          <h3>${item.titulo}</h3>
          <p>${escapeHtml(item.descricao || meta)}</p>
        </div>
        <div class="material-actions">
          <button class="secondary-button" type="button" data-video-material="${escapeAttribute(item.id)}">Assistir</button>
          ${completionControl}
        </div>
      </article>
    `;
  }

  if (item.tipo === "simulador") {
    return `
      <article class="material-item${doneClass}" data-material-card="${escapeAttribute(item.id)}">
        <div>
          <span class="type-chip">Simulador</span>
          <h3>${item.titulo}</h3>
          <p>Aplicação web externa</p>
        </div>
        <div class="material-actions">
          <a class="secondary-button" href="${item.url}" target="_blank" rel="noopener noreferrer">Abrir</a>
          ${completionControl}
        </div>
      </article>
    `;
  }

  if (item.tipo === "certificado") {
    const disabled = item.emitido ? "" : "is-disabled";
    const label = item.emitido ? "Baixar" : "Não emitido";
    return `
      <article class="material-item${doneClass}" data-material-card="${escapeAttribute(item.id)}">
        <div>
          <span class="type-chip">Certificado</span>
          <h3>${item.titulo}</h3>
          <p>${item.emitido ? "Certificado disponível" : "Será liberado após a conclusão"}</p>
        </div>
        <div class="material-actions">
          <a class="secondary-button ${disabled}" href="${item.url}" ${item.emitido ? 'target="_blank" rel="noopener noreferrer"' : 'aria-disabled="true"'}>${label}</a>
          ${completionControl}
        </div>
      </article>
    `;
  }

  const downloadUrl = getMaterialDownloadUrl(item.url);

  return `
    <article class="material-item${doneClass}" data-material-card="${escapeAttribute(item.id)}">
      <div>
        <span class="type-chip">${item.formato.toUpperCase()}</span>
        <h3>${item.titulo}</h3>
        <p>Material de apoio</p>
      </div>
      <div class="material-actions">
        <a class="secondary-button" href="${item.url}" target="_blank" rel="noopener noreferrer">Visualizar</a>
        <a class="ghost-button inline" href="${downloadUrl}" target="_blank" rel="noopener noreferrer" download>Baixar</a>
        ${completionControl}
      </div>
    </article>
  `;
}

function getMaterialDownloadUrl(url) {
  const value = String(url || "");
  const driveMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (driveMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  return value;
}

function renderMaterialCompletionControl(item) {
  const checked = isMaterialCompleted(item.id);
  return `
    <label class="completion-check ${checked ? "is-checked" : ""}">
      <input type="checkbox" data-completion-material="${escapeAttribute(item.id)}" ${checked ? "checked" : ""}>
      <span>${checked ? "Concluído" : "Marcar como concluído"}</span>
    </label>
  `;
}

function bindCompletionControls() {
  document.querySelectorAll("[data-completion-material]").forEach(input => {
    if (input.dataset.completionBound === "true") return;
    input.dataset.completionBound = "true";
    input.addEventListener("change", event => {
      const materialId = event.currentTarget.dataset.completionMaterial;
      const completed = event.currentTarget.checked;
      setMaterialCompleted(materialId, completed);
      updateCourseProgress();
      updateCompletionUI(materialId, completed);
    });
  });
}

function updateCompletionUI(materialId, completed) {
  document.querySelectorAll(`[data-completion-material="${cssEscape(materialId)}"]`).forEach(input => {
    input.checked = completed;
    const label = input.closest(".completion-check");
    if (label) {
      label.classList.toggle("is-checked", completed);
      const text = label.querySelector("span");
      if (text) text.textContent = completed ? "Concluído" : "Marcar como concluído";
    }
  });

  document.querySelectorAll(`[data-material-card="${cssEscape(materialId)}"]`).forEach(card => {
    card.classList.toggle("is-completed", completed);
  });

  document.querySelectorAll(`[data-playlist-status="${cssEscape(materialId)}"]`).forEach(status => {
    status.textContent = completed ? "Concluído" : "Pendente";
  });
}

function renderProfile() {
  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">Perfil</p>
      <h1>${state.aluno.nome}</h1>
      <p>${state.aluno.email}</p>
    </section>
    <section class="profile-grid">
      <article class="info-panel">
        <h2>Dados do aluno</h2>
        <dl>
          <div><dt>ID</dt><dd>${state.aluno.id}</dd></div>
          <div><dt>E-mail</dt><dd>${state.aluno.email}</dd></div>
          <div><dt>Cursos liberados</dt><dd>${state.cursos.length}</dd></div>
        </dl>
      </article>
    </section>
  `;
}

function renderCredits() {
  const summary = getCreditSummary();

  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">Perfil</p>
      <h1>Meus Créditos</h1>
      <p>Acompanhe sua assinatura, créditos conquistados e nível de evolução dentro da FlowCore Academy.</p>
    </section>

    <section class="credits-grid">
      <article class="credit-card">
        <span>Início da assinatura</span>
        <strong>${summary.startLabel}</strong>
        <p>${summary.active ? "Assinatura ativa" : "Assinatura sem vigência ativa"}</p>
      </article>

      <article class="credit-card highlight">
        <span>Créditos conquistados</span>
        <strong>${summary.credits}</strong>
        <p>1 crédito a cada 4 meses com assinatura ativa.</p>
      </article>

      <article class="credit-card">
        <span>Nível do aluno na FlowCore</span>
        <strong>${summary.level}</strong>
        <p>${summary.completedTrainings} treinamentos concluídos.</p>
      </article>
    </section>

    <section class="level-panel">
      <h2>Critério de nível</h2>
      <div class="level-steps">
        ${renderLevelStep("Bronze", "3 treinamentos feitos", summary.level === "Bronze")}
        ${renderLevelStep("Prata", "5 treinamentos feitos", summary.level === "Prata")}
        ${renderLevelStep("Ouro", "Mais de 5 treinamentos feitos", summary.level === "Ouro")}
      </div>
      <p>Os créditos continuam sendo acumulados automaticamente a cada ciclo de 4 meses enquanto a assinatura estiver ativa.</p>
    </section>
  `;
}

function renderLevelStep(level, rule, isActive) {
  return `
    <article class="level-step ${isActive ? "is-active" : ""}">
      <strong>${level}</strong>
      <span>${rule}</span>
    </article>
  `;
}

function renderFlowCoreTools(toolId = "meter-calibration-calculator") {
  const activeTool = toolId || "meter-calibration-calculator";

  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">The Standard / FlowCore Tools</p>
      <h1>FlowCore Tools</h1>
      <p>Practical industrial tools for measurement professionals. The first module is a smart calculator for pulsed output flow meter calibration.</p>
    </section>

    <section class="tools-shell">
      <aside class="tools-menu" aria-label="FlowCore Tools menu">
        <span class="type-chip">Available tool</span>
        <a class="${activeTool === "meter-calibration-calculator" ? "is-active" : ""}" href="#flowcore-tools/meter-calibration-calculator">
          <strong>Meter Calibration Calculator</strong>
          <small>Pulsed output flow meters</small>
        </a>
      </aside>

      <article class="tool-workspace">
        ${renderMeterCalibrationCalculator()}
      </article>
    </section>
  `;

  bindMeterCalibrationCalculator();
}

function renderMeterCalibrationCalculator() {
  return `
    <div class="tool-header">
      <div>
        <p class="eyebrow">Pulsed Output Flow Meters</p>
        <h2>Meter Calibration Calculator</h2>
        <p>Intelligent calculator for pulsed output flow meter calibration. Enter the known values and the tool detects every available calculation.</p>
      </div>
      <button class="secondary-button" type="button" data-load-calibration-demo>Load demo data</button>
    </div>

    <section class="solve-for-panel">
      <div class="solve-for-header">
        <div>
          <p class="eyebrow">Solve For Mode</p>
          <h2>What do you want to calculate?</h2>
          <p>Select the target variable first. The tool will show only the required inputs for that calculation.</p>
        </div>
        <label class="solve-target">
          I want to calculate
          <select id="solveForTarget" name="solveForTarget">
            ${getSolveForDefinitions().map(definition => `<option value="${definition.id}">${definition.label}</option>`).join("")}
          </select>
        </label>
      </div>

      <form id="solveForForm" class="solve-form">
        <div id="solveForFields" class="solve-fields"></div>
        <div id="solveForFormula" class="solve-formula"></div>
        <div class="tool-actions">
          <button class="primary-button" type="submit">Calculate selected target</button>
        </div>
      </form>

      <div id="solveForResult" class="solve-result" aria-live="polite"></div>
    </section>

    <section class="intelligent-calculator-panel">
      <div>
        <p class="eyebrow">Intelligent Calculator</p>
        <h2>Detect all possible calculations</h2>
        <p>Use this mode when you want the engine to inspect every known value and return every valid calculation available.</p>
      </div>
    </section>

    <form id="meterCalibrationForm" class="calculation-form">
      <fieldset>
        <legend>Core inputs</legend>
        <label>Pulse count N
          <input type="number" step="any" name="pulseCount" placeholder="12000" />
          <small>pulses</small>
        </label>
        <label>Time t
          <input type="number" step="any" name="timeSeconds" placeholder="60" />
          <small>s</small>
        </label>
        <label>Frequency f
          <input type="number" step="any" name="frequencyHz" placeholder="200" />
          <small>Hz</small>
        </label>
        <label>Flow rate Q
          <input type="number" step="any" name="flowM3h" placeholder="720" />
          <small>m3/h</small>
        </label>
        <label>K-factor K
          <input type="number" step="any" name="kPulsesM3" placeholder="1000" />
          <small>pulses/m3</small>
        </label>
        <label>Reference volume V_ref
          <input type="number" step="any" name="referenceVolumeM3" placeholder="12" />
          <small>m3</small>
        </label>
        <label>Indicated volume V_ind
          <input type="number" step="any" name="indicatedVolumeM3" placeholder="12.02" />
          <small>m3</small>
        </label>
        <label>Current K-factor
          <input type="number" step="any" name="currentKFactor" placeholder="1000" />
          <small>pulses/m3</small>
        </label>
      </fieldset>

      <fieldset>
        <legend>Validation inputs</legend>
        <label>Repeatability max value
          <input type="number" step="any" name="repeatabilityMax" placeholder="1.0002" />
        </label>
        <label>Repeatability min value
          <input type="number" step="any" name="repeatabilityMin" placeholder="0.9999" />
        </label>
        <label>Repeatability average
          <input type="number" step="any" name="repeatabilityAverage" placeholder="1.0000" />
        </label>
        <label>Repeatability criterion
          <input type="number" step="any" name="repeatabilityCriterion" placeholder="0.02" value="0.02" />
          <small>%</small>
        </label>
        <label>Nominal calibration point
          <input type="number" step="any" name="nominalFlowM3h" placeholder="900" />
          <small>m3/h</small>
        </label>
        <label>Actual reference flow
          <input type="number" step="any" name="actualFlowM3h" placeholder="915" />
          <small>m3/h</small>
        </label>
      </fieldset>

      <div class="tool-actions">
        <button class="primary-button" type="submit">Calculate</button>
        <button class="secondary-button" type="reset">Clear</button>
      </div>
    </form>

    <section class="calculation-output" aria-live="polite">
      <div class="calculation-summary">
        <strong>Detected calculations</strong>
        <span id="calculationCount">0 results</span>
      </div>
      <div id="calculationResults" class="result-grid">
        <article class="empty-state compact">
          <h2>Enter known values to start</h2>
          <p>The calculator will show formulas, substitutions, results, interpretation and validation status for every possible calculation.</p>
        </article>
      </div>
    </section>

    <section class="certificate-draft">
      <div>
        <p class="eyebrow">FlowCore Model Calibration Certificate</p>
        <h2>Certificate draft</h2>
        <p>Use Add to certificate to stage calculation results for a future PDF certificate workflow.</p>
      </div>
      <ul id="certificateDraftList">
        <li>No calculation added yet.</li>
      </ul>
    </section>
  `;
}

function bindMeterCalibrationCalculator() {
  const form = document.querySelector("#meterCalibrationForm");
  const results = document.querySelector("#calculationResults");
  const counter = document.querySelector("#calculationCount");
  const certificateDraft = [];

  bindSolveForMode(certificateDraft);

  const renderResults = () => {
    const inputs = readCalibrationInputs(form);
    const calculations = calculateMeterCalibration(inputs);

    if (counter) counter.textContent = `${calculations.length} result${calculations.length === 1 ? "" : "s"}`;

    if (!calculations.length) {
      results.innerHTML = `
        <article class="empty-state compact">
          <h2>No calculation available</h2>
          <p>Fill at least one valid formula combination. The tool does not mix units without explicit conversion.</p>
        </article>
      `;
      return;
    }

    results.innerHTML = calculations.map(renderCalculationResult).join("");
    bindCalculationResultActions(calculations, certificateDraft);
  };

  form.addEventListener("submit", event => {
    event.preventDefault();
    renderResults();
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      if (counter) counter.textContent = "0 results";
      results.innerHTML = `
        <article class="empty-state compact">
          <h2>Enter known values to start</h2>
          <p>The calculator will show formulas, substitutions, results, interpretation and validation status for every possible calculation.</p>
        </article>
      `;
      renderCertificateDraft(certificateDraft);
    }, 0);
  });

  document.querySelector("[data-load-calibration-demo]")?.addEventListener("click", () => {
    const demo = {
      pulseCount: 12000,
      timeSeconds: 60,
      frequencyHz: 200,
      flowM3h: 720,
      kPulsesM3: 1000,
      referenceVolumeM3: 12,
      indicatedVolumeM3: 12.02,
      currentKFactor: 1000,
      repeatabilityMax: 1.0002,
      repeatabilityMin: 0.9999,
      repeatabilityAverage: 1,
      repeatabilityCriterion: 0.02,
      nominalFlowM3h: 720,
      actualFlowM3h: 718
    };

    Object.entries(demo).forEach(([name, value]) => {
      const input = form.elements[name];
      if (input) input.value = value;
    });

    renderResults();
  });
}

function getSolveForDefinitions() {
  return [
    {
      id: "frequency",
      label: "Frequency",
      fields: [
        numberField("pulseCount", "Pulse count", "N", "pulses"),
        numberField("timeSeconds", "Time", "t", "seconds")
      ],
      formula: "f = N / t",
      errorMessage: "Enter pulse count and time to calculate frequency."
    },
    {
      id: "flow-rate",
      label: "Flow Rate",
      fields: [
        numberField("frequencyHz", "Frequency", "f", "Hz"),
        numberField("kPulsesM3", "K-factor", "K", "pulses/m3")
      ],
      formula: "Q_m3h = (3600 * f) / K",
      errorMessage: "Enter frequency and K-factor to calculate flow rate."
    },
    {
      id: "expected-frequency",
      label: "Expected Frequency",
      fields: [
        numberField("flowM3h", "Flow rate", "Q", "m3/h"),
        numberField("kPulsesM3", "K-factor", "K", "pulses/m3")
      ],
      formula: "f = (Q_m3h * K) / 3600",
      errorMessage: "Enter flow rate and K-factor to calculate expected frequency."
    },
    {
      id: "k-factor",
      label: "K-factor",
      fields: [
        numberField("frequencyHz", "Frequency", "f", "Hz"),
        numberField("flowM3h", "Flow rate", "Q", "m3/h")
      ],
      formula: "K = (3600 * f) / Q_m3h",
      errorMessage: "Enter frequency and flow rate to calculate K-factor."
    },
    {
      id: "actual-k-factor",
      label: "Actual K-factor",
      fields: [
        numberField("pulseCount", "Pulse count", "N", "pulses"),
        volumeField("referenceVolume", "Reference volume", "V_ref")
      ],
      formula: "K_actual = N / V_ref",
      errorMessage: "Enter pulse count and reference volume to calculate actual K-factor."
    },
    {
      id: "indicated-volume",
      label: "Indicated Volume",
      fields: [
        numberField("pulseCount", "Pulse count", "N", "pulses"),
        numberField("kPulsesM3", "K-factor", "K", "pulses/m3")
      ],
      formula: "V_ind = N / K",
      errorMessage: "Enter pulse count and K-factor to calculate indicated volume."
    },
    {
      id: "reference-volume",
      label: "Reference Volume",
      fields: [
        numberField("pulseCount", "Pulse count", "N", "pulses"),
        numberField("actualKFactor", "Actual K-factor", "K_actual", "pulses/m3")
      ],
      formula: "V_ref = N / K_actual",
      errorMessage: "Enter pulse count and actual K-factor to calculate reference volume."
    },
    {
      id: "meter-factor",
      label: "Meter Factor",
      fields: [
        volumeField("referenceVolume", "Reference volume", "V_ref"),
        volumeField("indicatedVolume", "Indicated volume", "V_ind")
      ],
      formula: "MF = V_ref / V_ind",
      errorMessage: "Enter reference volume and indicated volume to calculate Meter Factor."
    },
    {
      id: "percentage-error",
      label: "Percentage Error",
      fields: [
        volumeField("referenceVolume", "Reference volume", "V_ref"),
        volumeField("indicatedVolume", "Indicated volume", "V_ind")
      ],
      formula: "Error_percent = ((V_ind - V_ref) / V_ref) * 100",
      errorMessage: "Enter reference volume and indicated volume to calculate percentage error."
    },
    {
      id: "corrected-volume",
      label: "Corrected Volume",
      fields: [
        volumeField("indicatedVolume", "Indicated volume", "V_ind"),
        numberField("meterFactor", "Meter Factor", "MF", "dimensionless")
      ],
      formula: "V_corrected = V_ind * MF",
      errorMessage: "Enter indicated volume and Meter Factor to calculate corrected volume."
    },
    {
      id: "suggested-new-k-factor",
      label: "Suggested New K-factor",
      fields: [
        numberField("currentKFactor", "Current K-factor", "K_current", "pulses/m3"),
        numberField("meterFactor", "Meter Factor", "MF", "dimensionless")
      ],
      formula: "K_new = K_current / MF",
      errorMessage: "Enter current K-factor and Meter Factor to calculate suggested new K-factor."
    },
    {
      id: "expected-pulses",
      label: "Expected Pulses",
      fields: [
        volumeField("volume", "Volume", "V"),
        numberField("kPulsesM3", "K-factor", "K", "pulses/m3"),
        {
          name: "roundPulses",
          label: "Round pulses to integer",
          symbol: "N",
          unit: "optional",
          type: "checkbox"
        }
      ],
      formula: "N = V * K",
      errorMessage: "Enter volume and K-factor to calculate expected pulses."
    },
    {
      id: "prover-run-time",
      label: "Prover Run Time",
      fields: [
        volumeField("referenceVolume", "Reference volume", "V_ref"),
        numberField("flowM3h", "Flow rate", "Q", "m3/h")
      ],
      formula: "t = (V_ref * 3600) / Q_m3h",
      errorMessage: "Enter reference volume and flow rate to calculate prover run time."
    },
    {
      id: "volume-from-flow-time",
      label: "Volume from Flow Rate and Time",
      fields: [
        numberField("flowM3h", "Flow rate", "Q", "m3/h"),
        numberField("timeSeconds", "Time", "t", "seconds")
      ],
      formula: "V = (Q_m3h * t) / 3600",
      errorMessage: "Enter flow rate and time to calculate volume."
    },
    {
      id: "flow-rate-from-volume-time",
      label: "Flow Rate from Volume and Time",
      fields: [
        volumeField("volume", "Volume", "V"),
        numberField("timeSeconds", "Time", "t", "seconds")
      ],
      formula: "Q_m3h = (V * 3600) / t",
      errorMessage: "Enter volume and time to calculate flow rate."
    },
    {
      id: "repeatability",
      label: "Repeatability",
      fields: [
        selectField("repeatabilityType", "Value type", "type", "", [
          ["k-factor", "K-factor"],
          ["meter-factor", "Meter Factor"],
          ["percentage-error", "Percentage error"],
          ["indicated-volume", "Indicated volume"]
        ]),
        numberField("repeatabilityValue1", "Value 1", "Value_1", ""),
        numberField("repeatabilityValue2", "Value 2", "Value_2", ""),
        numberField("repeatabilityValue3", "Value 3", "Value_3", ""),
        numberField("repeatabilityCriterion", "Repeatability criterion", "criterion", "%", "0.02")
      ],
      formula: "Repeatability_percent = ((Value_max - Value_min) / Value_average) * 100",
      errorMessage: "Enter at least two values to calculate repeatability."
    },
    {
      id: "mass-flow-rate",
      label: "Mass Flow Rate",
      fields: [
        numberField("density", "Density", "rho", "kg/m3"),
        numberField("flowM3h", "Volumetric flow rate", "Qv", "m3/h")
      ],
      formula: "m_dot = rho * Qv",
      errorMessage: "Enter density and volumetric flow rate to calculate mass flow rate."
    },
    {
      id: "volumetric-flow-rate",
      label: "Volumetric Flow Rate",
      fields: [
        numberField("massFlowRate", "Mass flow rate", "m_dot", "kg/h"),
        numberField("density", "Density", "rho", "kg/m3")
      ],
      formula: "Qv = m_dot / rho",
      errorMessage: "Enter mass flow rate and density to calculate volumetric flow rate."
    },
    {
      id: "simplified-corrected-volume",
      label: "Simplified Corrected Volume using CTL and CPL",
      fields: [
        volumeField("observedVolume", "Observed volume", "V_observed"),
        numberField("ctl", "CTL", "CTL", "provided by user"),
        numberField("cpl", "CPL", "CPL", "provided by user")
      ],
      formula: "V_corrected = V_observed * CTL * CPL",
      errorMessage: "Enter observed volume, CTL and CPL to calculate simplified corrected volume."
    }
  ];
}

function numberField(name, label, symbol, unit = "", defaultValue = "") {
  return { name, label, symbol, unit, type: "number", defaultValue };
}

function volumeField(name, label, symbol) {
  return {
    name,
    label,
    symbol,
    unit: "m3 or L",
    type: "number",
    unitOptions: [["m3", "m3"], ["L", "L"]]
  };
}

function selectField(name, label, symbol, unit, options) {
  return { name, label, symbol, unit, type: "select", options };
}

function bindSolveForMode(certificateDraft) {
  const definitions = getSolveForDefinitions();
  const selector = document.querySelector("#solveForTarget");
  const fields = document.querySelector("#solveForFields");
  const formula = document.querySelector("#solveForFormula");
  const form = document.querySelector("#solveForForm");
  const result = document.querySelector("#solveForResult");

  const renderSelectedDefinition = () => {
    const definition = definitions.find(item => item.id === selector.value) || definitions[0];
    fields.innerHTML = definition.fields.map(renderSolveForField).join("");
    formula.innerHTML = `
      <strong>Formula</strong>
      <code>${escapeHtml(definition.formula)}</code>
    `;
    result.innerHTML = "";
  };

  selector.addEventListener("change", renderSelectedDefinition);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const definition = definitions.find(item => item.id === selector.value) || definitions[0];
    const calculated = calculateSolveFor(definition, form);

    if (calculated.error) {
      result.innerHTML = `
        <article class="result-card is-error">
          <div class="result-card-header">
            <span class="type-chip">Missing inputs</span>
            <h3>${escapeHtml(definition.label)}</h3>
          </div>
          <p>${escapeHtml(calculated.error)}</p>
        </article>
      `;
      return;
    }

    result.innerHTML = `<div class="result-grid single">${renderCalculationResult(calculated)}</div>`;
    bindCalculationResultActions([calculated], certificateDraft);
  });

  renderSelectedDefinition();
}

function renderSolveForField(field) {
  if (field.type === "select") {
    return `
      <label>
        ${escapeHtml(field.label)}
        <span>Symbol: ${escapeHtml(field.symbol)}${field.unit ? ` | Unit: ${escapeHtml(field.unit)}` : ""}</span>
        <select name="${escapeAttribute(field.name)}">
          ${field.options.map(([value, label]) => `<option value="${escapeAttribute(value)}">${escapeHtml(label)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  if (field.type === "checkbox") {
    return `
      <label class="solve-checkbox">
        <input type="checkbox" name="${escapeAttribute(field.name)}" value="yes" />
        <span>${escapeHtml(field.label)}</span>
      </label>
    `;
  }

  return `
    <label>
      ${escapeHtml(field.label)}
      <span>Symbol: ${escapeHtml(field.symbol)} | Unit: ${escapeHtml(field.unit)}</span>
      <div class="field-with-unit">
        <input type="number" step="any" name="${escapeAttribute(field.name)}" value="${escapeAttribute(field.defaultValue || "")}" />
        ${field.unitOptions ? `
          <select name="${escapeAttribute(`${field.name}Unit`)}">
            ${field.unitOptions.map(([value, label]) => `<option value="${escapeAttribute(value)}">${escapeHtml(label)}</option>`).join("")}
          </select>
        ` : ""}
      </div>
    </label>
  `;
}

function calculateSolveFor(definition, form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const value = name => parseTechnicalNumber(data[name]);
  const positive = name => isPositive(value(name));
  const volume = name => normalizeVolumeToM3(value(name), data[`${name}Unit`]);
  const result = details => ({ id: `solve-${definition.id}`, ...details });
  const error = message => ({ error: message || definition.errorMessage });

  switch (definition.id) {
    case "frequency": {
      if (!positive("pulseCount") || !positive("timeSeconds")) return error();
      const N = value("pulseCount");
      const t = value("timeSeconds");
      return result({
        title: "Frequency",
        inputs: [["N", N, "pulses"], ["t", t, "s"]],
        formula: "f = N / t",
        substitution: `f = ${formatTechnicalNumber(N)} / ${formatTechnicalNumber(t)}`,
        value: N / t,
        unit: "Hz",
        interpretation: `The pulse signal frequency is ${formatTechnicalNumber(N / t)} pulses per second.`,
        status: "Valid calculation"
      });
    }
    case "flow-rate": {
      if (!positive("frequencyHz") || !positive("kPulsesM3")) return error();
      const f = value("frequencyHz");
      const K = value("kPulsesM3");
      const Q = (3600 * f) / K;
      return result({
        title: "Flow Rate",
        inputs: [["f", f, "Hz"], ["K", K, "pulses/m3"]],
        formula: "Q_m3h = (3600 * f) / K",
        substitution: `Q_m3h = (3600 * ${formatTechnicalNumber(f)}) / ${formatTechnicalNumber(K)}`,
        value: Q,
        unit: "m3/h",
        interpretation: `Equivalent flow rate: ${formatTechnicalNumber(Q * 1000 / 60)} L/min.`,
        status: "Valid calculation"
      });
    }
    case "expected-frequency": {
      if (!positive("flowM3h") || !positive("kPulsesM3")) return error();
      const Q = value("flowM3h");
      const K = value("kPulsesM3");
      return result({
        title: "Expected Frequency",
        inputs: [["Q", Q, "m3/h"], ["K", K, "pulses/m3"]],
        formula: "f = (Q_m3h * K) / 3600",
        substitution: `f = (${formatTechnicalNumber(Q)} * ${formatTechnicalNumber(K)}) / 3600`,
        value: (Q * K) / 3600,
        unit: "Hz",
        interpretation: "Expected pulse signal frequency for the selected flow and K-factor.",
        status: "Valid calculation"
      });
    }
    case "k-factor": {
      if (!positive("frequencyHz") || !positive("flowM3h")) return error();
      const f = value("frequencyHz");
      const Q = value("flowM3h");
      return result({
        title: "K-factor",
        inputs: [["f", f, "Hz"], ["Q", Q, "m3/h"]],
        formula: "K = (3600 * f) / Q_m3h",
        substitution: `K = (3600 * ${formatTechnicalNumber(f)}) / ${formatTechnicalNumber(Q)}`,
        value: (3600 * f) / Q,
        unit: "pulses/m3",
        interpretation: "K-factor calculated from frequency and reference flow rate.",
        status: "Valid calculation"
      });
    }
    case "actual-k-factor": {
      const Vref = volume("referenceVolume");
      if (!positive("pulseCount") || !isPositive(Vref)) return error();
      const N = value("pulseCount");
      return result({
        title: "Actual K-factor",
        inputs: [["N", N, "pulses"], ["V_ref", Vref, "m3"]],
        formula: "K_actual = N / V_ref",
        substitution: `K_actual = ${formatTechnicalNumber(N)} / ${formatTechnicalNumber(Vref)}`,
        value: N / Vref,
        unit: "pulses/m3",
        interpretation: "Actual K-factor calculated from counted pulses and reference volume.",
        status: "Valid calculation"
      });
    }
    case "indicated-volume": {
      if (!positive("pulseCount") || !positive("kPulsesM3")) return error();
      const N = value("pulseCount");
      const K = value("kPulsesM3");
      const V = N / K;
      return result({
        title: "Indicated Volume",
        inputs: [["N", N, "pulses"], ["K", K, "pulses/m3"]],
        formula: "V_ind = N / K",
        substitution: `V_ind = ${formatTechnicalNumber(N)} / ${formatTechnicalNumber(K)}`,
        value: V,
        unit: "m3",
        interpretation: `Indicated volume from pulse total. Equivalent volume: ${formatTechnicalNumber(V * 1000)} L.`,
        status: "Valid calculation"
      });
    }
    case "reference-volume": {
      if (!positive("pulseCount") || !positive("actualKFactor")) return error();
      const N = value("pulseCount");
      const Kactual = value("actualKFactor");
      const V = N / Kactual;
      return result({
        title: "Reference Volume",
        inputs: [["N", N, "pulses"], ["K_actual", Kactual, "pulses/m3"]],
        formula: "V_ref = N / K_actual",
        substitution: `V_ref = ${formatTechnicalNumber(N)} / ${formatTechnicalNumber(Kactual)}`,
        value: V,
        unit: "m3",
        interpretation: `Reference volume calculated from pulses and actual K-factor. Equivalent volume: ${formatTechnicalNumber(V * 1000)} L.`,
        status: "Valid calculation"
      });
    }
    case "meter-factor": {
      const Vref = volume("referenceVolume");
      const Vind = volume("indicatedVolume");
      if (!isPositive(Vref) || !isPositive(Vind)) return error();
      const MF = Vref / Vind;
      return result({
        title: "Meter Factor",
        inputs: [["V_ref", Vref, "m3"], ["V_ind", Vind, "m3"]],
        formula: "MF = V_ref / V_ind",
        substitution: `MF = ${formatTechnicalNumber(Vref)} / ${formatTechnicalNumber(Vind)}`,
        value: MF,
        unit: "dimensionless",
        interpretation: MF < 1 ? "MF lower than 1 means the meter indicated more volume than the reference volume." : "MF higher than 1 means the meter indicated less volume than the reference volume.",
        status: "Valid calculation"
      });
    }
    case "percentage-error": {
      const Vref = volume("referenceVolume");
      const Vind = volume("indicatedVolume");
      if (!isPositive(Vref) || !isPositive(Vind)) return error();
      const errorPercent = ((Vind - Vref) / Vref) * 100;
      return result({
        title: "Percentage Error",
        inputs: [["V_ref", Vref, "m3"], ["V_ind", Vind, "m3"]],
        formula: "Error_percent = ((V_ind - V_ref) / V_ref) * 100",
        substitution: `Error_percent = ((${formatTechnicalNumber(Vind)} - ${formatTechnicalNumber(Vref)}) / ${formatTechnicalNumber(Vref)}) * 100`,
        value: errorPercent,
        unit: "%",
        interpretation: errorPercent > 0 ? "Positive error means the meter indicated above the reference volume." : "Negative error means the meter indicated below the reference volume.",
        status: "Valid calculation"
      });
    }
    case "corrected-volume": {
      const Vind = volume("indicatedVolume");
      if (!isPositive(Vind) || !positive("meterFactor")) return error();
      const MF = value("meterFactor");
      return result({
        title: "Corrected Volume",
        inputs: [["V_ind", Vind, "m3"], ["MF", MF, "dimensionless"]],
        formula: "V_corrected = V_ind * MF",
        substitution: `V_corrected = ${formatTechnicalNumber(Vind)} * ${formatTechnicalNumber(MF)}`,
        value: Vind * MF,
        unit: "m3",
        interpretation: "Corrected volume using the fixed FlowCore convention MF = V_ref / V_ind.",
        status: "Valid calculation"
      });
    }
    case "suggested-new-k-factor": {
      if (!positive("currentKFactor") || !positive("meterFactor")) return error();
      const Kcurrent = value("currentKFactor");
      const MF = value("meterFactor");
      return result({
        title: "Suggested New K-factor",
        inputs: [["K_current", Kcurrent, "pulses/m3"], ["MF", MF, "dimensionless"]],
        formula: "K_new = K_current / MF",
        substitution: `K_new = ${formatTechnicalNumber(Kcurrent)} / ${formatTechnicalNumber(MF)}`,
        value: Kcurrent / MF,
        unit: "pulses/m3",
        interpretation: "Suggested K-factor adjustment using the fixed Meter Factor convention.",
        status: "Valid calculation"
      });
    }
    case "expected-pulses": {
      const V = volume("volume");
      if (!isPositive(V) || !positive("kPulsesM3")) return error();
      const K = value("kPulsesM3");
      const pulses = V * K;
      const displayValue = data.roundPulses === "yes" ? Math.round(pulses) : pulses;
      return result({
        title: "Expected Pulses",
        inputs: [["V", V, "m3"], ["K", K, "pulses/m3"]],
        formula: "N = V * K",
        substitution: `N = ${formatTechnicalNumber(V)} * ${formatTechnicalNumber(K)}`,
        value: displayValue,
        unit: "pulses",
        interpretation: data.roundPulses === "yes" ? "Expected pulse count rounded to the nearest integer." : "Decimal pulses are shown for pulse interpolation.",
        status: "Valid calculation"
      });
    }
    case "prover-run-time": {
      const Vref = volume("referenceVolume");
      if (!isPositive(Vref) || !positive("flowM3h")) return error();
      const Q = value("flowM3h");
      return result({
        title: "Prover Run Time",
        inputs: [["V_ref", Vref, "m3"], ["Q", Q, "m3/h"]],
        formula: "t = (V_ref * 3600) / Q_m3h",
        substitution: `t = (${formatTechnicalNumber(Vref)} * 3600) / ${formatTechnicalNumber(Q)}`,
        value: (Vref * 3600) / Q,
        unit: "seconds",
        interpretation: "Estimated run time required to collect the selected reference volume.",
        status: "Valid calculation"
      });
    }
    case "volume-from-flow-time": {
      if (!positive("flowM3h") || !positive("timeSeconds")) return error();
      const Q = value("flowM3h");
      const t = value("timeSeconds");
      return result({
        title: "Volume from Flow Rate and Time",
        inputs: [["Q", Q, "m3/h"], ["t", t, "s"]],
        formula: "V = (Q_m3h * t) / 3600",
        substitution: `V = (${formatTechnicalNumber(Q)} * ${formatTechnicalNumber(t)}) / 3600`,
        value: (Q * t) / 3600,
        unit: "m3",
        interpretation: "Volume calculated from flow rate and elapsed time.",
        status: "Valid calculation"
      });
    }
    case "flow-rate-from-volume-time": {
      const V = volume("volume");
      if (!isPositive(V) || !positive("timeSeconds")) return error();
      const t = value("timeSeconds");
      return result({
        title: "Flow Rate from Volume and Time",
        inputs: [["V", V, "m3"], ["t", t, "s"]],
        formula: "Q_m3h = (V * 3600) / t",
        substitution: `Q_m3h = (${formatTechnicalNumber(V)} * 3600) / ${formatTechnicalNumber(t)}`,
        value: (V * 3600) / t,
        unit: "m3/h",
        interpretation: "Flow rate calculated from volume and elapsed time.",
        status: "Valid calculation"
      });
    }
    case "repeatability": {
      const values = ["repeatabilityValue1", "repeatabilityValue2", "repeatabilityValue3"]
        .map(name => value(name))
        .filter(isFiniteNumber);
      const criterion = isPositive(value("repeatabilityCriterion")) ? value("repeatabilityCriterion") : 0.02;
      if (values.length < 2) return error();
      const max = Math.max(...values);
      const min = Math.min(...values);
      const average = values.reduce((sum, item) => sum + item, 0) / values.length;
      if (!isPositive(average)) return error("Enter repeatability values with a positive average.");
      const repeatability = ((max - min) / average) * 100;
      return result({
        title: "Repeatability",
        inputs: [["Value_max", max, ""], ["Value_min", min, ""], ["Value_average", average, ""], ["Criterion", criterion, "%"]],
        formula: "Repeatability_percent = ((Value_max - Value_min) / Value_average) * 100",
        substitution: `Repeatability_percent = ((${formatTechnicalNumber(max)} - ${formatTechnicalNumber(min)}) / ${formatTechnicalNumber(average)}) * 100`,
        value: repeatability,
        unit: "%",
        interpretation: repeatability <= criterion ? "Repeatability is approved against the configured criterion." : "Repeatability is above the configured criterion.",
        status: repeatability <= criterion ? "Approved" : "Not approved"
      });
    }
    case "mass-flow-rate": {
      if (!positive("density") || !positive("flowM3h")) return error();
      const rho = value("density");
      const Qv = value("flowM3h");
      return result({
        title: "Mass Flow Rate",
        inputs: [["rho", rho, "kg/m3"], ["Qv", Qv, "m3/h"]],
        formula: "m_dot = rho * Qv",
        substitution: `m_dot = ${formatTechnicalNumber(rho)} * ${formatTechnicalNumber(Qv)}`,
        value: rho * Qv,
        unit: "kg/h",
        interpretation: "Mass flow rate calculated from density and volumetric flow rate.",
        status: "Valid calculation"
      });
    }
    case "volumetric-flow-rate": {
      if (!positive("massFlowRate") || !positive("density")) return error();
      const massFlow = value("massFlowRate");
      const rho = value("density");
      return result({
        title: "Volumetric Flow Rate",
        inputs: [["m_dot", massFlow, "kg/h"], ["rho", rho, "kg/m3"]],
        formula: "Qv = m_dot / rho",
        substitution: `Qv = ${formatTechnicalNumber(massFlow)} / ${formatTechnicalNumber(rho)}`,
        value: massFlow / rho,
        unit: "m3/h",
        interpretation: "Volumetric flow rate calculated from mass flow rate and density.",
        status: "Valid calculation"
      });
    }
    case "simplified-corrected-volume": {
      const Vobserved = volume("observedVolume");
      if (!isPositive(Vobserved) || !positive("ctl") || !positive("cpl")) return error();
      const CTL = value("ctl");
      const CPL = value("cpl");
      return result({
        title: "Simplified Corrected Volume",
        inputs: [["V_observed", Vobserved, "m3"], ["CTL", CTL, "provided"], ["CPL", CPL, "provided"]],
        formula: "V_corrected = V_observed * CTL * CPL",
        substitution: `V_corrected = ${formatTechnicalNumber(Vobserved)} * ${formatTechnicalNumber(CTL)} * ${formatTechnicalNumber(CPL)}`,
        value: Vobserved * CTL * CPL,
        unit: "m3",
        interpretation: "Simplified correction using user-provided CTL and CPL. This does not claim standard compliance.",
        status: "Valid calculation"
      });
    }
    default:
      return error("Select a target variable to calculate.");
  }
}

function normalizeVolumeToM3(value, unit) {
  if (!isFiniteNumber(value)) return null;
  if (unit === "L") return value / 1000;
  return value;
}

function readCalibrationInputs(form) {
  return Object.fromEntries(Array.from(new FormData(form).entries()).map(([key, value]) => {
    const parsed = parseTechnicalNumber(value);
    return [key, Number.isFinite(parsed) ? parsed : null];
  }));
}

function calculateMeterCalibration(inputs) {
  const results = [];
  const {
    pulseCount: N,
    timeSeconds: t,
    frequencyHz: f,
    flowM3h: Q,
    kPulsesM3: K,
    referenceVolumeM3: Vref,
    indicatedVolumeM3: Vind,
    currentKFactor: Kcurrent,
    repeatabilityMax: Rmax,
    repeatabilityMin: Rmin,
    repeatabilityAverage: Ravg,
    repeatabilityCriterion,
    nominalFlowM3h,
    actualFlowM3h
  } = inputs;

  const MF = isPositive(Vref) && isPositive(Vind) ? Vref / Vind : null;

  if (isPositive(N) && isPositive(t)) {
    addCalculation(results, {
      title: "Frequency",
      inputs: [["N", N, "pulses"], ["t", t, "s"]],
      formula: "f = N / t",
      substitution: `f = ${formatTechnicalNumber(N)} / ${formatTechnicalNumber(t)}`,
      value: N / t,
      unit: "Hz",
      interpretation: "Pulse frequency calculated from counted pulses over elapsed time.",
      status: "Calculated"
    });
  }

  if (isPositive(f) && isPositive(K)) {
    addCalculation(results, {
      title: "Flow rate from frequency",
      inputs: [["f", f, "Hz"], ["K", K, "pulses/m3"]],
      formula: "Q_m3h = (3600 * f) / K",
      substitution: `Q_m3h = (3600 * ${formatTechnicalNumber(f)}) / ${formatTechnicalNumber(K)}`,
      value: (3600 * f) / K,
      unit: "m3/h",
      interpretation: "Flow rate derived from pulse frequency and K-factor.",
      status: "Calculated"
    });
  }

  if (isPositive(Q) && isPositive(K)) {
    addCalculation(results, {
      title: "Expected frequency",
      inputs: [["Q", Q, "m3/h"], ["K", K, "pulses/m3"]],
      formula: "f = (Q_m3h * K) / 3600",
      substitution: `f = (${formatTechnicalNumber(Q)} * ${formatTechnicalNumber(K)}) / 3600`,
      value: (Q * K) / 3600,
      unit: "Hz",
      interpretation: "Expected signal frequency for the selected flow rate and K-factor.",
      status: "Calculated"
    });
  }

  if (isPositive(f) && isPositive(Q)) {
    addCalculation(results, {
      title: "K-factor from frequency and flow rate",
      inputs: [["f", f, "Hz"], ["Q", Q, "m3/h"]],
      formula: "K = (3600 * f) / Q_m3h",
      substitution: `K = (3600 * ${formatTechnicalNumber(f)}) / ${formatTechnicalNumber(Q)}`,
      value: (3600 * f) / Q,
      unit: "pulses/m3",
      interpretation: "Calculated K-factor from measured frequency and reference flow rate.",
      status: "Calculated"
    });
  }

  if (isPositive(N) && isPositive(K)) {
    addCalculation(results, {
      title: "Indicated volume",
      inputs: [["N", N, "pulses"], ["K", K, "pulses/m3"]],
      formula: "V_ind = N / K",
      substitution: `V_ind = ${formatTechnicalNumber(N)} / ${formatTechnicalNumber(K)}`,
      value: N / K,
      unit: "m3",
      interpretation: "Volume indicated by the pulse output using the configured K-factor.",
      status: "Calculated"
    });
  }

  if (isPositive(N) && isPositive(Vref)) {
    addCalculation(results, {
      title: "Actual K-factor",
      inputs: [["N", N, "pulses"], ["V_ref", Vref, "m3"]],
      formula: "K_actual = N / V_ref",
      substitution: `K_actual = ${formatTechnicalNumber(N)} / ${formatTechnicalNumber(Vref)}`,
      value: N / Vref,
      unit: "pulses/m3",
      interpretation: "Actual K-factor calculated from the reference volume collected during calibration.",
      status: "Calculated"
    });
  }

  if (isPositive(Vref) && isPositive(Vind)) {
    addCalculation(results, {
      title: "Meter Factor",
      inputs: [["V_ref", Vref, "m3"], ["V_ind", Vind, "m3"]],
      formula: "MF = V_ref / V_ind",
      substitution: `MF = ${formatTechnicalNumber(Vref)} / ${formatTechnicalNumber(Vind)}`,
      value: MF,
      unit: "dimensionless",
      interpretation: MF < 1 ? "MF lower than 1 means the indicated volume is greater than the reference volume." : "MF higher than 1 means the indicated volume is lower than the reference volume.",
      status: "Calculated"
    });

    const errorPercent = ((Vind - Vref) / Vref) * 100;
    addCalculation(results, {
      title: "Percentage error",
      inputs: [["V_ind", Vind, "m3"], ["V_ref", Vref, "m3"]],
      formula: "Error_percent = ((V_ind - V_ref) / V_ref) * 100",
      substitution: `Error_percent = ((${formatTechnicalNumber(Vind)} - ${formatTechnicalNumber(Vref)}) / ${formatTechnicalNumber(Vref)}) * 100`,
      value: errorPercent,
      unit: "%",
      interpretation: errorPercent > 0 ? "Positive error means the meter indicated above the reference volume." : "Negative error means the meter indicated below the reference volume.",
      status: Math.abs(errorPercent) <= 0.02 ? "Within default 0.02% reference" : "Review required"
    });

    addCalculation(results, {
      title: "Corrected volume",
      inputs: [["V_ind", Vind, "m3"], ["MF", MF, "dimensionless"]],
      formula: "V_corrected = V_ind * MF",
      substitution: `V_corrected = ${formatTechnicalNumber(Vind)} * ${formatTechnicalNumber(MF)}`,
      value: Vind * MF,
      unit: "m3",
      interpretation: "Corrected volume using the fixed FlowCore convention MF = V_ref / V_ind.",
      status: "Calculated"
    });
  }

  if (isPositive(Kcurrent) && isPositive(MF)) {
    addCalculation(results, {
      title: "Suggested new K-factor",
      inputs: [["K_current", Kcurrent, "pulses/m3"], ["MF", MF, "dimensionless"]],
      formula: "K_new = K_current / MF",
      substitution: `K_new = ${formatTechnicalNumber(Kcurrent)} / ${formatTechnicalNumber(MF)}`,
      value: Kcurrent / MF,
      unit: "pulses/m3",
      interpretation: "Suggested K-factor adjustment using the fixed Meter Factor convention.",
      status: "Calculated"
    });
  }

  if (isPositive(Q) && isPositive(t)) {
    addCalculation(results, {
      title: "Volume from flow rate and time",
      inputs: [["Q", Q, "m3/h"], ["t", t, "s"]],
      formula: "V = (Q_m3h * t) / 3600",
      substitution: `V = (${formatTechnicalNumber(Q)} * ${formatTechnicalNumber(t)}) / 3600`,
      value: (Q * t) / 3600,
      unit: "m3",
      interpretation: "Reference volume expected for the selected flow rate and run time.",
      status: "Calculated"
    });
  }

  if (isPositive(Vref) && isPositive(Q)) {
    addCalculation(results, {
      title: "Prover run time",
      inputs: [["V_ref", Vref, "m3"], ["Q", Q, "m3/h"]],
      formula: "t = (V * 3600) / Q_m3h",
      substitution: `t = (${formatTechnicalNumber(Vref)} * 3600) / ${formatTechnicalNumber(Q)}`,
      value: (Vref * 3600) / Q,
      unit: "s",
      interpretation: "Estimated prover run time for the selected reference volume and flow rate.",
      status: "Calculated"
    });
  }

  if (isPositive(Vref) && isPositive(K)) {
    addCalculation(results, {
      title: "Expected pulses",
      inputs: [["V_ref", Vref, "m3"], ["K", K, "pulses/m3"]],
      formula: "N = V * K",
      substitution: `N = ${formatTechnicalNumber(Vref)} * ${formatTechnicalNumber(K)}`,
      value: Vref * K,
      unit: "pulses",
      interpretation: "Expected pulse count for the selected reference volume and K-factor.",
      status: "Calculated"
    });
  }

  if (isFiniteNumber(Rmax) && isFiniteNumber(Rmin) && isPositive(Ravg)) {
    const criterion = isPositive(repeatabilityCriterion) ? repeatabilityCriterion : 0.02;
    const repeatability = ((Rmax - Rmin) / Ravg) * 100;
    addCalculation(results, {
      title: "Repeatability",
      inputs: [["Value_max", Rmax, ""], ["Value_min", Rmin, ""], ["Value_average", Ravg, ""], ["Criterion", criterion, "%"]],
      formula: "Repeatability_percent = ((Value_max - Value_min) / Value_average) * 100",
      substitution: `Repeatability_percent = ((${formatTechnicalNumber(Rmax)} - ${formatTechnicalNumber(Rmin)}) / ${formatTechnicalNumber(Ravg)}) * 100`,
      value: repeatability,
      unit: "%",
      interpretation: repeatability <= criterion ? "Repeatability is approved against the configured criterion." : "Repeatability is above the configured criterion.",
      status: repeatability <= criterion ? "Approved" : "Not approved"
    });
  }

  if (isPositive(nominalFlowM3h) && isPositive(actualFlowM3h)) {
    const min = nominalFlowM3h * 0.9;
    const max = nominalFlowM3h * 1.1;
    const approved = actualFlowM3h >= min && actualFlowM3h <= max;
    addCalculation(results, {
      title: "Calibration point validation",
      inputs: [["Q_nominal", nominalFlowM3h, "m3/h"], ["Q_ref", actualFlowM3h, "m3/h"]],
      formula: "Accepted range = Q_nominal * 0.90 to Q_nominal * 1.10",
      substitution: `Accepted range = ${formatTechnicalNumber(min)} to ${formatTechnicalNumber(max)} m3/h`,
      value: actualFlowM3h,
      unit: "m3/h",
      interpretation: approved ? "The reference flow is inside the configured calibration point range." : "The reference flow is outside the configured calibration point range.",
      status: approved ? "Approved" : "Not approved"
    });
  }

  return results;
}

function addCalculation(results, calculation) {
  results.push({
    id: `calc-${results.length}`,
    ...calculation
  });
}

function renderCalculationResult(result) {
  return `
    <article class="result-card" data-result-id="${result.id}">
      <div class="result-card-header">
        <span class="type-chip">${escapeHtml(result.status)}</span>
        <h3>${escapeHtml(result.title)}</h3>
      </div>
      <dl class="result-inputs">
        ${result.inputs.map(([label, value, unit]) => `
          <div><dt>${escapeHtml(label)}</dt><dd>${formatTechnicalNumber(value)} ${escapeHtml(unit || "")}</dd></div>
        `).join("")}
      </dl>
      <div class="formula-block">
        <strong>Formula</strong>
        <code>${escapeHtml(result.formula)}</code>
        <strong>Substitution</strong>
        <code>${escapeHtml(result.substitution)}</code>
      </div>
      <p class="result-value">${formatTechnicalNumber(result.value)} <span>${escapeHtml(result.unit)}</span></p>
      <p>${escapeHtml(result.interpretation)}</p>
      <div class="result-actions">
        <button class="secondary-button" type="button" data-copy-result="${result.id}">Copy result</button>
        <button class="primary-button" type="button" data-add-certificate="${result.id}">Add to certificate</button>
      </div>
    </article>
  `;
}

function bindCalculationResultActions(calculations, certificateDraft) {
  document.querySelectorAll("[data-copy-result]").forEach(button => {
    button.addEventListener("click", async () => {
      const result = calculations.find(item => item.id === button.dataset.copyResult);
      if (!result) return;
      const text = `${result.title}: ${formatTechnicalNumber(result.value)} ${result.unit}\nFormula: ${result.formula}\nSubstitution: ${result.substitution}`;
      await navigator.clipboard?.writeText(text);
      button.textContent = "Copied";
      window.setTimeout(() => { button.textContent = "Copy result"; }, 1400);
    });
  });

  document.querySelectorAll("[data-add-certificate]").forEach(button => {
    button.addEventListener("click", () => {
      const result = calculations.find(item => item.id === button.dataset.addCertificate);
      if (!result) return;
      certificateDraft.push(result);
      renderCertificateDraft(certificateDraft);
      button.textContent = "Added";
      window.setTimeout(() => { button.textContent = "Add to certificate"; }, 1400);
    });
  });
}

function renderCertificateDraft(certificateDraft) {
  const list = document.querySelector("#certificateDraftList");
  if (!list) return;

  if (!certificateDraft.length) {
    list.innerHTML = "<li>No calculation added yet.</li>";
    return;
  }

  list.innerHTML = certificateDraft.map(item => `
    <li>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${formatTechnicalNumber(item.value)} ${escapeHtml(item.unit)}</span>
    </li>
  `).join("");
}

function parseTechnicalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return Number(String(value).trim().replace(",", "."));
}

function formatTechnicalNumber(value) {
  if (!isFiniteNumber(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8
  }).format(value);
}

function isPositive(value) {
  return isFiniteNumber(value) && value > 0;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function renderLibrary() {
  const biblioteca = state.biblioteca;

  app.innerHTML = `
    <section class="library-hero">
      <div>
        <p class="eyebrow">Biblioteca FlowCore</p>
        <h1>Acervo técnico do aluno</h1>
        <p>${cleanPortugueseText(biblioteca.descricao)}</p>
      </div>
      <img src="${biblioteca.capa}" alt="" />
    </section>
    <section class="library-grid" aria-label="Materiais da Biblioteca FlowCore">
      ${biblioteca.itens.map(renderLibraryItem).join("")}
    </section>
  `;
  const libraryTitle = app.querySelector(".library-hero h1");
  if (libraryTitle) libraryTitle.textContent = "Acervo técnico do aluno";
}

function renderLibraryItem(item) {
  const disabled = item.url === "#" ? "is-disabled" : "";
  const actionLabel = item.url === "#" ? "Em breve" : cleanPortugueseText(item.cta || "Acessar");

  return `
    <article class="library-card">
      <div>
        <span class="type-chip">${cleanPortugueseText(item.tipo)}</span>
        <h2>${cleanPortugueseText(item.titulo)}</h2>
        <p>${cleanPortugueseText(item.descricao)}</p>
      </div>
      <div class="library-card-footer">
        <span>${cleanPortugueseText(item.status)}</span>
        <a class="secondary-button ${disabled}" href="${item.url}" ${item.url === "#" ? 'aria-disabled="true"' : 'target="_blank" rel="noopener noreferrer"'}>${actionLabel}</a>
      </div>
    </article>
  `;
}

function renderSpecialist() {
  const cursos = getAccessibleCourses();
  const courseNames = cursos.length
    ? cursos.map(curso => curso.titulo).join(", ")
    : "Nenhum curso liberado";

  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">Meu Especialista</p>
      <h1>FlowCore Specialist</h1>
      <p>Use este espaço para transformar aulas, materiais e conceitos técnicos em respostas mais claras para estudo e aplicação em campo.</p>
    </section>

    <section class="specialist-shell">
      <article class="specialist-panel">
        <div>
          <span class="type-chip">Contexto ativo</span>
          <h2>Cursos considerados</h2>
          <p>${escapeHtml(courseNames)}</p>
        </div>
        <div class="specialist-suggestions">
          <button type="button" data-specialist-question="Explique o conceito principal da aula em linguagem simples.">Explicar conceito</button>
          <button type="button" data-specialist-question="Crie um resumo prático para revisão antes de uma prova ou atividade em campo.">Resumo prático</button>
          <button type="button" data-specialist-question="Monte perguntas e respostas para eu testar meu entendimento.">Testar entendimento</button>
        </div>
      </article>

      <article class="specialist-chat">
        <div class="specialist-message">
          <strong>Especialista FlowCore</strong>
          <p>Envie uma dúvida sobre seus cursos, materiais ou conceitos técnicos. A integração com IA será conectada ao backend para responder com base no conteúdo liberado.</p>
        </div>
        <form id="specialistForm" class="specialist-form">
          <textarea name="question" placeholder="Digite sua dúvida sobre o conteúdo..." rows="5"></textarea>
          <button class="primary-button" type="submit">Enviar pergunta</button>
        </form>
        <div id="specialistAnswer" class="specialist-answer" style="display:none;"></div>
      </article>
    </section>
  `;

  document.querySelectorAll("[data-specialist-question]").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.querySelector("#specialistForm textarea");
      input.value = button.dataset.specialistQuestion;
      input.focus();
    });
  });

  document.querySelector("#specialistForm").addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const answer = document.querySelector("#specialistAnswer");
    answer.style.display = "block";
    answer.innerHTML = `
      <strong>Próximo passo</strong>
      <p>A pergunta foi registrada na interface. A resposta automática será ativada quando conectarmos o especialista ao backend de IA com acesso seguro ao conteúdo dos cursos.</p>
      <p><span>Pergunta:</span> ${escapeHtml(data.question || "")}</p>
    `;
  });
}

function renderSpecialistV2() {
  const cursos = getAccessibleCourses();
  const courseNames = cursos.length
    ? cursos.map(curso => curso.titulo).join(", ")
    : "Nenhum curso liberado";

  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">Meu Especialista</p>
      <h1>FlowCore Specialist</h1>
      <p>Use este espaço para transformar aulas, materiais e conceitos técnicos em respostas mais claras para estudo e aplicação em campo.</p>
    </section>

    <section class="specialist-shell">
      <article class="specialist-panel">
        <div>
          <span class="type-chip">Contexto ativo</span>
          <h2>Cursos considerados</h2>
          <p>${escapeHtml(courseNames)}</p>
        </div>
        <div class="specialist-suggestions">
          <button type="button" data-specialist-question="Explique o conceito principal da aula em linguagem simples.">Explicar conceito</button>
          <button type="button" data-specialist-question="Crie um resumo prático para revisão antes de uma prova ou atividade em campo.">Resumo prático</button>
          <button type="button" data-specialist-question="Monte perguntas e respostas para eu testar meu entendimento.">Testar entendimento</button>
        </div>
      </article>

      <article class="specialist-chat">
        <div class="specialist-message">
          <strong>Especialista FlowCore</strong>
          <p>Envie uma dúvida sobre seus cursos, materiais ou conceitos técnicos. A IA responde com orientação didática e foco operacional, usando o contexto dos cursos liberados.</p>
        </div>
        <form id="specialistForm" class="specialist-form">
          <textarea name="question" placeholder="Digite sua dúvida sobre o conteúdo..." rows="5" required></textarea>
          <button class="primary-button" type="submit">Enviar pergunta</button>
        </form>
        <div id="specialistAnswer" class="specialist-answer" style="display:none;"></div>
      </article>
    </section>
  `;

  document.querySelectorAll("[data-specialist-question]").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.querySelector("#specialistForm textarea");
      input.value = button.dataset.specialistQuestion;
      input.focus();
    });
  });

  document.querySelector("#specialistForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form).entries());
    const question = String(data.question || "").trim();
    const answer = document.querySelector("#specialistAnswer");

    if (!question) return;

    answer.style.display = "block";
    answer.classList.remove("is-error");
    answer.innerHTML = `<strong>FlowCore Specialist</strong><p>Consultando a IA com o contexto dos seus cursos...</p>`;
    if (submitButton) submitButton.disabled = true;

    try {
      const result = await askFlowCoreSpecialist(question);
      answer.innerHTML = `
        <strong>FlowCore Specialist</strong>
        <p>${formatAssistantText(result.answer || "Não recebi uma resposta da IA.")}</p>
      `;
    } catch (error) {
      answer.classList.add("is-error");
      answer.innerHTML = `
        <strong>Não foi possível responder agora</strong>
        <p>${escapeHtml(error.message || "Falha na comunicação com o FlowCore Specialist.")}</p>
      `;
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

async function askFlowCoreSpecialist(question) {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const response = await fetch(`${FLOWCORE_SUPABASE_URL}/functions/v1/flowcore-specialist`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question,
      courses: getAccessibleCourses().map(curso => ({
        id: curso.id,
        title: curso.titulo,
        description: curso.descricao,
        materials: (curso.materiais || []).map(material => ({
          id: material.id,
          type: material.tipo,
          title: material.titulo,
          description: material.descricao || "",
          format: material.formato || ""
        }))
      }))
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Falha no especialista. Status ${response.status}.`);
  }

  return result;
}

function formatAssistantText(value) {
  return escapeHtml(value)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

function renderFinancial() {
  const acessosPagos = getAccessibleCourses()
    .map(curso => ({
      curso,
      financeiro: state.financeiro.lancamentos.find(item => item.curso_id === curso.id)
    }))
    .filter(item => item.financeiro);

  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">Financeiro</p>
      <h1>Cursos pagos e validade</h1>
      <p>Esta área mostra somente o valor pago pelos cursos que estão liberados para o aluno. A validade será sempre de 1 ano e, nesta fase, a conferência é manual.</p>
    </section>
    <section class="finance-course-grid" aria-label="Cursos pagos e validade">
      ${acessosPagos.map(renderPaidCourseCard).join("")}
    </section>
  `;
}

function renderPaidCourseCard(item) {
  const financeiro = item.financeiro;
  const curso = item.curso;

  return `
    <article class="finance-course-card">
      <img src="${curso.capa}" alt="" />
      <div class="finance-course-body">
        <div>
          <span class="status-pill">Acesso ativo</span>
          <h2>${curso.titulo}</h2>
          <p>${curso.descricao}</p>
        </div>
        <div class="finance-facts">
          <div>
            <span>Valor pago</span>
            <strong>${formatCurrency(financeiro.valor)}</strong>
          </div>
          <div>
            <span>Validade</span>
            <strong>${formatDate(financeiro.validade_inicio)} a ${formatDate(financeiro.validade_ate)}</strong>
          </div>
        </div>
        <p class="manual-note">Validação manual · vigência padrão de 1 ano.</p>
      </div>
    </article>
  `;
}

function renderStoreLegacy() {
  const currentIds = new Set(state.cursos.map(curso => curso.id));
  const catalog = state.catalogoCursos;

  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">Comprar cursos</p>
      <h1>Produtos FlowCore Academy</h1>
      <p>Catálogo montado a partir dos assets de produto. Nesta fase, os botões de compra abrem contato comercial.</p>
    </section>
    <section class="catalog-grid" aria-label="Catálogo de novos cursos">
      ${catalog.map(curso => renderCatalogCard(curso, currentIds.has(curso.id))).join("")}
    </section>
  `;
}

function renderCatalogCard(curso, hasAccess = false) {
  const isComingSoon = curso.valor === null;
  const status = hasAccess ? "Já liberado" : curso.status;
  const priceLabel = isComingSoon ? "Status" : "Valor";
  const priceValue = isComingSoon ? "Em breve" : formatCurrency(curso.valor);
  const href = hasAccess ? `#curso/${curso.id}` : curso.url;
  const actionLabel = hasAccess ? "Acessar curso" : curso.cta;
  const disabled = isComingSoon ? "is-disabled" : "";
  const attrs = hasAccess || isComingSoon ? "" : 'target="_blank" rel="noopener noreferrer"';

  return `
    <article class="catalog-card">
      <img src="${curso.capa}" alt="" />
      <div class="catalog-card-body">
        <span class="status-pill">${status}</span>
        <h2>${curso.titulo}</h2>
        <p>${curso.descricao}</p>
        <div class="price-row">
          <span>${priceLabel}</span>
          <strong>${priceValue}</strong>
        </div>
        <a class="primary-button ${disabled}" href="${href}" ${isComingSoon ? 'aria-disabled="true"' : attrs}>${actionLabel}</a>
      </div>
    </article>
  `;
}

function renderStore() {
  const currentIds = new Set(state.cursos.map(curso => curso.id));
  const catalog = state.catalogoCursos;
  const cartItems = state.cart.items
    .map(item => ({
      ...item,
      course: catalog.find(course => (course.offerId || course.id) === item.offerId)
    }))
    .filter(item => item.course);
  const total = cartItems.reduce((sum, item) => sum + Number(item.course.valor || 0) * item.quantity, 0);

  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">FlowCore Academy</p>
      <h1>Comprar cursos</h1>
      <p>Escolha seus treinamentos e conclua a compra com segurança por cartão de crédito ou Pix.</p>
    </section>
    <section class="commerce-shell">
      <div class="catalog-grid" aria-label="Catálogo de novos cursos">
        ${catalog.map(curso => renderCommerceCatalogCard(curso, currentIds.has(curso.id))).join("")}
      </div>
      <aside class="checkout-panel" aria-label="Resumo da compra">
        <div>
          <p class="eyebrow">Checkout seguro</p>
          <h2>Seu carrinho</h2>
        </div>
        ${cartItems.length
          ? `<div class="cart-items">${cartItems.map(renderCartItem).join("")}</div>
             <div class="checkout-total"><span>Total</span><strong>${formatCurrency(total)}</strong></div>
             <form class="checkout-form" id="checkoutForm">
               <label>CPF ou CNPJ
                 <input name="document" inputmode="numeric" autocomplete="off" required minlength="11" placeholder="Somente números" />
               </label>
               <label>Telefone com DDD
                 <input name="phone" type="tel" inputmode="tel" autocomplete="tel" required minlength="10" placeholder="(24) 99999-9999" />
               </label>
               <p class="manual-note">Pagamento disponível por cartão de crédito ou Pix.</p>
               <button class="primary-button" type="submit" ${state.cart.status ? "disabled" : ""}>Ir para o pagamento</button>
             </form>`
          : `<p>Seu carrinho está vazio. Escolha um curso para continuar.</p>`}
        ${state.cart.status ? `<p class="checkout-status" role="status">${escapeHtml(state.cart.status)}</p>` : ""}
        ${state.cart.error ? `<p class="checkout-status is-error" role="alert">${escapeHtml(state.cart.error)}</p>` : ""}
      </aside>
    </section>
  `;

  bindStoreActions();
}

function renderCommerceCatalogCard(curso, hasAccess = false) {
  const isComingSoon = curso.valor === null;
  const status = hasAccess ? "Já liberado" : curso.status;
  const priceLabel = isComingSoon ? "Status" : "Valor";
  const priceValue = isComingSoon ? "Em breve" : formatCurrency(curso.valor);
  const offerId = curso.offerId || curso.id;
  const isInCart = state.cart.items.some(item => item.offerId === offerId);
  const actionLabel = hasAccess ? "Acessar curso" : isComingSoon ? "Em breve" : isInCart ? "Adicionado ao carrinho" : "Adicionar ao carrinho";
  const disabled = isComingSoon ? "is-disabled" : "";

  return `
    <article class="catalog-card">
      <img src="${escapeAttribute(curso.capa)}" alt="" />
      <div class="catalog-card-body">
        <span class="status-pill">${escapeHtml(status)}</span>
        <h2>${escapeHtml(curso.titulo)}</h2>
        <p>${escapeHtml(curso.descricao)}</p>
        <div class="price-row">
          <span>${priceLabel}</span>
          <strong>${priceValue}</strong>
        </div>
        ${hasAccess
          ? `<a class="primary-button" href="#curso/${escapeAttribute(curso.id)}">Acessar curso</a>`
          : `<button class="primary-button ${disabled}" type="button" data-cart-add="${escapeAttribute(offerId)}" ${isComingSoon || isInCart ? "disabled" : ""}>${actionLabel}</button>`}
      </div>
    </article>
  `;
}

function renderCartItem(item) {
  const course = item.course;
  return `
    <div class="cart-item">
      <div>
        <strong>${escapeHtml(course.titulo)}</strong>
        <span>${course.accessDays || 365} dias de acesso</span>
      </div>
      <div>
        <b>${formatCurrency(course.valor)}</b>
        <button class="text-link" type="button" data-cart-remove="${escapeAttribute(item.offerId)}">Remover</button>
      </div>
    </div>
  `;
}

function bindStoreActions() {
  document.querySelectorAll("[data-cart-add]").forEach(button => {
    button.addEventListener("click", () => addOfferToCart(button.dataset.cartAdd));
  });

  document.querySelectorAll("[data-cart-remove]").forEach(button => {
    button.addEventListener("click", () => removeOfferFromCart(button.dataset.cartRemove));
  });

  document.querySelector("#checkoutForm")?.addEventListener("submit", createPagarmeCheckout);
}

function addOfferToCart(offerId) {
  const offer = state.catalogoCursos.find(course => (course.offerId || course.id) === offerId);
  if (!offer || offer.valor === null) return;
  if (!state.cart.items.some(item => item.offerId === offerId)) {
    state.cart.items.push({ offerId, courseId: offer.id, quantity: 1 });
  }
  state.cart.status = "";
  state.cart.error = "";
  renderStore();
}

function removeOfferFromCart(offerId) {
  state.cart.items = state.cart.items.filter(item => item.offerId !== offerId);
  state.cart.status = "";
  state.cart.error = "";
  renderStore();
}

async function createPagarmeCheckout(event) {
  event.preventDefault();
  if (!state.cart.items.length) return;

  const form = event.currentTarget;
  const formData = Object.fromEntries(new FormData(form).entries());
  state.cart.status = "Criando checkout seguro...";
  state.cart.error = "";
  renderStore();

  try {
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sessao expirada. Entre novamente.");

    const response = await fetch(`${FLOWCORE_SUPABASE_URL}/functions/v1/create-pagarme-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        items: state.cart.items,
        customer: {
          document: String(formData.document || "").replace(/\D/g, ""),
          phone: String(formData.phone || "").replace(/\D/g, "")
        },
        successUrl: `${window.location.origin}${window.location.pathname}#financeiro`,
        cancelUrl: `${window.location.origin}${window.location.pathname}#comprar`
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Nao foi possivel criar o checkout.");
    if (!payload.paymentUrl) throw new Error("O Pagar.me nao retornou a URL de pagamento.");

    state.cart.status = "Checkout criado. Redirecionando para pagamento...";
    state.cart.error = "";
    window.location.href = payload.paymentUrl;
  } catch (error) {
    state.cart.status = "";
    state.cart.error = error.message || "Erro ao iniciar checkout.";
    renderStore();
  }
}

function renderEmptyState() {
  app.innerHTML = `
    <section class="empty-state">
      <p class="eyebrow">Sem cursos liberados</p>
      <h1>Nenhum curso aparece para este aluno.</h1>
      <p>Quando o acesso for liberado manualmente pela FlowCore Academy, os cursos passam a aparecer nesta área.</p>
      <a class="primary-button" href="https://wa.me/5524998788760" target="_blank" rel="noopener noreferrer">Falar com a FlowCore</a>
    </section>
  `;
}

function renderEmptyContent() {
  const courseIds = state.debug.courseIds.length ? state.debug.courseIds.join(", ") : "nenhum";

  return `
    <section class="empty-state compact">
      <h2>Nenhum curso liberado</h2>
      <p>Login atual: ${escapeHtml(state.aluno?.email || "-")}</p>
      <p>Aluno ID: ${escapeHtml(state.debug.studentId || "-")}</p>
      <p>Acessos encontrados: ${state.debug.accessCount}</p>
      <p>Cursos encontrados: ${escapeHtml(courseIds)}</p>
      <p>Entre em contato com a FlowCore para confirmar seu acesso.</p>
    </section>
  `;
}

function getAccessibleCourses() {
  // SUPABASE: buscar somente cursos permitidos via RLS em access(student_id, course_id).
  updateCourseProgress();
  return state.cursos;
}

function updateCourseProgress() {
  state.cursos.forEach(curso => {
    const measurableMaterials = (curso.materiais || []).filter(item => item.tipo !== "certificado");
    if (!measurableMaterials.length) {
      curso.progresso = 0;
      return;
    }

    const completedCount = measurableMaterials.filter(item => isMaterialCompleted(item.id)).length;
    curso.progresso = Math.round((completedCount / measurableMaterials.length) * 100);
  });
}

function getMaterialCompletionKey(materialId) {
  const studentId = state.aluno?.id || state.aluno?.email || "anon";
  return `${materialCompletionPrefix}:${studentId}:${materialId}`;
}

function isMaterialCompleted(materialId) {
  return localStorage.getItem(getMaterialCompletionKey(materialId)) === "1";
}

function setMaterialCompleted(materialId, completed) {
  const storageKey = getMaterialCompletionKey(materialId);
  if (completed) localStorage.setItem(storageKey, "1");
  else localStorage.removeItem(storageKey);
}

function groupByType(items) {
  return items.reduce((groups, item) => {
    groups[item.tipo] = groups[item.tipo] || [];
    groups[item.tipo].push(item);
    return groups;
  }, {});
}

function getCreditSummary() {
  const completedTrainings = state.cursos.filter(curso => Number(curso.progresso || 0) >= 100).length;
  const startDate = getSubscriptionStartDate();
  const active = hasActiveSubscription();
  const credits = active && startDate ? Math.floor(monthsBetween(startDate, new Date()) / 4) : 0;

  return {
    active,
    credits: Math.max(0, credits),
    completedTrainings,
    level: getStudentLevel(completedTrainings),
    startLabel: startDate ? formatDate(startDate.toISOString().slice(0, 10)) : "Sem assinatura registrada"
  };
}

function getStudentLevel(completedTrainings) {
  if (completedTrainings > 5) return "Ouro";
  if (completedTrainings >= 5) return "Prata";
  if (completedTrainings >= 3) return "Bronze";
  return "Em formação";
}

function getSubscriptionStartDate() {
  if (state.aluno?.subscriptionStartDate) {
    const registeredDate = new Date(state.aluno.subscriptionStartDate);
    if (!Number.isNaN(registeredDate.getTime())) return registeredDate;
  }

  const dates = [
    ...state.financeiro.lancamentos.flatMap(item => [item.validade_inicio, item.pago_em]),
    ...state.cursos.map(curso => curso.liberado_em)
  ]
    .filter(Boolean)
    .map(value => new Date(value))
    .filter(date => !Number.isNaN(date.getTime()));

  if (!dates.length) return null;
  return new Date(Math.min(...dates.map(date => date.getTime())));
}

function hasActiveSubscription() {
  if (typeof state.aluno?.subscriptionActive === "boolean") {
    return state.aluno.subscriptionActive;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const validityDates = [
    ...state.financeiro.lancamentos.map(item => item.validade_ate),
    ...state.cursos.map(curso => curso.validade_ate)
  ].filter(Boolean);

  if (!validityDates.length) return Boolean(getSubscriptionStartDate());

  return validityDates.some(value => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date >= today;
  });
}

function monthsBetween(startDate, endDate) {
  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
  months += endDate.getMonth() - startDate.getMonth();
  if (endDate.getDate() < startDate.getDate()) months -= 1;
  return Math.max(0, months);
}

function renderInstitutionalVideoCleanPage() {
  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">FlowCore Academy</p>
      <h1>V&iacute;deo institucional</h1>
      <p>Assista novamente quando quiser para revisar a apresenta&ccedil;&atilde;o da FlowCore Academy.</p>
    </section>
    ${renderInstitutionalVideoCleanBlock()}
  `;
}

function renderInstitutionalVideoCleanBlock() {
  return `
    <section class="institutional-video" aria-label="V&iacute;deo institucional FlowCore Academy">
      <div class="institutional-video-header">
        <span class="type-chip">FlowCore Academy</span>
        <h2>V&iacute;deo institucional</h2>
      </div>
      ${renderInstitutionalVideoCleanFrame()}
    </section>
  `;
}

function renderInstitutionalVideoCleanFrame() {
  return `
    <div class="institutional-video-frame">
      <iframe src="${institutionalVideoUrl}" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture" allowfullscreen fetchpriority="high"></iframe>
    </div>
  `;
}

function showInstitutionalVideoWelcomeOnce() {
  if (!state.aluno?.id) return;
  const storageKey = `${institutionalVideoSeenPrefix}:${state.aluno.id}`;
  if (localStorage.getItem(storageKey)) return;
  localStorage.setItem(storageKey, new Date().toISOString());

  const modal = document.createElement("div");
  modal.className = "video-modal-backdrop";
  modal.innerHTML = `
    <section class="video-modal" role="dialog" aria-modal="true" aria-labelledby="institutionalVideoTitle">
      <div class="video-modal-header">
        <div>
          <span class="type-chip">Boas-vindas</span>
          <h2 id="institutionalVideoTitle">V&iacute;deo institucional</h2>
        </div>
        <button class="video-modal-close" type="button" aria-label="Fechar v&iacute;deo institucional">Fechar</button>
      </div>
      ${renderInstitutionalVideoCleanFrame()}
    </section>
  `;

  const closeModal = () => modal.remove();
  modal.querySelector(".video-modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", function closeOnEscape(event) {
    if (event.key !== "Escape") return;
    closeModal();
    document.removeEventListener("keydown", closeOnEscape);
  });
  document.body.appendChild(modal);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function cleanPortugueseText(value) {
  let text = String(value || "");

  for (let index = 0; index < 3 && /Ã|Â/.test(text); index += 1) {
    try {
      text = decodeURIComponent(escape(text));
    } catch (error) {
      break;
    }
  }

  return text.replace(/\u00a0/g, " ");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(String(value || ""));
  return String(value || "").replace(/["\\]/g, "\\$&");
}

function showVideoNotice() {
  // SUPABASE: carregar URL assinada ou provider seguro do material de video.
  alert("Player visual nesta fase. A fonte do vídeo será integrada no backend.");
}

// SUPABASE: progresso por material deve ser persistido em tabela dedicada de progresso.
// SUPABASE: automacao de acesso via pagamento deve inserir linhas em access.
// SUPABASE: financeiro deve vir do cruzamento entre access e payments, mostrando apenas cursos liberados para o aluno.
// SUPABASE: compra de novos cursos deve integrar products/prices e checkout do gateway escolhido.
// SUPABASE: biblioteca deve vir de library_items filtrados por access, plano ou bundle adquirido.
// SUPABASE: emissao de certificado deve atualizar materials.emitido ou tabela propria de certificados.
boot();

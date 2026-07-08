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
  catalogoCursos: MOCK.catalogoCursos
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
  else if (view === "especialista") renderSpecialist();
  else if (view === "financeiro") renderFinancial();
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

function renderDashboard() {
  const cursos = getAccessibleCourses();
  const completedCount = cursos.filter(curso => Number(curso.progresso || 0) >= 100).length;
  const nextCourse = cursos.find(curso => Number(curso.progresso || 0) < 100) || cursos[0];
  app.innerHTML = `
    <section class="academy-cockpit">
      <div>
        <p class="eyebrow">Portal FlowCore Academy</p>
        <h1>Cockpit do Aluno</h1>
        <p>Olá, ${escapeHtml(state.aluno.nome)}. Acompanhe suas trilhas, aulas, certificados e evolução em um painel único de formação operacional.</p>
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

  return `
    <article class="material-item${doneClass}" data-material-card="${escapeAttribute(item.id)}">
      <div>
        <span class="type-chip">${item.formato.toUpperCase()}</span>
        <h3>${item.titulo}</h3>
        <p>Material de apoio</p>
      </div>
      <div class="material-actions">
        <a class="secondary-button" href="${item.url}" target="_blank" rel="noopener noreferrer">Visualizar</a>
        <a class="ghost-button inline" href="${item.url}" target="_blank" rel="noopener noreferrer" download>Baixar</a>
        ${completionControl}
      </div>
    </article>
  `;
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

function renderStore() {
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

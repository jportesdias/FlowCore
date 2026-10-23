const app = document.querySelector("#app");
const sidebar = document.querySelector(".sidebar");
const logoutButton = document.querySelector("#logoutButton");
const client = window.supabase?.createClient(FLOWCORE_SUPABASE_URL, FLOWCORE_SUPABASE_ANON_KEY, {
  auth: { storageKey: "flowcore-student-session", storage: window.sessionStorage }
});
const institutionalVideoSeenPrefix = "flowcore-institutional-video-seen";
const institutionalVideoUrl = "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=66c1df47-f33e-42bd-978d-b38c0e60b7eb";
const renewalOfferSeenPrefix = "flowcore-renewal-offer-seen";
const renewalOfferPaymentUrl = "https://payment-link-v3.pagar.me/pl_jQXmpP2VJad94ant5eUqGO0vlo1yG843";
const materialCompletionPrefix = "flowcore-material-completion";
let pendingOtpEmail = "";

const defaultMembershipPlans = [
  {
    code: "mensal",
    name: "Plano Mensal",
    description: "Acesso aos cursos incluídos no plano e IA proprietária com 10 utilizações por ciclo mensal.",
    billing_mode: "recurring",
    amount: 59.90,
    currency: "BRL",
    interval_name: "month",
    interval_count: 1,
    access_days: 31,
    initial_credits: 0,
    max_installments: 1,
    access_tag_id: "pratileira",
    status: "active",
    sort_order: 10
  },
  {
    code: "trimestral",
    name: "Plano Trimestral",
    description: "Acesso por 3 meses aos cursos incluídos no plano e IA proprietária limitada a 10 usos por ciclo mensal.",
    billing_mode: "one_time",
    amount: 119.90,
    currency: "BRL",
    interval_name: null,
    interval_count: null,
    access_days: 90,
    initial_credits: 0,
    max_installments: 1,
    access_tag_id: "pratileira",
    status: "active",
    sort_order: 15
  },
  {
    code: "anual",

    name: "Plano Anual",
    description: "Acesso por 12 meses, IA ilimitada, um novo curso gravado por mês e 3 créditos para cursos ao vivo.",
    billing_mode: "one_time",
    amount: 499.00,
    currency: "BRL",
    interval_name: null,
    interval_count: null,
    access_days: 365,
    initial_credits: 3,
    max_installments: 12,
    access_tag_id: "pratileira",
    status: "active",
    sort_order: 20
  }
];

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
  membershipPlans: defaultMembershipPlans,
  membershipOrders: [],
  creditBalance: 0,
  membershipSelection: "",
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
    },
    {
      id: "provadores-ihm-metering",
      tipo: "simulador",
      formato: "web",
      titulo: "IHM Metering",
      descricao: "Interface de simulação para a prática do curso de Provadores Compacto.",
      url: "https://flowcoresolutions.com.br/ihm-metering.html"
    }
  ]
};

async function boot() {
  if (!client) {
    renderLogin("Supabase nao carregou. Recarregue a pagina.", true);
    return;
  }

  const requestedPlan = new URLSearchParams(window.location.search).get("plano");
  if (["mensal", "anual"].includes(requestedPlan)) {
    state.membershipSelection = requestedPlan;
  }

  const { data } = await client.auth.getSession();
  if (data.session) {
    // Mostra algo na área central enquanto os dados do aluno carregam.
    app.innerHTML = `<section class="page-loading" aria-busy="true"><div class="loading-bar"></div><p>Carregando seu painel…</p></section>`;
    await openStudentSession();
  } else {
    renderLogin();
  }

  window.addEventListener("hashchange", renderRoute);
  logoutButton.addEventListener("click", async () => {
    if (state.aluno?.id) {
      sessionStorage.removeItem(`${renewalOfferSeenPrefix}:${state.aluno.id}`);
      sessionStorage.removeItem(`${aiTermAcceptedPrefix}:${state.aluno.id}`);
    }
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

const aiTermAcceptedPrefix = "flowcore-ai-term-accepted";

function confirmarTermoIA() {
  if (!state.aluno?.id) return Promise.resolve(false);

  const storageKey = `${aiTermAcceptedPrefix}:${state.aluno.id}`;
  if (sessionStorage.getItem(storageKey)) return Promise.resolve(true);

  return new Promise(resolve => {
    const backdrop = document.createElement("div");
    backdrop.className = "renewal-offer-backdrop";
    backdrop.innerHTML = `
      <section class="renewal-offer-modal ai-term-modal" role="dialog" aria-modal="true" aria-labelledby="aiTermTitle">
        <p class="renewal-offer-kicker">Termo de ciência</p>
        <h2 id="aiTermTitle">Serviço de inteligência artificial</h2>
        <div class="ai-term-text">
          <p>O certificado será analisado por um serviço de inteligência artificial de terceiros. Ao enviar o arquivo, você concorda que o conteúdo será processado por esse serviço.</p>
          <p>A FlowCore Academy não se responsabiliza pelo conteúdo enviado, pelas respostas geradas pela IA nem pelo uso que você fizer delas. As respostas devem ser conferidas por um profissional habilitado.</p>
          <p>Antes do envio, o sistema oculta automaticamente CPF, CNPJ, e-mails e telefones formatados. Nomes e outros dados não são ocultados automaticamente. Você é responsável por verificar se tem autorização para enviar o documento.</p>
        </div>
        <label class="ai-term-check">
          <input type="checkbox" id="aiTermCheck" />
          <span>Li e entendi as condições acima.</span>
        </label>
        <div class="ai-term-actions">
          <button class="secondary-button" type="button" id="aiTermCancel">Cancelar</button>
          <button class="primary-button" type="button" id="aiTermAccept" disabled>Concordar e enviar</button>
        </div>
      </section>
    `;
    document.body.appendChild(backdrop);

    const check = backdrop.querySelector("#aiTermCheck");
    const accept = backdrop.querySelector("#aiTermAccept");
    const cancel = backdrop.querySelector("#aiTermCancel");
    const close = aceito => {
      backdrop.remove();
      resolve(aceito);
    };

    check.addEventListener("change", () => {
      accept.disabled = !check.checked;
    });
    cancel.addEventListener("click", () => close(false));
    accept.addEventListener("click", () => {
      sessionStorage.setItem(storageKey, new Date().toISOString());
      close(true);
    });
  });
}


function ocultarDadosPessoais(texto) {
  return String(texto || "")
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[CPF oculto]")
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "[CNPJ oculto]")
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[e-mail oculto]")
    .replace(/(\(\d{2}\)\s?|\+?55\s?\d{2}\s?)?9?\d{4}-\d{4}\b/g, "[telefone oculto]");
}

async function openStudentSession() {
  try {
    // Só o essencial antes de desenhar a tela: dados do aluno e a situação do tour.
    await loadStudentState();
    await loadTourStatus().catch(() => {});

    state.isAuthenticated = true;
    sidebar.classList.remove("is-hidden");
    const accessExpired = getPlatformAccessState().expired;
    updatePlatformAccessNavigation(accessExpired);
    if (accessExpired) {
      state.cursos = [];
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#comprar`);
    } else {
      window.location.hash = "#dashboard";
    }
    renderRoute();
    if (!accessExpired) {
      showRenewalOfferOnce();
    }

    // O restante carrega em segundo plano e atualiza a tela quando chega.
    Promise.all([
      loadInstitutionalVideoStatus().catch(() => {}),
      loadAvatar().catch(() => {}),
      loadFocusData().catch(() => {}),
      loadNotifications().catch(() => {})
    ]).then(() => {
      iniciarNotificacoes();
      iniciarRastreamento();
      atualizarBadgeNotificacoes();
      const view = (window.location.hash.replace("#", "") || "dashboard").split("/")[0];
      if (view === "dashboard") renderRoute();
    }).catch(() => {});
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
  // getSession já traz o usuário da sessão local; evita uma ida extra ao servidor de login.
  const { data: sessionData } = await client.auth.getSession();
  const usuario = sessionData?.session?.user;
  if (!usuario) throw new Error("Sessao expirada. Entre novamente.");
  const userData = { user: usuario };

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

  await Promise.all([
    loadCommerceCatalog(),
    loadMembershipState(student.id)
  ]);
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

async function loadMembershipState(studentId) {
  try {
    const [plansResult, ordersResult, creditsResult] = await Promise.all([
      client
        .from("commerce_membership_plans")
        .select("code,name,description,billing_mode,amount,currency,interval_name,interval_count,access_days,initial_credits,max_installments,access_tag_id,status,sort_order")
        .eq("status", "active")
        .order("sort_order", { ascending: true }),
      client
        .from("membership_orders")
        .select("id,plan_code,status,amount,currency,starts_at,valid_until,gateway_status,created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
      client
        .from("student_credit_ledger")
        .select("amount")
        .eq("student_id", studentId)
    ]);

    state.membershipPlans = (plansResult.error || !plansResult.data?.length
      ? defaultMembershipPlans
      : plansResult.data).filter(plan => plan.code !== "manual");
    state.membershipOrders = ordersResult.error ? [] : ordersResult.data || [];
    state.creditBalance = creditsResult.error
      ? 0
      : (creditsResult.data || []).reduce((total, entry) => total + Number(entry.amount || 0), 0);
  } catch (error) {
    console.warn("Planos de acesso indisponiveis.", error);
    state.membershipPlans = defaultMembershipPlans;
    state.membershipOrders = [];
    state.creditBalance = 0;
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
  if (getPlatformAccessState().expired && view !== "comprar") {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#comprar`);
    updateActiveNav("comprar");
    renderStore();
    return;
  }
  updateActiveNav(view);
  document.querySelector(".nav-group")?.classList.toggle("is-open", view === "flowcore-tools");

  if (view === "curso" && id) renderCourse(id);
  else if (view === "biblioteca") renderLibrary();
  else if (view === "video-institucional") {
    renderInstitutionalVideoCleanPage();
    marcarVideoInstitucionalAssistido();
  }
  else if (view === "especialista") renderSpecialistV2();
  else if (view === "flowcore-tools") renderFlowCoreTools(id);
  else if (view === "financeiro") renderFinancial();
  else if (view === "notificacoes") renderNotifications();
  else if (view === "comprar") renderStore();
  else if (view === "perfil") renderProfile();
  else if (view === "creditos") renderCredits();
  else if (view === "vazio") renderEmptyState();
  else renderDashboard();

}

function getPlatformAccessState() {
  const orders = Array.isArray(state.membershipOrders) ? state.membershipOrders : [];
  const accessStatuses = new Set(["active", "paid", "expired", "canceled", "cancelled", "inactive"]);
  const activeOrder = orders.find(order =>
    ["active", "paid"].includes(String(order.status || "").toLowerCase()) &&
    (!order.valid_until || daysUntilDate(order.valid_until) >= 0)
  );

  if (activeOrder) return { expired: false, order: activeOrder, validUntil: activeOrder.valid_until || "" };

  const expiredOrders = orders
    .filter(order => accessStatuses.has(String(order.status || "").toLowerCase()))
    .filter(order => order.valid_until && daysUntilDate(order.valid_until) < 0)
    .sort((a, b) => String(b.valid_until).localeCompare(String(a.valid_until)));

  if (expiredOrders.length) {
    return { expired: true, order: expiredOrders[0], validUntil: expiredOrders[0].valid_until };
  }

  // Compatibilidade com acessos antigos, anteriores à tabela membership_orders.
  if (!orders.length) {
    const legacyAccesses = (state.financeiro?.lancamentos || [])
      .filter(item => ["paid", "active", "pago", "approved"].includes(String(item.status || "").toLowerCase()))
      .filter(item => item.validade_ate)
      .sort((a, b) => String(b.validade_ate).localeCompare(String(a.validade_ate)));
    const activeLegacyAccess = legacyAccesses.find(item => daysUntilDate(item.validade_ate) >= 0);
    if (activeLegacyAccess) {
      return { expired: false, order: null, validUntil: activeLegacyAccess.validade_ate, legacy: true };
    }
    if (legacyAccesses.length && daysUntilDate(legacyAccesses[0].validade_ate) < 0) {
      return { expired: true, order: null, validUntil: legacyAccesses[0].validade_ate, legacy: true };
    }
  }

  return { expired: false, order: null, validUntil: "" };
}

function updatePlatformAccessNavigation(accessExpired = getPlatformAccessState().expired) {
  sidebar.classList.toggle("is-expired-access", accessExpired);
  const plansLabel = sidebar.querySelector('[data-nav="comprar"] span');
  if (plansLabel) plansLabel.textContent = accessExpired ? "Contratação de planos" : "Planos e cursos";
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

function getSaudacao() {
  const hora = new Date().getHours();
  if (hora < 5) return "Seja bem-vindo, madrugador";
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function getSpecialistProgress(cursos) {
  const totalAulas = cursos.reduce((soma, curso) => soma + Number(curso.aulasTotal || 0), 0);
  if (!totalAulas) return 0;
  const assistidas = cursos.reduce((soma, curso) => soma + Number(curso.aulasConcluidas || 0), 0);
  return Math.min(100, Math.round((assistidas / totalAulas) * 100));
}

function getInstitutionalVideoCycle() {
  const access = getPlatformAccessState();
  return access.order?.id || access.validUntil || "sem-plano";
}

async function loadInstitutionalVideoStatus() {
  state.videoInstitucionalAssistido = false;
  if (!state.aluno?.id) return;
  const { data, error } = await client
    .from("student_institutional_video")
    .select("cycle")
    .eq("student_id", state.aluno.id)
    .maybeSingle();
  if (error) return;
  state.videoInstitucionalAssistido = data?.cycle === getInstitutionalVideoCycle();
}

async function marcarVideoInstitucionalAssistido() {
  if (!state.aluno?.id || state.videoInstitucionalAssistido) return;
  const { error } = await client
    .from("student_institutional_video")
    .upsert(
      { student_id: state.aluno.id, cycle: getInstitutionalVideoCycle(), watched_at: new Date().toISOString() },
      { onConflict: "student_id" }
    );
  if (!error) state.videoInstitucionalAssistido = true;
}

function renderJornada(cursos) {
  const liberados = cursos.map(curso => {
    const progresso = Number(curso.progresso || 0);
    const concluido = progresso >= 100;
    const emAndamento = !concluido && progresso > 0;
    const classe = concluido ? "is-done" : emAndamento ? "is-progress" : "is-open";
    const status = concluido
      ? "Concluído"
      : emAndamento
        ? `Em andamento · ${Number(curso.aulasConcluidas || 0)} de ${Number(curso.aulasTotal || 0)} aulas`
        : "Liberado";
    return `
      <li class="cockpit-step ${classe}">
        <span class="cockpit-dot"></span>
        <a class="cockpit-step-link" href="#curso/${curso.id}">
          <strong>${escapeHtml(curso.titulo)}</strong>
          <span class="cockpit-tag">${status}</span>
        </a>
      </li>`;
  }).join("");

  const liberadosIds = new Set(cursos.map(curso => curso.id));
  const sugeridos = (state.catalogoCursos || [])
    .filter(offer => !liberadosIds.has(offer.offerId || offer.id))
    .map(offer => {
      const emBreve = offer.status === "Em breve" || !offer.url || offer.url === "#";
      const acao = emBreve
        ? `<span class="cockpit-tag">Em breve</span>`
        : `<a class="cockpit-link" href="${escapeHtml(offer.url)}" target="_blank" rel="noopener">Ver curso</a>`;
      return `
      <li class="cockpit-step is-locked">
        <span class="cockpit-dot"></span>
        <strong>${escapeHtml(offer.titulo)}</strong>
        ${acao}
      </li>`;
    }).join("");

  const videoAssistido = state.videoInstitucionalAssistido;
  const videoStep = `
      <li class="cockpit-step ${videoAssistido ? "is-done" : "is-open"}">
        <span class="cockpit-dot"></span>
        <a class="cockpit-step-link" href="#video-institucional">
          <strong>V&iacute;deo institucional</strong>
          <span class="cockpit-tag">${videoAssistido ? "Assistido" : "Assistir"}</span>
        </a>
      </li>`;

  return `<ol class="cockpit-steps">${videoStep}${liberados}${sugeridos}</ol>`;

}

function renderCourseBands(cursos) {
  return cursos.map(curso => `
      <a class="cockpit-band" href="#curso/${curso.id}">
        <img src="${escapeHtml(curso.capa)}" alt="" />
        <div class="cockpit-band-body">
          <span class="eyebrow">Trilha liberada</span>
          <strong>${escapeHtml(curso.titulo)}</strong>
          <p>${escapeHtml(curso.descricao)}</p>
          <small class="cockpit-band-meta">${Number(curso.aulasConcluidas || 0)} de ${Number(curso.aulasTotal || 0)} aulas assistidas</small>
          <div class="cockpit-bar"><span style="width: ${Number(curso.progresso || 0)}%"></span></div>
        </div>
        <span class="cockpit-band-cta">Acessar</span>
      </a>`).join("");
}

let cockpitClockTimer = null;
const codigosTempo = {
  0: "Céu limpo", 1: "Predominantemente limpo", 2: "Parcialmente nublado", 3: "Nublado",
  45: "Nevoeiro", 48: "Nevoeiro", 51: "Garoa", 53: "Garoa", 55: "Garoa",
  61: "Chuva fraca", 63: "Chuva", 65: "Chuva forte",
  80: "Pancadas de chuva", 81: "Pancadas de chuva", 82: "Pancadas de chuva",
  95: "Trovoada", 96: "Trovoada", 99: "Trovoada"
};

function atualizarRelogio() {
  const relogio = document.querySelector("#cockpitClock");
  if (!relogio) return;
  const agora = new Date();
  relogio.querySelector("[data-clock-date]").textContent = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  relogio.querySelector("[data-clock-time]").textContent = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function iniciarRelogio() {
  atualizarRelogio();
  clearInterval(cockpitClockTimer);
  cockpitClockTimer = setInterval(atualizarRelogio, 30000);
}

const iconesTempo = {
  sol: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  nublado: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 18 18z"/></svg>`,
  chuva: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 14a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 18 14z"/><path d="M8 17l-1 2M12 17l-1 2M16 17l-1 2"/></svg>`,
  tempestade: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 14a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 18 14z"/><path d="M12 14l-2 4h3l-2 4"/></svg>`
};

function iconeDoTempo(codigo) {
  if (codigo <= 1) return "sol";
  if (codigo <= 3 || codigo === 45 || codigo === 48) return "nublado";
  if (codigo >= 95) return "tempestade";
  return "chuva";
}

function atualizarPrevisao() {
  const el = document.querySelector("#cockpitWeather");
  if (!el) return;
  const previsao = state.weather && state.weather !== "loading" ? state.weather : null;
  if (!previsao) {
    el.innerHTML = "";
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = `
    <span class="cockpit-weather-line">${iconesTempo[previsao.icone]}<strong>${previsao.temperatura}°C</strong> · ${escapeHtml(previsao.condicao)}</span>
    <span class="cockpit-weather-rain">Chance de chuva hoje: ${previsao.chuva}%</span>`;
}

function carregarPrevisao() {
  if (state.weather !== undefined || !navigator.geolocation) {
    atualizarPrevisao();
    return;
  }
  state.weather = "loading";
  navigator.geolocation.getCurrentPosition(async posicao => {
    try {
      const { latitude, longitude } = posicao.coords;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=precipitation_probability_max&forecast_days=1&timezone=auto`;
      const resposta = await fetch(url);
      const dados = await resposta.json();
      const codigo = dados.current.weather_code;
      state.weather = {
        temperatura: Math.round(dados.current.temperature_2m),
        condicao: codigosTempo[codigo] || "Tempo variável",
        icone: iconeDoTempo(codigo),
        chuva: Math.round(dados.daily?.precipitation_probability_max?.[0] ?? 0)
      };
    } catch (error) {
      state.weather = null;
    }
    atualizarPrevisao();
  }, () => {
    state.weather = null;
    atualizarPrevisao();
  }, { maximumAge: 1800000, timeout: 8000 });
}

function renderDashboard() {
  const cursos = getAccessibleCourses();
  const nextCourse = cursos.find(curso => Number(curso.progresso || 0) < 100) || cursos[0];
  const progresso = getSpecialistProgress(cursos);
  app.innerHTML = `
    <div class="cockpit-v2">
      ${renderPriorityBanner()}
      <section class="cockpit-head-row">
        <div>
          <p class="eyebrow">Portal FlowCore Academy</p>
          <h1>${getSaudacao()}, ${escapeHtml(state.aluno.nome)}</h1>
        </div>
        <div class="cockpit-head-side">
          <div class="cockpit-clock" id="cockpitClock">
            <span data-clock-date></span>
            <strong data-clock-time></strong>
            <span id="cockpitWeather" hidden></span>
          </div>
          <a class="cockpit-avatar ${levelClass(getCreditSummary().level)}" href="#perfil" aria-label="Meu perfil">
            ${state.avatarUrl
              ? `<img src="${escapeAttribute(state.avatarUrl)}" alt="" />`
              : `<span>${escapeHtml(String(state.aluno.nome || "?").split(" ").filter(Boolean).slice(0, 2).map(parte => parte[0].toUpperCase()).join(""))}</span>`}
          </a>
        </div>
      </section>

      ${nextCourse ? `
      <section class="cockpit-continue">
        <div>
          <p class="eyebrow">Continue de onde parou</p>
          <strong>${escapeHtml(nextCourse.titulo)}</strong>
        </div>
        <a class="primary-button" href="#curso/${nextCourse.id}">Continuar trilha</a>
      </section>` : ""}

      ${getObjetivoAtual() === objetivoNenhum ? "" : `
      <section class="cockpit-goal">
        <div>
          <p class="eyebrow">Seu objetivo</p>
          <strong>${escapeHtml(getObjetivoAtual())}</strong>
          <div class="cockpit-bar"><span style="width: ${progresso}%"></span></div>
        </div>
        <b>${progresso}%</b>
      </section>`}

      <section class="cockpit-journey">
        <p class="eyebrow">Sua jornada</p>
        ${renderJornada(cursos)}
      </section>

      ${cursos.length ? `
      <section class="cockpit-bands">
        <p class="eyebrow">Seus cursos</p>
        ${renderCourseBands(cursos)}
      </section>` : renderEmptyContent()}
    </div>
  `;
  iniciarRelogio();
  carregarPrevisao();
  if (state.tourVersionSeen === null) setTimeout(() => iniciarTour(), 700);
  else if (state.tourVersionSeen !== tourVersion) setTimeout(() => iniciarNovidades(state.tourVersionSeen), 700);
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
              <strong>Em breve</strong>
              <small>Esta aula será liberada em breve.</small>
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

function isVideoReleased(item) {
  return Boolean(item?.url && item.url !== "#");
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
        <em data-playlist-status="${escapeAttribute(video.id)}">${!isVideoReleased(video) ? "Em breve" : checked ? "Concluído" : "Pendente"}</em>
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
          : `<div class="video-placeholder compact"><span>Player</span><strong>Em breve</strong><small>Esta aula será liberada em breve.</small></div>`;
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
  if (!isVideoReleased(item)) {
    return `<span class="completion-check is-locked"><span>Disponível após a liberação da aula</span></span>`;
  }
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

const focusDefaults = { default_minutes: 30, fullscreen: true, alert_tab_switch: true };
let focoAtivo = null;
let atividadePendente = {};
let rastreamentoIniciado = false;

async function loadFocusData() {
  state.focus = { settings: { ...focusDefaults }, sessions: [], activity: [] };
  if (!state.aluno?.id) return;

  const [settings, sessions, activity] = await Promise.all([
    client.from("student_focus_settings")
      .select("default_minutes,fullscreen,alert_tab_switch")
      .eq("student_id", state.aluno.id)
      .maybeSingle(),
    client.from("student_focus_sessions")
      .select("course_id,planned_seconds,focused_seconds,interruptions,completed,started_at")
      .eq("student_id", state.aluno.id)
      .order("started_at", { ascending: false })
      .limit(10),
    client.from("student_activity")
      .select("course_id,day,seconds")
      .eq("student_id", state.aluno.id)
  ]);

  state.focus.settings = settings.data ? { ...focusDefaults, ...settings.data } : { ...focusDefaults };
  state.focus.sessions = sessions.data || [];
  state.focus.activity = activity.data || [];
  const goal = await client.from("student_goals")
    .select("goal")
    .eq("student_id", state.aluno.id)
    .maybeSingle();
  state.focus.goal = goal.data?.goal || "";
}

async function salvarRegrasFoco(regras) {
  const { error } = await client.from("student_focus_settings").upsert(
    { student_id: state.aluno.id, ...regras, updated_at: new Date().toISOString() },
    { onConflict: "student_id" }
  );
  if (error) throw new Error(error.message || "Não foi possível salvar as regras.");
  state.focus.settings = { ...state.focus.settings, ...regras };
}

async function salvarSessaoFoco(sessao) {
  await client.from("student_focus_sessions").insert({
    student_id: state.aluno.id,
    course_id: sessao.cursoId || "",
    planned_seconds: sessao.planejado,
    focused_seconds: sessao.focado,
    interruptions: sessao.interrupcoes,
    completed: sessao.concluida,
    started_at: sessao.inicio,
    ended_at: new Date().toISOString()
  });
}

function formatarTempo(segundos) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  return horas ? `${horas} h ${minutos} min` : `${minutos} min`;
}

function formatarRelogio(segundos) {
  const minutos = String(Math.floor(segundos / 60)).padStart(2, "0");
  const resto = String(segundos % 60).padStart(2, "0");
  return `${minutos}:${resto}`;
}

function iniciarFoco(minutos, cursoId) {
  if (focoAtivo) return;
  const planejado = minutos * 60;
  const regras = state.focus?.settings || focusDefaults;
  const nomeCurso = (state.cursos.find(curso => curso.id === cursoId)?.titulo) || "Sem curso";

  const overlay = document.createElement("div");
  overlay.className = "focus-overlay";
  overlay.innerHTML = `
    <section class="focus-card" role="dialog" aria-modal="true" aria-label="Core Attention">
      <p class="eyebrow">Core Attention</p>
      <div class="focus-time" data-focus-time>${formatarRelogio(planejado)}</div>
      <p class="focus-course">${escapeHtml(nomeCurso)}</p>
      <div class="focus-bar"><span data-focus-bar style="width:0%"></span></div>
      <p class="focus-alert" data-focus-alert hidden></p>
      <div class="focus-actions">
        <button class="secondary-button" type="button" data-focus-pause>Pausar</button>
        <button class="primary-button" type="button" data-focus-end>Encerrar</button>
      </div>
    </section>`;
  document.body.appendChild(overlay);

  focoAtivo = {
    overlay,
    planejado,
    restante: planejado,
    focado: 0,
    interrupcoes: 0,
    pausado: false,
    concluida: false,
    cursoId,
    inicio: new Date().toISOString(),
    timer: null
  };

  const tempo = overlay.querySelector("[data-focus-time]");
  const barra = overlay.querySelector("[data-focus-bar]");
  const alerta = overlay.querySelector("[data-focus-alert]");
  const botaoPausa = overlay.querySelector("[data-focus-pause]");

  const atualizar = () => {
    tempo.textContent = formatarRelogio(focoAtivo.restante);
    barra.style.width = `${Math.round((focoAtivo.focado / focoAtivo.planejado) * 100)}%`;
    botaoPausa.textContent = focoAtivo.pausado ? "Retomar" : "Pausar";
  };

  const finalizar = async concluida => {
    if (!focoAtivo) return;
    clearInterval(focoAtivo.timer);
    focoAtivo.concluida = concluida;
    document.removeEventListener("visibilitychange", aoTrocarAba);
    window.removeEventListener("beforeunload", aoSair);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    try {
      await salvarSessaoFoco(focoAtivo);
    } catch (error) {
      console.warn("Sessão de foco não foi salva.", error);
    }
    focoAtivo.overlay.remove();
    focoAtivo = null;
    await loadFocusData().catch(() => {});
    if (location.hash === "#perfil") renderProfile();
  };

  const aoTrocarAba = () => {
    if (!focoAtivo) return;
    if (document.hidden) {
      if (regras.alert_tab_switch && !focoAtivo.pausado) {
        focoAtivo.pausado = true;
        focoAtivo.interrupcoes += 1;
      }
      return;
    }
    if (focoAtivo.pausado && regras.alert_tab_switch) {
      alerta.textContent = "Você saiu da tela de foco. O tempo ficou pausado. Clique em Retomar para continuar.";
      alerta.hidden = false;
    }
    atualizar();
  };

  const aoSair = event => {
    if (!focoAtivo) return;
    event.preventDefault();
    event.returnValue = "";
  };

  botaoPausa.addEventListener("click", () => {
    focoAtivo.pausado = !focoAtivo.pausado;
    alerta.hidden = true;
    atualizar();
  });
  overlay.querySelector("[data-focus-end]").addEventListener("click", () => finalizar(false));

  document.addEventListener("visibilitychange", aoTrocarAba);
  window.addEventListener("beforeunload", aoSair);

  if (regras.fullscreen) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  focoAtivo.timer = setInterval(() => {
    if (!focoAtivo || focoAtivo.pausado || document.hidden) return;
    focoAtivo.restante -= 1;
    focoAtivo.focado += 1;
    if (focoAtivo.restante <= 0) {
      focoAtivo.restante = 0;
      atualizar();
      finalizar(true);
      return;
    }
    atualizar();
  }, 1000);
  atualizar();
}

function registrarTick() {
  if (document.hidden || !state.isAuthenticated) return;
  const cursoId = decodeURIComponent((window.location.hash.match(/^#curso\/(.+)$/) || [])[1] || "");
  atividadePendente[cursoId] = (atividadePendente[cursoId] || 0) + 15;
}

async function enviarAtividade() {
  const entradas = Object.entries(atividadePendente).filter(([, segundos]) => segundos > 0);
  atividadePendente = {};
  for (const [cursoId, segundos] of entradas) {
    await client.rpc("registrar_atividade", { p_course_id: cursoId, p_seconds: segundos });
  }
}

function iniciarRastreamento() {
  if (rastreamentoIniciado) return;
  rastreamentoIniciado = true;

  setInterval(registrarTick, 15000);
  setInterval(() => enviarAtividade().catch(() => {}), 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) enviarAtividade().catch(() => {});
  });

  document.addEventListener("click", event => {
    if (event.target.closest("[data-history-open]")) {
      openHistoryPopup();
      return;
    }
    if (event.target.closest("[data-history-open]")) {
      openHistoryPopup();
      return;
    }
    const botao = event.target.closest("[data-focus-start]");
    if (!botao) return;
    const campo = document.querySelector("#focusCustomForm");
    const cursoId = campo?.elements.curso?.value || "";
    iniciarFoco(Number(botao.dataset.focusStart), cursoId);
  });

  document.addEventListener("submit", async event => {
    if (event.target.id === "goalForm") {
      event.preventDefault();
      const formulario = event.target;
      const escolha = formulario.elements.objetivo?.value || "";
      const texto = escolha === "__outro__" ? formulario.elements.outro.value.trim() : escolha;
      if (!texto) {
        document.querySelector("#goalStatus").textContent = "Escreva ou escolha um objetivo.";
        return;
      }
      try {
        await salvarObjetivo(texto);
        renderProfile();
        document.querySelector("#goalStatus").textContent = "Objetivo salvo.";
      } catch (error) {
        document.querySelector("#goalStatus").textContent = error.message;
      }
      return;
    }
    if (event.target.id === "focusCustomForm") {
      event.preventDefault();
      const minutos = Math.min(480, Math.max(5, Number(event.target.elements.minutos.value) || 30));
      iniciarFoco(minutos, event.target.elements.curso.value || "");
    }
    if (event.target.id === "focusRulesForm") {
      event.preventDefault();
      const formulario = event.target;
      const status = formulario.querySelector("#focusRulesStatus");
      try {
        await salvarRegrasFoco({
          default_minutes: Math.min(480, Math.max(5, Number(formulario.elements.padrao.value) || 30)),
          fullscreen: formulario.elements.fullscreen.checked,
          alert_tab_switch: formulario.elements.alert.checked
        });
        renderProfile();
        document.querySelector("#focusRulesStatus").textContent = "Regras salvas.";
      } catch (error) {
        status.textContent = error.message;
      }
    }
  });
}

function renderFocusSection() {
  const settings = state.focus?.settings || focusDefaults;
  const opcoesCurso = getAccessibleCourses()
    .map(curso => `<option value="${escapeAttribute(curso.id)}">${escapeHtml(curso.titulo)}</option>`)
    .join("");

  return `
    <article class="info-panel focus-panel">
      <p class="eyebrow">Core Attention</p>
      <h2>Modo de foco</h2>
      <p>Escolha o tempo de estudo. Ao sair da tela de foco, o tempo é pausado e a saída fica registrada.</p>
      <div class="focus-presets">
        <button class="secondary-button" type="button" data-focus-start="15">15 min</button>
        <button class="secondary-button" type="button" data-focus-start="30">30 min</button>
        <button class="secondary-button" type="button" data-focus-start="60">1 h</button>
        <button class="secondary-button" type="button" data-focus-start="120">2 h</button>
      </div>
      <form class="focus-custom" id="focusCustomForm">
        <label>Outro tempo (minutos)
          <input type="number" name="minutos" min="5" max="480" value="${settings.default_minutes}" />
        </label>
        <label>Curso
          <select name="curso">
            <option value="">Sem curso</option>
            ${opcoesCurso}
          </select>
        </label>
        <button class="primary-button" type="submit">Iniciar com tempo personalizado</button>
      </form>
      <form class="focus-rules" id="focusRulesForm">
        <h3>Regras</h3>
        <label class="focus-check"><input type="checkbox" name="fullscreen" ${settings.fullscreen ? "checked" : ""} /> Abrir em tela cheia</label>
        <label class="focus-check"><input type="checkbox" name="alert" ${settings.alert_tab_switch ? "checked" : ""} /> Pausar quando eu sair da tela</label>
        <label>Tempo padrão (minutos)
          <input type="number" name="padrao" min="5" max="480" value="${settings.default_minutes}" />
        </label>
        <button class="secondary-button" type="submit">Salvar regras</button>
        <p id="focusRulesStatus" class="manual-note"></p>
      </form>
    </article>`;
}

function renderMonitoringSection() {
  const atividade = state.focus?.activity || [];
  const totalSegundos = atividade.reduce((soma, item) => soma + Number(item.seconds || 0), 0);

  return `
    <div class="profile-monitor">
      <p class="eyebrow">Acompanhamento</p>
      <h2>Tempo na plataforma</h2>
      <p class="focus-total">${formatarTempo(totalSegundos)}</p>
      <button class="secondary-button profile-history-button" type="button" data-history-open>Meu histórico</button>
    </div>`;
}

function renderHistoryBody() {
  const atividade = state.focus?.activity || [];
  const porCurso = {};
  atividade.forEach(item => {
    if (!item.course_id) return;
    porCurso[item.course_id] = (porCurso[item.course_id] || 0) + Number(item.seconds || 0);
  });
  const tituloDe = id => state.cursos.find(curso => curso.id === id)?.titulo
    || (state.catalogoCursos || []).find(curso => (curso.offerId || curso.id) === id)?.titulo
    || id;

  const linhasCurso = Object.entries(porCurso)
    .sort((a, b) => b[1] - a[1])
    .map(([id, segundos]) => `<li><span>${escapeHtml(tituloDe(id))}</span><strong>${formatarTempo(segundos)}</strong></li>`)
    .join("") || "<li><span>Nenhum curso aberto ainda.</span></li>";

  const linhasSessao = (state.focus?.sessions || [])
    .map(sessao => `<li><span>${formatDate(sessao.started_at)} · ${escapeHtml(sessao.course_id ? tituloDe(sessao.course_id) : "Sem curso")}</span><strong>${formatarTempo(sessao.focused_seconds)} de ${formatarTempo(sessao.planned_seconds)}${sessao.completed ? " · concluída" : ""} · ${sessao.interruptions} saída(s)</strong></li>`)
    .join("") || "<li><span>Nenhuma sessão de foco ainda.</span></li>";

  return `
    <h3>Por curso</h3>
    <ul class="focus-list">${linhasCurso}</ul>
    <h3>Últimas sessões de foco</h3>
    <ul class="focus-list">${linhasSessao}</ul>
    <p class="manual-note">Este acompanhamento registra o tempo em que a plataforma está aberta e ativa, e o curso visualizado. Ele é usado para acompanhar a sua evolução.</p>`;
}

function openHistoryPopup() {
  const modal = document.createElement("div");
  modal.className = "renewal-offer-backdrop";
  modal.innerHTML = `
    <section class="renewal-offer-modal history-popup" role="dialog" aria-modal="true" aria-labelledby="historyTitle">
      <p class="renewal-offer-kicker">Acompanhamento</p>
      <h2 id="historyTitle">Meu histórico</h2>
      <div class="history-popup-body">${renderHistoryBody()}</div>
      <div class="plan-popup-actions">
        <button class="secondary-button" type="button" data-history-close>Fechar</button>
      </div>
    </section>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector("[data-history-close]").addEventListener("click", close);
  modal.addEventListener("click", event => {
    if (event.target === modal) close();
  });
}


function renderHistoryBody() {
  const atividade = state.focus?.activity || [];
  const porCurso = {};
  atividade.forEach(item => {
    if (!item.course_id) return;
    porCurso[item.course_id] = (porCurso[item.course_id] || 0) + Number(item.seconds || 0);
  });
  const tituloDe = id => state.cursos.find(curso => curso.id === id)?.titulo
    || (state.catalogoCursos || []).find(curso => (curso.offerId || curso.id) === id)?.titulo
    || id;

  const linhasCurso = Object.entries(porCurso)
    .sort((a, b) => b[1] - a[1])
    .map(([id, segundos]) => `<li><span>${escapeHtml(tituloDe(id))}</span><strong>${formatarTempo(segundos)}</strong></li>`)
    .join("") || "<li><span>Nenhum curso aberto ainda.</span></li>";

  const linhasSessao = (state.focus?.sessions || [])
    .map(sessao => `<li><span>${formatDate(sessao.started_at)} · ${escapeHtml(sessao.course_id ? tituloDe(sessao.course_id) : "Sem curso")}</span><strong>${formatarTempo(sessao.focused_seconds)} de ${formatarTempo(sessao.planned_seconds)}${sessao.completed ? " · concluída" : ""} · ${sessao.interruptions} saída(s)</strong></li>`)
    .join("") || "<li><span>Nenhuma sessão de foco ainda.</span></li>";

  return `
    <h3>Por curso</h3>
    <ul class="focus-list">${linhasCurso}</ul>
    <h3>Últimas sessões de foco</h3>
    <ul class="focus-list">${linhasSessao}</ul>
    <p class="manual-note">Este acompanhamento registra o tempo em que a plataforma está aberta e ativa, e o curso visualizado. Ele é usado para acompanhar a sua evolução.</p>`;
}

function openHistoryPopup() {
  const modal = document.createElement("div");
  modal.className = "renewal-offer-backdrop";
  modal.innerHTML = `
    <section class="renewal-offer-modal history-popup" role="dialog" aria-modal="true" aria-labelledby="historyTitle">
      <p class="renewal-offer-kicker">Acompanhamento</p>
      <h2 id="historyTitle">Meu histórico</h2>
      <div class="history-popup-body">${renderHistoryBody()}</div>
      <div class="plan-popup-actions">
        <button class="secondary-button" type="button" data-history-close>Fechar</button>
      </div>
    </section>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector("[data-history-close]").addEventListener("click", close);
  modal.addEventListener("click", event => {
    if (event.target === modal) close();
  });
}


const objetivosPredefinidos = [
  "Metering Specialist",
  "Metering Engineer Specialist",
  "Metering Technician",
  "Metering Engineer",
  "Nenhum"
];
const objetivoPadrao = "Metering Specialist";
const objetivoNenhum = "Nenhum";

function getObjetivoAtual() {
  return state.focus?.goal || objetivoPadrao;
}

async function salvarObjetivo(texto) {
  const { error } = await client.from("student_goals").upsert(
    { student_id: state.aluno.id, goal: texto, updated_at: new Date().toISOString() },
    { onConflict: "student_id" }
  );
  if (error) throw new Error(error.message || "Não foi possível salvar o objetivo.");
  state.focus.goal = texto;
}

function renderGoalPanel() {
  const atual = getObjetivoAtual();
  const predefinido = objetivosPredefinidos.includes(atual);
  const opcoes = objetivosPredefinidos.map(nome => `
      <label class="goal-option">
        <input type="radio" name="objetivo" value="${escapeAttribute(nome)}" ${atual === nome ? "checked" : ""} />
        <span>${escapeHtml(nome)}</span>
      </label>`).join("");

  return `
    <article class="info-panel goal-panel">
      <p class="eyebrow">Objetivo</p>
      <h2>Meu objetivo</h2>
      <p>Escolha o objetivo que você está buscando. Ele aparece no seu painel.</p>
      <form class="goal-form" id="goalForm">
        ${opcoes}
        <label class="goal-option">
          <input type="radio" name="objetivo" value="__outro__" ${predefinido ? "" : "checked"} />
          <span>Outro</span>
        </label>
        <input type="text" name="outro" maxlength="80" placeholder="Escreva seu objetivo" value="${predefinido ? "" : escapeAttribute(atual)}" />
        <button class="primary-button" type="submit">Salvar objetivo</button>
        <p id="goalStatus" class="manual-note"></p>
      </form>
    </article>`;
}

function renderProfile() {
  const iniciais = String(state.aluno.nome || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0].toUpperCase())
    .join("");

  app.innerHTML = `
    <section class="page-header profile-head">
      <div class="profile-avatar ${levelClass(getCreditSummary().level)}">
        ${state.avatarUrl
          ? `<img src="${escapeAttribute(state.avatarUrl)}" alt="Foto do aluno" />`
          : `<span>${escapeHtml(iniciais || "?")}</span>`}
      </div>
      <div class="profile-head-text">
        <p class="eyebrow">Perfil</p>
        <h1>${state.aluno.nome}</h1>
        <p>${state.aluno.email}</p>
        <label class="secondary-button profile-avatar-button">
          Editar foto do perfil
          <input type="file" id="avatarFile" accept="image/jpeg,image/png,image/webp" class="visually-hidden-input" />
        </label>
        <p id="avatarStatus" class="manual-note"></p>
      </div>
      ${renderMonitoringSection()}
    </section>
    <section class="profile-grid">
      <article class="info-panel">
        <h2>Dados do aluno</h2>
        ${(state.membershipOrders || []).some(item => item.plan_code === "mensal" && ["active", "paid", "checkout_open"].includes(item.status))
          ? `<button class="tour-skip" type="button" data-cancel-subscription>Cancelar assinatura mensal</button>`
          : ""}
        <button class="secondary-button" type="button" data-tour-replay>Rever tour do Meu Painel</button>
        <dl>
          <div><dt>ID</dt><dd>${state.aluno.id}</dd></div>
          <div><dt>E-mail</dt><dd>${state.aluno.email}</dd></div>
          <div><dt>Cursos liberados</dt><dd>${state.cursos.length}</dd></div>
          <div><dt>Nível</dt><dd>${getCreditSummary().level}</dd></div>
          <div><dt>Descontos</dt><dd>${(() => {
            const desconto = getLevelDiscount(getCreditSummary().level);
            return desconto
              ? `Ao vivo ${desconto.aoVivo}%${desconto.gravado ? ` · Gravado ${desconto.gravado}%` : ""}`
              : "Sem desconto ainda";
          })()}</dd></div>
        </dl>
      </article>
      ${renderGoalPanel()}
      ${renderFocusSection()}
    </section>
  `;

  document.querySelector("#avatarFile").addEventListener("change", async event => {
    const arquivo = event.currentTarget.files?.[0];
    const status = document.querySelector("#avatarStatus");
    if (!arquivo) return;
    if (arquivo.size > 5 * 1024 * 1024) {
      status.textContent = "A imagem deve ter até 5 MB.";
      return;
    }
    status.textContent = "Enviando foto...";
    try {
      await enviarAvatar(arquivo);
      renderProfile();
      document.querySelector("#avatarStatus").textContent = "Foto atualizada.";
    } catch (error) {
      status.textContent = error.message || "Não foi possível enviar a foto.";
    }
  });
}


async function loadAvatar() {
  const { data } = await client.auth.getSession();
  const uid = data.session?.user?.id;
  state.avatarUid = uid || "";
  state.avatarUrl = "";
  if (!uid) return;

  const bucket = client.storage.from("avatars");
  const { data: arquivos, error } = await bucket.list(uid, { search: "avatar.jpg" });
  if (error) return;
  const arquivo = (arquivos || []).find(item => item.name === "avatar.jpg");
  if (!arquivo) return;

  const { data: publica } = bucket.getPublicUrl(`${uid}/avatar.jpg`);
  state.avatarUrl = `${publica.publicUrl}?v=${encodeURIComponent(arquivo.updated_at || Date.now())}`;
}

async function enviarAvatar(arquivo) {
  if (!state.avatarUid) throw new Error("Sessão expirada. Entre novamente.");

  const imagem = await createImageBitmap(arquivo);
  const lado = 256;
  const escala = Math.max(lado / imagem.width, lado / imagem.height);
  const largura = imagem.width * escala;
  const altura = imagem.height * escala;

  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  canvas.getContext("2d").drawImage(imagem, (lado - largura) / 2, (lado - altura) / 2, largura, altura);
  imagem.close();

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
  const { error } = await client.storage
    .from("avatars")
    .upload(`${state.avatarUid}/avatar.jpg`, blob, { upsert: true, contentType: "image/jpeg" });
  if (error) throw new Error(error.message || "Não foi possível enviar a foto.");

  await loadAvatar();
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
        <p>Créditos disponíveis para participar dos cursos da grade ao vivo.</p>
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
      <p>O Plano Anual concede 3 créditos após a confirmação do pagamento. Uso e ajustes ficam registrados no histórico da plataforma.</p>
    </section>
    <section class="credits-levels">
      <article class="info-panel">
        <p class="eyebrow">Níveis</p>
        <h2>Níveis e descontos</h2>
        <p>Seu nível sobe conforme você conclui cursos. O desconto aparece ao lado de cada categoria.</p>
        ${renderLevelDiscountTable(summary.level)}
        <p class="manual-note">Os descontos serão aplicados por tipo de curso (ao vivo ou gravado) assim que essa classificação estiver ativa na plataforma.</p>
      </article>
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

function renderFlowCoreTools(toolId) {
  document.querySelectorAll("[data-nav-sub]").forEach(link => {
    link.classList.toggle("is-active", link.dataset.navSub === toolId);
  });

  if (!toolId) {
    app.innerHTML = `
      <section class="page-header">
        <p class="eyebrow">The Standard / FlowCore Tools</p>
        <h1>FlowCore Tools</h1>
        <p>Ferramentas práticas para profissionais de medição. Escolha uma ferramenta para abrir.</p>
      </section>

      <section class="tool-cards" aria-label="Ferramentas disponíveis">
        <article class="tool-card">
          <div>
            <span class="type-chip">Medidores de vazão</span>
            <h2>Meter Calibration Calculator</h2>
            <p>Calculadora para calibração de medidores de vazão com saída de pulsos. Informe os valores conhecidos e escolha o que deseja calcular.</p>
          </div>
          <a class="primary-button" href="#flowcore-tools/meter-calibration-calculator">Abrir ferramenta</a>
        </article>

        <article class="tool-card">
          <div>
            <span class="type-chip">Modo inteligente</span>
            <h2>Intelligent calculator</h2>
            <p>Informe todos os valores que você já tem e a ferramenta calcula, de uma vez, todos os resultados possíveis, com fórmulas e validação.</p>
          </div>
          <a class="primary-button" href="#flowcore-tools/intelligent-calculator">Abrir ferramenta</a>
        </article>
      </section>
    `;
    return;
  }

  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">The Standard / FlowCore Tools</p>
      <h1>FlowCore Tools</h1>
      <p>Practical industrial tools for measurement professionals. The first module is a smart calculator for pulsed output flow meter calibration.</p>
    </section>

    <section class="tools-shell">
      <aside class="tools-menu" aria-label="FlowCore Tools menu">
        <span class="type-chip">Available tool</span>
        <a class="${toolId === "meter-calibration-calculator" || toolId === "intelligent-calculator" ? "is-active" : ""}" href="#flowcore-tools/meter-calibration-calculator">
          <strong>Meter Calibration Calculator</strong>
          <small>Pulsed output flow meters</small>
        </a>
      </aside>

      <article class="tool-workspace">
        ${toolId === "intelligent-calculator" ? renderIntelligentPage() : renderSolveForPage()}
      </article>
    </section>
  `;

  if (toolId === "intelligent-calculator") {
    bindMeterCalibrationCalculator();
    bindCertificateUpload();
  } else {
    bindSolveForMode([]);
  }
}

function renderSolveForPage() {
  return `
    <div class="tool-header">
      <div>
        <p class="eyebrow">Pulsed Output Flow Meters</p>
        <h2>Meter Calibration Calculator</h2>
        <p>Selecione a grandeza que deseja calcular. A ferramenta mostra apenas os dados necessários para ela.</p>
      </div>
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

  `;
}

function renderIntelligentPage() {
  return `
    <div class="tool-header">
      <div>
        <p class="eyebrow">Pulsed Output Flow Meters</p>
        <h2>Intelligent calculator</h2>
        <p>Informe os valores que você já tem. A ferramenta verifica todos eles e devolve todos os cálculos possíveis, com fórmulas e validação.</p>
      </div>
      <button class="secondary-button" type="button" data-load-calibration-demo>Load demo data</button>
    </div>

    <section class="certificate-upload" aria-labelledby="certificateTitle">
      <p class="eyebrow">Análise de certificado</p>
      <h2 id="certificateTitle">Enviar certificado em PDF</h2>
      <p>Antes do envio, CPF, CNPJ, e-mails e telefones formatados são ocultados. Você confere o texto antes de enviar. O conteúdo é processado por um serviço de inteligência artificial de terceiros.</p>
      <label class="certificate-dropzone" id="certificateDropzone">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><polyline points="7 9 12 4 17 9"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>
        <strong>Arraste o PDF aqui</strong>
        <span>ou <u>selecione do seu computador</u></span>
        <small id="certificateFileName">Apenas arquivos PDF</small>
        <input type="file" id="certificateFile" accept="application/pdf" />
      </label>
      <div id="certificatePreview" class="certificate-preview" hidden>
        <p class="eyebrow">Texto que será enviado</p>
        <pre id="certificateText"></pre>
        <button class="primary-button" type="button" id="certificateSend">Enviar para análise</button>
      </div>
      <div id="certificateResult" class="certificate-result" aria-live="polite"></div>
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
    </section>  `;
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
  if (!document.querySelector("#solveForForm")) return;
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
  const activeMembership =
    state.membershipOrders.find(order => order.plan_code === "anual" && ["active", "paid"].includes(order.status)) ||
    state.membershipOrders.find(order => order.plan_code === "mensal" && ["active", "paid"].includes(order.status));
  const aiPlanLabel = activeMembership?.plan_code === "anual"
    ? "Plano Anual · uso ilimitado"
    : activeMembership?.plan_code === "mensal"
      ? "Plano Mensal · 10 utilizações por ciclo"
      : "Disponível nos Planos Mensal e Anual";

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
          <p><strong>${escapeHtml(aiPlanLabel)}</strong></p>
        </div>
        <div class="specialist-suggestions">
          <button type="button" data-specialist-question="Explique o conceito principal da aula em linguagem simples.">Explicar conceito</button>
          <button type="button" data-specialist-question="Crie um resumo prático para revisão antes de uma prova ou atividade em campo.">Resumo prático</button>
          <button type="button" data-specialist-question="Monte perguntas e respostas para eu testar meu entendimento.">Testar entendimento</button>
        </div>
      </article>

      <article class="specialist-chat">
        <div id="specialistAnswer" class="specialist-answer">
          <div class="specialist-bubble is-assistant">
            <strong>FlowCore Specialist</strong>
            <p>Envie uma dúvida sobre seus cursos, materiais ou conceitos técnicos. A IA responde com orientação didática e foco operacional, usando o contexto dos cursos liberados.</p>
          </div>
        </div>
        <form id="specialistForm" class="specialist-form">
          <textarea name="question" placeholder="Digite sua dúvida sobre o conteúdo..." rows="1" required></textarea>
          <button class="specialist-mic" id="specialistMic" type="button" aria-label="Falar a pergunta"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg></button>
          <button class="specialist-send" type="submit" aria-label="Enviar pergunta (Enter)"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg></button>
        </form>
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

  const specialistInput = document.querySelector("#specialistForm textarea");
  const specialistThread = document.querySelector("#specialistAnswer");

  function addSpecialistBubble(role, html) {
    const bubble = document.createElement("div");
    bubble.className = `specialist-bubble is-${role}`;
    bubble.innerHTML = html;
    specialistThread.appendChild(bubble);
    specialistThread.scrollTop = specialistThread.scrollHeight;
    return bubble;
  }

  const specialistMic = document.querySelector("#specialistMic");
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionAPI) {
    specialistMic.hidden = true;
  } else {
    const recognition = new SpeechRecognitionAPI();
    let textoAnterior = "";
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = event => {
      const transcricao = Array.from(event.results).map(result => result[0].transcript).join(" ");
      specialistInput.value = `${textoAnterior} ${transcricao}`.trim();
      ajustarCampo();
    };
    recognition.onend = () => specialistMic.classList.remove("is-listening");
    recognition.onerror = () => specialistMic.classList.remove("is-listening");
    specialistMic.addEventListener("click", () => {
      if (specialistMic.classList.contains("is-listening")) {
        recognition.stop();
        return;
      }
      textoAnterior = specialistInput.value.trim();
      specialistMic.classList.add("is-listening");
      recognition.start();
    });
  }

  function ajustarCampo() {
    specialistInput.style.height = "auto";
    specialistInput.style.height = `${Math.min(specialistInput.scrollHeight, 160)}px`;
  }
  specialistInput.addEventListener("input", ajustarCampo);

  specialistInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      document.querySelector("#specialistForm").requestSubmit();
    }
  });

  document.querySelector("#specialistForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const question = specialistInput.value.trim();

    if (!question) return;

    specialistInput.value = "";
    ajustarCampo();
    addSpecialistBubble("user", `<strong>${escapeHtml(state.aluno?.nome || "Aluno")}</strong><p>${escapeHtml(question)}</p>`);
    const pending = addSpecialistBubble("assistant", `<strong>FlowCore Specialist</strong><p>Metrificando e diminuindo as incertezas...</p>`);
    if (submitButton) submitButton.disabled = true;

    try {
      const result = await askFlowCoreSpecialist(question);
      const usageMessage = result.aiUsage?.unlimited
        ? "IA ilimitada no Plano Anual."
        : Number.isFinite(Number(result.aiUsage?.remaining))
          ? `${Number(result.aiUsage.remaining)} de ${Number(result.aiUsage.limit || 10)} utilizações disponíveis neste ciclo.`
          : "";
      pending.innerHTML = `
        <strong>FlowCore Specialist</strong>
        <p>${formatAssistantText(result.answer || "Não recebi uma resposta da IA.")}</p>
        ${usageMessage ? `<small>${escapeHtml(usageMessage)}</small>` : ""}
      `;
    } catch (error) {
      pending.classList.add("is-error");
      pending.innerHTML = `
        <strong>Não foi possível responder agora</strong>
        <p>${escapeHtml(error.message || "Falha na comunicação com o FlowCore Specialist.")}</p>
      `;
    } finally {
      if (submitButton) submitButton.disabled = false;
      specialistInput.focus();
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
  const acessosPagos = getAccessibleCourses().map(curso => ({ curso }));

  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">Financeiro</p>
      <h1>Cursos liberados</h1>
      <p>Esta área mostra somente os cursos liberados para o aluno e o status de pagamento de cada um.</p>
    </section>
    <section class="finance-course-grid" aria-label="Cursos pagos e validade">
      ${acessosPagos.map(renderPaidCourseCard).join("")}
    </section>
  `;
}

function renderPaidCourseCard(item) {
  const curso = item.curso;

  return `
    <article class="finance-course-card">
      <img src="${curso.capa}" alt="" />
      <div class="finance-course-body">
        <div>
          <h2>${curso.titulo}</h2>
          <p>${curso.descricao}</p>
        </div>
        <span class="finance-paid-tag">Pago</span>
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

function renderStoreNotice() {
  const plano = (state.membershipPlans || []).find(item => item.code === state.membershipSelection);
  if (plano) {
    return `
    <div class="store-notice is-lock" role="status">
      <div>
        <strong>Plano ${escapeHtml(plano.name)} escolhido.</strong>
        <span>O carrinho está travado. Para comprar cursos avulsos, desfaça a escolha do plano.</span>
      </div>
      <button class="secondary-button" type="button" data-membership-undo>Desfazer escolha</button>
    </div>`;
  }
  if (state.storeNotice) {
    return `
    <div class="store-notice" role="alert">
      <span>${escapeHtml(state.storeNotice)}</span>
    </div>`;
  }
  return "";
}

function renderStore() {
  const platformAccess = getPlatformAccessState();
  if (platformAccess.expired) {
    renderExpiredMembershipStore(platformAccess);
    return;
  }

  app.innerHTML = `
    <section class="page-header store-head">
      <p class="eyebrow">FlowCore Academy</p>
      <h1>Planos e cursos</h1>
      <p>Escolha um plano de formação para liberar os cursos incluídos nele.</p>
      ${renderCartButton()}
    </section>
    ${renderCartPanel()}
    ${renderStoreNotice()}
    ${state.membershipPlans.length
      ? `<section class="membership-section" aria-labelledby="membershipTitle">
           <div class="section-heading">
             <div>
               <p class="eyebrow">Formação continuada</p>
               <h2 id="membershipTitle">Escolha seu plano</h2>
             </div>
             <p>Os cursos incluídos em cada plano são liberados após a confirmação do pagamento.</p>
           </div>
           <div class="membership-plan-grid">
             ${state.membershipPlans.map(renderMembershipPlanCard).join("")}
           </div>
         </section>`
      : ""}
    <section class="store-courses" aria-labelledby="storeCoursesTitle">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Cursos individuais</p>
          <h2 id="storeCoursesTitle">Cursos disponíveis</h2>
        </div>
        <p>Compre cursos avulsos ou escolha um plano. Não é possível combinar os dois na mesma compra.</p>
      </div>
      <div class="store-course-list">
        ${state.catalogoCursos.map(renderStoreCourseRow).join("")}
      </div>
    </section>
  `;

  bindStoreActions();
}


function renderExpiredMembershipStore(platformAccess) {
  const selectedPlan = state.membershipPlans.find(plan => plan.code === state.membershipSelection);
  const expirationLabel = platformAccess.validUntil ? formatDate(platformAccess.validUntil) : "data encerrada";

  app.innerHTML = `
    <section class="expired-access-banner" role="status">
      <span class="expired-access-chip">Validade vencida</span>
      <h1>Seu acesso venceu em ${escapeHtml(expirationLabel)}</h1>
      <p>Você continua com acesso à plataforma para contratar um novo plano. Os cursos e os demais recursos ficam disponíveis novamente após a confirmação do pagamento.</p>
    </section>
    <section class="membership-section" aria-labelledby="expiredMembershipTitle">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Renove seu acesso</p>
          <h2 id="expiredMembershipTitle">Escolha um plano para continuar</h2>
        </div>
        <p>A liberação é automática após a confirmação do pagamento.</p>
      </div>
      <div class="membership-plan-grid">
        ${state.membershipPlans.map(renderMembershipPlanCard).join("")}
      </div>
    </section>
  `;

  bindStoreActions();
}

function getCartDiscountPercent(quantidade) {
  return Math.min(30, quantidade * 5);
}

function getCartCourses() {
  return state.cart.items
    .map(item => state.catalogoCursos.find(curso => (curso.offerId || curso.id) === item.offerId))
    .filter(Boolean);
}

const stoneCheckoutUrl = ""; // URL do ambiente de pagamento da Stone

function renderStoneCheckoutButton(label) {
  if (!stoneCheckoutUrl) {
    return `<button class="primary-button" type="button" data-checkout-plan="${escapeAttribute(plan.code)}">Seguir com a compra</button>`;
  }
  return `<a class="primary-button" href="${escapeAttribute(stoneCheckoutUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function renderCartIcon(quantidade) {
  const cheio = quantidade > 0;
  return `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 8h14l-1.6 6.6a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8L5.2 5H3" ${cheio ? 'fill="currentColor" fill-opacity="0.22"' : ""}/>
      <circle cx="9.5" cy="19.5" r="1.4"/>
      <circle cx="17" cy="19.5" r="1.4"/>
    </svg>`;
}

function renderCartButton() {
  const quantidade = state.cart.items.length;
  const label = `Carrinho, ${quantidade} ${quantidade === 1 ? "item" : "itens"}`;
  return `
    <button class="store-cart-button" type="button" data-cart-toggle aria-expanded="${state.cart.open ? "true" : "false"}" aria-label="${label}">
      ${renderCartIcon(quantidade)}
      ${quantidade ? `<span class="store-cart-count">${quantidade}</span>` : ""}
    </button>`;
}

function renderCartPanel() {
  if (!state.cart.open) return "";

  const cursos = getCartCourses();
  const quantidade = cursos.length;

  if (!quantidade) {
    return `
      <section class="store-cart" aria-label="Carrinho">
        <div class="store-cart-head">
          <h2>Seu carrinho está vazio</h2>
        </div>
        <p>Adicione cursos abaixo para ver o total.</p>
      </section>`;
  }

  const nivel = getCreditSummary().level;
  const classificado = Boolean(getLevelDiscount(nivel));
  const subtotal = cursos.reduce((soma, curso) => soma + Number(curso.valor || 0), 0);

  let rotuloDesconto;
  let desconto;
  let dica = "";
  let degraus = "";

  if (classificado) {
    desconto = 0;
    rotuloDesconto = "Sem desconto de nível";
    dica = "O desconto por nível vale no Plano Anual.";
  } else {
    const percentual = getCartDiscountPercent(quantidade);
    desconto = subtotal * percentual / 100;
    rotuloDesconto = `Desconto progressivo (${percentual}%)`;
    dica = quantidade < 6
      ? `Adicione mais 1 curso e o desconto sobe para ${getCartDiscountPercent(quantidade + 1)}%.`
      : "Desconto máximo de 30% aplicado.";
    degraus = `
      <div class="store-discount-steps" aria-label="Desconto progressivo">
        ${[1, 2, 3, 4, 5, 6].map(degrau => `<span class="store-discount-step ${quantidade >= degrau ? "is-reached" : ""}">${degrau * 5}%</span>`).join("")}
      </div>`;
  }

  const total = subtotal - desconto;

  return `
    <section class="store-cart" aria-label="Carrinho">
      <div class="store-cart-head">
        <h2>Seu carrinho</h2>
        <span>${quantidade} ${quantidade === 1 ? "curso" : "cursos"}</span>
      </div>
      <ul class="store-cart-items">
        ${cursos.map(curso => `
        <li>
          <span>${escapeHtml(curso.titulo)}</span>
          <div>
            <strong>${formatCurrency(Number(curso.valor || 0))}</strong>
            <button class="text-link" type="button" data-cart-remove="${escapeAttribute(curso.offerId || curso.id)}">Remover</button>
          </div>
        </li>`).join("")}
      </ul>
      ${degraus}
      <dl class="store-cart-summary">
        <div><dt>Subtotal</dt><dd>${formatCurrency(subtotal)}</dd></div>
        <div><dt>${rotuloDesconto}</dt><dd>- ${formatCurrency(desconto)}</dd></div>
        <div class="is-total"><dt>Total</dt><dd>${formatCurrency(total)}</dd></div>
      </dl>
      <p class="store-cart-hint">${dica}</p>
      <button class="primary-button" type="button" data-checkout-cart>Finalizar compra</button>
    </section>`;
}


// Modalidade interna: todos os cursos são "ao vivo", exceto os listados aqui.
const cursosGravados = ["ia-dominio-tecnico"];

function getCourseModalidade(cursoId) {
  return cursosGravados.includes(cursoId) ? "gravado" : "ao_vivo";
}

function getStudentCoursePrice(curso) {
  // O desconto de nível vale só no Plano Anual, então os cursos avulsos não têm desconto de nível.
  const percentual = 0;
  const original = Number(curso.valor || 0);
  return { original, final: original * (1 - percentual / 100), percentual };
}

function renderStoreCourseRow(curso) {
  const owned = state.cursos.some(item => item.id === curso.id);
  const isComingSoon = curso.valor === null || curso.url === "#";
  const priceLabel = isComingSoon ? "Status" : "Valor";
  const priceValue = isComingSoon ? "Em breve" : formatCurrency(curso.valor);
  const modalidadeLabel = getCourseModalidade(curso.id) === "ao_vivo" ? "Ao vivo" : "Gravado";
  const offerId = curso.offerId || curso.id;
  const inCart = state.cart.items.some(item => item.offerId === offerId);
  const travado = Boolean(state.membershipSelection);

  let action;
  if (owned) {
    action = `<a class="primary-button" href="#curso/${escapeAttribute(curso.id)}">Acessar curso</a>`;
  } else if (isComingSoon) {
    action = `<span class="store-tag">Em breve</span>`;
  } else if (travado) {
    action = `<span class="store-tag">Carrinho travado</span>`;
  } else {
    action = `<button class="primary-button" type="button" data-cart-add="${escapeAttribute(offerId)}" ${inCart ? "disabled" : ""}>${inCart ? "No carrinho" : "Adicionar ao carrinho"}</button>`;
  }

  return `
    <article class="store-course-row">
      <img src="${escapeAttribute(curso.capa)}" alt="" />
      <div class="store-course-body">
        <div>
          <span class="status-pill">${owned ? "Já liberado" : escapeHtml(curso.status || "")}</span>
          <span class="store-tag">${modalidadeLabel}</span>
          <h2>${escapeHtml(curso.titulo)}</h2>
          <p>${escapeHtml(curso.descricao)}</p>
        </div>
        <div class="store-course-side">
          <div class="price-row">
            <span>${priceLabel}</span>
            <strong>${priceValue}</strong>
          </div>
          ${action}
        </div>
      </div>
    </article>
  `;
}

function renderPlanPrice(plan, unidade) {
  const valor = Number(plan.amount || 0);
  const nivel = getCreditSummary().level;
  const desconto = plan.code === "anual" ? getLevelDiscount(nivel) : null;
  if (!desconto) {
    return `
        <div class="membership-price">
          <strong>${formatCurrency(valor)}</strong>
          <span>${unidade}</span>
        </div>`;
  }

  const final = valor * (1 - desconto.aoVivo / 100);
  return `
        <div class="membership-price">
          <s>${formatCurrency(valor)}</s>
          <strong>${formatCurrency(final)}</strong>
          <span>${unidade}</span>
        </div>
        <p class="level-discount-note">Desconto de nível ${escapeHtml(nivel)}: ${desconto.aoVivo}% aplicado.</p>`;
}

function renderMembershipPlanCard(plan) {
  const recurring = plan.billing_mode === "recurring";
  const anual = Number(plan.access_days) >= 365;
  const trimestral = Number(plan.access_days) === 90;
  const activeOrder = state.membershipOrders.find(order =>
    order.plan_code === plan.code &&
    ["active", "paid"].includes(order.status) &&
    (!order.valid_until || order.valid_until >= new Date().toISOString().slice(0, 10))
  );
  const detail = recurring
    ? "Cobrança mensal automática no cartão"
    : `Compra única em até ${Number(plan.max_installments || 12)}x sem juros`;
  const eyebrow = recurring ? "Assinatura" : anual ? "Compra anual" : "Compra única";
  const unidade = recurring ? "/mês" : anual ? "/ano" : trimestral ? "/trimestre" : "";

  return `
    <article class="membership-plan-card ${anual ? "is-featured" : ""}">
      ${anual ? `<span class="membership-badge">Melhor condição</span>` : ""}
      <div class="membership-plan-main">
        <p class="eyebrow">${eyebrow}</p>
        <h3>${escapeHtml(plan.name)}</h3>
        <p>${escapeHtml(plan.description)}</p>
        <ul>
          <li>Acesso aos cursos incluídos no plano</li>
          <li>${recurring ? "IA proprietária: 10 utilizações por ciclo mensal" : "IA proprietária ilimitada"}</li>
          ${anual ? `<li>Um novo curso gravado liberado a cada mês</li>` : ""}
          ${Number(plan.initial_credits || 0) > 0
            ? `<li>${Number(plan.initial_credits)} créditos para cursos ao vivo</li>`
            : ""}
          <li>${escapeHtml(detail)}</li>
        </ul>
      </div>
      <div class="membership-plan-side">
        ${renderPlanPrice(plan, unidade)}
        ${activeOrder
          ? `<span class="membership-active">Plano vigente até ${formatDate(activeOrder.valid_until)}</span>`
          : `<button class="primary-button" type="button" data-membership-select="${escapeAttribute(plan.code)}">Escolher ${escapeHtml(plan.name)}</button>`}
      </div>
    </article>
  `;
}


function openPlanPopup(planCode) {
  const plan = state.membershipPlans.find(item => item.code === planCode);
  if (!plan) return;

  const recurring = plan.billing_mode === "recurring";
  const backdrop = document.createElement("div");
  backdrop.className = "renewal-offer-backdrop";
  backdrop.innerHTML = `
    <section class="renewal-offer-modal plan-popup" role="dialog" aria-modal="true" aria-labelledby="planPopupTitle">
      <p class="renewal-offer-kicker">${recurring ? "Assinatura mensal" : "Compra única"}</p>
      <h2 id="planPopupTitle">${escapeHtml(plan.name)}</h2>
      <div class="plan-popup-price">
        <strong>${formatCurrency(Number(plan.amount || 0))}</strong>
        <span>${recurring ? "cobrado mensalmente" : `em até ${Number(plan.max_installments || 12)}x sem juros`}</span>
      </div>
      <p class="plan-popup-text">Você será redirecionado ao ambiente seguro de pagamento. A compra será concluída em uma nova aba.</p>
      <p id="planPopupStatus" class="manual-note"></p>
      <div class="plan-popup-actions">
        <button class="secondary-button" type="button" data-plan-popup-close>Cancelar</button>
        <button class="primary-button" type="button" data-checkout-plan="${escapeAttribute(plan.code)}">Seguir com a compra</button>
      </div>
    </section>
  `;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.querySelector("[data-plan-popup-close]").addEventListener("click", close);
  backdrop.addEventListener("click", event => {
    if (event.target === backdrop) close();
  });
}

function renderMembershipCheckout(plan) {
  const recurring = plan.billing_mode === "recurring";
  return `
    <div>
      <p class="eyebrow">${recurring ? "Assinatura mensal" : "Compra anual"}</p>
      <h2>${escapeHtml(plan.name)}</h2>
    </div>
    <div class="selected-membership-summary">
      <strong>${formatCurrency(Number(plan.amount || 0))}</strong>
      <span>${recurring ? "cobrado mensalmente" : `em até ${Number(plan.max_installments || 12)}x sem juros`}</span>
    </div>
    <div class="checkout-actions">
      ${renderStoneCheckoutButton("Ir para o pagamento")}
      <button class="text-link" type="button" data-membership-cancel>${getPlatformAccessState().expired ? "Escolher outro plano" : "Voltar aos planos"}</button>
    </div>

  `;
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

  document.querySelectorAll("[data-cart-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      state.cart.open = !state.cart.open;
      renderStore();
    });
  });

  document.querySelectorAll("[data-cart-remove]").forEach(button => {
    button.addEventListener("click", () => removeOfferFromCart(button.dataset.cartRemove));
  });

  document.querySelector("#checkoutForm")?.addEventListener("submit", createPagarmeCheckout);
  document.querySelector("#membershipCheckoutForm")?.addEventListener("submit", createPagarmeMembershipCheckout);

  document.querySelectorAll("[data-membership-select]").forEach(button => {
    button.addEventListener("click", () => {
      const codigo = button.dataset.membershipSelect || "";
      if (state.cart.items.length) {
        state.storeNotice = "Seu carrinho já tem cursos. Remova os cursos ou finalize a compra antes de escolher um plano.";
        renderStore();
        return;
      }
      state.membershipSelection = codigo;
      state.storeNotice = "";
      renderStore();
      openPlanPopup(codigo);
    });
  });

  document.querySelector("[data-membership-cancel]")?.addEventListener("click", () => {
    state.membershipSelection = "";
    state.cart.status = "";
    state.cart.error = "";
    renderStore();
  });
}

function addOfferToCart(offerId) {
  if (state.membershipSelection) {
    state.storeNotice = "O carrinho está travado pelo plano escolhido. Desfaça a escolha do plano para comprar cursos avulsos.";
    renderStore();
    return;
  }
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

async function createPagarmeMembershipCheckout(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const planCode = String(form.dataset.planCode || "");
  const formData = Object.fromEntries(new FormData(form).entries());
  state.cart.status = "Criando checkout seguro...";
  state.cart.error = "";
  renderStore();

  try {
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sessao expirada. Entre novamente.");

    const response = await fetch(`${FLOWCORE_SUPABASE_URL}/functions/v1/create-pagarme-membership-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        planCode,
        customer: {
          document: String(formData.document || "").replace(/\D/g, ""),
          phone: String(formData.phone || "").replace(/\D/g, "")
        },
        successUrl: `${window.location.origin}${window.location.pathname}#creditos`,
        cancelUrl: `${window.location.origin}${window.location.pathname}#comprar`
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Nao foi possivel criar o checkout do plano.");
    if (!payload.paymentUrl) throw new Error("O Pagar.me nao retornou a URL de pagamento.");

    state.cart.status = "Checkout criado. Redirecionando para pagamento...";
    state.cart.error = "";
    window.location.href = payload.paymentUrl;
  } catch (error) {
    state.cart.status = "";
    state.cart.error = error.message || "Erro ao iniciar checkout do plano.";
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
    // Todas as aulas do curso contam. O curso só fica concluído com 100% das aulas marcadas.
    const measurableMaterials = (curso.materiais || []).filter(item => item.tipo !== "certificado");
    if (!measurableMaterials.length) {
      curso.progresso = 0;
      curso.aulasTotal = 0;
      curso.aulasConcluidas = 0;
      return;
    }

    const completedCount = measurableMaterials.filter(item => isMaterialCompleted(item.id)).length;
    curso.aulasTotal = measurableMaterials.length;
    curso.aulasConcluidas = completedCount;
    if (completedCount === measurableMaterials.length) {
      curso.progresso = 100;
      return;
    }
    curso.progresso = Math.min(99, Math.round((completedCount / measurableMaterials.length) * 100));
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
  const credits = Number.isFinite(Number(state.creditBalance))
    ? Number(state.creditBalance)
    : active && startDate
      ? Math.floor(monthsBetween(startDate, new Date()) / 4)
      : 0;

  return {
    active,
    credits: Math.max(0, credits),
    completedTrainings,
    level: getStudentLevel(state.cursos.length),
    startLabel: startDate ? formatDate(startDate.toISOString().slice(0, 10)) : "Sem assinatura registrada"
  };
}

function getStudentLevel(completedTrainings) {
  if (completedTrainings >= 8) return "Diamante";
  if (completedTrainings >= 5) return "Ouro";
  if (completedTrainings >= 4) return "Prata";
  if (completedTrainings >= 3) return "Bronze";
  return "Em formação";
}

const studentLevelDiscounts = {
  Bronze: { aoVivo: 7, gravado: 0 },
  Prata: { aoVivo: 15, gravado: 5 },
  Ouro: { aoVivo: 20, gravado: 10 },
  Diamante: { aoVivo: 30, gravado: 15 }
};

function getLevelDiscount(nivel) {
  return studentLevelDiscounts[nivel] || null;
}

function levelClass(nivel) {
  const slug = String(nivel || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  return `level-${slug}`;
}

function renderLevelDiscountTable(nivelAtual) {
  const niveis = [
    ["Bronze", "3 cursos"],
    ["Prata", "4 cursos"],
    ["Ouro", "5 a 7 cursos"],
    ["Diamante", "8 ou mais cursos"]
  ];
  const linhas = niveis.map(([nome, criterio]) => {
    const desconto = studentLevelDiscounts[nome];
    return `
      <tr class="${nome === nivelAtual ? "is-current" : ""}">
        <td>${nome}</td>
        <td>${criterio}</td>
        <td>${desconto.aoVivo}%</td>
        <td>${desconto.gravado ? `${desconto.gravado}%` : "—"}</td>
      </tr>`;
  }).join("");

  return `
    <table class="level-table">
      <thead>
        <tr><th>Nível</th><th>Critério</th><th>Ao vivo</th><th>Gravado</th></tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>`;
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

function showRenewalOfferOnce() {
  if (!state.aluno?.id) return false;

  const expiringAccess = getExpiringPlatformAccess(3);
  if (!expiringAccess) return false;

  const storageKey = `${renewalOfferSeenPrefix}:${state.aluno.id}`;
  if (sessionStorage.getItem(storageKey)) return false;
  sessionStorage.setItem(storageKey, new Date().toISOString());

  const daysRemaining = daysUntilDate(expiringAccess.validUntil);
  const deadlineMessage = daysRemaining === 0
    ? "Seu acesso vence hoje."
    : `Seu acesso vence em ${daysRemaining} dia${daysRemaining === 1 ? "" : "s"}.`;

  const modal = document.createElement("div");
  modal.className = "renewal-offer-backdrop";
  modal.innerHTML = `
    <section class="renewal-offer-modal" role="dialog" aria-modal="true" aria-labelledby="renewalOfferTitle" aria-describedby="renewalOfferDescription">
      <button class="renewal-offer-close" type="button" aria-label="Fechar oferta">&times;</button>
      <span class="renewal-offer-kicker">Condição especial para ex-aluno</span>
      <h2 id="renewalOfferTitle">Continue com acesso à plataforma</h2>
      <p class="renewal-offer-deadline">${deadlineMessage}</p>
      <p id="renewalOfferDescription">Renove agora e mantenha seu acesso aos conteúdos da FlowCore Academy por mais 3 meses.</p>
      <div class="renewal-offer-price">
        <span>3 meses de acesso por</span>
        <strong>R$ 119,90</strong>
        <small>Pagamento em até 12x no cartão</small>
      </div>
      <a class="primary-button renewal-offer-cta" href="${renewalOfferPaymentUrl}" target="_blank" rel="noopener noreferrer">Garantir mais 3 meses</a>
      <button class="renewal-offer-later" type="button">Agora não</button>
    </section>
  `;

  const closeModal = () => {
    modal.remove();
    document.removeEventListener("keydown", closeOnEscape);
  };
  const closeOnEscape = event => {
    if (event.key === "Escape") closeModal();
  };

  modal.querySelector(".renewal-offer-close").addEventListener("click", closeModal);
  modal.querySelector(".renewal-offer-later").addEventListener("click", closeModal);
  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", closeOnEscape);
  document.body.appendChild(modal);
  modal.querySelector(".renewal-offer-cta")?.focus();
  return true;
}

function getExpiringPlatformAccess(days) {
  const membershipExpirationDates = state.membershipOrders
    .filter(order => ["active", "paid"].includes(order.status))
    .map(order => order.valid_until)
    .filter(Boolean)
    .filter(value => daysUntilDate(value) >= 0)
    .sort();

  if (membershipExpirationDates.length) {
    const membershipValidUntil = membershipExpirationDates[membershipExpirationDates.length - 1];
    return daysUntilDate(membershipValidUntil) <= days
      ? { validUntil: membershipValidUntil, source: "membership" }
      : null;
  }

  const courseExpirationDates = state.cursos
    .map(course => course.validade_ate)
    .filter(Boolean)
    .filter(value => daysUntilDate(value) >= 0);

  if (!courseExpirationDates.length) return null;

  courseExpirationDates.sort();
  const platformValidUntil = courseExpirationDates[courseExpirationDates.length - 1];
  return daysUntilDate(platformValidUntil) <= days
    ? { validUntil: platformValidUntil, source: "course_access" }
    : null;
}

function daysUntilDate(value) {
  const match = String(value || "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return Number.POSITIVE_INFINITY;

  const today = new Date();
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetDay = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Math.round((targetDay.getTime() - currentDay.getTime()) / 86400000);
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

const certificateAnalysisFunction = "flowcore-certificate-analysis";
let pdfJsPromise = null;

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfJsPromise) {
    pdfJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error("Não foi possível carregar o leitor de PDF."));
      document.head.appendChild(script);
    });
  }
  return pdfJsPromise;
}

async function extrairTextoPdf(file) {
  const pdfjs = await loadPdfJs();
  const documento = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let texto = "";
  for (let numero = 1; numero <= documento.numPages; numero += 1) {
    const pagina = await documento.getPage(numero);
    const conteudo = await pagina.getTextContent();
    texto += conteudo.items.map(item => item.str).join(" ") + "\n";
  }
  return texto.trim();
}

function bindCertificateUpload() {
  const input = document.querySelector("#certificateFile");
  if (!input) return;

  const dropzone = document.querySelector("#certificateDropzone");
  const fileName = document.querySelector("#certificateFileName");
  dropzone.addEventListener("dragover", event => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
  dropzone.addEventListener("drop", event => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
    const arquivo = event.dataTransfer?.files?.[0];
    if (!arquivo) return;
    if (arquivo.type !== "application/pdf") {
      fileName.textContent = "Envie um arquivo PDF";
      return;
    }
    const transferencia = new DataTransfer();
    transferencia.items.add(arquivo);
    input.files = transferencia.files;
    input.dispatchEvent(new Event("change"));
  });
  input.addEventListener("change", () => {
    fileName.textContent = input.files?.[0]?.name || "Apenas arquivos PDF";
  });
  const preview = document.querySelector("#certificatePreview");
  const textoEl = document.querySelector("#certificateText");
  const sendButton = document.querySelector("#certificateSend");
  const result = document.querySelector("#certificateResult");
  let textoOculto = "";

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    preview.hidden = true;
    result.innerHTML = "";
    textoOculto = "";
    if (!file) return;

    result.innerHTML = "<p>Lendo o PDF...</p>";
    try {
      const texto = await extrairTextoPdf(file);
      textoOculto = ocultarDadosPessoais(texto);
      textoEl.textContent = textoOculto || "Não encontrei texto neste PDF. Se for uma imagem digitalizada, o texto não pode ser lido.";
      sendButton.disabled = !textoOculto;
      preview.hidden = false;
      result.innerHTML = "";
    } catch (error) {
      result.innerHTML = `<p class="is-error">${escapeHtml(error.message || "Não foi possível ler o PDF.")}</p>`;
    }
  });

  sendButton.addEventListener("click", async () => {
    const termoAceito = await confirmarTermoIA();
    if (!termoAceito) return;

    sendButton.disabled = true;
    result.innerHTML = "<p>Analisando o certificado...</p>";
    try {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Entre novamente.");

      const response = await fetch(`${FLOWCORE_SUPABASE_URL}/functions/v1/${certificateAnalysisFunction}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ texto: textoOculto })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Falha na análise. Status ${response.status}.`);

      result.innerHTML = `
        <strong>Análise do certificado</strong>
        <p>${formatAssistantText(payload.answer || "Não recebi uma resposta da IA.")}</p>
      `;
    } catch (error) {
      result.innerHTML = `<p class="is-error">${escapeHtml(error.message || "Falha na comunicação com a análise.")}</p>`;
    } finally {
      sendButton.disabled = !textoOculto;
    }
  });
}

// Notificações: lista, contador não lido e alerta de mensagem nova
let notificationsTimer = null;

function mostrarAvisoNotificacao(quantidade) {
  const badge = document.querySelector("#notificationBadge");
  if (badge) {
    badge.classList.remove("is-new");
    void badge.offsetWidth;
    badge.classList.add("is-new");
  }

  const aviso = document.createElement("a");
  aviso.className = "notify-toast";
  aviso.href = "#notificacoes";
  aviso.textContent = quantidade === 1
    ? "Você tem uma nova mensagem"
    : `Você tem ${quantidade} novas mensagens`;
  document.body.appendChild(aviso);
  setTimeout(() => aviso.remove(), 6000);
}

async function marcarNotificacoesLidas(ids) {
  const pendentes = (state.notifications || []).filter(item => ids.includes(item.id) && !item.lida);
  if (!pendentes.length) return;
  pendentes.forEach(item => { item.lida = true; });
  atualizarBadgeNotificacoes();
  await client.from("notification_reads").upsert(
    pendentes.map(item => ({
      notification_id: item.id,
      student_id: state.aluno.id,
      read_at: new Date().toISOString()
    })),
    { onConflict: "notification_id,student_id" }
  );
}

document.addEventListener("click", event => {
  const linha = event.target.closest("[data-notification-id]");
  if (!linha || !document.querySelector(".mail-layout")) return;
  state.notificationSelectedId = linha.dataset.notificationId;
  renderNotifications();
});

function iniciarNotificacoes() {
  if (notificationsTimer) return;
  notificationsTimer = setInterval(() => loadNotifications().catch(() => {}), 60000);
}

// Versão atual e histórico de novidades. Para uma nova versão, suba tourVersion e adicione um item em versionNotes.
const tourVersion = "2.0.0";
const versionNotes = [
  {
    version: "2.0.0",
    changes: [
      "Meu Painel com saudação, previsão do tempo, seu objetivo e a jornada dos cursos.",
      "Meu objetivo, com opções predefinidas e campo livre.",
      "Core Attention: sessões de foco com acompanhamento de tempo na plataforma.",
      "Níveis Bronze, Prata, Ouro e Diamante, com descontos no Plano Anual.",
      "Planos e cursos com plano trimestral e compra pelo WhatsApp.",
      "FlowCore Tools com análise de certificado em PDF.",
      "FlowCore Specialist com entrada por voz.",
      "Notificações com aviso de mensagem nova."
    ]
  }
];

const tourSteps = [
  { selector: ".cockpit-head-row h1", title: "Meu Painel", text: "Aqui você vê a sua saudação, a data, a previsão do tempo e a sua foto." },
  { selector: ".cockpit-goal", title: "Seu objetivo", text: "Mostra a meta que você escolheu no perfil e o seu avanço, conforme as aulas assistidas." },
  { selector: ".cockpit-journey", title: "Sua jornada", text: "Os cursos liberados aparecem primeiro, com o status de cada um. Os sugeridos mostram o que ainda pode conquistar." },
  { selector: "[data-nav='notificacoes']", title: "Notificações", text: "As mensagens da equipe FlowCore chegam aqui. O contador mostra quantas você ainda não leu." },
  { selector: ".cockpit-avatar", title: "Seu perfil", text: "No perfil você troca a foto, define o objetivo e acompanha o Core Attention e o seu histórico." }
];
let tourOpen = false;

function compareVersions(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const diferenca = (pa[i] || 0) - (pb[i] || 0);
    if (diferenca) return diferenca;
  }
  return 0;
}

async function loadTourStatus() {
  state.tourVersionSeen = null;
  state.tourSeen = false;
  if (!state.aluno?.id) return;
  const { data, error } = await client.from("student_tours")
    .select("tour_version")
    .eq("student_id", state.aluno.id)
    .maybeSingle();
  if (error) return;
  state.tourVersionSeen = data?.tour_version || null;
  state.tourSeen = state.tourVersionSeen === tourVersion;
}

async function marcarTourVisto() {
  state.tourVersionSeen = tourVersion;
  state.tourSeen = true;
  await client.from("student_tours").upsert(
    { student_id: state.aluno.id, tour_version: tourVersion, seen_at: new Date().toISOString() },
    { onConflict: "student_id" }
  );
}

function abrirCartaoCentral(html, { comFundo = false, rotulo = "" } = {}) {
  const fundo = document.createElement("div");
  fundo.className = `tour-backdrop ${comFundo ? "is-dimmed" : ""}`;
  const cartao = document.createElement("section");
  cartao.className = "tour-card";
  cartao.setAttribute("role", "dialog");
  cartao.setAttribute("aria-label", rotulo);
  cartao.innerHTML = html;
  fundo.appendChild(cartao);
  document.body.appendChild(fundo);
  return { fundo, cartao };
}

function posicionarCartaoDoTour(cartao, alvo, primeiraVez) {
  const margem = 16;
  const largura = cartao.offsetWidth;
  const altura = cartao.offsetHeight;
  let left;
  let top;

  if (!alvo) {
    left = (window.innerWidth - largura) / 2;
    top = (window.innerHeight - altura) / 2;
  } else {
    const r = alvo.getBoundingClientRect();
    top = r.bottom + margem;
    if (top + altura > window.innerHeight - margem) top = r.top - altura - margem;
    if (top < margem) top = Math.max(margem, (window.innerHeight - altura) / 2);
    left = r.left + r.width / 2 - largura / 2;
  }

  left = Math.max(margem, Math.min(left, window.innerWidth - largura - margem));
  top = Math.max(margem, Math.min(top, window.innerHeight - altura - margem));

  cartao.style.transition = primeiraVez ? "none" : "left 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)";
  cartao.style.left = `${left}px`;
  cartao.style.top = `${top}px`;
}

function iniciarTour() {
  if (tourOpen) return;
  const passos = tourSteps.filter(passo => document.querySelector(passo.selector));
  if (!passos.length) return;

  tourOpen = true;
  let atual = 0;
  let primeiraVez = true;
  const { fundo, cartao } = abrirCartaoCentral(`
    <div class="tour-dots" data-tour-dots></div>
    <p class="eyebrow" data-tour-count></p>
    <h2 data-tour-title></h2>
    <p data-tour-text></p>
    <div class="tour-actions">
      <button class="tour-skip" type="button" data-tour-skip>Pular tour</button>
      <button class="primary-button" type="button" data-tour-next></button>
    </div>`, { rotulo: "Tour do Meu Painel" });
  fundo.classList.add("is-transparent");
  cartao.classList.add("is-floating");

  const limparDestaque = () => {
    document.querySelectorAll(".tour-highlight").forEach(el => el.classList.remove("tour-highlight"));
  };

  const mostrar = () => {
    limparDestaque();
    const passo = passos[atual];
    const alvo = document.querySelector(passo.selector);
    alvo?.classList.add("tour-highlight");
    cartao.querySelector("[data-tour-dots]").innerHTML = passos
      .map((_, indice) => `<span class="${indice <= atual ? "is-on" : ""}"></span>`).join("");
    cartao.querySelector("[data-tour-count]").textContent = `Passo ${atual + 1} de ${passos.length}`;
    cartao.querySelector("[data-tour-title]").textContent = passo.title;
    cartao.querySelector("[data-tour-text]").textContent = passo.text;
    cartao.querySelector("[data-tour-next]").textContent = atual === passos.length - 1 ? "Concluir" : "Próximo";

    if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    // espera o scroll terminar para medir a posição do elemento
    setTimeout(() => {
      posicionarCartaoDoTour(cartao, alvo, primeiraVez);
      primeiraVez = false;
    }, alvo ? 380 : 0);
  };

  const fechar = () => {
    limparDestaque();
    window.removeEventListener("resize", reposicionar);
    fundo.remove();
    tourOpen = false;
    marcarTourVisto().catch(() => {});
  };

  const reposicionar = () => {
    const alvo = document.querySelector(passos[atual].selector);
    posicionarCartaoDoTour(cartao, alvo, true);
  };
  window.addEventListener("resize", reposicionar);

  cartao.querySelector("[data-tour-skip]").addEventListener("click", fechar);
  cartao.querySelector("[data-tour-next]").addEventListener("click", () => {
    if (atual === passos.length - 1) fechar();
    else {
      atual += 1;
      mostrar();
    }
  });
  mostrar();
}

// Mostra o que mudou desde a última versão que o aluno viu
function iniciarNovidades(versaoVista) {
  if (tourOpen) return;
  const notas = versionNotes
    .filter(nota => compareVersions(nota.version, versaoVista) > 0 && compareVersions(nota.version, tourVersion) <= 0)
    .sort((a, b) => compareVersions(b.version, a.version));
  if (!notas.length) {
    marcarTourVisto().catch(() => {});
    return;
  }

  tourOpen = true;
  const { fundo, cartao } = abrirCartaoCentral(`
    <p class="eyebrow">Novidades</p>
    <h2>O que mudou na plataforma</h2>
    <div class="novidades-list">
      ${notas.map(nota => `
        <div>
          <strong>Versão ${escapeHtml(nota.version)}</strong>
          <ul>${nota.changes.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>`).join("")}
    </div>
    <div class="tour-actions">
      <button class="text-link" type="button" data-novidades-tour>Ver tour</button>
      <button class="primary-button" type="button" data-novidades-ok>Entendi</button>
    </div>`, { comFundo: true, rotulo: "O que mudou" });

  const fechar = () => {
    fundo.remove();
    tourOpen = false;
    marcarTourVisto().catch(() => {});
  };
  cartao.querySelector("[data-novidades-ok]").addEventListener("click", fechar);
  cartao.querySelector("[data-novidades-tour]").addEventListener("click", () => {
    fechar();
    setTimeout(() => iniciarTour(), 300);
  });
}

document.addEventListener("click", event => {
  if (!event.target.closest("[data-tour-replay]")) return;
  window.location.hash = "#dashboard";
  setTimeout(() => iniciarTour(), 500);
});

// Banner de mensagem prioritária no topo do Meu Painel (aparece até o aluno fechar)
document.addEventListener("click", event => {
  const botao = event.target.closest("[data-priority-close]");
  if (!botao) return;
  const banner = botao.closest(".priority-banner");
  const id = banner?.dataset.priorityId;
  banner?.remove();
  if (id) marcarNotificacoesLidas([id]).catch(() => {});
});

function atualizarBadgeNotificacoes() {
  const badge = document.querySelector("#notificationBadge");
  if (!badge) return;
  const naoLidas = (state.notifications || []).filter(item => !item.lida && !item.apagada).length;
  badge.textContent = naoLidas > 99 ? "99+" : String(naoLidas);
  badge.hidden = naoLidas === 0;
}

function renderPriorityBanner() {
  const pendente = (state.notifications || []).find(item => item.priority === "prioritaria" && !item.lida && !item.apagada);
  if (!pendente) return "";
  return `
      <section class="priority-banner" role="status" data-priority-id="${escapeAttribute(pendente.id)}">
        <div class="priority-banner-text">
          <p class="eyebrow">Aviso importante</p>
          <strong>${escapeHtml(pendente.title)}</strong>
          <p>${formatAssistantText(pendente.body || "")}</p>
        </div>
        <button class="priority-close" type="button" data-priority-close aria-label="Fechar aviso">Fechar</button>
      </section>`;
}


async function loadNotifications() {
  if (!state.aluno?.id) return;
  const anteriores = (state.notifications || []).filter(item => !item.lida && !item.apagada).length;

  const [mensagens, leituras] = await Promise.all([
    client.from("notifications")
      .select("id,title,body,created_at,priority")
      .order("created_at", { ascending: false })
      .limit(50),
    client.from("notification_reads")
      .select("notification_id,deleted_at,purged_at")
      .eq("student_id", state.aluno.id)
  ]);
  if (mensagens.error) return;

  const registros = new Map((leituras.data || []).map(item => [item.notification_id, item]));
  state.notifications = (mensagens.data || [])
    .filter(item => !registros.get(item.id)?.purged_at)
    .map(item => {
      const registro = registros.get(item.id);
      return {
        ...item,
        lida: Boolean(registro),
        apagada: Boolean(registro?.deleted_at)
      };
    });
  atualizarBadgeNotificacoes();

  const naoLidas = state.notifications.filter(item => !item.lida && !item.apagada).length;
  if (naoLidas > anteriores && location.hash !== "#notificacoes") {
    mostrarAvisoNotificacao(naoLidas - anteriores);
  }
}

async function alterarLixeira(id, paraLixeira) {
  const item = (state.notifications || []).find(mensagem => mensagem.id === id);
  if (!item) return;
  item.apagada = paraLixeira;
  item.lida = true;
  atualizarBadgeNotificacoes();
  await client.from("notification_reads").upsert(
    {
      notification_id: id,
      student_id: state.aluno.id,
      read_at: new Date().toISOString(),
      deleted_at: paraLixeira ? new Date().toISOString() : null
    },
    { onConflict: "notification_id,student_id" }
  );
}

async function excluirDefinitivamente(id) {
  state.notifications = (state.notifications || []).filter(mensagem => mensagem.id !== id);
  atualizarBadgeNotificacoes();
  const agora = new Date().toISOString();
  await client.from("notification_reads").upsert(
    { notification_id: id, student_id: state.aluno.id, read_at: agora, deleted_at: agora, purged_at: agora },
    { onConflict: "notification_id,student_id" }
  );
}

function renderNotifications() {
  const todas = state.notifications || [];
  const caixa = todas.filter(item => !item.apagada);
  const lixeira = todas.filter(item => item.apagada);
  const lista = state.notificationShowDeleted ? lixeira : caixa;

  if (!lista.some(item => item.id === state.notificationSelectedId)) {
    state.notificationSelectedId = lista[0]?.id || null;
  }
  const selecionada = todas.find(item => item.id === state.notificationSelectedId);
  if (selecionada && !selecionada.lida) {
    marcarNotificacoesLidas([selecionada.id]).catch(() => {});
  }
  const naoLidas = caixa.filter(item => !item.lida).length;

  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">Comunicados</p>
      <h1>${state.notificationShowDeleted ? "Lixeira" : "Notificações"}</h1>
      <p>${state.notificationShowDeleted
        ? (lixeira.length ? "Mensagens apagadas. Você pode restaurar ou excluir de vez." : "A lixeira está vazia.")
        : (naoLidas === 0 ? "Você não tem mensagens não lidas." : `${naoLidas} ${naoLidas === 1 ? "mensagem não lida" : "mensagens não lidas"}.`)}</p>
    </section>
    ${lista.length
      ? `<section class="mail-layout">
           <div>
             <ul class="mail-list" aria-label="${state.notificationShowDeleted ? "Lixeira" : "Mensagens"}">
               ${lista.map(item => `
                 <li>
                   <button type="button" class="mail-row ${item.lida ? "is-read" : "is-unread"} ${item.id === state.notificationSelectedId ? "is-selected" : ""} ${item.apagada ? "is-deleted" : ""}" data-notification-id="${escapeAttribute(item.id)}">
                     <span class="mail-status">${item.apagada ? "Lixeira" : item.lida ? "Lida" : "Não lida"}</span>
                     <strong>${escapeHtml(item.title)}</strong>
                     <small>${formatDate(String(item.created_at).slice(0, 10))}</small>
                   </button>
                 </li>`).join("")}
             </ul>
             <button class="text-link mail-toggle" type="button" data-notification-toggle-deleted>
               ${state.notificationShowDeleted ? "Voltar às mensagens" : `Lixeira (${lixeira.length})`}
             </button>
           </div>
           <article class="mail-reader" aria-live="polite">
             ${selecionada
               ? `<div class="mail-reader-head">
                    <div>
                      <p class="eyebrow">${selecionada.priority === "prioritaria" ? "Prioritária" : "Mensagem"} · ${formatDate(String(selecionada.created_at).slice(0, 10))}</p>
                      <h2>${escapeHtml(selecionada.title)}</h2>
                    </div>
                    ${selecionada.apagada
                      ? `<div class="mail-reader-actions">
                           <button class="secondary-button" type="button" data-notification-restore="${escapeAttribute(selecionada.id)}">Restaurar</button>
                           <button class="tour-skip" type="button" data-notification-purge="${escapeAttribute(selecionada.id)}">Excluir de vez</button>
                         </div>`
                      : `<button class="tour-skip" type="button" data-notification-delete="${escapeAttribute(selecionada.id)}">Apagar</button>`}
                  </div>
                  <div class="mail-body">${formatAssistantText(selecionada.body || "")}</div>`
               : ""}
           </article>
         </section>`
      : `<article class="empty-state compact">
           <h2>${state.notificationShowDeleted ? "A lixeira está vazia" : "Nenhuma notificação"}</h2>
           <p>${state.notificationShowDeleted ? "Mensagens apagadas aparecem aqui." : "Quando houver uma mensagem para você, ela aparece aqui."}</p>
           ${state.notificationShowDeleted
             ? `<button class="secondary-button" type="button" data-notification-toggle-deleted>Voltar às mensagens</button>`
             : ""}
         </article>`}
  `;
}

document.addEventListener("click", event => {
  const apagar = event.target.closest("[data-notification-delete]");
  if (apagar) {
    const id = apagar.dataset.notificationDelete;
    const caixa = (state.notifications || []).filter(item => !item.apagada);
    const posicao = caixa.findIndex(item => item.id === id);
    const proxima = caixa[posicao + 1] || caixa[posicao - 1];
    alterarLixeira(id, true).catch(() => {});
    state.notificationSelectedId = proxima?.id || null;
    renderNotifications();
    return;
  }

  const restaurar = event.target.closest("[data-notification-restore]");
  if (restaurar) {
    alterarLixeira(restaurar.dataset.notificationRestore, false).catch(() => {});
    state.notificationSelectedId = restaurar.dataset.notificationRestore;
    renderNotifications();
    return;
  }

  const purgar = event.target.closest("[data-notification-purge]");
  if (purgar) {
    if (!window.confirm("Excluir esta mensagem de vez? Ela não poderá ser restaurada.")) return;
    const id = purgar.dataset.notificationPurge;
    const lixeira = (state.notifications || []).filter(item => item.apagada && item.id !== id);
    excluirDefinitivamente(id).catch(() => {});
    state.notificationSelectedId = lixeira[0]?.id || null;
    renderNotifications();
    return;
  }

  if (event.target.closest("[data-notification-toggle-deleted]")) {
    state.notificationShowDeleted = !state.notificationShowDeleted;
    state.notificationSelectedId = null;
    renderNotifications();
  }
});

document.addEventListener("click", event => {
  if (!event.target.closest("[data-membership-undo]")) return;
  state.membershipSelection = "";
  state.storeNotice = "";
  renderStore();
});

// Checkout único: o servidor calcula o valor e devolve o link de pagamento.
async function criarLinkDeCompra(payload) {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const resposta = await fetch(`${FLOWCORE_SUPABASE_URL}/functions/v1/create-checkout`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok || !dados.paymentUrl) {
    throw new Error(dados.error || "Não foi possível iniciar a compra.");
  }
  return dados.paymentUrl;
}

// Abre o pagamento em nova aba. A aba é aberta no clique, antes da chamada ao servidor,
// para o navegador não bloquear. Nunca troca a página do The Standard.
async function iniciarCompra(payload, aoErro) {
  const janela = window.open("", "_blank");
  if (!janela) {
    aoErro("Seu navegador bloqueou a nova aba. Permita pop-ups para este site e tente de novo.");
    return;
  }
  janela.document.write("<p style='font-family:sans-serif;padding:24px'>Abrindo o ambiente seguro de pagamento…</p>");

  try {
    const url = await criarLinkDeCompra(payload);
    janela.opener = null;
    janela.location.href = url;
  } catch (error) {
    janela.close();
    aoErro(error.message || "Não foi possível iniciar a compra.");
  }
}

document.addEventListener("click", event => {
  const botaoPlano = event.target.closest("[data-checkout-plan]");
  if (botaoPlano) {
    const status = document.querySelector("#planPopupStatus");
    botaoPlano.disabled = true;
    if (status) status.textContent = "Abrindo o ambiente de pagamento…";
    iniciarCompra({ type: "plan", planCode: botaoPlano.dataset.checkoutPlan }, mensagem => {
      botaoPlano.disabled = false;
      if (status) {
        status.textContent = mensagem;
        status.classList.add("is-error");
      }
    });
    return;
  }

  const botaoCarrinho = event.target.closest("[data-checkout-cart]");
  if (botaoCarrinho) {
    const offerIds = state.cart.items.map(item => item.offerId);
    iniciarCompra({ type: "courses", offerIds }, mensagem => {
      state.storeNotice = mensagem;
      renderStore();
    });
  }
});

document.addEventListener("click", async event => {
  const botao = event.target.closest("[data-cancel-subscription]");
  if (!botao) return;
  if (!window.confirm("Cancelar sua assinatura mensal? Você não será cobrado novamente.")) return;

  botao.disabled = true;
  try {
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sessão expirada. Entre novamente.");

    const resposta = await fetch(`${FLOWCORE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.error || "Não foi possível cancelar a assinatura.");

    state.membershipOrders = (state.membershipOrders || []).map(item =>
      item.plan_code === "mensal" ? { ...item, status: "canceled" } : item
    );
    renderProfile();
    window.alert("Assinatura cancelada. Você não será cobrado novamente.");
  } catch (error) {
    botao.disabled = false;
    window.alert(error.message || "Não foi possível cancelar a assinatura.");
  }
});

const app = document.querySelector("#app");
const sidebar = document.querySelector(".sidebar");
const logoutButton = document.querySelector("#logoutButton");

let state = {
  isAuthenticated: false,
  aluno: MOCK.aluno,
  cursos: MOCK.cursos,
  biblioteca: MOCK.biblioteca,
  financeiro: MOCK.financeiro,
  catalogoCursos: MOCK.catalogoCursos
};

const materialLabels = {
  documento: "Documentos",
  video: "Vídeos",
  simulador: "Simuladores",
  certificado: "Certificados"
};

function boot() {
  // SUPABASE: checar session ativa em supabase.auth.getSession().
  renderLogin();
  window.addEventListener("hashchange", renderRoute);
  logoutButton.addEventListener("click", () => {
    // SUPABASE: chamar supabase.auth.signOut() e limpar estado local.
    state.isAuthenticated = false;
    window.location.hash = "";
    renderLogin();
  });
}

function renderLogin() {
  sidebar.classList.add("is-hidden");
  const template = document.querySelector("#loginTemplate");
  app.replaceChildren(template.content.cloneNode(true));
  document.querySelector("#loginForm").addEventListener("submit", event => {
    event.preventDefault();
    // SUPABASE: trocar por signInWithPassword(email, password).
    state.isAuthenticated = true;
    sidebar.classList.remove("is-hidden");
    window.location.hash = "#dashboard";
    renderRoute();
  });
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
  else if (view === "financeiro") renderFinancial();
  else if (view === "comprar") renderStore();
  else if (view === "perfil") renderProfile();
  else if (view === "vazio") renderEmptyState();
  else renderDashboard();

  app.focus({ preventScroll: true });
}

function updateActiveNav(view) {
  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.toggle("is-active", link.dataset.nav === view);
  });
}

function renderDashboard() {
  const cursos = getAccessibleCourses();
  app.innerHTML = `
    <section class="page-header">
      <p class="eyebrow">FlowCore Academy</p>
      <h1>Olá, ${state.aluno.nome}</h1>
      <p>Seus cursos liberados manualmente aparecem aqui. Conteúdo sem acesso não é exibido.</p>
    </section>
    ${cursos.length ? renderCourseGrid(cursos) : renderEmptyContent()}
  `;
}

function renderCourseGrid(cursos) {
  return `
    <section class="course-grid" aria-label="Cursos liberados">
      ${cursos.map(curso => `
        <article class="course-card">
          <img src="${curso.capa}" alt="" />
          <div class="course-card-body">
            <span class="status-pill">Liberado</span>
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
  app.innerHTML = `
    <section class="course-hero">
      <div>
        <a class="text-link" href="#dashboard">Voltar para meus cursos</a>
        <p class="eyebrow">Curso liberado</p>
        <h1>${curso.titulo}</h1>
        <p>${curso.descricao}</p>
      </div>
      <img src="${curso.capa}" alt="" />
    </section>
    <section class="video-shell">
      <div class="video-placeholder">
        <span>Player</span>
        <strong>Fonte do vídeo pendente</strong>
        <small>O backend definirá a URL segura do vídeo.</small>
      </div>
    </section>
    <section class="materials-stack">
      ${Object.keys(materialLabels).map(type => renderMaterialGroup(type, groups[type] || [])).join("")}
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

function renderMaterialItem(item) {
  const meta = [item.formato, item.duracao].filter(Boolean).join(" · ");

  if (item.tipo === "video") {
    return `
      <article class="material-item">
        <div>
          <span class="type-chip">Vídeo</span>
          <h3>${item.titulo}</h3>
          <p>${meta}</p>
        </div>
        <button class="secondary-button" type="button" onclick="showVideoNotice()">Assistir</button>
      </article>
    `;
  }

  if (item.tipo === "simulador") {
    return `
      <article class="material-item">
        <div>
          <span class="type-chip">Simulador</span>
          <h3>${item.titulo}</h3>
          <p>Aplicação web externa</p>
        </div>
        <a class="secondary-button" href="${item.url}" target="_blank" rel="noopener noreferrer">Abrir</a>
      </article>
    `;
  }

  if (item.tipo === "certificado") {
    const disabled = item.emitido ? "" : "is-disabled";
    const label = item.emitido ? "Baixar" : "Não emitido";
    return `
      <article class="material-item">
        <div>
          <span class="type-chip">Certificado</span>
          <h3>${item.titulo}</h3>
          <p>${item.emitido ? "Certificado disponível" : "Será liberado após a conclusão"}</p>
        </div>
        <a class="secondary-button ${disabled}" href="${item.url}" ${item.emitido ? 'target="_blank" rel="noopener noreferrer"' : 'aria-disabled="true"'}>${label}</a>
      </article>
    `;
  }

  return `
    <article class="material-item">
      <div>
        <span class="type-chip">${item.formato.toUpperCase()}</span>
        <h3>${item.titulo}</h3>
        <p>Material de apoio</p>
      </div>
      <div class="button-pair">
        <a class="secondary-button" href="${item.url}">Visualizar</a>
        <a class="ghost-button inline" href="${item.url}" download>Baixar</a>
      </div>
    </article>
  `;
}

function renderProfile() {
  const certificates = state.cursos
    .flatMap(curso => curso.materiais
      .filter(material => material.tipo === "certificado")
      .map(material => ({ ...material, curso: curso.titulo })));

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
      <article class="info-panel">
        <h2>Certificados</h2>
        <div class="certificate-list">
          ${certificates.map(cert => `
            <div class="certificate-row">
              <div>
                <strong>${cert.curso}</strong>
                <span>${cert.emitido ? "Emitido" : "Pendente"}</span>
              </div>
              <a class="secondary-button ${cert.emitido ? "" : "is-disabled"}" href="${cert.url}" ${cert.emitido ? 'target="_blank" rel="noopener noreferrer"' : 'aria-disabled="true"'}>Download</a>
            </div>
          `).join("")}
        </div>
      </article>
    </section>
  `;
}

function renderLibrary() {
  const biblioteca = state.biblioteca;

  app.innerHTML = `
    <section class="library-hero">
      <div>
        <p class="eyebrow">Biblioteca FlowCore</p>
        <h1>Acervo técnico do aluno</h1>
        <p>${biblioteca.descricao}</p>
      </div>
      <img src="${biblioteca.capa}" alt="" />
    </section>
    <section class="library-grid" aria-label="Materiais da Biblioteca FlowCore">
      ${biblioteca.itens.map(renderLibraryItem).join("")}
    </section>
  `;
}

function renderLibraryItem(item) {
  const disabled = item.url === "#" ? "is-disabled" : "";
  const actionLabel = item.url === "#" ? "Em breve" : "Acessar";

  return `
    <article class="library-card">
      <div>
        <span class="type-chip">${item.tipo}</span>
        <h2>${item.titulo}</h2>
        <p>${item.descricao}</p>
      </div>
      <div class="library-card-footer">
        <span>${item.status}</span>
        <a class="secondary-button ${disabled}" href="${item.url}" ${item.url === "#" ? 'aria-disabled="true"' : 'target="_blank" rel="noopener noreferrer"'}>${actionLabel}</a>
      </div>
    </article>
  `;
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
  return `
    <section class="empty-state compact">
      <h2>Nenhum curso liberado</h2>
      <p>Entre em contato com a FlowCore para confirmar seu acesso.</p>
    </section>
  `;
}

function getAccessibleCourses() {
  // SUPABASE: buscar somente cursos permitidos via RLS em access(student_id, course_id).
  return state.cursos;
}

function groupByType(items) {
  return items.reduce((groups, item) => {
    groups[item.tipo] = groups[item.tipo] || [];
    groups[item.tipo].push(item);
    return groups;
  }, {});
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

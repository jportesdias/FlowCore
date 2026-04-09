/* ================================================
   BIBI SELECT — PAINEL ADMINISTRATIVO
================================================ */

const STORAGE_KEY      = 'bibi_products';
const FILE_SYNC_KEY    = 'bibi_file_sync';
const PASS_KEY         = 'bibi_admin_pass';
const GITHUB_CONFIG_KEY = 'bibi_github_config';
const SESSION_KEY   = 'bibi_admin_session';
const DEFAULT_PASS  = 'bibi2024';

const CATEGORIES = [
  { id: 'eletronicos', label: 'Eletrônicos' },
  { id: 'casa',        label: 'Casa & Jardim' },
  { id: 'moda',        label: 'Moda' },
  { id: 'beleza',      label: 'Beleza' },
  { id: 'esporte',     label: 'Esporte' },
  { id: 'brinquedos',  label: 'Brinquedos' },
  { id: 'pet',         label: 'Pet Shop' },
  { id: 'outros',      label: 'Outros' },
];

// ================================================
// STATE
// ================================================
const state = {
  products: [],
  currentPage: 'dashboard',
  editingId: null,
  deleteTargetId: null,
  listSearch: '',
  listStore: 'all',
  listCategory: 'all',
};

// ================================================
// AUTH
// ================================================
function getPassword() {
  return localStorage.getItem(PASS_KEY) || DEFAULT_PASS;
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function login(password) {
  if (password === getPassword()) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    return true;
  }
  return false;
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

// ================================================
// PRODUCTS CRUD
// ================================================
// Carrega do localStorage (rascunho de edição)
function loadProducts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    state.products = stored ? JSON.parse(stored) : [];
  } catch {
    state.products = [];
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.products));
  updatePublishBadge();
}

// Sincroniza com data/products.json do repositório ao abrir o admin.
// Se o localStorage estiver vazio → preenche com o arquivo.
// Se já houver edições locais → mantém, mas mostra badge de "não publicado".
async function syncFromFile() {
  try {
    const res = await fetch('data/products.json?v=' + Date.now());
    if (!res.ok) throw new Error('not found');
    const fileProducts = await res.json();
    const fileJson = JSON.stringify(fileProducts);
    const localJson = localStorage.getItem(STORAGE_KEY);

    if (!localJson || localJson === '[]') {
      // Sem dados locais → usa o arquivo
      state.products = Array.isArray(fileProducts) ? fileProducts : [];
      saveProducts();
      localStorage.setItem(FILE_SYNC_KEY, fileJson);
    } else {
      // Já há dados locais → carrega e verifica diferença
      loadProducts();
      const lastSync = localStorage.getItem(FILE_SYNC_KEY);
      if (fileJson !== lastSync) {
        // Arquivo do repositório foi atualizado externamente
        // Substitui o local pelo arquivo (o arquivo é a fonte de verdade)
        state.products = Array.isArray(fileProducts) ? fileProducts : [];
        saveProducts();
        localStorage.setItem(FILE_SYNC_KEY, fileJson);
        showToast('Dados sincronizados do repositório.', 'info');
      }
      // else: arquivo igual ao último publicado → manter edições locais
    }
  } catch {
    // Arquivo não encontrado (desenvolvimento local) → usa localStorage
    loadProducts();
  }
  updatePublishBadge();
}

// Verifica se há alterações locais ainda não publicadas no GitHub
function hasUnpublishedChanges() {
  const lastSync = localStorage.getItem(FILE_SYNC_KEY);
  const local    = localStorage.getItem(STORAGE_KEY);
  if (!lastSync || !local) return false;
  return lastSync !== local;
}

// Atualiza o badge de "não publicado" no topbar
function updatePublishBadge() {
  const badge = document.getElementById('publish-badge');
  if (!badge) return;
  if (hasUnpublishedChanges()) {
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function generateId() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function addProduct(data) {
  const product = {
    id: generateId(),
    ...data,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  state.products.unshift(product);
  saveProducts();
  return product;
}

function updateProduct(id, data) {
  const idx = state.products.findIndex(p => p.id === id);
  if (idx === -1) return false;
  state.products[idx] = { ...state.products[idx], ...data };
  saveProducts();
  return true;
}

function deleteProduct(id) {
  state.products = state.products.filter(p => p.id !== id);
  saveProducts();
}

function toggleActive(id) {
  const p = state.products.find(p => p.id === id);
  if (p) {
    p.active = !p.active;
    saveProducts();
    renderProductsTable();
    renderDashboard();
  }
}

// ================================================
// HELPERS
// ================================================
function formatCurrency(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcDiscount(original, sale) {
  if (!original || original <= sale) return 0;
  return Math.round((1 - sale / original) * 100);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function categoryLabel(id) {
  return CATEGORIES.find(c => c.id === id)?.label || id;
}

function storeLabel(store) {
  return store === 'ml' ? 'Mercado Livre' : 'Shopee';
}

// ================================================
// TOAST
// ================================================
function showToast(message, type = 'success') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '•'}</span> ${escapeHtml(message)}`;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ================================================
// NAVIGATION
// ================================================
function navigate(page) {
  state.currentPage = page;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  document.querySelectorAll('.page').forEach(el => {
    el.style.display = 'none';
  });

  const target = document.getElementById(`page-${page}`);
  if (target) target.style.display = 'block';

  if (page === 'dashboard') renderDashboard();
  if (page === 'products')  renderProductsTable();
  if (page === 'settings')  renderSettings();

  closeSidebar();
}

// ================================================
// DASHBOARD
// ================================================
function renderDashboard() {
  const total    = state.products.length;
  const active   = state.products.filter(p => p.active).length;
  const mlCount  = state.products.filter(p => p.store === 'ml').length;
  const shopeeCount = state.products.filter(p => p.store === 'shopee').length;
  const featuredCount = state.products.filter(p => p.featured && p.active).length;

  setEl('dash-total',    total);
  setEl('dash-active',   active);
  setEl('dash-ml',       mlCount);
  setEl('dash-shopee',   shopeeCount);
  setEl('dash-featured', featuredCount);

  // Recent products
  const recent = [...state.products]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const tbody = document.getElementById('dash-recent-body');
  if (!tbody) return;

  if (recent.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="table-empty">
          <span class="table-empty-icon">📦</span>
          <h4>Nenhum produto ainda</h4>
          <p>Adicione seu primeiro produto!</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(p => {
    const discount = calcDiscount(p.originalPrice, p.salePrice);
    return `
      <tr>
        <td>
          <div class="product-info-cell">
            <img class="product-thumb"
              src="${escapeHtml(p.image)}"
              alt=""
              onerror="this.src='https://placehold.co/48x48/EDE9FE/8B5CF6?text=?'"/>
            <div class="product-name-cell">
              ${escapeHtml(p.name)}
              <small>${escapeHtml(categoryLabel(p.category))}</small>
            </div>
          </div>
        </td>
        <td><span class="pill ${p.store}">${storeLabel(p.store)}</span></td>
        <td>${formatCurrency(p.salePrice)} ${discount > 0 ? `<small style="color:var(--success)">-${discount}%</small>` : ''}</td>
        <td><span class="pill ${p.active ? 'active' : 'inactive'}">${p.active ? 'Ativo' : 'Inativo'}</span></td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="openEditModal('${p.id}')">Editar</button>
        </td>
      </tr>
    `;
  }).join('');
}

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ================================================
// PRODUCTS TABLE
// ================================================
function getFilteredList() {
  let list = [...state.products];

  if (state.listStore !== 'all') {
    list = list.filter(p => p.store === state.listStore);
  }
  if (state.listCategory !== 'all') {
    list = list.filter(p => p.category === state.listCategory);
  }
  if (state.listSearch.trim()) {
    const q = state.listSearch.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      categoryLabel(p.category).toLowerCase().includes(q)
    );
  }

  return list;
}

// ================================================
// DRAG & DROP — reordenar produtos
// ================================================
let dragSrcId = null;

function attachDragEvents() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    // Iniciar arrasto apenas pelo handle
    const handle = row.querySelector('.drag-handle-cell');
    if (handle) {
      handle.addEventListener('mousedown', () => { row.draggable = true; });
      handle.addEventListener('mouseup',   () => { row.draggable = false; });
    }

    row.addEventListener('dragstart', e => {
      dragSrcId = row.dataset.id;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => row.classList.add('dragging'), 0);
    });

    row.addEventListener('dragend', () => {
      row.draggable = false;
      row.classList.remove('dragging');
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
    });

    row.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (row.dataset.id === dragSrcId) return;
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
      row.classList.add('drag-over');
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('drag-over');
    });

    row.addEventListener('drop', e => {
      e.preventDefault();
      row.classList.remove('drag-over');
      if (!dragSrcId || dragSrcId === row.dataset.id) return;

      const srcIdx = state.products.findIndex(p => p.id === dragSrcId);
      const tgtIdx = state.products.findIndex(p => p.id === row.dataset.id);
      if (srcIdx === -1 || tgtIdx === -1) return;

      const [moved] = state.products.splice(srcIdx, 1);
      state.products.splice(tgtIdx, 0, moved);

      saveProducts();
      renderProductsTable();
      renderDashboard();
      showToast('Ordem atualizada!', 'info');
    });
  });
}

function renderProductsTable() {
  const tbody = document.getElementById('products-tbody');
  const countEl = document.getElementById('table-count');
  if (!tbody) return;

  const list = getFilteredList();
  if (countEl) countEl.textContent = list.length + ' produto(s)';

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="table-empty">
          <span class="table-empty-icon">📦</span>
          <h4>Nenhum produto encontrado</h4>
          <p>Altere os filtros ou adicione um novo produto.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const discount = calcDiscount(p.originalPrice, p.salePrice);
    return `
      <tr data-id="${p.id}">
        <td class="drag-handle-cell" title="Segurar para reordenar">
          <span class="drag-handle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9"  cy="5"  r="1" fill="currentColor" stroke="none"/>
              <circle cx="15" cy="5"  r="1" fill="currentColor" stroke="none"/>
              <circle cx="9"  cy="12" r="1" fill="currentColor" stroke="none"/>
              <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/>
              <circle cx="9"  cy="19" r="1" fill="currentColor" stroke="none"/>
              <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </span>
        </td>
        <td>
          <div class="product-info-cell">
            <img class="product-thumb"
              src="${escapeHtml(p.image)}"
              alt=""
              onerror="this.src='https://placehold.co/48x48/EDE9FE/8B5CF6?text=?'"/>
            <div class="product-name-cell">
              ${escapeHtml(p.name)}
              <small title="${escapeHtml(p.affiliateLink)}">${escapeHtml(p.affiliateLink.slice(0, 40))}${p.affiliateLink.length > 40 ? '…' : ''}</small>
            </div>
          </div>
        </td>
        <td><span class="pill ${p.store}">${storeLabel(p.store)}</span></td>
        <td><span class="pill" style="background:#F3F4F6;color:#374151">${escapeHtml(categoryLabel(p.category))}</span></td>
        <td>
          <div style="font-weight:600">${formatCurrency(p.salePrice)}</div>
          ${p.originalPrice > p.salePrice
            ? `<small style="color:var(--text-secondary);text-decoration:line-through">${formatCurrency(p.originalPrice)}</small>
               <small style="color:var(--success);font-weight:600"> -${discount}%</small>`
            : ''}
        </td>
        <td>${p.featured ? '<span class="pill featured">⭐ Sim</span>' : '<span style="color:var(--text-secondary);font-size:0.82rem">—</span>'}</td>
        <td>
          <button class="pill ${p.active ? 'active' : 'inactive'}"
                  onclick="toggleActive('${p.id}')"
                  style="cursor:pointer;border:none;font-family:inherit">
            ${p.active ? '● Ativo' : '○ Inativo'}
          </button>
        </td>
        <td>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="openEditModal('${p.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" title="Excluir"
                    onclick="openDeleteConfirm('${p.id}')"
                    style="color:var(--danger)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  attachDragEvents();
}

// ================================================
// PRODUCT MODAL (ADD / EDIT)
// ================================================
function openAddModal() {
  state.editingId = null;
  setEl('modal-title', 'Novo Produto');

  clearForm();
  openModal('product-modal');
}

function openEditModal(id) {
  const p = state.products.find(p => p.id === id);
  if (!p) return;

  state.editingId = id;
  setEl('modal-title', 'Editar Produto');

  fillForm(p);
  openModal('product-modal');
}

function clearForm() {
  document.getElementById('product-form').reset();
  document.getElementById('img-preview').style.display = 'none';
  document.getElementById('img-placeholder').style.display = 'block';
  document.querySelectorAll('#product-form .form-control').forEach(el => el.classList.remove('error'));
  // Reseta aba de imagem
  setImgTab('url');
  const fi = document.getElementById('f-image');
  if (fi) { fi.value = ''; delete fi.dataset.base64; }
  document.getElementById('f-image-local').value = '';
  const area  = document.getElementById('upload-area');
  const label = document.getElementById('upload-label');
  if (area)  area.classList.remove('has-file');
  if (label) label.textContent = 'Clique para escolher uma imagem';
  // Reseta encode do link
  linkIsEncoded = false;
  const linkInput = document.getElementById('f-affiliate-link');
  if (linkInput) linkInput.style.color = '';
  const btn  = document.getElementById('btn-encode');
  const hint = document.getElementById('link-hint');
  if (btn)  btn.textContent = '🔒 Ocultar link';
  if (hint) hint.innerHTML  = 'Cole o link de afiliado. Clique em <strong>🔒 Ocultar link</strong> para esconder o URL.';
}

function fillForm(p) {
  setValue('f-name',           p.name);
  setValue('f-description',    p.description);
  setValue('f-original-price', p.originalPrice);
  setValue('f-sale-price',     p.salePrice);
  setValue('f-store',          p.store);
  setValue('f-category',       p.category);
  setValue('f-affiliate-link', p.affiliateLink);
  setChecked('f-featured',     p.featured);
  setChecked('f-active',       p.active !== false);

  // Detecta origem da imagem e ativa a aba correta
  detectImgTab(p.image);
  updateImgPreview(p.image);
  detectLinkEncoding(p.affiliateLink);
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function setChecked(id, value) {
  const el = document.getElementById(id);
  if (el) el.checked = !!value;
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function getChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

// ================================================
// ENCODE / DECODE LINK DE AFILIADO
// ================================================
let linkIsEncoded = false;

function toggleEncodeLink() {
  const input  = document.getElementById('f-affiliate-link');
  const btn    = document.getElementById('btn-encode');
  const hint   = document.getElementById('link-hint');
  const val    = input.value.trim();
  if (!val) { showToast('Cole o link primeiro.', 'error'); return; }

  if (!linkIsEncoded) {
    // Codificar
    try {
      const encoded = btoa(unescape(encodeURIComponent(val)));
      input.value       = encoded;
      input.type        = 'text';
      input.style.color = 'var(--text-secondary)';
      btn.textContent   = '🔓 Mostrar link';
      hint.innerHTML    = '✅ <strong>Link oculto</strong> — o URL real está codificado e não aparece no site.';
      linkIsEncoded = true;
    } catch {
      showToast('Não foi possível codificar o link.', 'error');
    }
  } else {
    // Decodificar (para editar)
    try {
      const decoded = decodeURIComponent(escape(atob(val)));
      input.value       = decoded;
      input.type        = 'text';
      input.style.color = '';
      btn.textContent   = '🔒 Ocultar link';
      hint.innerHTML    = 'Cole o link de afiliado. Clique em <strong>🔒 Ocultar link</strong> para esconder o URL.';
      linkIsEncoded = false;
    } catch {
      showToast('Não foi possível decodificar. O link pode não estar codificado.', 'error');
    }
  }
}

// Ao abrir o modal de edição, detecta se o link já está codificado
function detectLinkEncoding(value) {
  const btn  = document.getElementById('btn-encode');
  const hint = document.getElementById('link-hint');
  const input = document.getElementById('f-affiliate-link');
  try {
    const decoded = decodeURIComponent(escape(atob(value)));
    if (decoded.startsWith('http')) {
      // Está codificado
      linkIsEncoded = true;
      input.style.color = 'var(--text-secondary)';
      if (btn)  btn.textContent = '🔓 Mostrar link';
      if (hint) hint.innerHTML  = '✅ <strong>Link oculto</strong> — o URL real está codificado e não aparece no site.';
      return;
    }
  } catch (_) {}
  // Link normal
  linkIsEncoded = false;
  input.style.color = '';
  if (btn)  btn.textContent = '🔒 Ocultar link';
  if (hint) hint.innerHTML  = 'Cole o link de afiliado. Clique em <strong>🔒 Ocultar link</strong> para esconder o URL.';
}

// ================================================
// IMAGEM — ABAS (URL / LOCAL / UPLOAD)
// ================================================
let currentImgTab = 'url';

function setImgTab(tab) {
  currentImgTab = tab;
  ['url', 'local', 'upload'].forEach(t => {
    document.getElementById(`tab-${t}`)?.classList.toggle('active', t === tab);
    document.getElementById(`img-panel-${t}`).style.display = t === tab ? 'block' : 'none';
  });
}

// Detecta automaticamente qual aba usar baseado no valor salvo
function detectImgTab(value) {
  if (!value) { setImgTab('url'); return; }
  if (value.startsWith('data:image')) {
    setImgTab('upload');
  } else if (value.startsWith('images/')) {
    setImgTab('local');
    const input = document.getElementById('f-image-local');
    if (input) input.value = value.replace('images/', '');
    // Limpa o f-image para não conflitar
    const fi = document.getElementById('f-image');
    if (fi) fi.value = '';
  } else {
    setImgTab('url');
    const fi = document.getElementById('f-image');
    if (fi) fi.value = value;
  }
}

// Lê o valor da imagem independente da aba ativa
function getImageValue() {
  if (currentImgTab === 'local') {
    const filename = document.getElementById('f-image-local')?.value.trim();
    return filename ? `images/${filename}` : '';
  }
  if (currentImgTab === 'upload') {
    return document.getElementById('f-image')?.dataset.base64 || document.getElementById('f-image')?.value || '';
  }
  return document.getElementById('f-image')?.value.trim() || '';
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 800 * 1024) {
    showToast('Imagem muito grande! Use menos de 800KB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const base64 = e.target.result;
    // Guarda no campo hidden
    const fi = document.getElementById('f-image');
    if (fi) { fi.value = base64; fi.dataset.base64 = base64; }

    // Atualiza UI
    const label = document.getElementById('upload-label');
    const area  = document.getElementById('upload-area');
    if (label) label.textContent = `✓ ${file.name}`;
    if (area)  area.classList.add('has-file');

    updateImgPreview(base64);
  };
  reader.readAsDataURL(file);
}

function updateImgPreview(url) {
  const img = document.getElementById('img-preview');
  const placeholder = document.getElementById('img-placeholder');
  if (!img || !placeholder) return;

  if (url) {
    img.src = url;
    img.style.display = 'block';
    placeholder.style.display = 'none';
    img.onerror = () => {
      img.style.display = 'none';
      placeholder.style.display = 'block';
    };
  } else {
    img.style.display = 'none';
    placeholder.style.display = 'block';
  }
}

function saveProductForm() {
  // Validate
  const name         = getValue('f-name');
  const salePrice    = parseFloat(getValue('f-sale-price'));
  const store        = getValue('f-store');
  const category     = getValue('f-category');
  const affiliateLink = getValue('f-affiliate-link');
  const image        = getImageValue();

  let valid = true;

  function setError(id, hasError) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('error', hasError);
    if (hasError) valid = false;
  }

  setError('f-name',          !name);
  setError('f-sale-price',    !salePrice || isNaN(salePrice) || salePrice <= 0);
  setError('f-store',         !store);
  setError('f-category',      !category);
  setError('f-affiliate-link', !affiliateLink);

  if (!valid) {
    showToast('Preencha todos os campos obrigatórios.', 'error');
    return;
  }

  const data = {
    name,
    description:    getValue('f-description'),
    image:          image || 'https://placehold.co/400x400/EDE9FE/8B5CF6?text=Produto',
    originalPrice:  parseFloat(getValue('f-original-price')) || salePrice,
    salePrice,
    store,
    category,
    affiliateLink,
    featured:       getChecked('f-featured'),
    active:         getChecked('f-active'),
  };

  if (state.editingId) {
    updateProduct(state.editingId, data);
    showToast('Produto atualizado com sucesso!');
  } else {
    addProduct(data);
    showToast('Produto adicionado com sucesso!');
  }

  closeModal('product-modal');
  renderProductsTable();
  renderDashboard();
}

// ================================================
// DELETE CONFIRM
// ================================================
function openDeleteConfirm(id) {
  const p = state.products.find(p => p.id === id);
  if (!p) return;

  state.deleteTargetId = id;
  const nameEl = document.getElementById('confirm-product-name');
  if (nameEl) nameEl.textContent = p.name;
  openModal('confirm-modal');
}

function confirmDelete() {
  if (!state.deleteTargetId) return;
  deleteProduct(state.deleteTargetId);
  state.deleteTargetId = null;
  closeModal('confirm-modal');
  renderProductsTable();
  renderDashboard();
  showToast('Produto excluído.');
}

// ================================================
// SETTINGS
// ================================================
function renderSettings() {
  // Preenche campos do GitHub se já configurado
  const cfg = getGithubConfig();
  if (cfg.token) setValue('s-gh-token', cfg.token);
  if (cfg.owner) setValue('s-gh-owner', cfg.owner);
  if (cfg.repo)  setValue('s-gh-repo',  cfg.repo);

  const status = document.getElementById('github-status');
  if (status && cfg.owner && cfg.repo) {
    status.innerHTML = `<span style="color:var(--text-secondary)">Configurado para <strong>${cfg.owner}/${cfg.repo}</strong> — clique em "Testar conexão" para validar.</span>`;
  }
}

function savePassword() {
  const current  = getValue('s-current-pass');
  const newPass  = getValue('s-new-pass');
  const confirm  = getValue('s-confirm-pass');

  if (current !== getPassword()) {
    showToast('Senha atual incorreta.', 'error');
    return;
  }
  if (!newPass || newPass.length < 6) {
    showToast('A nova senha deve ter pelo menos 6 caracteres.', 'error');
    return;
  }
  if (newPass !== confirm) {
    showToast('As senhas não coincidem.', 'error');
    return;
  }

  localStorage.setItem(PASS_KEY, newPass);
  document.getElementById('settings-pass-form').reset();
  showToast('Senha alterada com sucesso!');
}

// ================================================
// GITHUB API — publicar direto do admin
// ================================================
function getGithubConfig() {
  try { return JSON.parse(localStorage.getItem(GITHUB_CONFIG_KEY)) || {}; }
  catch { return {}; }
}

function saveGithubConfig(cfg) {
  localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(cfg));
}

async function publishToGithub() {
  const cfg = getGithubConfig();

  if (!cfg.token || !cfg.owner || !cfg.repo) {
    navigate('settings');
    showToast('Configure o Token do GitHub nas configurações primeiro.', 'error');
    // Destaca a seção
    setTimeout(() => {
      document.getElementById('github-config-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
    return;
  }

  // Botão loading
  const btn = document.getElementById('publish-badge');
  const originalHtml = btn?.innerHTML;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-inline"></span> Publicando…`;
  }

  try {
    const filePath = 'data/products.json';
    const apiBase  = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}`;
    const headers  = {
      'Authorization': `Bearer ${cfg.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    // 1. Busca SHA atual do arquivo (necessário para atualizar)
    let sha = null;
    const getRes = await fetch(apiBase, { headers });
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    } else if (getRes.status !== 404) {
      throw new Error(`Erro ao acessar repositório (${getRes.status})`);
    }

    // 2. Codifica conteúdo em Base64
    const json    = JSON.stringify(state.products, null, 2);
    const content = btoa(unescape(encodeURIComponent(json)));

    // 3. Commit via API
    const body = {
      message: `Produtos atualizados — ${new Date().toLocaleString('pt-BR')}`,
      content,
      ...(sha ? { sha } : {}),
    };

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      throw new Error(err.message || `Erro ${putRes.status}`);
    }

    // 4. Marca como sincronizado
    localStorage.setItem(FILE_SYNC_KEY, json);
    updatePublishBadge();
    showToast('✅ Publicado! O site atualiza em ~1 minuto.', 'success');

  } catch (err) {
    showToast(`Erro ao publicar: ${err.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
  }
}

// Testa conexão com o GitHub
async function testGithubConnection() {
  const cfg = getGithubConfig();
  if (!cfg.token || !cfg.owner || !cfg.repo) {
    showToast('Preencha todos os campos antes de testar.', 'error');
    return;
  }

  const btn = document.getElementById('btn-test-github');
  if (btn) { btn.disabled = true; btn.textContent = 'Testando…'; }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}`,
      { headers: { 'Authorization': `Bearer ${cfg.token}` } }
    );

    if (res.ok) {
      const data = await res.json();
      showToast(`✅ Conectado! Repositório: ${data.full_name}`, 'success');
      document.getElementById('github-status').innerHTML =
        `<span style="color:var(--success)">✅ Conectado — ${data.full_name}</span>`;
    } else if (res.status === 401) {
      throw new Error('Token inválido ou expirado.');
    } else if (res.status === 404) {
      throw new Error('Repositório não encontrado. Verifique usuário e nome do repo.');
    } else {
      throw new Error(`Erro ${res.status}`);
    }
  } catch (err) {
    showToast(`Falha: ${err.message}`, 'error');
    document.getElementById('github-status').innerHTML =
      `<span style="color:var(--danger)">❌ ${err.message}</span>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Testar conexão'; }
  }
}

// Salva configuração do GitHub
function saveGithubSettings() {
  const token = document.getElementById('s-gh-token')?.value.trim();
  const owner = document.getElementById('s-gh-owner')?.value.trim();
  const repo  = document.getElementById('s-gh-repo')?.value.trim();

  if (!token || !owner || !repo) {
    showToast('Preencha todos os campos.', 'error');
    return;
  }

  saveGithubConfig({ token, owner, repo });
  showToast('Configuração salva!', 'success');
  document.getElementById('github-status').innerHTML =
    `<span style="color:var(--text-secondary)">Configurado — clique em "Testar conexão" para validar.</span>`;
}

// Backup completo (mantido como segurança)
function exportData() {
  const json = JSON.stringify(state.products, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `bibi-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exportado!');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const products = data.products || data;
      if (!Array.isArray(products)) throw new Error('Formato inválido');

      state.products = products;
      saveProducts();
      renderProductsTable();
      renderDashboard();
      showToast(`${products.length} produtos importados com sucesso!`);
    } catch {
      showToast('Arquivo inválido. Verifique o formato JSON.', 'error');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function clearAllProducts() {
  if (!confirm('Tem certeza? Isso irá apagar TODOS os produtos. Esta ação não pode ser desfeita.')) return;
  state.products = [];
  saveProducts();
  renderProductsTable();
  renderDashboard();
  showToast('Todos os produtos foram removidos.', 'info');
}

// ================================================
// MODAL HELPERS
// ================================================
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.add('open');
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove('open');
}

// Close on overlay click — apenas o modal de confirmação, não o de edição
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay') && e.target.id === 'confirm-modal') {
    e.target.classList.remove('open');
  }
});

// ================================================
// MOBILE SIDEBAR
// ================================================
function toggleSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay?.classList.toggle('show');
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar?.classList.remove('open');
  overlay?.classList.remove('show');
}

// ================================================
// INIT
// ================================================
async function initAdmin() {
  // Check auth
  if (!isLoggedIn()) {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('admin-app').style.display  = 'none';

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const pass  = document.getElementById('login-password').value;
        const error = document.getElementById('login-error');
        if (login(pass)) {
          location.reload();
        } else {
          if (error) error.style.display = 'block';
          document.getElementById('login-password').value = '';
          document.getElementById('login-password').focus();
        }
      });
    }
    return;
  }

  // Logged in
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('admin-app').style.display  = 'block';

  await syncFromFile(); // Sincroniza com data/products.json do repositório

  // Populate category dropdowns
  const catSelects = document.querySelectorAll('.category-select');
  catSelects.forEach(sel => {
    CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.label;
      sel.appendChild(opt);
    });
  });

  // Nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Image preview on URL change
  // Preview ao digitar URL
  const imgInput = document.getElementById('f-image');
  if (imgInput) {
    imgInput.addEventListener('input', e => updateImgPreview(e.target.value));
  }
  // Preview ao digitar nome do arquivo local
  const imgLocalInput = document.getElementById('f-image-local');
  if (imgLocalInput) {
    imgLocalInput.addEventListener('input', e => {
      const val = e.target.value.trim();
      updateImgPreview(val ? `images/${val}` : '');
    });
  }

  // Product form submit
  const productForm = document.getElementById('product-form');
  if (productForm) {
    productForm.addEventListener('submit', e => {
      e.preventDefault();
      saveProductForm();
    });
  }

  // Admin list search & filters
  const listSearch = document.getElementById('list-search');
  if (listSearch) {
    let debounce;
    listSearch.addEventListener('input', e => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.listSearch = e.target.value;
        renderProductsTable();
      }, 260);
    });
  }

  const listStore = document.getElementById('list-store-filter');
  if (listStore) {
    listStore.addEventListener('change', e => {
      state.listStore = e.target.value;
      renderProductsTable();
    });
  }

  const listCat = document.getElementById('list-cat-filter');
  if (listCat) {
    CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.label;
      listCat.appendChild(opt);
    });
    listCat.addEventListener('change', e => {
      state.listCategory = e.target.value;
      renderProductsTable();
    });
  }

  // Password form
  const passForm = document.getElementById('settings-pass-form');
  if (passForm) {
    passForm.addEventListener('submit', e => {
      e.preventDefault();
      savePassword();
    });
  }

  // Start on dashboard
  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', initAdmin);

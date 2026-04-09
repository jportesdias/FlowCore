/* ================================================
   BIBI SELECT — VITRINE PRINCIPAL
================================================ */

const STORAGE_KEY = 'bibi_products';

const CATEGORIES = [
  { id: 'all',         label: 'Todos',           icon: '🛍️' },
  { id: 'eletronicos', label: 'Eletrônicos',      icon: '📱' },
  { id: 'casa',        label: 'Casa & Jardim',    icon: '🏠' },
  { id: 'moda',        label: 'Moda',             icon: '👗' },
  { id: 'beleza',      label: 'Beleza',           icon: '💄' },
  { id: 'esporte',     label: 'Esporte',          icon: '⚽' },
  { id: 'brinquedos',  label: 'Brinquedos',       icon: '🧸' },
  { id: 'pet',         label: 'Pet Shop',         icon: '🐾' },
  { id: 'outros',      label: 'Outros',           icon: '📦' },
];

const SAMPLE_PRODUCTS = [
  {
    id: 'p1',
    name: 'Fone de Ouvido Bluetooth TWS 5.3',
    description: 'Fone sem fio com cancelamento de ruído ativo, 30h de bateria total e resistência à água IPX5.',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80',
    originalPrice: 89.90,
    salePrice: 39.90,
    store: 'shopee',
    category: 'eletronicos',
    affiliateLink: '#',
    featured: true,
    active: true,
    createdAt: '2024-01-15'
  },
  {
    id: 'p2',
    name: 'Smartwatch HW67 Pro Max Tela 1.9"',
    description: 'Relógio inteligente com monitor cardíaco, GPS, 100+ modos esportivos e bateria de 7 dias.',
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400&q=80',
    originalPrice: 159.90,
    salePrice: 79.90,
    store: 'ml',
    category: 'eletronicos',
    affiliateLink: '#',
    featured: true,
    active: true,
    createdAt: '2024-01-20'
  },
  {
    id: 'p3',
    name: 'Kit Organizador de Gavetas 6 Peças',
    description: 'Conjunto de organizadores modulares para gavetas, armários e prateleiras. Material resistente.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    originalPrice: 49.90,
    salePrice: 24.90,
    store: 'ml',
    category: 'casa',
    affiliateLink: '#',
    featured: false,
    active: true,
    createdAt: '2024-02-01'
  },
  {
    id: 'p4',
    name: 'Vestido Floral Midi Verão',
    description: 'Vestido feminino estampado, tecido leve e fresquinho, ideal para o verão. Disponível em P, M e G.',
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80',
    originalPrice: 79.90,
    salePrice: 39.90,
    store: 'shopee',
    category: 'moda',
    affiliateLink: '#',
    featured: false,
    active: true,
    createdAt: '2024-02-10'
  },
  {
    id: 'p5',
    name: 'Kit Skincare Coreano 5 Produtos',
    description: 'Rotina completa de cuidados com a pele: limpador, tônico, sérum, hidratante e protetor solar.',
    image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80',
    originalPrice: 119.90,
    salePrice: 67.90,
    store: 'shopee',
    category: 'beleza',
    affiliateLink: '#',
    featured: true,
    active: true,
    createdAt: '2024-02-15'
  },
  {
    id: 'p6',
    name: 'Tênis Running Masculino Leve',
    description: 'Tênis esportivo com amortecimento extra, solado antiderrapante e cabedal respirável.',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
    originalPrice: 199.90,
    salePrice: 119.90,
    store: 'ml',
    category: 'esporte',
    affiliateLink: '#',
    featured: false,
    active: true,
    createdAt: '2024-03-01'
  },
  {
    id: 'p7',
    name: 'Boneca Articulada com Acessórios',
    description: 'Boneca fashion com 30 articulações, 15 acessórios inclusos e case de armazenamento.',
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&q=80',
    originalPrice: 89.90,
    salePrice: 49.90,
    store: 'ml',
    category: 'brinquedos',
    affiliateLink: '#',
    featured: false,
    active: true,
    createdAt: '2024-03-10'
  },
  {
    id: 'p8',
    name: 'Cadeira Gamer Ergonômica Reclinável',
    description: 'Cadeira gamer com suporte lombar, apoio de braços 4D e reclinação até 180 graus. Suporta até 150kg.',
    image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80',
    originalPrice: 899.90,
    salePrice: 499.90,
    store: 'shopee',
    category: 'eletronicos',
    affiliateLink: '#',
    featured: true,
    active: true,
    createdAt: '2024-03-15'
  },
  {
    id: 'p9',
    name: 'Tapete de Yoga Antiderrapante 6mm',
    description: 'Tapete de yoga e pilates com textura antiderrapante dupla face, alça de transporte inclusa.',
    image: 'https://images.unsplash.com/photo-1593164842264-854604db2260?w=400&q=80',
    originalPrice: 69.90,
    salePrice: 34.90,
    store: 'shopee',
    category: 'esporte',
    affiliateLink: '#',
    featured: false,
    active: true,
    createdAt: '2024-03-20'
  },
  {
    id: 'p10',
    name: 'Panela Elétrica de Arroz 1,8L',
    description: 'Panela elétrica multifunção para arroz, mingau e vapor. Revestimento antiaderente, desliga automático.',
    image: 'https://images.unsplash.com/photo-1585515656762-91bdb9890555?w=400&q=80',
    originalPrice: 89.90,
    salePrice: 59.90,
    store: 'ml',
    category: 'casa',
    affiliateLink: '#',
    featured: false,
    active: true,
    createdAt: '2024-04-01'
  },
  {
    id: 'p11',
    name: 'Creme Facial Anti-idade com Retinol',
    description: 'Creme facial noturno com retinol 0,5%, vitamina C e ácido hialurônico. Reduz rugas em 4 semanas.',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80',
    originalPrice: 79.90,
    salePrice: 44.90,
    store: 'shopee',
    category: 'beleza',
    affiliateLink: '#',
    featured: false,
    active: true,
    createdAt: '2024-04-05'
  },
  {
    id: 'p12',
    name: 'Mochila Escolar Impermeável 30L',
    description: 'Mochila resistente com compartimento para notebook 15.6", porta USB, material impermeável.',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80',
    originalPrice: 129.90,
    salePrice: 74.90,
    store: 'ml',
    category: 'moda',
    affiliateLink: '#',
    featured: false,
    active: true,
    createdAt: '2024-04-10'
  },
];

// ================================================
// STATE
// ================================================
const state = {
  products: [],
  category: 'all',
  search: '',
  sort: 'featured',
};

// ================================================
// HELPERS
// ================================================
function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcDiscount(original, sale) {
  if (!original || original <= sale) return 0;
  return Math.round((1 - sale / original) * 100);
}

function getInstallments(price) {
  if (price < 30) return null;
  const parcelas = price >= 100 ? 12 : price >= 50 ? 6 : 3;
  const valor = price / parcelas;
  return `${parcelas}x de ${formatCurrency(valor)} sem juros`;
}

function categoryLabel(id) {
  return CATEGORIES.find(c => c.id === id)?.label || id;
}

function storeLabel(store) {
  return store === 'ml' ? 'Mercado Livre' : 'Shopee';
}

// ================================================
// DATA
// ================================================

// Carrega produtos do arquivo data/products.json (fonte de verdade no repositório).
// Fallback para SAMPLE_PRODUCTS quando rodando localmente via file://
async function loadProducts() {
  try {
    const res = await fetch('data/products.json?v=' + Date.now());
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    state.products = Array.isArray(data) ? data : [];
  } catch {
    // Fallback: desenvolvimento local ou arquivo ausente
    state.products = SAMPLE_PRODUCTS;
  }
}

function getActiveProducts() {
  return state.products.filter(p => p.active);
}

function getFiltered() {
  let list = getActiveProducts();

  if (state.category !== 'all') {
    list = list.filter(p => p.category === state.category);
  }

  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      categoryLabel(p.category).toLowerCase().includes(q)
    );
  }

  switch (state.sort) {
    case 'featured':
      list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      break;
    case 'price_asc':
      list = [...list].sort((a, b) => a.salePrice - b.salePrice);
      break;
    case 'price_desc':
      list = [...list].sort((a, b) => b.salePrice - a.salePrice);
      break;
    case 'discount':
      list = [...list].sort((a, b) =>
        calcDiscount(b.originalPrice, b.salePrice) - calcDiscount(a.originalPrice, a.salePrice)
      );
      break;
    case 'newest':
      list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
  }

  return list;
}

// ================================================
// RENDER: HEADER STATS
// ================================================
function renderStats() {
  const active = getActiveProducts();
  const mlCount = active.filter(p => p.store === 'ml').length;
  const shopeeCount = active.filter(p => p.store === 'shopee').length;

  const statProducts = document.getElementById('stat-products');
  const statML       = document.getElementById('stat-ml');
  const statShopee   = document.getElementById('stat-shopee');

  if (statProducts) statProducts.textContent = active.length;
  if (statML)       statML.textContent       = mlCount;
  if (statShopee)   statShopee.textContent   = shopeeCount;
}

// ================================================
// RENDER: CATEGORIES
// ================================================
function renderCategories() {
  const wrap = document.getElementById('categories-wrap');
  if (!wrap) return;

  const active = getActiveProducts();
  const counts = {};
  active.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });

  wrap.innerHTML = CATEGORIES.map(cat => {
    const count = cat.id === 'all' ? active.length : (counts[cat.id] || 0);
    if (cat.id !== 'all' && count === 0) return '';
    return `
      <button class="cat-btn ${state.category === cat.id ? 'active' : ''}"
              onclick="setCategory('${cat.id}')">
        ${cat.icon} ${cat.label}
        <span class="count">${count}</span>
      </button>
    `;
  }).join('');
}

// ================================================
// RENDER: PRODUCTS
// ================================================
function renderProducts() {
  const grid = document.getElementById('products-grid');
  const countEl = document.getElementById('results-count');
  if (!grid) return;

  const list = getFiltered();
  if (countEl) countEl.textContent = list.length;

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <h3>Nenhum produto encontrado</h3>
        <p>Tente outros termos de busca ou selecione outra categoria.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(p => renderProductCard(p)).join('');
}

function renderProductCard(p) {
  const discount = calcDiscount(p.originalPrice, p.salePrice);
  const installment = getInstallments(p.salePrice);
  const storeName = storeLabel(p.store);

  const rightBadge = p.featured
    ? `<span class="badge featured">⭐ Destaque</span>`
    : discount > 0
      ? `<span class="badge discount">-${discount}%</span>`
      : '';

  return `
    <div class="product-card">
      <div class="card-img-wrap">
        <img
          class="card-img"
          src="${escapeHtml(p.image)}"
          alt="${escapeHtml(p.name)}"
          loading="lazy"
          onerror="this.src='https://placehold.co/400x400/EDE9FE/8B5CF6?text=Sem+Imagem'"
        />
        <div class="card-badges">
          <span class="badge ${p.store}">${storeName}</span>
          ${rightBadge}
        </div>
      </div>
      <div class="card-body">
        <div class="card-cat">${escapeHtml(categoryLabel(p.category))}</div>
        <div class="card-name">${escapeHtml(p.name)}</div>
        <div class="card-prices">
          ${p.originalPrice > p.salePrice
            ? `<div class="original-price">De ${formatCurrency(p.originalPrice)}</div>`
            : ''}
          <div class="sale-price">${formatCurrency(p.salePrice)}</div>
          ${installment ? `<div class="installment">${installment}</div>` : ''}
        </div>
        <a class="card-btn" href="ir.html?p=${escapeHtml(p.id)}" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Ver Oferta
        </a>
      </div>
    </div>
  `;
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

// ================================================
// ACTIONS
// ================================================
function setCategory(cat) {
  state.category = cat;
  renderCategories();
  renderProducts();
  window.scrollTo({ top: document.getElementById('products-section')?.offsetTop - 130, behavior: 'smooth' });
}

function setSort(val) {
  state.sort = val;
  renderProducts();
}

function setSearch(val) {
  state.search = val;
  renderCategories();
  renderProducts();
}

// ================================================
// INIT
// ================================================
async function init() {
  await loadProducts();
  renderStats();
  renderCategories();
  renderProducts();

  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', e => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => setSearch(e.target.value), 280);
    });
  }

  // Sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', e => setSort(e.target.value));
  }
}

document.addEventListener('DOMContentLoaded', init);

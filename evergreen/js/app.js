// ============================================================
//  app.js — Core Engine: Auth, Router, Sidebar, Modal, Toast
// ============================================================

// ---- Helpers ----
window.fmt = function(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
window.fmtDate = function(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
window.fmtNumber = function(val) {
    if (val === null || val === undefined || val === '') return '—';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)) return '—';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
window.isOverdue = function(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr + 'T23:59:59') < new Date();
}
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
window.priorityBadge = function(p) {
    const map = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };
    return `<span class="badge ${map[p] || 'badge-low'}">${p || 'low'}</span>`;
}
window.statusBadge = function(s) {
    const map = {
        open: 'status-open', 'in-progress': 'status-in-progress', closed: 'status-closed',
        overdue: 'status-overdue', pending: 'status-pending', 'in-transit': 'status-in-progress',
        inspection: 'status-pending', 'ok': 'status-closed', 'open-issue': 'status-open',
        'shore-support': 'status-shore', 'awaiting-materials': 'status-materials',
        'purchase-requisition': 'status-materials', 'purchase-order': 'status-shore',
        'on-shore-calibration': 'status-shore', 'awaiting-installation': 'status-pending'
    };
    return `<span class="badge ${map[s] || 'status-open'}">${s || 'open'}</span>`;
}
function opModeBadge(mode) {
    const isIdle = (mode || '').toLowerCase() === 'idle';
    return `<span class="badge ${isIdle ? 'status-open' : 'status-closed'}">${isIdle ? 'Idle' : 'Duty'}</span>`;
}
function installationStatusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'removed') return `<span class="badge bg-orange-600 text-navy font-black uppercase text-[10px]">Removed</span>`;
    if (s === 'awaiting-installation') return `<span class="badge bg-blue-500 text-navy font-black uppercase text-[10px] animate-pulse">Waiting Install</span>`;
    return `<span class="badge bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-black uppercase text-[10px]">Installed</span>`;
}
window.tagChip = function(code) {
    return `<span class="tag-chip">${code || ''}</span>`;
}
window.escHtml = function(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---- Media & Lightbox Helpers ----
function setupMediaDropzone(containerId, onMediaChange, initialMedia = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let media = [...initialMedia];

    const isOnlyTxt = container.dataset.accept === 'txt';
    
    container.innerHTML = `
        <div class="media-dropzone" id="${containerId}-dropzone">
            <svg class="w-8 h-8 mx-auto text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-sm text-slate-400">${isOnlyTxt ? 'Drag <span class="text-evergreen-500 font-bold">.TXT</span> files here' : 'Drag photos/PDFs here'} or <span class="text-orange-500 font-bold">click to upload</span></p>
            <input type="file" id="${containerId}-input" multiple accept="${isOnlyTxt ? '.txt,text/plain' : 'image/*,application/pdf'}" class="hidden" />
        </div>
        <div class="media-preview-container" id="${containerId}-previews"></div>
    `;

    const dropzone = document.getElementById(`${containerId}-dropzone`);
    const input = document.getElementById(`${containerId}-input`);
    const previews = document.getElementById(`${containerId}-previews`);

    const resizeImage = (file, maxWidth, maxHeight, callback) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleFiles = (files) => {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                resizeImage(file, 1200, 1200, (base64) => {
                    media.push(base64);
                    refreshPreviews();
                    if (onMediaChange) onMediaChange(media);
                });
            } else if (file.type === 'application/pdf' || file.type === 'text/plain' || file.name.endsWith('.txt')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    let result = e.target.result;
                    // If it's a txt file, let's ensure it has the correct data URI if needed, 
                    // though for simple base64 it's fine.
                    media.push(result);
                    refreshPreviews();
                    if (onMediaChange) onMediaChange(media);
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const refreshPreviews = () => {
        previews.innerHTML = media.map((m, i) => {
            const isPdf = m.startsWith('data:application/pdf');
            const isTxt = m.startsWith('data:text/plain');
            return `
            <div class="media-preview-item">
                ${isPdf ? `
                    <div class="pdf-placeholder flex flex-col items-center justify-center h-full bg-slate-800 rounded">
                        <svg class="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" /><path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                        <span class="text-[8px] text-slate-400 mt-1 uppercase">PDF DOC</span>
                    </div>
                    <div class="pdf-placeholder flex flex-col items-center justify-center h-full bg-surface rounded">
                        <svg class="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span class="text-[8px] text-slate-400 mt-1 uppercase">TXT FILE</span>
                    </div>
                ` : `<img src="${m}" onclick="openLightbox('${m}')" />`}
                <div class="remove-btn" onclick="window.removeMediaItem('${containerId}', ${i})">✕</div>
            </div>`;
        }).join('');
    };

    refreshPreviews();

    window.removeMediaItem = (cid, index) => {
        if (cid !== containerId) return;
        media.splice(index, 1);
        refreshPreviews();
        if (onMediaChange) onMediaChange(media);
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', (e) => handleFiles(e.target.files));
}

function renderGallery(mediaArray) {
    if (!mediaArray || !mediaArray.length) return '';
    return `
        <div class="gallery-grid">
            ${mediaArray.map((m, idx) => {
        const isPdf = m.startsWith('data:application/pdf');
        const isTxt = m.startsWith('data:text/plain') || m.includes('text/plain') || (m.startsWith('data:') && !m.startsWith('data:image/'));
        
        if (isPdf) {
            return `
                <a href="${m}" download="document-${idx + 1}.pdf" class="gallery-thumb pdf-thumb flex flex-col items-center justify-center bg-navy-900 border border-slate-700/50 rounded-lg hover:border-red-500 transition-colors group">
                    <svg class="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" /><path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                    <span class="text-[8px] font-bold text-slate-400 mt-1 uppercase">Download PDF</span>
                </a>`;
        }
        
        if (isTxt) {
            return `
                <a href="${m}" download="log-${idx + 1}.txt" class="gallery-thumb pdf-thumb flex flex-col items-center justify-center bg-surface border border-border-color rounded-lg hover:border-orange-500 transition-colors group">
                    <svg class="w-8 h-8 text-orange-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span class="text-[8px] font-bold text-slate-400 mt-1 uppercase">Download TXT</span>
                </a>`;
        }
        
        return `<img src="${m}" class="gallery-thumb" onclick="openLightbox('${m}')" title="Click to enlarge" />`;
    }).join('')}
        </div>`;
}

function openLightbox(src) {
    let lb = document.getElementById('global-lightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'global-lightbox';
        lb.className = 'lightbox';
        lb.innerHTML = '<img id="lightbox-img" src="" />';
        lb.onclick = () => lb.classList.remove('active');
        document.body.appendChild(lb);
    }
    document.getElementById('lightbox-img').src = src;
    lb.classList.add('active');
}


// ---- Toast ----
function toast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const icons = {
        success: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
        error: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
        info: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `${icons[type] || icons.info}<span>${escHtml(msg)}</span>`;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

// ---- Modal ----
window.openModal = function(title, bodyHtml, onOpen, sizeClass = 'max-w-2xl') {
    const container = document.getElementById('global-modal-container');
    // Remove old max-w classes
    container.className = container.className.split(' ').filter(c => !c.startsWith('max-w-')).join(' ');
    container.classList.add(sizeClass);
    
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('global-modal').classList.remove('hidden');
    if (onOpen) onOpen();
}
window.closeModal = function() {
    document.getElementById('global-modal').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
}

// ---- Auth ----
let currentUser = null;
window.getUser = function() { try { return JSON.parse(localStorage.getItem('ph_user')); } catch { return null; } }
function setUser(u) { localStorage.setItem('ph_user', JSON.stringify(u)); currentUser = u; }
function clearUser() { localStorage.removeItem('ph_user'); localStorage.removeItem('ph_active_platform'); currentUser = null; }

window.canEdit = function(item) {
    if (!item) return false;
    const user = window.getUser();
    if (!user) return false;
    
    // For this specific Demo/Handover app, we allow editing if:
    // 1. User is Admin
    // 2. User is the author
    // 3. Item has no author_id (legacy/seed)
    // 4. We are on the FlowCore site (total freedom for demo)
    const activePlat = DB.getActivePlatform();
    const isFlowCore = activePlat && activePlat.id === 'plat-flowcore';
    
    if (user.role === 'Admin') return true;
    if (isFlowCore) return true;
    if (!item.author_id) return true;
    return item.author_id === user.id;
}

function handleSaveResult(result) {
    if (result && result.limitReached) {
        openModal('🔒 Modo Demo — Limite Atingido', `
            <div class="text-center py-4">
                <div class="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-navy mb-2">Limite de 3 registros atingido</h3>
                <p class="text-slate-400 mb-6 leading-relaxed">
                    Você explorou as funcionalidades básicas! Para desbloquear todos os recursos profissionais, 
                    armazenamento ilimitado e segurança total dos seus dados, entre em contato conosco.
                </p>
                <div class="bg-navy-800 rounded-xl p-4 border border-slate-700 mb-6">
                    <div class="text-xs text-slate-500 uppercase font-bold mb-1">E-mail para Licenciamento</div>
                    <div class="text-orange-400 font-mono font-bold">commercial@flowcoresolutions.com.br</div>
                </div>
                <a href="https://flowcoresolutions.com.br/evergreen" target="_blank" class="btn btn-primary w-full py-3 mb-2">
                    Visitar Website Oficial
                </a>
                <button class="btn btn-secondary w-full" onclick="closeModal()">Continuar Explorando</button>
            </div>
        `);
        return false;
    }
    return result && result.success;
}


function populatePlatformsForm() {
    const list = document.getElementById('reg-platforms-list');
    const platforms = DB.getPlatforms();
    list.innerHTML = platforms.map(p => `
        <label class="flex items-center gap-3 p-2 hover:bg-navy-700 rounded-lg cursor-pointer transition">
            <input type="checkbox" name="platforms" value="${p.id}" class="w-4 h-4 rounded border-slate-600 bg-navy-900 text-orange-500 focus:ring-orange-500/20">
            <div class="text-sm">
                <div class="text-navy font-medium">${p.name}</div>
                <div class="text-xs text-slate-500">${p.type} · ${p.basin}</div>
            </div>
        </label>
    `).join('');
}

function updatePlatformSwitcher(user) {
    const switcher = document.getElementById('platform-switcher');
    const allPlatforms = DB.getPlatforms();
    // Admins see everything, regular users only see assigned sites
    const userPlatforms = user.role === 'Admin' ? allPlatforms : allPlatforms.filter(p => user.platforms.includes(p.id));

    switcher.innerHTML = userPlatforms.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    // Set active platform
    const savedPlatform = DB.getActivePlatform();
    const canAccessSaved = savedPlatform && (user.role === 'Admin' || user.platforms.includes(savedPlatform.id));
    
    if (canAccessSaved) {
        switcher.value = savedPlatform.id;
    } else if (userPlatforms.length > 0) {
        DB.setActivePlatform(userPlatforms[0].id);
        switcher.value = userPlatforms[0].id;
    }

    // Sync alerts for the newly selected/active platform
    DB.syncWellAlerts();

    // Listen for platform changes to re-sync
    switcher.onchange = () => {
        DB.setActivePlatform(switcher.value);
        DB.syncWellAlerts();
        navigate(currentPage); 
    };
}

// ---- Router ----
let currentPage = 'dashboard';
window.navigate = function(page, params) {
    currentPage = page;
    document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    renderPage(page, params);
}
window.refreshCurrentPage = function() {
    if (currentPage) renderPage(currentPage);
}
window.handleGlobalSync = async function(btn) {
    if (!DB.forceSync) return;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>';
    btn.disabled = true;
    
    const success = await DB.forceSync();
    
    if (success) {
        toast('Sincronização global concluída!', 'success');
    } else {
        toast('Falha na sincronização. Verifique a conexão.', 'error');
    }
    
    btn.innerHTML = originalContent;
    btn.disabled = false;
}
function renderPage(page, params) {
    const container = document.getElementById('page-container');
    const activeModule = document.body.getAttribute('data-module') || 'metering';
    const renderers = {
        dashboard: () => activeModule === 'supervisor' ? window.renderSupervisorDashboard(container) : window.renderDashboard(container),
        events: () => window.renderEvents(container, params),
        activities: () => window.renderActivities(container),
        tags: () => window.renderTags(container),
        'tag-detail': () => window.renderTagDetail(container, params),
        inspections: () => window.renderInspections(container),
        materials: () => window.renderMaterials(container),
        systems: () => window.renderSystems(container),
        notes: () => window.renderNotes(container),
        alerts: () => window.renderAlerts(container),
        metering: () => window.renderMetering(container),
        reports: () => window.renderReports(container),
        search: () => window.renderSearch(container, params),
        orifice: () => window.renderOrifice(container),
        users: () => window.renderUserManagement(container),
        // Supervisor pages
        'sup-water':    () => window.renderWaterSystem(container),
        'sup-gas':      () => window.renderGasSystem(container),
        'sup-oil':      () => window.renderOilSystem(container),
        'sup-utilities': () => window.renderUtilities(container),
        'sup-people':   () => window.renderPeopleManagement(container),
        'sup-crew':     () => window.renderCrewManager(container),
        'sup-vacations': () => window.renderVacationRanking(container),
    };
    if (renderers[page]) renderers[page]();
    else container.innerHTML = `<div class="empty-state"><p>Page not found: ${page}</p></div>`;
}

// ---- Sidebar toggle ----
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const toggle = document.getElementById('sidebar-toggle');
    const mobileBtn = document.getElementById('mobile-menu-btn');

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('collapsed');
    });
    mobileBtn.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.innerWidth < 1024) sidebar.classList.remove('mobile-open');
            navigate(link.dataset.page);
        });
    });
}

// ---- Global Search ----
function initGlobalSearch() {
    const input = document.getElementById('global-search-input');
    let timer;
    input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            const q = input.value.trim();
            // If we are on the tags page, update its local search instead of navigating
            const tagSearch = document.getElementById('tag-search');
            if (tagSearch && document.getElementById('tag-grid')) {
                tagSearch.value = q;
                tagSearch.dispatchEvent(new Event('input'));
                return;
            }
            if (q.length >= 2) navigate('search', { q });
        }, 350);
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const q = input.value.trim();
            if (q) navigate('search', { q });
        }
    });
}

// ---- App Boot ----
function showApp(user) {
    currentUser = user; // SYNC GLOBAL STATE
    document.body.classList.remove('login-active');
    document.getElementById('page-login').classList.remove('active');
    document.getElementById('page-login').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('active');

    // ---- Module Routing (role-based) ----
    const isSupervisor = (user.role === 'Supervisor' || user.module === 'supervisor');
    const isAdmin = (user.role === 'Admin');
    const activeModule = isSupervisor ? 'supervisor' : 'metering';
    document.body.setAttribute('data-module', activeModule);

    // Sidebar visibility helper
    const syncSidebar = (mod) => {
        const navMetering = document.getElementById('nav-metering-group');
        const navSupervisor = document.getElementById('nav-supervisor-group');
        if (navMetering) navMetering.classList.toggle('hidden', mod !== 'metering');
        if (navSupervisor) navSupervisor.classList.toggle('hidden', mod !== 'supervisor');
    };

    syncSidebar(activeModule);

    // Admin module switcher
    const modSwitcher = document.getElementById('module-switcher');
    if (modSwitcher) {
        modSwitcher.classList.toggle('hidden', !isAdmin);
        modSwitcher.value = activeModule;
        modSwitcher.onchange = () => {
            document.body.setAttribute('data-module', modSwitcher.value);
            syncSidebar(modSwitcher.value);
            navigate('dashboard');
            toast(`Switched to ${modSwitcher.value === 'supervisor' ? 'Production Supv' : 'Metering'} Mode`, 'info');
        };
    }

    // Update Topbar/Header User Info
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-initials').textContent = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    if (document.getElementById('user-role')) {
        document.getElementById('user-role').textContent = user.role;
    }

    updatePlatformSwitcher(user);
    initSidebar();
    initGlobalSearch();
    
    // Initial sync on app boot
    DB.syncWellAlerts();

    // Admin visibility
    const navUsers = document.getElementById('nav-users');
    if (navUsers) {
        navUsers.classList.toggle('hidden', user.role !== 'Admin' || user.isGuest);
    }

    // Demo Indicator
    const demoIndicator = document.getElementById('demo-mode-indicator');
    if (demoIndicator) {
        demoIndicator.classList.toggle('hidden', !user.isGuest);
    }

    navigate('dashboard');

    // Master Local Flow: Check for updates at boot (only for Master console)
    if (DB.isMasterLocal()) {
        setTimeout(async () => {
            const updates = await DB.checkCloudUpdates();
            if (updates) {
                window.showSyncNotification(updates);
            }
        }, 3000);
    }

    // Update alert badge
    const overdueCount = DB.getAlerts().filter(a => a.status === 'overdue' || isOverdue(a.due_date)).length;
    if (overdueCount === 0) document.getElementById('notif-badge').style.display = 'none';
    else document.getElementById('notif-badge').style.display = 'block';
}

// Master Local Sync UI Logic
window.showSyncNotification = function(updates) {
    const badge = document.getElementById('sync-notification');
    if (!badge) return;
    badge.classList.remove('hidden');
    badge.classList.add('flex');
    toast('Cloud updates detected. Authorization required.', 'info');
};

window.DB.showSyncAuthorizationModal = async function() {
    const updates = await DB.checkCloudUpdates();
    if (!updates) {
        toast('Sincronização já está em dia.', 'success');
        document.getElementById('sync-notification')?.classList.add('hidden');
        return;
    }

    let summaryHtml = '<div class="space-y-4">';
    let totalCount = 0;
    
    for (const [table, items] of Object.entries(updates)) {
        totalCount += items.length;
        summaryHtml += `
            <div class="flex items-center justify-between p-3 bg-navy-800 rounded-lg border border-slate-700/50">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span class="text-sm font-semibold text-navy uppercase">${table.replace('_', ' ')}</span>
                </div>
                <span class="text-xs font-bold text-slate-400">${items.length} pendentes</span>
            </div>
        `;
    }
    summaryHtml += '</div>';

    openModal('🛡️ Autorização de Sincronização Cloud', `
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center p-4 bg-orange-500/10 rounded-full mb-4">
                <svg class="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h3 class="text-xl font-bold text-navy mb-2">Atualizações Disponíveis na Web</h3>
            <p class="text-sm text-slate-400">Existem <strong>${totalCount}</strong> alterações registradas na versão web que ainda não foram aplicadas à sua base local.</p>
        </div>

        <div class="max-h-[300px] overflow-y-auto mb-8 px-2">
            ${summaryHtml}
        </div>

        <div class="bg-navy-800/50 border border-slate-700/30 rounded-xl p-4 mb-8">
            <p class="text-[11px] text-slate-500 leading-relaxed italic">
                * Ao autorizar, as alterações da nuvem serão mescladas. A base local é soberana: dados locais mais novos que a versão web NÃO serão sobrescritos.
            </p>
        </div>

        <div class="flex gap-3">
            <button class="btn btn-secondary flex-1" onclick="closeModal()">Revisar Depois</button>
            <button id="btn-authorize-sync" class="btn btn-primary flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-navy font-black shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                AUTORIZAR ATUALIZAÇÃO
            </button>
        </div>
    `, () => {
        document.getElementById('btn-authorize-sync').onclick = async () => {
            const btn = document.getElementById('btn-authorize-sync');
            btn.disabled = true;
            btn.innerHTML = 'Sincronizando...';
            
            const success = await DB.authorizeSync();
            if (success) {
                document.getElementById('sync-notification')?.classList.add('hidden');
                closeModal();
                toast('Base local atualizada com sucesso!', 'success');
            } else {
                btn.disabled = false;
                btn.innerHTML = 'AUTORIZAR ATUALIZAÇÃO';
            }
        };
    });
};

function showLogin() {
    document.body.classList.add('login-active');
    // Hide App Shell
    const shell = document.getElementById('app-shell');
    shell.classList.add('hidden');
    shell.classList.remove('active');

    // Show Login Page
    const loginPage = document.getElementById('page-login');
    loginPage.classList.remove('hidden');
    loginPage.classList.add('active');

    // Clean up content to prevent scrolling issues
    const container = document.getElementById('page-container');
    if (container) container.innerHTML = '';

    window.scrollTo(0, 0); // Jump to top
    clearUser();
    initIdleTimer();
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    // Login
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('login-user').value.trim();
        const p = document.getElementById('login-pass').value; // DO NOT TRIM PASSWORDS

        const user = DB.loginUser(u, p);
        if (user) {
            setUser(user);
            const remember = document.getElementById('login-remember').checked;
            if (remember) {
                localStorage.setItem('ph_remembered_u', u);
                localStorage.setItem('ph_remembered_p', p);
            } else {
                localStorage.removeItem('ph_remembered_u');
                localStorage.removeItem('ph_remembered_p');
            }
            loginError.classList.add('hidden');
            showApp(user);
        } else {
            loginError.textContent = 'Invalid username or password.';
            loginError.classList.remove('hidden');
        }
    });


    document.getElementById('btn-demo-login').addEventListener('click', () => {
        const guestUser = {
            id: 'guest-' + Date.now(),
            name: 'Guest Explorer',
            username: 'guest',
            role: 'User',
            isGuest: true,
            platforms: ['plat-flowcore'], // Restrict to FlowCore site
            created_at: new Date().toISOString()
        };
        setUser(guestUser);
        showApp(guestUser);
        toast('Bem-vindo ao Modo Demo! Explore livremente.', 'info');
    });

    document.getElementById('platform-switcher').addEventListener('change', (e) => {
        const platformId = e.target.value;
        DB.setActivePlatform(platformId);
        toast(`Switched to Site: ${DB.getPlatform(platformId).name}`, 'success');
        navigate(currentPage); // Refresh current page with new platform context
    });

    // Reset Database Tool (Requires Admin Password)
    const resetBtn = document.getElementById('btn-reset-db');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const pass = prompt('SECURITY CHECK: Enter ADMINISTRATOR password to reset database:');
            if (pass === null) return; // Cancelled

            if (DB.loginUser('admin', pass)) {
                if (confirm('CRITICAL: Are you sure? This will PERMANENTLY delete all records, custom users, and settings. This cannot be undone.')) {
                    // Force clear all relevant keys
                    const keys = Object.keys(localStorage);
                    keys.forEach(key => {
                        if (key.startsWith('ph_')) localStorage.removeItem(key);
                    });

                    toast('Database reset successfully! Reloading system...', 'success');
                    setTimeout(() => location.reload(), 2000);
                }
            } else {
                toast('Invalid Administrator password. Access denied.', 'error');
                console.error('Database reset attempt failed: Incorrect credentials.');
            }
        });
    }

    document.getElementById('btn-logout').addEventListener('click', () => showLogin());
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-backdrop').addEventListener('click', closeModal);

    // EPIC SPLASH SCREEN - Delay initial load to show animation
    setTimeout(() => {
        // Hide splash screen using class instead of removal
        const splash = document.getElementById('splash-screen');
        if (splash) splash.classList.add('splash-hidden');
        
        // Resume session
        const saved = getUser();
        if (saved) showApp(saved);
        else {
            document.getElementById('page-login').classList.add('active');
            // Load remembered credentials
            const remU = localStorage.getItem('ph_remembered_u');
            const remP = localStorage.getItem('ph_remembered_p');
            if (remU && remP) {
                document.getElementById('login-user').value = remU;
                document.getElementById('login-pass').value = remP;
                document.getElementById('login-remember').checked = true;
            }
            initIdleTimer();
        }
    }, 2500);
});

// ---- Screensaver / Idle Mode ----
let idleTimer;
function initIdleTimer() {
    const splash = document.getElementById('splash-screen');
    const resetTimer = () => {
        if (!splash) return;
        
        // Only trigger if we are ON the login page and NOT logged in
        const isLoginActive = document.getElementById('page-login').classList.contains('active');
        if (!isLoginActive || window.getUser()) {
            clearTimeout(idleTimer);
            splash.classList.add('splash-hidden');
            return;
        }

        // Hide screensaver if it's up
        if (!splash.classList.contains('splash-hidden')) {
            splash.classList.add('splash-hidden');
        }

        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            splash.classList.remove('splash-hidden');
        }, 60000); // 1 minute
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('scroll', resetTimer);
    
    resetTimer(); // Start the first timer
}

// ---- Confirm delete helper ----
function confirmDelete(label, onConfirm) {
    openModal('Confirm Delete', `
    <p class="text-navy opacity-80 mb-6">Are you sure you want to delete <strong class="text-navy">${escHtml(label)}</strong>? This cannot be undone.</p>
    <div class="flex gap-3 justify-end">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" id="confirm-del-btn">Delete</button>
    </div>
  `);
    document.getElementById('confirm-del-btn').addEventListener('click', () => { onConfirm(); closeModal(); });
}
// ---- Theme Manager ----
function initTheme() {
    const html = document.documentElement;
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');
    const toggleBtn = document.getElementById('theme-toggle');

    if (!toggleBtn) return;

    // Load saved theme or default to dark
    const savedTheme = localStorage.getItem('ph_theme') || 'dark';
    html.className = savedTheme;

    const updateIcons = (theme) => {
        if (theme === 'dark') {
            darkIcon?.classList.remove('hidden');
            lightIcon?.classList.add('hidden');
        } else {
            darkIcon?.classList.add('hidden');
            lightIcon?.classList.remove('hidden');
        }
    };

    updateIcons(savedTheme);

    toggleBtn.addEventListener('click', () => {
        const currentTheme = html.classList.contains('light') ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        html.className = newTheme;
        localStorage.setItem('ph_theme', newTheme);
        updateIcons(newTheme);
        
        toast(`Tema alterado para: ${newTheme === 'light' ? 'White Off' : 'Dark Mode'}`, 'info');
    });
}

// Update DOMContentLoaded to include initTheme
const originalDOMContentLoaded = document.addEventListener;
document.addEventListener('DOMContentLoaded', () => {
    // Existing logic is already handled in the previous DOMContentLoaded block in app.js
    // but we need to ensure initTheme is called after everything is ready.
    setTimeout(initTheme, 100); 
});

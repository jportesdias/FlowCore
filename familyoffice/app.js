/**
 * App Module - Main Controller
 */
window.formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val || 0).replace(/\xA0/g, ' '); // Replace non-breaking space for consistency
};

window.getLocalISODate = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

window.applyCurrencyMask = (input) => {
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value === '') {
            e.target.value = '';
            return;
        }
        value = (value / 100).toFixed(2) + '';
        value = value.replace(".", ",");
        value = value.replace(/(\d)(\?=(\d{3})+(?!\d))/g, "$1.");
        e.target.value = "R$ " + value;
    });

    // Handle initial value or focus
    input.addEventListener('focus', (e) => {
        if (!e.target.value) e.target.value = "R$ 0,00";
    });
};

window.parseCurrency = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    // Remove R$, dots and replace comma with dot
    const clean = val.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    return parseFloat(clean) || 0;
};

window.parseBRL = window.parseCurrency;

/* ─── SUPABASE REALTIME CONFIG ────────────────────────────────── */
const SB_URL = 'https://lruqphwlcimzcqpafjrn.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxydXFwaHdsY2ltemNxcGFmanJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTI2ODcsImV4cCI6MjA5MDQ4ODY4N30.uPEAdV2rKcZ7SuXC6A_KH3Ili6fq72ytsReRZEXijWQ';
const SB_HEADERS = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };
const SB_TABLE = `${SB_URL}/rest/v1/cash_flow_entries`;
const CARDS_TABLE = `${SB_URL}/rest/v1/cards`;
const CARD_TX_TABLE = `${SB_URL}/rest/v1/card_transactions`;
const REC_TABLE = `${SB_URL}/rest/v1/recurring_items`;
const INCOME_TABLE = `${SB_URL}/rest/v1/net_income`;
const MONTH_STATUS_TABLE    = `${SB_URL}/rest/v1/recurring_month_status`;
const MONTHLY_BALANCE_TABLE = `${SB_URL}/rest/v1/monthly_balance`;

// Injeta user_id em payloads de INSERT (não em PATCH/status updates)
function withUser(payload) {
    const uid = window.FO_USER_ID;
    if (!uid) return payload;
    if (Array.isArray(payload)) return payload.map(p => ({ ...p, user_id: uid }));
    return { ...payload, user_id: uid };
}

// Fetch autenticado com token do usuário logado
async function sbFetch(url, opts = {}) {
    const token = window.AUTH_TOKEN;
    const baseHeaders = token
        ? { ...SB_HEADERS, 'Authorization': `Bearer ${token}` }
        : SB_HEADERS;
    // Mescla headers sem sobrescrever os de autenticação
    const { headers: extraHeaders, ...restOpts } = opts;
    const mergedHeaders = { ...baseHeaders, ...(extraHeaders || {}) };
    const r = await fetch(url, { cache: 'no-store', ...restOpts, headers: mergedHeaders });
    if (!r.ok) throw new Error(await r.text());
    return r.headers.get('content-type')?.includes('json') ? r.json() : [];
}

// Sincroniza o resumo de UM mês do localStorage para o Supabase
async function syncMonthlyBalance(month) {
    if (!month) return;
    const entries = store.getMonthlyCashflow(month);
    const income  = entries.filter(e => e.type === 'income' ).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    try {
        await sbFetch(MONTHLY_BALANCE_TABLE, {
            method: 'POST',
            headers: { 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify(withUser({ month, income, expense, updated_at: new Date().toISOString() }))
        });
    } catch (e) {
        console.warn('[sync] monthly_balance falhou:', e);
    }
}

// Sincroniza TODOS os meses com dados no localStorage para o Supabase (histórico completo)
async function syncAllMonthlyBalances() {
    try {
        const all = store.getData().cashflow || [];
        const months = [...new Set(all.map(e => (e.date || '').substring(0, 7)).filter(m => m.length === 7))];
        if (!months.length) return;
        const rows = months.map(month => {
            const entries = all.filter(e => (e.date || '').startsWith(month));
            const income  = entries.filter(e => e.type === 'income' ).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
            const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
            return { month, income, expense, updated_at: new Date().toISOString() };
        });
        await sbFetch(MONTHLY_BALANCE_TABLE, {
            method: 'POST',
            headers: { 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify(withUser(rows))
        });
        console.log(`[sync] ${rows.length} meses sincronizados para monthly_balance`);
    } catch (e) {
        console.warn('[sync] syncAllMonthlyBalances falhou:', e);
    }
}

class FamilyOfficeApp {
    constructor() {
        try {
            this.chartsManager = new FamilyOfficeCharts();
            this.initializeUI();
            this.bindEvents();
            
            // Supabase Realtime State
            this.pendingEntries = [];
            this.handledIds = JSON.parse(localStorage.getItem('fo_handled_ids') || '[]');
            this.rtRetryCount = 0;
            this.setupSupabaseRealtime();
            this.fetchPendingEntries();
            
            // Cards sync state
            this.cards = [];
            this.cardTransactions = [];
            
            // Handle initial page and hash changes
            window.addEventListener('hashchange', () => this.renderActivePage());
            const now = new Date();
            this.currentViewedMonth = window.getLocalISODate(now).substring(0, 7);
            this.currentRecMonth = this.currentViewedMonth;
            this.currentCardsMonth = this.currentViewedMonth;
            this.dashboardPeriod = 3;
            this.updateAIStatus();
            this.renderActivePage();

            // Sync histórico completo para o Supabase ao iniciar
            syncAllMonthlyBalances();

            console.log("FamilyOfficeApp initialized successfully.");
        } catch (err) {
            console.error("CRITICAL: App initialization failed:", err);
            // Non-blocking alert for user
            setTimeout(() => {
                const status = document.getElementById('ai-global-status');
                if (status) status.innerHTML = '<span style="color:#f87171;font-size:10px;">ERRO DE SINCRO</span>';
            }, 1000);
        }
    }

    isBrainConfigured() {
        const brain = window.brain;
        if (!brain) return false;

        if (typeof brain.isConfigured === "function") {
            try { return !!brain.isConfigured(); } catch { return false; }
        }

        if (typeof brain.isConfigured !== "undefined") {
            return !!brain.isConfigured;
        }

        if (typeof brain.configured !== "undefined") {
            return !!brain.configured;
        }

        if (typeof brain.isReady === "function") {
            try { return !!brain.isReady(); } catch { return false; }
        }

        if (typeof brain.ready !== "undefined") {
            return !!brain.ready;
        }

        if (brain.config && typeof brain.config === "object") {
            return Object.keys(brain.config).length > 0;
        }

        return false;
    }

    initializeUI() {
        this.navItems = document.querySelectorAll('.nav-item');
        this.pages = {
            dashboard: document.getElementById('dashboard-view'),
            assets: document.getElementById('assets-view'),
            cashflow: document.getElementById('cashflow-view'),
            investments: document.getElementById('investments-view'),
            goals: document.getElementById('goals-view'),
            planning: document.getElementById('planning-view'),
            cards: document.getElementById('cards-view'),
            recorrencias: document.getElementById('recorrencias-view'),
            reports: document.getElementById('reports-view'),
            'ai-settings': document.getElementById('ai-settings-view'),
            consultor: document.getElementById('consultor-view')
        };
        this.viewTitle = document.getElementById('view-title');
        this.modal = document.getElementById('entry-modal');
        this.navToggle = document.getElementById('theme-toggle');

        // Modals explicitly
        this.recModal = document.getElementById('fo-rec-modal-overlay');
        this.incomeModal = document.getElementById('fo-income-modal-overlay');

        // Apply masks to initial fields
        document.querySelectorAll('.currency-mask').forEach(input => {
            try { window.applyCurrencyMask(input); } catch(e) {}
        });

        // Form listeners
        const incomeForm = document.getElementById('fo-income-form');
        if (incomeForm) incomeForm.addEventListener('submit', (e) => this.saveNetIncome(e));
        
        const recForm = document.getElementById('fo-rec-form');
        if (recForm) recForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRecSubmit();
        });

        // Dynamic Features Injection
        this.ensureReportsUI();
    }

    /* ─── REALTIME & APPROVAL METHODS ────────────────────────────── */
    async fetchPendingEntries() {
        try {
            const resp = await fetch(`${SB_TABLE}?status=eq.pending&origin=eq.mobile`, { headers: SB_HEADERS });
            if (!resp.ok) throw new Error('Falha ao buscar pendentes');
            const data = await resp.json();
            
            // Filter already handled locally
            this.pendingEntries = data.filter(e => !this.handledIds.includes(e.id));
            
            // Apply local AI categorization if missing
            this.pendingEntries.forEach(e => {
                if (!e.category && window.brain) {
                    const localCat = window.brain.categorizeLocal(e.description);
                    if (localCat) e.category = localCat;
                }
            });

            this.updatePendingBadge();
            if (window.location.hash === '#cashflow' || window.location.hash === '') this.renderActivePage();
        } catch (err) {
            console.error('fetchPendingEntries error:', err);
        }
    }

    setupSupabaseRealtime() {
        const wsUrl = `wss://${new URL(SB_URL).hostname}/realtime/v1/websocket?apikey=${SB_KEY}&vsn=1.0.0`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            this.rtRetryCount = 0;
            console.log('Supabase Realtime connected 🚀');
            ws.send(JSON.stringify({
                topic: 'realtime:public:cash_flow_entries',
                event: 'phx_join',
                payload: { config: { broadcast: { self: true }, presence: { key: '' } } },
                ref: '1'
            }));
        };

        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            // WebSocket Realtime v1 format
            if (data.event === 'INSERT' || (data.payload && data.payload.type === 'INSERT')) {
                const record = data.payload?.record || data.payload?.data?.record;
                if (record && record.status === 'pending') {
                    if (!this.handledIds.includes(record.id)) {
                        // AI Categorization
                        if (!record.category && window.brain) {
                            record.category = window.brain.categorizeLocal(record.description);
                        }
                        this.pendingEntries.unshift(record);
                        this.triggerNotification();
                        this.updatePendingBadge();
                        if (window.location.hash === '#cashflow') this.renderCashflowView();
                    }
                }
            }
        };

        ws.onclose = () => {
            const delay = Math.min(30000, Math.pow(2, this.rtRetryCount) * 1000);
            this.rtRetryCount++;
            console.warn(`Realtime connection lost. Retrying in ${delay/1000}s...`);
            setTimeout(() => this.setupSupabaseRealtime(), delay);
        };
    }

    triggerNotification() {
        const badge = document.getElementById('fo-notification-badge');
        if (badge) {
            badge.classList.remove('pulse');
            void badge.offsetWidth; // force reflow
            badge.classList.add('pulse');
            
            const count = this.pendingEntries.length;
            document.title = count > 0 ? `(${count}) Family Office` : 'Family Office';
        }
    }

    updatePendingBadge() {
        const badge = document.getElementById('fo-notification-badge');
        if (!badge) return;
        const count = this.pendingEntries.length;
        badge.innerText = count;
        badge.classList.toggle('hidden', count === 0);
        document.title = count > 0 ? `(${count}) Family Office` : 'Family Office';
    }

    async approveEntry(id) {
        const idx = this.pendingEntries.findIndex(e => e.id === id);
        if (idx === -1) return;

        const entry = this.pendingEntries[idx];

        // UI Update (Immediate feedback)
        this.pendingEntries.splice(idx, 1);
        this.updatePendingBadge();

        try {
            // 1. AI categorization antes de salvar
            const patch = { status: 'posted' };
            try {
                const aiResult = await window.brain.processEntry(entry.description, entry.type);
                if (aiResult?.aiStatus === 'success') {
                    patch.category    = aiResult.category;
                    patch.subcategory = aiResult.subcategory;
                }
            } catch(e) {
                console.warn('AI categorization failed:', e);
            }

            // 2. Atualiza a entrada original no Supabase (sem criar duplicata)
            const authHeaders = window.AUTH_TOKEN
                ? { ...SB_HEADERS, 'Authorization': `Bearer ${window.AUTH_TOKEN}` }
                : SB_HEADERS;
            await fetch(`${SB_TABLE}?id=eq.${id}`, {
                method: 'PATCH',
                headers: { ...authHeaders, 'Prefer': 'return=representation' },
                body: JSON.stringify(patch)
            });

            // 3. Recarrega cache do Supabase para refletir a aprovação
            await window.store.loadFromSupabase();

            this.renderActivePage();
        } catch (err) {
            console.error('Approval sync error:', err);
            alert('Erro ao sincronizar aprovação com o servidor.');
        }
    }

    async rejectEntry(id) {
        const idx = this.pendingEntries.findIndex(e => e.id === id);
        if (idx === -1) return;

        // UI Update
        this.pendingEntries.splice(idx, 1);
        this.updatePendingBadge();
        this.renderCashflowView();

        try {
            // Update status on Supabase so it leaves the PWA inbox
            const authHeaders = window.AUTH_TOKEN
                ? { ...SB_HEADERS, 'Authorization': `Bearer ${window.AUTH_TOKEN}` }
                : SB_HEADERS;
            await fetch(`${SB_TABLE}?id=eq.${id}`, {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ status: 'rejected' })
            });

            // Mark as handled to avoid re-fetching
            this.handledIds.push(id);
            localStorage.setItem('fo_handled_ids', JSON.stringify(this.handledIds));
        } catch (err) {
            console.error('Rejection sync error:', err);
        }
    }

    async approveCardTx(id) {
        try {
            await fetch(`${CARD_TX_TABLE}?id=eq.${id}`, {
                method: 'PATCH',
                headers: SB_HEADERS,
                body: JSON.stringify({ status: 'posted' })
            });
            // Re-fetch and re-render to update UI
            await this.renderCardsView();
        } catch (err) {
            console.error('Error approving card tx:', err);
        }
    }

    async rejectCardTx(id) {
        if (!confirm('Rejeitar este lançamento de cartão?')) return;
        try {
            await fetch(`${CARD_TX_TABLE}?id=eq.${id}`, {
                method: 'PATCH',
                headers: SB_HEADERS,
                body: JSON.stringify({ status: 'rejected' })
            });
            // Re-fetch and re-render. Since status is now 'rejected', 
            // it will be filtered out by the default query.
            await this.renderCardsView();
        } catch (err) {
            console.error('Error rejecting card tx:', err);
        }
    }

    /**
     * Verifica fechamento de cartões e gera fatura pendente no fluxo de caixa.
     * Executado uma vez por sessão, logo após o login.
     */
    async checkCardClosings() {
        const today = new Date();
        const todayDay = today.getDate();

        try {
            const [cRes, tRes] = await Promise.all([
                fetch(`${CARDS_TABLE}?select=*`, { headers: SB_HEADERS }),
                fetch(`${CARD_TX_TABLE}?status=eq.posted&select=*&limit=5000`, { headers: SB_HEADERS })
            ]);
            const cards = await cRes.json();
            const allTxs = await tRes.json();

            for (const card of cards) {
                if (!card.closing_day || card.closing_day !== todayDay) continue;

                // Ciclo: do dia seguinte ao fechamento do mês anterior até hoje
                const cycleEnd   = new Date(today.getFullYear(), today.getMonth(), card.closing_day);
                const cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, card.closing_day + 1);
                const cycleStartStr = window.getLocalISODate(cycleStart);
                const cycleEndStr   = window.getLocalISODate(cycleEnd);

                // Vencimento: due_day do próximo mês
                const dueDate    = new Date(today.getFullYear(), today.getMonth() + 1, card.due_day || 1);
                const dueDateStr = window.getLocalISODate(dueDate);
                const dueMonth   = dueDateStr.substring(0, 7);

                // Chave de deduplicação
                const descKey = `Fatura ${card.name} ${dueMonth}`;

                // Verifica se já foi gerada
                const existingRes = await fetch(
                    `${SB_TABLE}?origin=eq.card_closing&description=eq.${encodeURIComponent(descKey)}&limit=1`,
                    { headers: SB_HEADERS }
                );
                const existing = await existingRes.json();
                if (Array.isArray(existing) && existing.length > 0) continue;

                // Soma transações do ciclo (usa purchase_date ou date como fallback)
                const cycleTxs = allTxs.filter(t => {
                    const txDate = (t.purchase_date || t.date || '').substring(0, 10);
                    return String(t.card_id) === String(card.id) &&
                           txDate >= cycleStartStr &&
                           txDate <= cycleEndStr;
                });

                if (cycleTxs.length === 0) continue;

                const total = cycleTxs.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
                if (total <= 0) continue;

                // Cria entrada pendente no fluxo de caixa
                const entry = withUser({
                    date:        dueDateStr,
                    description: descKey,
                    amount:      parseFloat(total.toFixed(2)),
                    type:        'expense',
                    category:    'DIVIDAS_E_OBRIGACOES',
                    subcategory: 'cartao_credito',
                    status:      'pending',
                    origin:      'card_closing',
                    notes:       `${cycleTxs.length} lançamento(s) — ciclo ${cycleStartStr} a ${cycleEndStr}`
                });

                await sbFetch(SB_TABLE, {
                    method: 'POST',
                    headers: { 'Prefer': 'return=representation' },
                    body: JSON.stringify(entry)
                });

                console.log(`[CardClosing] Fatura gerada: ${descKey} = R$ ${total.toFixed(2)}`);
            }

            // Atualiza badge de pendentes após eventuais novas faturas
            await this.fetchPendingEntries();

        } catch (err) {
            console.error('[CardClosing] Erro ao verificar fechamentos:', err);
        }
    }

    updateAIStatus() {
        const statusElem = document.getElementById('ai-global-status');
        if (!statusElem) return;

        const apiKey = store.getApiKey();
        const indicator = statusElem.querySelector('.status-dot');
        const textElem = statusElem.querySelector('.status-text');

        if (apiKey && window.brain.aiConfig.selectedModel) {
            statusElem.classList.add('online');
            indicator.style.background = '#22C55E';
            indicator.style.boxShadow = '0 0 10px #22C55E';
            const modelName = window.brain.aiConfig.selectedModel.split('/').pop().toUpperCase();
            textElem.innerText = `${modelName} ATIVO`;
        } else if (apiKey) {
            statusElem.classList.remove('online');
            indicator.style.background = '#F59E0B';
            indicator.style.boxShadow = '0 0 10px #F59E0B';
            textElem.innerText = 'IA CONFIGURADA';
        } else {
            statusElem.classList.remove('online');
            indicator.style.background = '#EF4444';
            indicator.style.boxShadow = 'none';
            textElem.innerText = 'IA OFFLINE';
        }
    }

    // --- CARDS CRUD LOGIC ---

    async renderCardsView(filter = 'todos') {
        const dateElem = document.getElementById('fo-today');
        if (dateElem) {
            dateElem.textContent = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
        }
        
        // Update Month Selector Display
        const monthElem = document.getElementById('current-cards-month');
        if (monthElem) {
            const [y, m] = this.currentCardsMonth.split('-');
            const d = new Date(parseInt(y), parseInt(m)-1, 1);
            monthElem.textContent = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
        }
        
        try {
            const [cRes, tRes] = await Promise.all([
                fetch(`${CARDS_TABLE}?select=*&order=name.asc`, { headers: SB_HEADERS }),
                fetch(`${CARD_TX_TABLE}?select=*&or=(status.is.null,status.neq.rejected)&order=date.desc&limit=5000`, { headers: SB_HEADERS })
            ]);
            
            this.cards = await cRes.json();
            this.cardTransactions = await tRes.json();
            
            console.log(`DEBUG: renderCardsView loaded ${this.cards.length} cards and ${this.cardTransactions.length} transactions.`);
            
            this.processCardProjections();
            this.renderCardsMetrics();
            this.renderCardsGrid();
            this.renderDynamicAlerts();
            this.renderCardsTxTable(filter);
        } catch (err) {
            console.error('Cards fetch error:', err);
        }
    }

    processCardProjections() {
        // Use selected month or fallback to current month
        const targetMonth = this.currentCardsMonth || new Date().toISOString().substring(0, 7);
        const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);

        this.cards.forEach(card => {
            const cardIdStr = String(card.id);
            const txs = this.cardTransactions.filter(t => String(t.card_id) === cardIdStr);
            const limit = window.parseBRL(card.total_limit);

            // Total outstanding = ALL transactions (unpaid obligations)
            card.effectiveUsed = txs.reduce((s, t) => s + window.parseBRL(t.amount), 0);

            // Due date for the SPECIFIC selected month
            card.nextDueDate = new Date(targetYear, targetMonthNum - 1, card.due_day || 1);

            // Invoice = transactions due in the TARGET month
            card.invoiceAmount = txs
                .filter(t => {
                    const dd = (t.due_date || t.date || t.purchase_date || '');
                    return dd.startsWith(targetMonth);
                })
                .reduce((s, t) => s + window.parseBRL(t.amount), 0);

            card.usedAmount = card.effectiveUsed;
            card.utilizationPct = limit > 0 ? (card.effectiveUsed / limit) : 0;
        });
    }

    renderCardsMetrics() {
        const totalLimit = this.cards.reduce((sum, c) => sum + (window.parseBRL(c.total_limit) || 0), 0);
        const totalUsed = this.cards.reduce((sum, c) => sum + (parseFloat(c.effectiveUsed) || 0), 0);
        const totalInvoice = this.cards.reduce((sum, c) => sum + (parseFloat(c.invoiceAmount) || 0), 0);
        const totalPoints = this.cards.reduce((sum, c) => sum + (parseInt(c.points) || 0), 0);
        
        const utilizationPct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
        
        const futureDates = this.cards.map(c => c.nextDueDate).sort((a,b) => a - b);
        const nextDue = futureDates.length > 0 ? futureDates[0].toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}) : 'N/A';

        const metricsHtml = `
            <div class="fo-metric glass">
                <div class="fo-metric-label">LIMITE TOTAL</div>
                <div class="fo-metric-value">${totalLimit.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                <div class="fo-metric-sub">${this.cards.length} cartões ativos</div>
            </div>
            <div class="fo-metric glass">
                <div class="fo-metric-label">UTILIZADO</div>
                <div class="fo-metric-value">${totalUsed.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                <div class="fo-metric-sub">${utilizationPct.toFixed(1)}% do limite consolidado</div>
            </div>
            <div class="fo-metric glass">
                <div class="fo-metric-label">FATURAS ABERTAS</div>
                <div class="fo-metric-value">${totalInvoice.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                <div class="fo-metric-sub">Próximo vencimento: ${nextDue}</div>
            </div>
            <div class="fo-metric glass">
                <div class="fo-metric-label">CASHBACK / PONTOS</div>
                <div class="fo-metric-value">${totalPoints.toLocaleString('pt-BR')} PTS</div>
                <div class="fo-metric-sub">Consolidado em todos os cartões</div>
            </div>
        `;
        const container = document.querySelector('#cards-view .fo-metrics');
        if (container) container.innerHTML = metricsHtml;
    }

    renderCardsGrid() {
        const container = document.getElementById('fo-cards-container');
        if (!container) return;

        if (this.cards.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding: 20px; font-size:12px;">Nenhum cartão cadastrado.</div>';
            return;
        }

        container.innerHTML = this.cards.map(card => {
            const limit = window.parseBRL(card.total_limit) || 0;
            const utilPct = card.utilizationPct * 100;
            
            let status = 'Regular';
            let badgeClass = 'fo-badge-ok';
            let barClass = 'fo-bar-ok';
            
            if (utilPct > 70) {
                status = 'Crítico'; badgeClass = 'fo-badge-danger'; barClass = 'fo-bar-danger';
            } else if (utilPct > 40) {
                status = 'Atenção'; badgeClass = 'fo-badge-warn'; barClass = 'fo-bar-warn';
            }

            const barWidth = Math.min(100, Math.round(utilPct));
            const dueDateStr = card.nextDueDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'short'});

            return `
            <div class="fo-card glass" onclick="app.openProjectionModal('${card.id}')">
                <div class="fo-card-actions">
                    <button class="fo-action-btn" onclick="event.stopPropagation(); app.openCardModal('${card.id}')" title="Editar Cartão"><i class="fas fa-edit"></i></button>
                    <button class="fo-action-btn delete" onclick="event.stopPropagation(); app.deleteCard('${card.id}')" title="Excluir Cartão"><i class="fas fa-trash"></i></button>
                </div>
                <div class="fo-card-chip"></div>
                <div class="fo-card-top">
                    <div>
                        <div class="fo-card-name">${card.name}</div>
                        <div class="fo-card-holder">${card.bank} — ${card.holder}</div>
                    </div>
                    <span class="fo-badge ${badgeClass}">${status}</span>
                </div>
                <div class="fo-progress-wrap">
                    <div class="fo-progress-row">
                        <span>Comprometido</span>
                        <span>${card.effectiveUsed.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})} / ${limit.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                    </div>
                    <div class="fo-bar"><div class="fo-bar-fill ${barClass}" style="width:${barWidth}%"></div></div>
                </div>
                <div class="fo-card-footer">
                    <div><div class="fo-card-stat-label">Fatura</div><div class="fo-card-stat-val">${parseFloat(card.invoiceAmount || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div></div>
                    <div><div class="fo-card-stat-label">Vencimento</div><div class="fo-card-stat-val">${dueDateStr}</div></div>
                    <div><div class="fo-card-stat-label">Pontos</div><div class="fo-card-stat-val">${parseInt(card.points || 0).toLocaleString('pt-BR')}</div></div>
                </div>
            </div>`;
        }).join('');
    }

    renderDynamicAlerts() {
        const container = document.getElementById('fo-alerts-container');
        if (!container) return;

        let alerts = [];
        const today = new Date();
        const next5Days = new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000));

        this.cards.forEach(card => {
            const dueDate = card.nextDueDate;
            if (dueDate >= today && dueDate <= next5Days) {
                const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                alerts.push(`
                    <div class="fo-alert glass">
                        <div class="fo-alert-dot dot-danger"></div>
                        <div class="fo-alert-text">${card.name} — fatura vence em <strong>${diffDays} dias</strong> (${parseFloat(card.invoiceAmount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})})</div>
                        <div class="fo-alert-date">${dueDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}</div>
                    </div>
                `);
            }

            const pct = card.utilizationPct;
            if (pct > 0.5) {
                alerts.push(`
                    <div class="fo-alert glass">
                        <div class="fo-alert-dot dot-warn"></div>
                        <div class="fo-alert-text">${card.name} — utilização acima de <strong>50%</strong> do limite disponível</div>
                        <div class="fo-alert-date">Hoje</div>
                    </div>
                `);
            }
        });

        if (alerts.length < 5 && this.cards.length > 0) {
            alerts.push(`
                <div class="fo-alert glass">
                    <div class="fo-alert-dot dot-ok"></div>
                    <div class="fo-alert-text">Gestão de limites estabilizada. Nenhuma fatura crítica detectada.</div>
                    <div class="fo-alert-date">Automático</div>
                </div>
            `);
        }

        if (this.cards.length === 0) {
            alerts = [`<div style="color:var(--text-muted); font-size:12px; padding: 10px;">Adicione cartões para ver alertas.</div>`];
        }

        container.innerHTML = alerts.slice(0, 5).join('');
    }

    renderCardsTxTable(filter = 'todos') {
        const tbody = document.getElementById('fo-tx-body');
        if (!tbody) return;

        let rows = this.cardTransactions;
        
        // Filter by Month first (Pagination Logic)
        const targetMonth = this.currentCardsMonth || new Date().toISOString().substring(0, 7);
        rows = rows.filter(t => {
            const dd = (t.due_date || t.date || t.purchase_date || '');
            return dd.startsWith(targetMonth);
        });

        if (filter !== 'todos') {
            rows = rows.filter(t => t.category === filter);
        }
        
        // Ordenação por data de COMPRA (da mais recente para a mais antiga)
        rows.sort((a,b) => {
            const dateA = new Date(a.purchase_date || a.date);
            const dateB = new Date(b.purchase_date || b.date);
            return dateB - dateA;
        });

        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Nenhuma transação encontrada.</td></tr>';
            return;
        }

        const catClass = {
          'Viagem':      'cat-viagem',
          'Restaurante': 'cat-rest',
          'Compras':     'cat-comp',
          'Saúde':       'cat-saude',
          'Outros':      'cat-outros'
        };

        tbody.innerHTML = rows.map(r => {
            const card = this.cards.find(c => c.id === r.card_id);
            const cardName = card ? card.name : 'Desconhecido';
            const dateStr = new Date((r.purchase_date || r.date) + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'short'});
            
            // Approval Actions for Pending items
            const isPending = r.status === 'pending';
            const approvalActions = isPending ? `
                <button class="fo-action-btn check" onclick="window.app.approveCardTx('${r.id}')" title="Aprovar"><i class="fas fa-check"></i></button>
                <button class="fo-action-btn delete" onclick="window.app.rejectCardTx('${r.id}')" title="Rejeitar"><i class="fas fa-times"></i></button>
            ` : `
                <button class="fo-action-btn" onclick="window.app.openCardTxModal('${r.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="fo-action-btn delete" onclick="window.app.deleteCardTx('${r.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
            `;

            const statusBadge = isPending ? `<span class="fo-status-pending" style="font-size:10px; background:rgba(184,137,26,0.1); color:var(--gold-200); padding:2px 6px; border-radius:4px; margin-left:8px;">Pendente</span>` : '';

            return `
                <tr class="${isPending ? 'pending-row' : ''}">
                  <td>${dateStr}</td>
                  <td>
                      <div style="display:flex; align-items:center; justify-content:space-between;">
                        <span>${r.description}${statusBadge}</span>
                        <div class="fo-tx-actions">
                           ${approvalActions}
                        </div>
                      </div>
                  </td>
                  <td class="fo-card-col">${cardName}</td>
                  <td><span class="fo-cat ${catClass[r.category] || 'cat-outros'}">${r.category || 'Outros'}</span></td>
                  <td class="fo-amount">${parseFloat(r.amount).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                </tr>
            `;
        }).join('');
    }

    openCardModal(id = null) {
        document.getElementById('fo-card-form').reset();
        document.getElementById('fo-card-id').value = '';
        document.getElementById('fo-card-modal-title').innerText = id ? 'Editar Cartão' : 'Adicionar Cartão';

        if (id) {
            const card = this.cards.find(c => c.id === id);
            if (card) {
                document.getElementById('fo-card-id').value = card.id;
                document.getElementById('fo-card-name').value = card.name;
                document.getElementById('fo-card-bank').value = card.bank;
                document.getElementById('fo-card-holder').value = card.holder;
                document.getElementById('fo-card-limit').value = window.formatBRL(card.total_limit).replace('R$', '').trim();
                // used, invoice and due are now computed or from DB due_day
                document.getElementById('fo-card-closing').value = card.closing_day || '';
                document.getElementById('fo-card-due').value = card.due_day || 1;
                document.getElementById('fo-card-points').value = (card.points || 0);
            }
        }
        document.getElementById('fo-card-modal-overlay').classList.remove('hidden');
    }

    async deleteCard(id) {
        if (confirm('Tem certeza? Isso apagará o cartão e todas as suas transações vinculadas.')) {
            try {
                await fetch(`${CARDS_TABLE}?id=eq.${id}`, { method: 'DELETE', headers: SB_HEADERS });
                await fetch(`${CARD_TX_TABLE}?card_id=eq.${id}`, { method: 'DELETE', headers: SB_HEADERS });
                this.renderCardsView();
            } catch(e) { alert('Erro ao deletar cartão'); }
        }
    }

    openCardTxModal(id = null, preSelectedCardId = null) {
        if (this.cards.length === 0) {
            alert('Você precisa adicionar um cartão primeiro.');
            return;
        }

        const select = document.getElementById('fo-tx-card');
        select.innerHTML = this.cards.map(c => `<option value="${c.id}" data-due="${c.due_day}" data-closing="${c.closing_day || ''}">${c.name}</option>`).join('');
        
        document.getElementById('fo-tx-form').reset();
        document.getElementById('fo-tx-id').value = '';
        document.getElementById('fo-tx-modal-title').innerText = id ? 'Editar Transação' : 'Nova Transação';

        // Padrão Calculadora (Máscara de Moeda)
        const amountInput = document.getElementById('fo-tx-amount');
        if (amountInput) {
            amountInput.type = 'text';
            amountInput.classList.add('currency-mask');
            amountInput.placeholder = '0,00';
            // Reaplica a lógica de máscara se necessário
            if (typeof window.applyCurrencyMask === 'function') {
                window.applyCurrencyMask(amountInput);
            }
        }

        // Garante existência do Preview de parcelas
        let previewElem = document.getElementById('fo-tx-preview');
        if (!previewElem && amountInput) {
            previewElem = document.createElement('div');
            previewElem.id = 'fo-tx-preview';
            previewElem.style.cssText = 'font-size: 11px; color: var(--gold-200); opacity: 0.8; margin-bottom: 12px; min-height: 14px; font-style: italic;';
            amountInput.parentElement.insertAdjacentElement('afterend', previewElem);
        }
        if (previewElem) previewElem.innerText = '';

        const installmentsElem = document.getElementById('fo-tx-installments');

        if (id) {
            const tx = this.cardTransactions.find(t => t.id === id);
            if (tx) {
                document.getElementById('fo-tx-id').value = tx.id;
                document.getElementById('fo-tx-card').value = tx.card_id;
                document.getElementById('fo-tx-date').value = tx.date;
                document.getElementById('fo-tx-place').value = tx.description;
                document.getElementById('fo-tx-amount').value = window.formatBRL(tx.amount).replace('R$', '').trim();
                if (installmentsElem) {
                    installmentsElem.value = '1';
                    installmentsElem.disabled = true; // Disable installments on edit
                }
            }
        } else {
            document.getElementById('fo-tx-date').value = new Date().toISOString().split('T')[0];
            if (installmentsElem) installmentsElem.disabled = false;
            if (preSelectedCardId) {
                select.value = preSelectedCardId;
            }
        }

        document.getElementById('fo-tx-modal-overlay').classList.remove('hidden');
    }

    updateInstallmentPreview() {
        const amount = window.parseCurrency(document.getElementById('fo-tx-amount').value);
        const n = parseInt(document.getElementById('fo-tx-installments')?.value) || 1;
        const preview = document.getElementById('fo-tx-preview');
        if (amount > 0 && n > 1) {
            const each = amount / n;
            preview.textContent = `${n}x de ${each.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}`;
        } else {
            preview.textContent = '';
        }
    }

    openProjectionModal(cardId) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;

        // Populate Header
        document.getElementById('fo-proj-header').innerHTML = `
            <div style="font-family: var(--font-display); font-size: 24px; color: var(--gold-200);">${card.name}</div>
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">${card.bank} • ${card.holder} • Dia ${card.due_day}</div>
        `;
        
        const limitDisplay = document.getElementById('fo-proj-limit');
        const futureDisplay = document.getElementById('fo-proj-future');
        limitDisplay.innerText = parseFloat(card.total_limit - card.effectiveUsed).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
        futureDisplay.innerText = parseFloat(card.futureCommitted).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

        // Launch Button inside Projection
        document.getElementById('btn-add-card-tx-inner').onclick = () => this.openCardTxModal(null, card.id);

        const timeline = document.getElementById('fo-projection-timeline');
        timeline.innerHTML = '';

        const today = new Date();
        // Use loose equality (==) for card_id to handle potential String/Number mismatches
        const txs = this.cardTransactions.filter(t => t.card_id == cardId && t.status !== 'rejected');

        for (let i = 0; i < 12; i++) {
            const m = new Date(today.getFullYear(), today.getMonth() + i, 1);
            // Local Month/Year string for comparison
            const my = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = m.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            
            const monthTxs = txs.filter(t => t.due_date && t.due_date.startsWith(my));
            const monthTotal = monthTxs.reduce((s, t) => s + parseFloat(t.amount || 0), 0);

            // Calculate cumulative used up to this month
            const cumulativeUsed = txs.filter(t => {
                if (!t.due_date) return false;
                const tDate = new Date(t.due_date + 'T12:00:00');
                const endDate = new Date(m.getFullYear(), m.getMonth() + 1, 0); 
                return tDate <= endDate;
            }).reduce((s, t) => s + parseFloat(t.amount || 0), 0);

            const pct = Math.min(100, (cumulativeUsed / (card.total_limit || 1)) * 100);
            const barColor = pct <= 40 ? '#4ade80' : (pct <= 75 ? '#fbbf24' : '#f87171');

            const row = document.createElement('div');
            row.className = `fo-timeline-row ${i === 0 ? 'active' : ''}`;
            row.innerHTML = `
                <div class="fo-timeline-header" onclick="this.nextElementSibling.classList.toggle('expanded')">
                    <div class="month-label">${monthLabel}</div>
                    <div class="cumulative-bar-wrap">
                        <div class="cumulative-bar" style="width: ${pct}%; background: ${barColor}"></div>
                    </div>
                    <div class="month-total">${monthTotal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                </div>
                <div class="tx-list">
                    ${monthTxs.map(t => `
                        <div class="tx-item">
                            <span>${t.description}</span>
                            <span style="font-weight:600; color:#fff">${parseFloat(t.amount).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                        </div>
                    `).join('') || '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px;">Sem lançamentos</div>'}
                </div>
            `;
            timeline.appendChild(row);
        }

        document.getElementById('fo-projection-modal-overlay').classList.remove('hidden');
    }

    async deleteCardTx(id) {
        if (confirm('Excluir esta transação?')) {
            try {
                await fetch(`${CARD_TX_TABLE}?id=eq.${id}`, { method: 'DELETE', headers: SB_HEADERS });
                this.renderCardsView();
            } catch(e) { alert('Erro ao deletar transação'); }
        }
    }

    bindEvents() {
        // Recorr&#234;ncias & Fluxo Fixo
        document.getElementById('fo-btn-insert-rec')?.addEventListener('click', () => {
            console.log("DEBUG: #fo-btn-insert-rec clicked");
            this.openRecModal();
        });
        document.getElementById('fo-btn-net-income')?.addEventListener('click', () => {
            console.log("DEBUG: #fo-btn-net-income clicked");
            this.openNetIncomeModal();
        });

        // Cards Filter Logic
        document.getElementById('fo-filters')?.addEventListener('click', e => {
            const btn = e.target.closest('.fo-filter');
            if (!btn) return;
            document.querySelectorAll('#fo-filters .fo-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Exclude the 'Nova transação' button logic from filter reset if clicked accidentally
            if (btn.id !== 'btn-add-card-tx') {
                this.renderCardsTxTable(btn.dataset.cat);
            }
        });

        // Cards Modal Triggers
        document.getElementById('btn-add-card')?.addEventListener('click', () => this.openCardModal());
        document.getElementById('btn-add-card-tx')?.addEventListener('click', () => this.openCardTxModal());
        
        // AI Categorization for Card Transactions (Desktop Only)
        let cardTxAiTimeout = null;
        document.getElementById('fo-tx-place')?.addEventListener('input', (e) => {
            clearTimeout(cardTxAiTimeout);
            const desc = e.target.value.trim();
            if (desc.length < 3) return;

            cardTxAiTimeout = setTimeout(async () => {
                if (!window.brain) return;
                console.log(`DEBUG: AI Categorizing card tx: "${desc}"`);
                // Note: Category selection removed from UI, keeping logic for potential future use or hidden categorization
            }, 800);
        });
        
        document.getElementById('fo-card-modal-close')?.addEventListener('click', () => document.getElementById('fo-card-modal-overlay').classList.add('hidden'));
        document.getElementById('fo-card-modal-cancel')?.addEventListener('click', () => document.getElementById('fo-card-modal-overlay').classList.add('hidden'));
        document.getElementById('fo-tx-modal-close')?.addEventListener('click', () => document.getElementById('fo-tx-modal-overlay').classList.add('hidden'));
        document.getElementById('fo-tx-modal-cancel')?.addEventListener('click', () => document.getElementById('fo-tx-modal-overlay').classList.add('hidden'));

        document.getElementById('fo-card-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'fo-card-modal-overlay') e.target.classList.add('hidden');
        });

        document.getElementById('fo-proj-modal-close')?.addEventListener('click', () => {
            document.getElementById('fo-projection-modal-overlay').classList.add('hidden');
        });

        document.getElementById('fo-projection-modal-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'fo-projection-modal-overlay') e.target.classList.add('hidden');
        });
        document.getElementById('fo-tx-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'fo-tx-modal-overlay') e.target.classList.add('hidden');
        });

        // Cards Forms Submit
        document.getElementById('fo-card-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('fo-card-id').value;
            const card = {
                name: document.getElementById('fo-card-name').value,
                bank: document.getElementById('fo-card-bank').value,
                holder: document.getElementById('fo-card-holder').value,
                total_limit: window.parseCurrency(document.getElementById('fo-card-limit').value),
                closing_day: parseInt(document.getElementById('fo-card-closing').value) || null,
                due_day: parseInt(document.getElementById('fo-card-due').value) || 1,
                points: window.parseCurrency(document.getElementById('fo-card-points').value) || 0
            };
            
            try {
                if (id) {
                    await fetch(`${CARDS_TABLE}?id=eq.${id}`, { method: 'PATCH', headers: SB_HEADERS, body: JSON.stringify(card) });
                } else {
                    await fetch(CARDS_TABLE, { method: 'POST', headers: SB_HEADERS, body: JSON.stringify(withUser(card)) });
                }
                document.getElementById('fo-card-modal-overlay').classList.add('hidden');
                this.renderCardsView();
            } catch(e) { alert('Erro ao salvar cartão'); }
        });

        document.getElementById('fo-tx-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.submitter || e.target.querySelector('button[type="submit"]');
            const originalText = btn ? btn.innerText : 'Salvar';
            
            const id = document.getElementById('fo-tx-id').value;
            const cardSelect = document.getElementById('fo-tx-card');
            const cardId = cardSelect.value;
            
            // Defensive data-due retrieval
            const selectedOpt = cardSelect.selectedOptions ? cardSelect.selectedOptions[0] : null;
            const dueDay = parseInt(selectedOpt?.dataset.due || '1');
            const closingDay = parseInt(selectedOpt?.dataset.closing || '0') || null;
            
            const amount = window.parseCurrency(document.getElementById('fo-tx-amount').value);
            const n = parseInt(document.getElementById('fo-tx-installments')?.value) || 1;
            const description = document.getElementById('fo-tx-place').value.trim();
            const purchaseDate = document.getElementById('fo-tx-date').value;
            
            if (!cardId || isNaN(amount) || !description || !purchaseDate) {
                alert('Por favor, preencha todos os campos obrigatórios corretamente.');
                return;
            }

            // IA Categorization (Silent fallback) - Same logic as Fluxo de Caixa
            let category = 'Outros';
            let subcategory = 'outro';
            try {
                const aiResult = await window.brain.processEntry(description, 'expense');
                if (aiResult && aiResult.aiStatus === 'success') {
                    // Match ID to Name for compatibility with current cards view
                    const catObj = store.getCategories().find(c => c.id === aiResult.category);
                    category = catObj ? catObj.name : (aiResult.category || 'Outros');
                    subcategory = aiResult.subcategory || 'outro';
                }
            } catch (err) { console.warn('Card AI categorization failed:', err); }

            if (btn) {
                btn.innerText = 'Salvando...';
                btn.disabled = true;
            }

            try {
                if (id) {
                    // Update single transaction (Edit mode)
                    const tx = {
                        card_id: cardId,
                        date: purchaseDate,
                        due_date: purchaseDate, // Ensure due_date is preserved/updated on edit
                        description,
                        amount,
                        status: 'posted'
                    };
                    console.log('DEBUG: Updating TX payload:', tx);
                    const res = await fetch(`${CARD_TX_TABLE}?id=eq.${id}`, { method: 'PATCH', headers: SB_HEADERS, body: JSON.stringify(tx) });
                    if (!res.ok) {
                        const errorBody = await res.json().catch(() => ({}));
                        throw new Error(`Supabase PATCH Error: ${JSON.stringify(errorBody)}`);
                    }
                } else {
                    // Create New Transaction(s)
                    const groupId = (window.crypto && window.crypto.randomUUID) 
                        ? window.crypto.randomUUID() 
                        : 'grp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

                    const each = parseFloat((amount / n).toFixed(2));
                    const diff = parseFloat((amount - (each * n)).toFixed(2));
                    
                    const records = Array.from({length: n}, (_, i) => {
                        const base = new Date(purchaseDate + 'T12:00:00');
                        base.setMonth(base.getMonth() + i);
                        let due;
                        if (closingDay) {
                            // Se a compra for no dia de fechamento ou depois, cai no ciclo seguinte
                            const afterClosing = base.getDate() >= closingDay ? 1 : 0;
                            due = new Date(base.getFullYear(), base.getMonth() + afterClosing + 1, dueDay);
                        } else {
                            // Fallback legado sem dia de fechamento cadastrado
                            due = new Date(base.getFullYear(), base.getMonth(), dueDay);
                            if (due <= base) due.setMonth(due.getMonth() + 1);
                            if (base.getDate() > 25) due.setMonth(due.getMonth() + 1);
                        }
                        const dueDateStr = window.getLocalISODate(due);
                        
                        // Add diff to the last installment
                        const currentAmount = (i === n - 1) ? parseFloat((each + diff).toFixed(2)) : each;
                        
                        return {
                            card_id: cardId,
                            purchase_date: purchaseDate,
                            date: dueDateStr,
                            due_date: dueDateStr,
                            description: n > 1 ? `${description} (${i+1}/${n})` : description,
                            amount: currentAmount,
                            installments: n,
                            installment_current: i + 1,
                            installment_group_id: groupId,
                            installment_group_id: groupId,
                            status: 'posted',
                            origin: 'mobile'
                        };
                    });

                    console.log(`DEBUG: Sending ${n} records to Supabase:`, records);

                    // Multi-POST sync
                    for (const record of records) {
                        const res = await fetch(CARD_TX_TABLE, { method: 'POST', headers: SB_HEADERS, body: JSON.stringify(withUser(record)) });
                        if (!res.ok) {
                            const errorBody = await res.json().catch(() => ({}));
                            console.error('DEBUG: Supabase POST Full Error:', errorBody);
                            throw new Error(`Supabase POST Error (Installment ${record.installment_current}): ${JSON.stringify(errorBody)}`);
                        }
                    }
                }
                
                
                document.getElementById('fo-tx-modal-overlay').classList.add('hidden');
                
                // Small delay to ensure DB consistency before refresh
                await new Promise(resolve => setTimeout(resolve, 800));
                await this.renderCardsView();
            } catch(e) { 
                console.error('CRITICAL: Error saving tx:', e);
                // Detailed alert for user
                alert('Erro ao salvar transação:\n' + e.message); 
            } finally {
                if (btn) {
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            }
        });

        // Add preview listeners
        document.getElementById('fo-tx-amount')?.addEventListener('input', () => this.updateInstallmentPreview());
        document.getElementById('fo-tx-installments')?.addEventListener('change', () => this.updateInstallmentPreview());

        // Navigation Links (Don't prevent default, let hashchange handle it)
        this.navItems.forEach(item => {
            if(item.id === 'theme-toggle') return;
            item.addEventListener('click', (e) => {
                const page = item.getAttribute('data-page');
                if (page) {
                    e.preventDefault();
                    // Direct navigation if already on the page or to avoid protocol warnings
                    if (window.location.hash.replace('#','') !== page) {
                        window.location.hash = page;
                    } else {
                        this.renderActivePage();
                    }
                }
            });
        });

        // Theme Toggle — persiste no localStorage
        const applyTheme = (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            const icon = document.querySelector('#theme-toggle i');
            const label = document.getElementById('theme-toggle-label');
            if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
            if (label) label.textContent = theme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
            localStorage.setItem('fo-theme', theme);
        };

        // Carrega tema salvo (padrão: dark)
        const savedTheme = localStorage.getItem('fo-theme') || 'dark';
        applyTheme(savedTheme);

        document.getElementById('theme-toggle').addEventListener('click', (e) => {
            e.preventDefault();
            const current = document.documentElement.getAttribute('data-theme');
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });

        // Modal Logic
        document.getElementById('add-entry-btn').addEventListener('click', () => {
            this.showModal();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('close-modal').addEventListener('click', () => {
            this.modal.style.display = 'none';
        });

        window.addEventListener('dataChanged', () => {
            this.renderActivePage();
        });

        document.getElementById('entry-type').addEventListener('change', (e) => {
            this.renderFormFields(e.target.value);
        });

        document.getElementById('quick-entry-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.handleQuickEntry(formData);
        });

        document.getElementById('entry-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(new FormData(e.target));
        });

        // Recurring Modal Events
        document.getElementById('manage-recurring-btn')?.addEventListener('click', () => {
            this.showRecurringModal();
        });

        document.getElementById('close-recurring-modal')?.addEventListener('click', () => {
            document.getElementById('recurring-modal').style.display = 'none';
        });

        document.getElementById('add-recurring-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const entry = {
                description: formData.get('description'),
                amount: window.parseCurrency(formData.get('amount')),
                start_date: formData.get('start_date'),
                installments: formData.get('installments'),
                type: 'expense'
            };
            store.addRecurring(entry);
            e.target.reset();
            this.renderRecurringList();
        });

        // Family Office Recorrências Form
        document.getElementById('fo-rec-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRecItem();
        });

        // Family Office Net Income Form
        document.getElementById('fo-income-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNetIncome();
        });

        // Investment Form
        document.getElementById('new-investment-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleInvestmentSubmit(new FormData(e.target));
        });

        document.getElementById('indices-manual-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleManualIndicesSubmit(new FormData(e.target));
        });

        // Projection Inputs
        document.getElementById('proj-months')?.addEventListener('input', () => {
            this.renderInvestments();
        });
    }

    // Removed manual navigate function to rely on native link behavior
    // navigate(pageId) { ... }

    changeMonth(delta) {
        const [year, month] = this.currentViewedMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + delta, 1);
        const nextYear = date.getFullYear();
        const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
        this.currentViewedMonth = `${nextYear}-${nextMonth}`;
        
        console.log('--- NAVIGATION DIAGNOSTIC ---');
        console.log('New Viewed Month:', this.currentViewedMonth);
        
        this.renderCashflowView();
    }

    setDashboardPeriod(months) {
        this.dashboardPeriod = months;
        const btns = document.querySelectorAll('.period-btn');
        btns.forEach(btn => {
            btn.classList.toggle('active', btn.innerText.includes(months));
        });
        this.renderDashboardSummary();
    }

    renderActivePage() {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        
        // Update Title
        const titles = {
            dashboard: 'Dashboard Principal',
            assets: 'Patrimônio & Ativos',
            cashflow: 'Fluxo de Caixa',
            cards: 'Cartões de Crédito',
            recorrencias: 'Recorrências & Fluxo Fixo',
            investments: 'Análise de Investimentos',
            goals: 'Metas Financeiras',
            planning: 'Planejamento de Futuro',
            reports: 'Visão Detalhada de Gastos',
            'ai-settings': 'Configurações de IA',
            consultor: 'Consultor IA Financeiro'
        };

        const subtitles = {
            dashboard: 'Bem-vindo à sua gestão patrimonial.',
            assets: 'Visão consolidade de bens e investimentos.',
            cashflow: 'Acompanhamento de entradas e saídas.',
            cards: 'Gestão de faturas e limites.',
            recorrencias: 'Controle de gastos fixos e assinaturas.',
            investments: 'Performance e alocação de ativos.',
            goals: 'Progresso rumo aos seus objetivos.',
            planning: 'Simulações de liberdade financeira.',
            reports: 'Geração de inteligência sobre despesas por categoria.',
            'ai-settings': 'Personalize sua experiência com IA.',
            consultor: 'Análise Profunda & Estratégia Patrimonial'
        };

        this.viewTitle.innerText = titles[hash] || 'Dashboard';
        const subtitleEl = document.getElementById('view-subtitle');
        if (subtitleEl) subtitleEl.innerText = subtitles[hash] || '';

        // Update Nav
        this.navItems.forEach(nav => {
            nav.classList.toggle('active', nav.getAttribute('data-page') === hash);
        });

        // Show/Hide sections
        Object.keys(this.pages).forEach(key => {
            if (this.pages[key]) {
                this.pages[key].classList.toggle('hidden', key !== hash);
            }
        });

        if (hash === 'dashboard') {
            this.renderDashboardSummary();
        }
        if (hash === 'assets') this.renderAssetsTable();
        if (hash === 'cashflow') this.renderCashflowView();
        if (hash === 'cards') this.renderCardsView();
        if (hash === 'goals') this.renderGoals();
        if (hash === 'planning') this.initPlanning();
        if (hash === 'investments') this.renderInvestments();
        if (hash === 'recorrencias') this.renderRecorrenciasView();
        if (hash === 'reports') this.renderReportsView();
        if (hash === 'ai-settings') this.renderAISettings();
        if (hash === 'consultor') this.renderConsultorIA();
        
        this.updateUI();
    }

    renderDashboardSummary() {
        const container = document.getElementById('dashboard-summary-content');
        if (!container) return;

        const data = store.getData();
        const cashflow = data.cashflow || [];
        const monthsCount = this.dashboardPeriod;

        // Onboarding: cards guia quando não há dados
        const hasNoData = cashflow.length === 0 && (!data.assets || data.assets.length === 0) && (!data.goals || data.goals.length === 0);
        if (hasNoData) {
            container.innerHTML = `
                <div style="grid-column:1/-1; padding:1rem 0;">
                    <p style="color:var(--text-secondary); font-size:0.85rem; margin:0 0 1.25rem 0; text-align:center;">Seu painel está vazio. Veja o que você pode registrar:</p>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem;">
                        <div onclick="window.location.hash='cashflow'" style="cursor:pointer; background:var(--bg-accent); border:1px solid var(--glass-border); border-radius:14px; padding:1.5rem; transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--gold-primary)'" onmouseout="this.style.borderColor='var(--glass-border)'">
                            <i class="fas fa-exchange-alt" style="color:var(--gold-primary); font-size:1.5rem; margin-bottom:0.75rem; display:block;"></i>
                            <div style="color:var(--text-primary); font-weight:600; margin-bottom:0.4rem;">Fluxo de Caixa</div>
                            <div style="color:var(--text-secondary); font-size:0.8rem; line-height:1.5;">Registre suas receitas e despesas mensais para acompanhar o saldo e entender para onde vai o seu dinheiro.</div>
                            <div style="margin-top:1rem; color:var(--gold-primary); font-size:0.78rem; font-weight:600;">+ Adicionar lançamento →</div>
                        </div>
                        <div onclick="window.location.hash='assets'" style="cursor:pointer; background:var(--bg-accent); border:1px solid var(--glass-border); border-radius:14px; padding:1.5rem; transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--gold-primary)'" onmouseout="this.style.borderColor='var(--glass-border)'">
                            <i class="fas fa-landmark" style="color:var(--gold-primary); font-size:1.5rem; margin-bottom:0.75rem; display:block;"></i>
                            <div style="color:var(--text-primary); font-weight:600; margin-bottom:0.4rem;">Patrimônio</div>
                            <div style="color:var(--text-secondary); font-size:0.8rem; line-height:1.5;">Cadastre imóveis, veículos, investimentos e outros bens para ter uma visão completa do seu patrimônio.</div>
                            <div style="margin-top:1rem; color:var(--gold-primary); font-size:0.78rem; font-weight:600;">+ Cadastrar ativo →</div>
                        </div>
                        <div onclick="window.location.hash='goals'" style="cursor:pointer; background:var(--bg-accent); border:1px solid var(--glass-border); border-radius:14px; padding:1.5rem; transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--gold-primary)'" onmouseout="this.style.borderColor='var(--glass-border)'">
                            <i class="fas fa-bullseye" style="color:var(--gold-primary); font-size:1.5rem; margin-bottom:0.75rem; display:block;"></i>
                            <div style="color:var(--text-primary); font-weight:600; margin-bottom:0.4rem;">Metas</div>
                            <div style="color:var(--text-secondary); font-size:0.8rem; line-height:1.5;">Defina objetivos financeiros como reserva de emergência, viagem ou aquisição de bem e monitore o progresso.</div>
                            <div style="margin-top:1rem; color:var(--gold-primary); font-size:0.78rem; font-weight:600;">+ Criar meta →</div>
                        </div>
                        <div onclick="window.location.hash='investments'" style="cursor:pointer; background:var(--bg-accent); border:1px solid var(--glass-border); border-radius:14px; padding:1.5rem; transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--gold-primary)'" onmouseout="this.style.borderColor='var(--glass-border)'">
                            <i class="fas fa-chart-line" style="color:var(--gold-primary); font-size:1.5rem; margin-bottom:0.75rem; display:block;"></i>
                            <div style="color:var(--text-primary); font-weight:600; margin-bottom:0.4rem;">Investimentos</div>
                            <div style="color:var(--text-secondary); font-size:0.8rem; line-height:1.5;">Registre suas aplicações financeiras, veja a rentabilidade projetada e compare com os índices do mercado.</div>
                            <div style="margin-top:1rem; color:var(--gold-primary); font-size:0.78rem; font-weight:600;">+ Registrar investimento →</div>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Calculate date range (YYYY-MM string comparison)
        let currentDate;
        try {
            currentDate = new Date();
            const startYear = currentDate.getFullYear();
            const startMonth = currentDate.getMonth() - monthsCount + 1;
            const d = new Date(startYear, startMonth, 1);
            const startLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            
            console.log(`--- DASHBOARD SUMMARY DIAGNOSTIC ---`);
            console.log(`Period: Last ${monthsCount} months (from ${startLabel})`);
            console.log(`Total Records in Store: ${cashflow.length}`);
            
            const filteredFlow = data.cashflow.filter(c => {
                if (!c.date) return false;
                const rowMonth = FamilyOfficeStore.normalizeMonth(c.date);
                const match = rowMonth >= startLabel;
                return match;
            });
            
            console.log(`Filtered Records for Dashboard: ${filteredFlow.length}`);
            if (filteredFlow.length === 0 && cashflow.length > 0) {
                const earliest = cashflow.sort((a,b) => a.date.localeCompare(b.date))[0].date;
                console.warn(`Dashboard is EMPTY because all ${cashflow.length} records are older than ${startLabel}. Earliest record: ${earliest}`);
            }

            const totalIncome = filteredFlow.filter(c => c.type === 'income').reduce((s, c) => s + parseFloat(c.amount), 0);
            const totalExpense = filteredFlow.filter(c => c.type === 'expense').reduce((s, c) => s + parseFloat(c.amount), 0);
            const net = totalIncome - totalExpense;

            container.innerHTML = `
                <div class="summary-card main ${net >= 0 ? 'positive' : 'negative'}">
                    <div class="summary-icon-bg">
                        <i class="fas ${net >= 0 ? 'fa-chart-line' : 'fa-chart-area'}"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">Resultado Consolidado</div>
                        <div class="summary-value">${window.formatBRL(net)}</div>
                        <div class="summary-footer">
                            <span class="period-badge"><i class="far fa-calendar-alt"></i> ${monthsCount} MESES</span>
                        </div>
                    </div>
                </div>
                <div class="summary-details">
                    <div class="summary-mini-card">
                        <div class="mini-icon income"><i class="fas fa-arrow-up"></i></div>
                        <div class="mini-data">
                            <div class="mini-label">Total Entradas</div>
                            <div class="mini-value">${window.formatBRL(totalIncome)}</div>
                        </div>
                    </div>
                    <div class="summary-mini-card">
                        <div class="mini-icon expense"><i class="fas fa-arrow-down"></i></div>
                        <div class="mini-data">
                            <div class="mini-label">Total Saídas</div>
                            <div class="mini-value">${window.formatBRL(totalExpense)}</div>
                        </div>
                    </div>
                    <div class="summary-mini-card">
                        <div class="mini-icon avg"><i class="fas fa-divide"></i></div>
                        <div class="mini-data">
                            <div class="mini-label">Média Mensal</div>
                            <div class="mini-value">${window.formatBRL(net / monthsCount)}</div>
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('CRITICAL: Dashboard Render Failure', err);
            container.innerHTML = `<div class="alert alert-danger">Erro ao carregar dashboard: ${err.message}</div>`;
        }

        // Refresh Charts
        this.chartsManager.updateDashboardCharts(data);
    }

    renderInvestments() {
        const investments = store.getInvestments();
        const indices = store.getMarketIndices();
        
        this.renderIndicesHeader(indices);
        this.renderInvestmentsList(investments);
        
        // Update Summary if focused on single investment or general
        const projMonths = parseInt(document.getElementById('proj-months')?.value) || 12;
        this.updateInvestmentProjection(investments, indices, projMonths);
    }

    renderIndicesHeader(indices) {
        const container = document.getElementById('indices-display');
        const lastUpdate = document.getElementById('indices-last-update');
        if (!container) return;

        const items = [
            { label: 'CDI', val: indices.cdi, color: '#22C55E' },
            { label: 'SELIC', val: indices.selic, color: '#38BDF8' },
            { label: 'IPCA', val: indices.ipca, color: '#F87171' },
            { label: 'LCI', val: indices.lci, color: '#FCD34D' },
            { label: 'LCA', val: indices.lca, color: '#D4AF37' }
        ];

        container.innerHTML = items.map(idx => `
            <div style="display: flex; flex-direction: column;">
                <span class="text-secondary" style="font-size: 0.7rem;">${idx.label}</span>
                <span style="font-weight: bold; color: ${idx.color};">${idx.val?.toFixed(2)}%</span>
            </div>
        `).join('');

        if (indices.last_updated && lastUpdate) {
            const date = new Date(indices.last_updated);
            lastUpdate.innerText = `Atualizado em: ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
    }

    renderInvestmentsList(investments) {
        const container = document.getElementById('investments-list-container');
        if (!container) return;

        const indices = store.getMarketIndices();

        container.innerHTML = investments.map(inv => {
            const annualRate = (indices[inv.benchmarkIndex.toLowerCase()] || 0) / 100;
            const dailyRate = Math.pow(1 + annualRate, 1/252) - 1;
            const effectiveDailyRate = dailyRate * (inv.benchmarkPercentage / 100);
            const grossDailyYield = parseFloat(inv.allocatedValue) * effectiveDailyRate;

            // Apply IR based on holding days
            const startDate = new Date(inv.startDate);
            const today = new Date();
            const holdingDays = Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
            const taxRate = this.getInvestmentTaxRate(holdingDays);
            const netDailyYield = grossDailyYield > 0 ? grossDailyYield * (1 - taxRate) : grossDailyYield;

            return `
                <div class="investment-item stat-card" style="padding: 1rem; margin-bottom: 0.8rem; border: 1px solid var(--glass-border); transition: transform 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <div>
                            <strong style="display: block;">${inv.investmentName || 'Investimento'}</strong>
                            <span class="text-secondary" style="font-size: 0.75rem;">${inv.institution}</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="display: block; font-weight: bold; color: var(--accent-color);">${window.formatBRL(inv.allocatedValue)}</span>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px; margin-top: 4px;">
                                <span class="text-secondary" style="font-size: 0.7rem;">${inv.benchmarkPercentage}% ${inv.benchmarkIndex}</span>
                                <span style="font-size: 0.65rem; color: #4ade80; background: rgba(74, 222, 128, 0.1); padding: 1px 4px; border-radius: 4px; font-weight: 500;" title="Rendimento diário líquido (após IR de ${(taxRate*100).toFixed(1)}%)">
                                    + ${window.formatBRL(netDailyYield)} líq / dia
                                </span>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-sm btn-primary" style="flex: 1; font-size: 0.65rem; padding: 0.4rem;" onclick="window.app.openContributionModal('${inv.id}')">
                            <i class="fas fa-plus-circle"></i> Aportar
                        </button>
                        <button class="btn btn-sm btn-secondary" style="flex: 1; font-size: 0.65rem; padding: 0.4rem;" onclick="window.app.openWithdrawModal('${inv.id}')">
                            <i class="fas fa-hand-holding-usd"></i> Resgatar
                        </button>
                        <button class="btn btn-sm btn-secondary" style="font-size: 0.65rem; padding: 0.4rem;" title="Editar Ativo" onclick="window.app.openInvestmentEditModal('${inv.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm" style="background: rgba(248, 113, 113, 0.1); color: #f87171; font-size: 0.65rem; padding: 0.4rem;" onclick="window.app.deleteInvestment('${inv.id}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('') || '<p class="text-secondary" style="text-align:center; padding: 1rem;">Nenhum investimento registrado.</p>';
    }

    async refreshMarketIndices() {
        const btn = event?.currentTarget;
        if (btn) btn.disabled = true;
        
        try {
            const newIndices = await window.brain.fetchMarketIndices();
            if (newIndices) {
                store.updateMarketIndices(newIndices);
                this.renderInvestments();
                alert('Índices atualizados via Gemini! 💎📈');
            }
        } catch (e) {
            console.error('Refresh Indices Failure:', e);
            if (e.message === 'RATE_LIMIT_EXCEEDED') {
                alert('Limite de uso atingido. Tente novamente em 1 minuto. ⏳');
            } else if (e.message === 'MODEL_OR_ENDPOINT_ERROR') {
                alert('Erro na conexão com a IA. Verifique sua chave API ou o status do Gemini. 🤖🛠️');
            } else if (e.message === 'ACCESS_DENIED') {
                alert('Chave API inválida ou sem permissão. 🛑');
            } else if (e.message === 'API_KEY_MISSING') {
                alert('Configure sua chave de API nas configurações antes de atualizar. 🔑');
            } else {
                alert('Falha ao atualizar índices. Tente novamente mais tarde.');
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    getInvestmentTaxRate(holdingDays) {
        if (holdingDays <= 180) return 0.225;
        if (holdingDays <= 360) return 0.20;
        if (holdingDays <= 720) return 0.175;
        return 0.150;
    }

    calculateNetProjection({ principal, grossBalance, holdingDays }) {
        const grossYield = grossBalance - principal;
        const taxRate = this.getInvestmentTaxRate(holdingDays);
        const taxAmount = grossYield > 0 ? grossYield * taxRate : 0;
        const netBalance = grossBalance - taxAmount;
        const netYield = grossYield - taxAmount;

        return {
            principal,
            grossBalance,
            grossYield,
            taxRate: (taxRate * 100).toFixed(1),
            taxAmount,
            netBalance,
            netYield
        };
    }

    handleInvestmentSubmit(formData) {
        const entry = {
            institution: formData.get('institution'),
            investmentName: formData.get('investmentName'),
            allocatedValue: window.parseCurrency(formData.get('allocatedValue')),
            benchmarkIndex: formData.get('benchmarkIndex').toUpperCase(),
            benchmarkPercentage: parseFloat(formData.get('benchmarkPercentage')),
            startDate: formData.get('startDate')
        };
        store.addInvestment(entry);
        document.getElementById('new-investment-form').reset();
        this.renderInvestments();
    }

    updateInvestmentProjection(investments, indices, months) {
        const totalAllocated = investments.reduce((s, i) => s + parseFloat(i.allocatedValue), 0);
        if (totalAllocated === 0) {
            this.chartsManager.renderProjectionChart('investmentProjectionChart', [], []);
            return;
        }

        const businessDaysPerMonth = 21;
        const totalDays = months * businessDaysPerMonth;
        const labels = [];
        const netSeries = [];
        const grossSeries = [];
        const today = new Date();
        
        for (let d = 0; d <= totalDays; d++) {
            let dailyGrossTotal = 0;
            let dailyNetTotal = 0;
            
            investments.forEach(inv => {
                const annualRate = (indices[inv.benchmarkIndex.toLowerCase()] || 0) / 100;
                const dailyRate = Math.pow(1 + annualRate, 1/252) - 1;
                const effectiveDailyRate = dailyRate * (inv.benchmarkPercentage / 100);
                
                const principal = parseFloat(inv.allocatedValue);
                const dayGrossBalance = principal * Math.pow(1 + effectiveDailyRate, d);
                
                // Calendar days for tax (approx simulation)
                const calendarDays = d * (365 / 252); 
                const taxRate = this.getInvestmentTaxRate(calendarDays);
                const dayGrossYield = dayGrossBalance - principal;
                const dayTax = dayGrossYield > 0 ? dayGrossYield * taxRate : 0;
                const dayNetBalance = dayGrossBalance - dayTax;

                dailyGrossTotal += dayGrossBalance;
                dailyNetTotal += dayNetBalance;
            });
            
            netSeries.push(dailyNetTotal);
            grossSeries.push(dailyGrossTotal);
            
            if (d % businessDaysPerMonth === 0) {
                labels.push(`Mês ${d/businessDaysPerMonth}`);
            } else {
                labels.push('');
            }
        }

        // Summary Calculations (at end of period)
        const finalNet = netSeries[netSeries.length - 1];
        const finalGross = grossSeries[grossSeries.length - 1];
        const finalYield = finalGross - totalAllocated;
        const finalTax = finalGross - finalNet;
        
        // Update UI
        const yieldDisplay = document.getElementById('daily-yield-val');
        if (yieldDisplay) {
            yieldDisplay.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                    <span style="color: var(--accent-color); font-weight: bold;">Líquido: ${window.formatBRL(finalNet)}</span>
                    <span style="font-size: 0.65rem; color: #94a3b8;">Bruto: ${window.formatBRL(finalGross)} (Imposto: ${window.formatBRL(finalTax)})</span>
                </div>
            `;
        }

        this.chartsManager.renderProjectionChart('investmentProjectionChart', labels, netSeries);
        this.renderWithdrawHistory(investments);
    }

    renderWithdrawHistory(investments) {
        const container = document.getElementById('investment-withdraw-history');
        if (!container) return;

        const allHistory = [];
        investments.forEach(inv => {
            const name = inv.investmentName || inv.institution;
            if (inv.history) {
                inv.history.forEach(h => {
                    allHistory.push({
                        ...h,
                        name: name,
                        displayType: 'Resgate',
                        color: '#f87171'
                    });
                });
            }
            if (inv.contributionHistory) {
                inv.contributionHistory.forEach(h => {
                    allHistory.push({
                        ...h,
                        name: name,
                        displayType: 'Aporte',
                        color: '#22c55e'
                    });
                });
            }
        });

        const sorted = allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = sorted.map(h => `
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 0.85rem;">${new Date(h.date).toLocaleDateString()} - ${h.name}</span>
                    <span style="font-size: 0.7rem; color: ${h.color}; opacity: 0.8;">${h.displayType}</span>
                </div>
                <span style="color: ${h.color}; font-weight: bold;">
                    ${h.displayType === 'Aporte' ? '-' : '+'} ${window.formatBRL(h.amount)}
                </span>
            </div>
        `).join('') || '<p class="text-secondary">Nenhum histórico de movimentação.</p>';
    }

    openWithdrawModal(id) {
        const investments = store.getInvestments();
        const inv = investments.find(i => i.id === id);
        if (!inv) return;

        const amount = prompt(`Resgatar de ${inv.investmentName || inv.institution}\nSaldo disponível: ${window.formatBRL(inv.allocatedValue)}\n\nDigite o valor do resgate (ex: 1.234,56):`, '0,00');
        if (!amount) return;

        const parsedAmount = window.parseCurrency(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            alert('Valor inválido.');
            return;
        }

        if (parsedAmount > parseFloat(inv.allocatedValue)) {
            alert('Saldo insuficiente.');
            return;
        }

        const date = window.getLocalISODate();
        const indices = store.getMarketIndices();
        
        // Calculate Current Gross Balance for proportional yield calculation
        const startDate = new Date(inv.startDate);
        const rescueDate = new Date(date);
        const calendarDays = Math.max(0, Math.floor((rescueDate - startDate) / (1000 * 60 * 60 * 24)));
        
        // Business days approximation for current yield
        // We use the same business day logic as the projection for consistency
        const businessDays = Math.floor(calendarDays * (252 / 365));
        const annualRate = (indices[inv.benchmarkIndex.toLowerCase()] || 0) / 100;
        const dailyRate = Math.pow(1 + annualRate, 1/252) - 1;
        const effectiveDailyRate = dailyRate * (inv.benchmarkPercentage / 100);
        
        const principal = parseFloat(inv.allocatedValue);
        const currentGrossBalance = principal * Math.pow(1 + effectiveDailyRate, businessDays);
        
        // Proportions
        const rescuedGross = parsedAmount;
        const proportionalPrincipal = rescuedGross * (principal / currentGrossBalance);
        const proportionalYield = rescuedGross - proportionalPrincipal;
        
        // Tax
        const taxRate = this.getInvestmentTaxRate(calendarDays);
        const taxAmount = proportionalYield > 0 ? proportionalYield * taxRate : 0;
        const netAmount = rescuedGross - taxAmount;

        if (store.withdrawInvestment(id, proportionalPrincipal, netAmount, date)) {
            this.renderInvestments(); 
            alert(`Resgate realizado!\n\nBruto: ${window.formatBRL(rescuedGross)}\nIR (${(taxRate*100).toFixed(1)}% sobre lucro): ${window.formatBRL(taxAmount)}\nLíquido: ${window.formatBRL(netAmount)}\n\nO valor líquido foi lançado no Fluxo de Caixa. 💰⚖️✅`);
        }
    }

    openContributionModal(id) {
        const investments = store.getInvestments();
        const inv = investments.find(i => i.id === id);
        if (!inv) return;

        const amount = prompt(`Novo Aporte em ${inv.investmentName || inv.institution}\nSaldo Atual: ${window.formatBRL(inv.allocatedValue)}\n\nDigite o valor do novo depósito (ex: 1.234,56):`, '0,00');
        if (!amount) return;

        const parsedAmount = window.parseCurrency(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            alert('Valor inválido.');
            return;
        }

        const date = window.getLocalISODate();
        if (store.addInvestmentContribution(id, parsedAmount, date)) {
            this.renderInvestments(); 
            alert('Aporte realizado com sucesso! O valor foi descontado do Fluxo de Caixa. 📈✅');
        }
    }

    openInvestmentEditModal(id) {
        const investments = store.getInvestments();
        const inv = investments.find(i => i.id === id);
        if (!inv) return;

        const newIndex = prompt(`Editar Índice (Benchmark) para ${inv.investmentName || inv.institution}:\nOpções: CDI, SELIC, IPCA, LCI, LCA`, inv.benchmarkIndex);
        if (newIndex === null) return;

        const newPercentage = prompt(`Editar % do Índice (ex: 110 para 110% do CDI):`, inv.benchmarkPercentage);
        if (newPercentage === null) return;

        const fields = {
            benchmarkIndex: newIndex.trim() || inv.benchmarkIndex,
            benchmarkPercentage: parseFloat(newPercentage) || inv.benchmarkPercentage
        };

        if (store.updateInvestment(id, fields)) {
            this.renderInvestments();
            alert('Dados do investimento atualizados! ⚙️💎');
        }
    }

    deleteInvestment(id) {
        if (!confirm('Deseja realmente excluir este investimento?')) return;
        const data = store.getData();
        data.investments = data.investments.filter(i => i.id !== id);
        store.save(data);
        this.renderInvestments();
    }

    renderGoals() {
        const goals = store.getGoals();
        const container = document.getElementById('goals-list');
        container.innerHTML = goals.map(g => `
            <div class="stat-card">
                <h3>${g.name}</h3>
                <div class="progress-bar-container" style="background:#334155; height:10px; border-radius:5px; margin: 10px 0;">
                    <div style="background:var(--accent-color); height:100%; width:${Math.min(100, (g.current / g.target) * 100)}%; border-radius:5px;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem">
                    <span>${window.formatBRL(parseFloat(g.current))}</span>
                    <span>Meta: ${window.formatBRL(parseFloat(g.target))}</span>
                </div>
            </div>
        `).join('') || '<p>Nenhuma meta definida.</p>';
    }

    initPlanning() {
        const monthlyInput = document.getElementById('plan-monthly');
        window.applyCurrencyMask(monthlyInput);

        document.getElementById('run-simulation').onclick = () => {
            const monthly = window.parseCurrency(monthlyInput.value);
            const rate = parseFloat(document.getElementById('plan-rate').value) / 100 / 12;
            const months = parseInt(document.getElementById('plan-years').value) * 12;
            
            let total = store.getSummary().totalNetWorth;
            for(let i=0; i<months; i++) {
                total = (total + monthly) * (1 + rate);
            }

            document.getElementById('simulation-result').classList.remove('hidden');
            document.getElementById('sim-total').innerText = window.formatBRL(total);
            document.getElementById('sim-passive').innerText = window.formatBRL(total * 0.005);
        };
    }

    renderAISettings() {
        const aiConfig = store.getAIConfig();
        const providerSelector = document.getElementById('ai-provider-selector');
        const statusBox = document.getElementById('ai-status-box');
        
        // ROLLBACK: Lock to Gemini
        providerSelector.value = "gemini";
        // Disabling provider selection to ensure stability
        providerSelector.disabled = true;
        
        document.getElementById('gemini-api-key').value = aiConfig.providers.gemini.apiKey || '';
        document.getElementById('gemini-model').value = aiConfig.providers.gemini.model || '';
        
        // Hide OpenAI Config UI
        const openaiSection = document.getElementById('config-openai');
        if (openaiSection) openaiSection.classList.add('hidden');
        
        // Show Gemini Config UI
        const geminiSection = document.getElementById('config-gemini');
        if (geminiSection) geminiSection.classList.remove('hidden');

        // Submit to Save
        document.getElementById('ai-settings-form').onsubmit = (e) => {
            e.preventDefault();
            const newConfig = {
                provider: "gemini",
                providers: {
                    gemini: {
                        enabled: true,
                        apiKey: document.getElementById('gemini-api-key').value.trim(),
                        model: document.getElementById('gemini-model').value.trim()
                    },
                    openai: aiConfig.providers.openai // Preserve OpenAI config but keep disabled
                }
            };

            store.saveAIConfig(newConfig);
            window.aiProvider.config = newConfig;
            
            statusBox.classList.remove('hidden');
            this.updateAIStatus();
            alert('Configuração Gemini salva com sucesso! 🛡️');
        };

        // Explicit Test Button locked to Gemini
        this.isAiTestRunning = false;

        document.getElementById('test-ai-connection').onclick = async (e) => {
            if (this.isAiTestRunning) return;
            
            const btn = e.currentTarget;
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testando Gemini...';
            btn.disabled = true;
            this.isAiTestRunning = true;

            try {
                // Preflight will trigger discovery if model is missing
                const preflight = await window.aiProvider.preflightCheck("gemini");
                if (!preflight.success) {
                    throw new Error(preflight.errorType);
                }

                console.log(`--- Gemini Connection Test ---`);
                const health = await window.aiProvider.checkHealth("gemini");
                
                if (health.success) {
                    this.updateAIStatus();
                    // Refetch config to show discovered model in UI if it was discovered
                    const aiConfig = window.store.getData().aiConfig;
                    if (document.getElementById('gemini-model')) {
                        document.getElementById('gemini-model').value = aiConfig.providers.gemini.model || '';
                    }
                    alert(`Conexão Gemini OK!\n\nModelo: ${health.model}\nStatus: Online 🚀`);
                } else {
                    throw new Error(health.errorType || health.message || 'Erro na conexão Gemini.');
                }
            } catch (err) {
                console.error('Gemini Test Failure:', err);
                let msg = `Falha: ${err.message}`;
                if (err.message === 'RATE_LIMIT_EXCEEDED') msg = "Limite atingido (429). Aguarde 30s.";
                if (err.message === 'KEY_NOT_CONFIGURED') msg = "Chave de API não configurada.";
                if (err.message === 'NO_COMPATIBLE_MODEL_FOUND') msg = "Nenhum modelo compatível encontrado na sua conta.";
                alert(msg);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
                this.isAiTestRunning = false;
            }
        };
    }

    updateAIStatus() {
        const apiKey = store.getApiKey();
        const statusEl = document.getElementById('ai-global-status');
        if (!statusEl) return;

        if (apiKey) {
            statusEl.classList.add('online');
            statusEl.querySelector('.status-text').innerText = 'IA ONLINE';
        } else {
            statusEl.classList.remove('online');
            statusEl.querySelector('.status-text').innerText = 'IA OFFLINE';
        }
    }

    exportData() {
        const data = store.getData();
        const exportPayload = {
            exported_at: new Date().toISOString(),
            cashflow:  data.cashflow  || [],
            assets:    data.assets    || [],
            goals:     data.goals     || []
        };
        const json = JSON.stringify(exportPayload, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `family_office_backup_${new Date().toISOString().substring(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    updateUI() {
        const summary = store.getSummary();
        const data = store.getData();
        const format = window.formatBRL;

        const nwElem = document.getElementById('total-net-worth');
        const invElem = document.getElementById('total-invested');
        const liqElem = document.getElementById('total-liquidity');
        const passElem = document.getElementById('passive-income');

        if (nwElem) nwElem.innerText = format(summary.totalNetWorth);
        if (invElem) invElem.innerText = format(summary.totalInvested);
        if (liqElem) liqElem.innerText = format(summary.liquidity);
        if (passElem) passElem.innerText = format(summary.passiveIncome);
    }

    renderAssetDashboard() {
        const assets = store.getAssets();
        const metrics = store.calculateAssetDashboardMetrics(assets);
        const format = window.formatBRL;

        const elInvested = document.getElementById('dash-total-invested');
        const elEstimated = document.getElementById('dash-total-estimated');
        const elDiff = document.getElementById('dash-total-diff');
        const elPercent = document.getElementById('dash-total-percent');

        if (elInvested) elInvested.innerText = format(metrics.totalInvestedValue);
        if (elEstimated) elEstimated.innerText = format(metrics.totalEstimatedValue);
        
        if (elDiff) {
            elDiff.innerText = format(metrics.totalDifference);
            elDiff.style.color = metrics.totalDifference >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        }
        
        if (elPercent) {
            elPercent.innerText = `${metrics.totalVariationPercent >= 0 ? '+' : ''}${metrics.totalVariationPercent.toFixed(2)}%`;
            elPercent.style.color = metrics.totalVariationPercent >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        }
    }

    renderAssetsTable() {
        const assets = store.getAssets();
        const tbody = document.getElementById('assets-list');
        if (!tbody) return;

        tbody.innerHTML = assets.map(asset => {
            const valuationClass = asset.valuationStatus === 'valorização' ? 'trend positive' : (asset.valuationStatus === 'depreciação' ? 'trend negative' : '');
            const valuationIcon = asset.valuationStatus === 'valorização' ? 'fa-arrow-up' : (asset.valuationStatus === 'depreciação' ? 'fa-arrow-down' : 'fa-equals');
            
            return `
                <tr>
                    <td>
                        <div style="display: flex; flex-direction: column;">
                            <strong>${asset.assetName}</strong>
                            <span style="font-size: 0.75rem; color: var(--text-secondary);">${asset.assetType}</span>
                        </div>
                    </td>
                    <td>${new Date(asset.acquisitionDate).toLocaleDateString('pt-BR')}</td>
                    <td>${window.formatBRL(parseFloat(asset.acquisitionValue))}</td>
                    <td>${window.formatBRL(parseFloat(asset.currentEstimatedValue))}</td>
                    <td class="${valuationClass}">
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <i class="fas ${valuationIcon}"></i>
                            <span>${asset.valuationPercent}%</span>
                        </div>
                    </td>
                    <td>
                        <div class="ai-analysis-cell" title="${asset.valuationAnalysis || 'Sem análise disponível'}">
                            <i class="fas fa-robot" style="color: var(--gold-primary); margin-right: 6px;"></i>
                            <span class="truncate-text">${asset.valuationAnalysis || '-'}</span>
                        </div>
                    </td>
                    <td style="text-align: right;">
                        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                            <button class="btn btn-sm" onclick="window.app.openAssetEditModal('${asset.id}')" title="Editar Ativo">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm" onclick="window.deleteAsset('${asset.id}')" title="Excluir Ativo">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="7" style="text-align:center;">Nenhum ativo registrado.</td></tr>';

        window.deleteAsset = (id) => {
            store.deleteAsset(id);
            this.renderAssetsTable();
        };

        this.renderAssetDashboard();
    }

    async handleQuickEntry(formData) {
        const type = formData.get('type');
        const amount = window.parseCurrency(formData.get('amount'));
        const description = formData.get('description');
        const date = formData.get('date');

        if (!amount || !description || !date) return;

        // Show "AI Thinking" feedback
        const submitBtn = document.querySelector('#quick-entry-form button[type="submit"]');
        const originalContent = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-brain fa-spin"></i>';
        submitBtn.disabled = true;

        // Use Brain for smart detection (Silent fallback)
        let finalType = type;
        let category = 'CUSTO_DE_VIDA';
        let subcategory = 'outro';
        try {
            const aiResult = await window.brain.processEntry(description, type);
            if (aiResult && aiResult.aiStatus === 'success') {
                finalType = aiResult.type || type;
                category = aiResult.category || category;
                subcategory = aiResult.subcategory || subcategory;
            } else if (aiResult?.reason === 'RATE_LIMIT_EXCEEDED') {
                console.warn('AI Rate Limit in Quick Entry - using local fallback');
            }
        } catch (err) {
            console.warn('AI Processing Error:', err);
        }

        store.addCashflow({
            type: finalType,
            amount,
            description,
            date,
            category,
            subcategory
        });
        syncMonthlyBalance(date.substring(0, 7));

        // Show toast if categorized
        if (subcategory !== 'outro') {
            const categories = store.getCategories();
            const cat = categories.find(c => c.id === category);
            const toast = document.getElementById('ai-feedback-toast');
            if (toast && cat) {
                document.getElementById('ai-cat-name').innerText = `${cat.name} > ${subcategory}`;
                toast.classList.remove('hidden');
                setTimeout(() => toast.classList.add('hidden'), 3000);
            }
        }

        this.updateUI();
        this.renderActivePage();
        
        // Reset and restore
        submitBtn.innerHTML = originalContent;
        submitBtn.disabled = false;
        document.getElementById('quick-desc').value = '';
        document.querySelector('.quick-entry-amount').value = '';
    }

    async handleReceiptUpload(input) {
        if (!this.isBrainConfigured()) {
            alert('Por favor, configure sua Google Gemini API Key nas "Configurações IA" antes de importar recibos.');
            input.value = '';
            return;
        }
        if (!input.files || !input.files[0]) return;
        
        const file = input.files[0];
        this.modalImageBuffer = file;
        
        // Show modal and preview
        this.showPasteModal();
        const reader = new FileReader();
        reader.onload = (event) => {
            const container = document.getElementById('paste-preview-container');
            if (container) {
                container.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                container.classList.add('has-image');
            }
            const readBtn = document.getElementById('read-pasted-btn');
            if (readBtn) readBtn.disabled = false;
        };
        reader.readAsDataURL(file);
        
        input.value = '';
    }

    async processImageInput(file) {
        if (!this.isBrainConfigured()) {
            alert('IA não configurada.');
            return;
        }
        if (this.isVisionProcessing) return;
        
        const dateInput = document.getElementById('import-transaction-date');
        const transactionDate = dateInput ? dateInput.value : null;

        if (!transactionDate) {
            alert('A data da transação é obrigatória para processar a imagem.');
            return;
        }

        const fingerprint = `${file.name}_${file.size}_${file.lastModified}_${transactionDate}`;
        if (store.isImageProcessed(fingerprint)) {
            alert('Esta imagem já foi processada com esta data anteriormente.');
            return;
        }

        const btns = document.querySelectorAll('button[onclick*="receipt-upload"], #read-pasted-btn');
        const originalStates = Array.from(btns).map(b => ({ btn: b, html: b.innerHTML }));
        
        this.isVisionProcessing = true;
        btns.forEach(b => {
            b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            b.disabled = true;
        });

        try {
            console.log(`--- APP DIAGNOSTIC: processImageInput (Primary Date: ${transactionDate}) ---`);
            const results = await window.brain.processReceipt(file, `The authoritative date for these transactions is ${transactionDate}.`);
            
            if (results && results.length > 0) {
                store.markImageProcessed(fingerprint);
                
                // Normalization Phase
                results.forEach(entry => {
                    entry.date = transactionDate;
                    entry.source = 'IA_VISION';
                    entry.aiStatus = 'success';
                });
                
                console.log(`Materializing ${results.length} normalized entries:`, results.map(r => ({ d: r.description, a: r.amount, t: r.type })));
                store.addCashflowBatch(results);
                
                // Direct Refresh (Avoid hash navigation to prevent iframe/file:// warnings)
                this.renderActivePage();
                
                const toast = document.getElementById('ai-feedback-toast');
                if (toast) {
                    const countMsg = results.length === 1 ? '1 transação extraída!' : `${results.length} transações extraídas!`;
                    document.getElementById('ai-cat-name').innerText = countMsg;
                    toast.classList.remove('hidden');
                    setTimeout(() => toast.classList.add('hidden'), 4000);
                }

                if (this.modalImageBuffer) this.closePasteModal();
            }
        } catch (err) {
            console.error('OCR Error:', err);
            const errorType = err.message;

            let msg = 'Erro ao ler recibo: ' + errorType;
            if (errorType === 'RATE_LIMIT_EXCEEDED') {
                msg = 'Limite de Uso do Gemini atingido. Aguarde 1 minuto e tente novamente.';
            } else if (errorType === 'REQUEST_ALREADY_IN_FLIGHT') {
                console.warn('Bloqueado: requisição já em andamento.');
                return;
            } else if (errorType === 'MODEL_OR_ENDPOINT_ERROR') {
                msg = 'Erro de IA: Verifique se sua chave tem acesso ao Gemini 1.5 Flash.';
            } else if (errorType === 'ACCESS_DENIED') {
                msg = 'Chave de API Inválida ou Sem Acesso.';
            }
            
            alert(msg);
        } finally {
            this.isVisionProcessing = false;
            originalStates.forEach(s => {
                s.btn.innerHTML = s.html;
                s.btn.disabled = false;
            });
        }
    }

    showPasteModal() {
        const modal = document.getElementById('cashflow-paste-modal');
        if (modal) {
            modal.classList.add('active');
            
            // Set default date (Respect current viewed month)
            const dateInput = document.getElementById('import-transaction-date');
            if (dateInput) {
                const currentMonthStr = window.getLocalISODate().substring(0, 7);
                if (this.currentViewedMonth === currentMonthStr) {
                    dateInput.value = window.getLocalISODate();
                } else {
                    dateInput.value = `${this.currentViewedMonth}-01`;
                }
            }

            document.addEventListener('paste', this.pasteListener);
        }
    }

    closePasteModal() {
        const modal = document.getElementById('cashflow-paste-modal');
        if (modal) {
            modal.classList.remove('active');
            document.removeEventListener('paste', this.pasteListener);
            this.modalImageBuffer = null;
            const container = document.getElementById('paste-preview-container');
            if (container) {
                container.innerHTML = `
                    <div class="paste-placeholder">
                        <i class="fas fa-clipboard-list fa-3x" style="opacity: 0.2; margin-bottom: 1rem;"></i>
                        <p>Aguardando imagem...</p>
                    </div>
                `;
                container.classList.remove('has-image');
            }
            const readBtn = document.getElementById('read-pasted-btn');
            if (readBtn) readBtn.disabled = true;
        }
    }

    handlePasteInModal(e) {
        if (!e.clipboardData || !e.clipboardData.items) return;
        
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                this.modalImageBuffer = file;
                
                // Show preview
                const reader = new FileReader();
                reader.onload = (event) => {
                    const container = document.getElementById('paste-preview-container');
                    if (container) {
                        container.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                        container.classList.add('has-image');
                    }
                    const readBtn = document.getElementById('read-pasted-btn');
                    if (readBtn) readBtn.disabled = false;
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    }

    async processPastedImage() {
        if (!this.modalImageBuffer) return;
        await this.processImageInput(this.modalImageBuffer);
    }

    getFilteredTransactions() {
        return store.getMonthlyCashflow(this.currentViewedMonth);
    }

    renderCashflowView() {
        store.checkMonthlyArchive();
        
        const currentMonth = this.currentViewedMonth;
        const cashflow = this.getFilteredTransactions();
        
        console.group('--- CASHFLOW FILTER DIAGNOSTIC ---');
        console.log('Target Month:', currentMonth);
        console.log('Transactions Found:', cashflow.length);
        if (cashflow.length > 0) {
            console.log('Sample IDs:', cashflow.slice(0, 3).map(c => c.id));
            const totals = cashflow.reduce((acc, c) => {
                const amt = parseFloat(c.amount) || 0;
                if (c.type === 'income') acc.income += amt;
                else acc.expense += amt;
                return acc;
            }, { income: 0, expense: 0 });
            console.log('Computed Filtered Totals:', totals);
        }
        console.log('Total Ledger Content:', store.getCashflow().length, 'records');
        console.groupEnd();
        
        const container = document.getElementById('cashflow-view');
        if (!container) return;

        // Calculate Balance
        const totalIncome = cashflow.filter(c => c.type === 'income').reduce((s, c) => s + parseFloat(c.amount), 0);
        const totalExpense = cashflow.filter(c => c.type === 'expense').reduce((s, c) => s + parseFloat(c.amount), 0);
        const netBalance = totalIncome - totalExpense;

        // Group by Date
        const grouped = {};
        cashflow.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(entry => {
            if (!grouped[entry.date]) grouped[entry.date] = [];
            grouped[entry.date].push(entry);
        });

        const formatMonth = (monthStr) => {
            const [year, month] = monthStr.split('-').map(Number);
            const date = new Date(year, month - 1, 1);
            return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
        };

        const pendingHtml = this.pendingEntries.length > 0 ? `
            <div class="fo-aprv-panel glass">
                <div class="fo-aprv-header" onclick="this.closest('.fo-aprv-panel').classList.toggle('collapsed')">
                    <div class="fo-aprv-title">
                        <span class="fo-label" style="margin:0">Lançamentos Aguardando Aprovação</span>
                        <span class="fo-aprv-count">${this.pendingEntries.length}</span>
                    </div>
                    <i class="fas fa-chevron-down" style="color:var(--text-muted); transition: transform 0.3s;"></i>
                </div>
                <div class="fo-aprv-body">
                    ${this.pendingEntries.map(e => {
                        const dateObj = new Date(e.date + 'T12:00:00');
                        const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                        const isIncome = e.type === 'income';
                        return `
                        <div class="fo-aprv-card">
                            <div class="fo-aprv-left">
                                <div class="fo-aprv-desc">${e.description}</div>
                                <div class="fo-aprv-meta">
                                    <span>${dateStr}</span>
                                    <span class="fo-aprv-origin">mobile</span>
                                    <span class="fo-cat" style="background:rgba(212,168,39,0.1); color:var(--gold-200); border:0.5px solid rgba(212,168,39,0.2); font-size:9px; padding:2px 8px;">
                                        ${e.category || 'Categorizando...'}
                                    </span>
                                </div>
                            </div>
                            <div class="fo-aprv-center">
                                <div style="font-size:12px; color:var(--text-secondary)">${e.account || 'Mobile'}</div>
                                ${e.notes ? `<div style="font-size:11px; color:var(--text-muted); font-style:italic">"${e.notes}"</div>` : ''}
                            </div>
                            <div class="fo-aprv-right">
                                <div class="fo-aprv-amount ${isIncome ? 'income' : 'expense'}">
                                    ${isIncome ? '+' : '-'} ${window.formatBRL(e.amount)}
                                </div>
                                <div class="fo-aprv-actions">
                                    <button class="fo-aprv-btn approve" onclick="window.app.approveEntry('${e.id}')">✓ Aprovar</button>
                                    <button class="fo-aprv-btn reject" onclick="window.app.rejectEntry('${e.id}')">✕ Rejeitar</button>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : '';

        container.innerHTML = `
            ${pendingHtml}
            <div class="journal-month-nav">
                <button onclick="window.app.changeMonth(-1)" class="month-nav-btn"><i class="fas fa-chevron-left"></i></button>
                <div class="current-month-display">
                    <i class="fas fa-book-open"></i>
                    <span>${formatMonth(currentMonth)}</span>
                </div>
                <button onclick="window.app.changeMonth(1)" class="month-nav-btn"><i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="journal-balance-header">
                <div class="balance-card total ${netBalance >= 0 ? 'positive-balance' : 'negative-balance'}">
                    <div class="label">Saldo do Mês</div>
                    <div class="value">${window.formatBRL(netBalance)}</div>
                </div>
                <div class="balance-card income">
                    <div class="label">Total Entradas</div>
                    <div class="value">+ ${window.formatBRL(totalIncome)}</div>
                </div>
                <div class="balance-card expense">
                    <div class="label">Total Saídas</div>
                    <div class="value">- ${window.formatBRL(totalExpense)}</div>
                </div>
                <div class="balance-card magic-action" onclick="window.app.showRecurringModal()">
                    <div class="magic-icon"><i class="fas fa-wand-magic-sparkles"></i></div>
                    <div class="magic-content">
                        <div class="label">Lançamentos</div>
                        <div class="value">RECORRENTES</div>
                    </div>
                </div>
            </div>
            <div class="quick-entry-container">
                <form id="quick-entry-form" class="quick-entry-form">
                    <div class="quick-entry-type-toggle">
                        <button type="button" class="type-btn active expense" data-type="expense">SAÍDA</button>
                        <button type="button" class="type-btn income" data-type="income">ENTRADA</button>
                        <input type="hidden" name="type" id="quick-type" value="expense">
                    </div>
                    <input type="date" name="date" id="quick-date" class="quick-entry-input quick-entry-date" required>
                    <input type="text" name="description" id="quick-desc" class="quick-entry-input quick-desc-input" placeholder="O que você comprou ou recebeu? (Ex: Salário, Aluguel, Jantar...)" required autocomplete="off">
                    <div class="quick-amount-wrapper">
                        <span class="currency-prefix">R$</span>
                        <input type="text" name="amount" class="quick-entry-input quick-entry-amount" placeholder="0,00" required>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="submit" class="btn btn-primary btn-sm" style="padding: 0.5rem 1rem;" title="Lançamento Inteligente com IA">
                            <i class="fas fa-brain"></i>
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" style="padding: 0.5rem 1rem;" onclick="document.getElementById('receipt-upload').click()" title="Foto/Arquivo">
                            <i class="fas fa-camera"></i>
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" style="padding: 0.5rem 1rem;" onclick="window.app.showPasteModal()" title="Colar Imagem (Ctrl+V)">
                            <i class="fas fa-paste"></i>
                        </button>
                    </div>
                    <input type="file" id="receipt-upload" style="display: none;" accept="image/*" onchange="window.app.handleReceiptUpload(this)">
                </form>
                <div id="ai-feedback-toast" class="ai-feedback-toast hidden">
                    <i class="fas fa-brain"></i> IA categorizou como: <span id="ai-cat-name"></span>
                </div>
            </div>
            <div class="journal-container">
                ${Object.keys(grouped).map(dateStr => {
                    const [y, m, d] = dateStr.split('-').map(Number);
                    const formattedDate = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                    return `
                    <div class="journal-day-group">
                        <div class="journal-date-header">${formattedDate}</div>
                        <div class="journal-entries">
                            ${grouped[dateStr].map(entry => {
                                const categories = store.getCategories();
                                const cat = categories.find(c => c.id === entry.category);
                                const catHtml = cat ? `
                                    <span class="entry-cat-badge" style="background: ${cat.color}25; color: ${cat.color}; border: 1px solid ${cat.color}60; flex-shrink: 0;">
                                        <i class="fas ${cat.icon}" style="margin-right: 4px;"></i>
                                        <span>${cat.name} : ${entry.subcategory || 'outro'}</span>
                                        <i class="fas fa-robot" style="font-size: 0.6rem; margin-left: 6px; opacity: 0.7;" title="IA Categorizou"></i>
                                    </span>` : '';

                                return `
                                <div class="journal-entry-card">
                                    <div class="entry-info">
                                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
                                            <span class="entry-description">${entry.description}</span>
                                            ${catHtml}
                                        </div>
                                        <span class="entry-category">${entry.type === 'income' ? 'Entrada de Capital' : 'Despesa Registrada'}</span>
                                    </div>
                                    <div style="display:flex; align-items:center;">
                                        <div class="entry-amount ${entry.type === 'income' ? 'trend positive' : 'trend negative'}">
                                            ${entry.type === 'income' ? '+' : '-'} ${window.formatBRL(parseFloat(entry.amount))}
                                        </div>
                                        <div class="entry-actions" style="display: flex; gap: 0.8rem; align-items: center;">
                                            <i class="fas fa-edit" style="cursor:pointer; color:var(--accent-color); font-size: 0.9rem;" onclick="window.app.openEditModal('${entry.id}')" title="Editar Lançamento"></i>
                                            <i class="fas fa-trash-alt" style="cursor:pointer; color:var(--danger); font-size: 0.9rem;" onclick="window.deleteCashflow('${entry.id}')" title="Excluir"></i>
                                        </div>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
                }).join('') || '<p style="text-align:center; padding: 2rem; border: 1px dashed var(--glass-border); border-radius: 1rem;">O seu diário de despesas está vazio. Comece a anotar agora!</p>'}
            </div>
        `;

        // Re-calculate grouped with dateStr replaced back to date for internal map if needed
        // (Actually the above map already handles it)

        // Bind Quick Entry Logic
        const quickForm = document.getElementById('quick-entry-form');
        const typeButtons = quickForm.querySelectorAll('.type-btn');
        const typeInput = document.getElementById('quick-type');
        const dateInput = document.getElementById('quick-date');

        // Set Default Date (Respect current viewed month)
        const [viewYear, viewMonth] = this.currentViewedMonth.split('-');
        const today = new Date();
        const currentMonthStr = window.getLocalISODate().substring(0, 7);
        
        if (this.currentViewedMonth === currentMonthStr) {
            dateInput.value = window.getLocalISODate();
        } else {
            // If in future/past, default to the 1st of that month or today if it's the current month
            dateInput.value = `${viewYear}-${viewMonth}-01`;
        }

        // Apply Mask
        window.applyCurrencyMask(quickForm.querySelector('.quick-entry-amount'));

        typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                typeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                typeInput.value = btn.dataset.type;
            });
        });

        quickForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.handleQuickEntry(formData);
        });

        // Re-focus description for next entry (if needed)
        setTimeout(() => {
            const descInput = document.getElementById('quick-desc');
            if (descInput) {
                descInput.focus();
                descInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);

        window.deleteCashflow = (id) => {
            const data = store.getData();
            const toDelete = data.cashflow.find(c => c.id === id);
            const month = toDelete?.date?.substring(0, 7);
            store.deleteCashflow(id);
            if (month) syncMonthlyBalance(month);
            if (typeof this.renderCashflowView === "function") {
                this.renderCashflowView();
            } else {
                this.renderActivePage();
            }
        };
    }

    showRecurringModal() {
        const modal = document.getElementById('recurring-modal');
        modal.style.display = 'flex';
        this.renderRecurringList();
        
        // Apply mask to the new form
        const amountInput = modal.querySelector('.currency-mask');
        if (amountInput) window.applyCurrencyMask(amountInput);
    }

    renderRecurringList() {
        const container = document.getElementById('recurring-list');
        if (!container) return;

        const recurring = store.getRecurring();
        container.innerHTML = recurring.map(r => {
            let currentIdx = r.current_installment;
            let total = r.installments;
            
            // If has start date, calculate based on current viewed month
            if (r.start_date) {
                const start = new Date(r.start_date);
                const current = new Date(this.currentViewedMonth + '-01');
                const diffMonths = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
                currentIdx = diffMonths + 1;
            }

            const isInstallment = total || r.start_date;
            
            // Logic: if total exists, show "X/N". If only start_date show "X". Otherwise REC.
            let badge = '<span class="installment-badge recurring">REC</span>';
            if (total && currentIdx > 0) {
                badge = `<span class="installment-badge">${currentIdx}/${total}x</span>`;
            } else if (currentIdx > 0) {
                badge = `<span class="installment-badge dated">${currentIdx}º Mês</span>`;
            }

            // Don't show if installments finished
            if (total && currentIdx > total) return '';
            if (currentIdx < 1) return ''; // Future start
            
            return `
            <div class="recurring-item">
                <div class="recurring-info">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <strong>${r.description}</strong>
                        ${badge}
                    </div>
                    <span>${window.formatBRL(r.amount)}</span>
                </div>
                <div class="recurring-actions">
                    <button class="btn btn-sm btn-action-launch" title="Lançar no Diário" onclick="window.app.launchRecurring('${r.id}', ${currentIdx})">
                        <i class="fas fa-magic"></i>
                    </button>
                    <button class="btn btn-sm btn-action-delete" title="Excluir Regra" onclick="window.app.deleteRecurring('${r.id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
        }).join('') || '<p class="text-muted" style="text-align:center; padding: 1rem;">Nenhuma regra ativa para este período.</p>';
    }

    launchRecurring(id, calculatedIdx) {
        const recurring = store.getRecurring();
        const rule = recurring.find(r => r.id === id);
        if (rule) {
            let desc = rule.description;
            if (rule.installments) {
                desc = `${rule.description} (${calculatedIdx}/${rule.installments}x)`;
            } else if (rule.start_date) {
                desc = `${rule.description} (${calculatedIdx}º Mês)`;
            }

            // Safely determine the day (handle months with different lengths)
            const today = new Date();
            const year = parseInt(this.currentViewedMonth.split('-')[0]);
            const month = parseInt(this.currentViewedMonth.split('-')[1]);
            const lastDayOfMonth = new Date(year, month, 0).getDate();
            const launchDay = Math.min(today.getDate(), lastDayOfMonth).toString().padStart(2, '0');

            store.addCashflow({
                description: desc,
                amount: rule.amount,
                type: 'expense',
                date: `${this.currentViewedMonth}-${launchDay}`
            });
            syncMonthlyBalance(this.currentViewedMonth);

            // Only use the old manual counter if NO start_date
            if (!rule.start_date) {
                store.useRecurring(id);
            }
            
            this.renderRecurringList();
            if (typeof this.renderCashflowView === "function") {
                this.renderCashflowView();
            } else {
                this.renderActivePage();
            }
        }
    }

    deleteRecurring(id) {
        store.deleteRecurring(id);
        this.renderRecurringList();
    }

    toggleAssetTypeFields(type) {
        const vehicleFields = document.getElementById('vehicle-fields');
        const realEstateFields = document.getElementById('real-estate-fields');
        if (!vehicleFields || !realEstateFields) return;

        const isVehicle = ['carro', 'moto', 'caminhonete', 'embarcação'].includes(type);
        const isRealEstate = ['casa', 'apartamento', 'terreno', 'imóvel comercial', 'sítio', 'sala comercial'].includes(type);

        vehicleFields.style.display = isVehicle ? 'block' : 'none';
        realEstateFields.style.display = isRealEstate ? 'block' : 'none';
    }

    showModal(type = 'asset') {
        this.editingId = null;
        document.getElementById('modal-title').innerText = 'Novo Registro';
        document.getElementById('entry-type').value = type;
        document.getElementById('entry-type').disabled = false;
        this.modal.style.display = 'flex';
        this.renderFormFields(type);

        // Auto-set date if it's a cashflow entry
        if (type === 'expense' || type === 'income') {
            const form = document.getElementById('entry-form');
            if (form && form.date) {
                const currentMonthStr = window.getLocalISODate().substring(0, 7);
                if (this.currentViewedMonth === currentMonthStr) {
                    form.date.value = window.getLocalISODate();
                } else {
                    form.date.value = `${this.currentViewedMonth}-01`;
                }
            }
        }
    }

    openAssetEditModal(id) {
        const assets = store.getAssets();
        const asset = assets.find(a => a.id === id);
        if (!asset) return;

        this.editingId = id;
        document.getElementById('modal-title').innerText = 'Editar Ativo';
        document.getElementById('entry-type').value = 'asset';
        document.getElementById('entry-type').disabled = true;
        
        this.modal.style.display = 'flex';
        this.renderFormFields('asset');

        // Fill fields
        const form = document.getElementById('entry-form');
        form.assetName.value = asset.assetName;
        form.assetType.value = asset.assetType;
        form.acquisitionDate.value = asset.acquisitionDate;
        form.acquisitionValue.value = window.formatBRL(asset.acquisitionValue).replace('R$', '').trim();
        form.currentEstimatedValue.value = window.formatBRL(asset.currentEstimatedValue).replace('R$', '').trim();
        
        // Fill specialized fields based on type
        if (form.manufacturer) form.manufacturer.value = asset.manufacturer || '';
        if (form.model) form.model.value = asset.model || '';
        if (form.version) form.version.value = asset.version || '';
        if (form.modelYear) form.modelYear.value = asset.modelYear || '';
        if (form.municipality) form.municipality.value = asset.municipality || '';
        if (form.state) form.state.value = asset.state || '';

        // Show previous analysis if exists
        const aiContainer = document.getElementById('ai-analysis-container');
        const aiText = document.getElementById('ai-valuation-text');
        if (aiContainer && aiText && asset.valuationAnalysis) {
            aiContainer.style.display = 'block';
            aiText.innerText = asset.valuationAnalysis;
        }
    }

    openEditModal(id) {
        const cashflow = store.getCashflow();
        const entry = cashflow.find(c => c.id === id);
        if (!entry) return;

        this.editingId = id;
        document.getElementById('modal-title').innerText = 'Editar Lançamento';
        document.getElementById('entry-type').value = entry.type === 'income' ? 'income' : 'expense';
        document.getElementById('entry-type').disabled = true;
        
        this.modal.style.display = 'flex';
        this.renderFormFields(entry.type);

        // Fill fields
        const form = document.getElementById('entry-form');
        form.description.value = entry.description;
        form.amount.value = window.formatBRL(entry.amount).replace('R$', '').trim();
        form.date.value = entry.date;
        if (form.type) form.type.value = entry.type;
        if (form.category) form.category.value = entry.category;
        if (form.subcategory) form.subcategory.value = entry.subcategory || '';
    }

    renderFormFields(type) {
        const container = document.getElementById('dynamic-fields');
        if (type === 'asset') {
            container.innerHTML = `
                <div class="form-group">
                    <label>Nome do Ativo</label>
                    <input type="text" name="assetName" class="form-control" placeholder="Ex: Apartamento Jardins, Toyota Corolla..." required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Tipo de Ativo</label>
                        <select name="assetType" id="asset-type-select" class="form-control">
                            <option value="casa">Casa</option>
                            <option value="apartamento">Apartamento</option>
                            <option value="terreno">Terreno</option>
                            <option value="carro">Carro</option>
                            <option value="moto">Moto</option>
                            <option value="caminhonete">Caminhonete</option>
                            <option value="imóvel comercial">Imóvel Comercial</option>
                            <option value="sítio">Sítio</option>
                            <option value="sala comercial">Sala Comercial</option>
                            <option value="embarcação">Embarcação</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Data de Aquisição</label>
                        <input type="date" name="acquisitionDate" class="form-control" required>
                    </div>
                </div>

                <!-- Vehicle Specific Fields (Hidden by default) -->
                <div id="vehicle-fields" style="display: none; border: 1px solid rgba(212,175,55,0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; background: rgba(255,255,255,0.02);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>Fabricante</label>
                            <input type="text" name="manufacturer" class="form-control" placeholder="Ex: Toyota, Honda...">
                        </div>
                        <div class="form-group">
                            <label>Modelo</label>
                            <input type="text" name="model" class="form-control" placeholder="Ex: Corolla, Civic...">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>Versão</label>
                            <input type="text" name="version" class="form-control" placeholder="Ex: XEI 2.0, LXR 2.0...">
                        </div>
                        <div class="form-group">
                            <label>Ano Modelo</label>
                            <input type="number" name="modelYear" class="form-control" placeholder="Ex: 2024">
                        </div>
                    </div>
                </div>

                <!-- Real Estate Specific Fields (Hidden by default) -->
                <div id="real-estate-fields" style="display: none; border: 1px solid rgba(212,175,55,0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; background: rgba(255,255,255,0.02);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>Município</label>
                            <input type="text" name="municipality" class="form-control" placeholder="Ex: São Paulo, Curitiba...">
                        </div>
                        <div class="form-group">
                            <label>Estado (UF)</label>
                            <input type="text" name="state" class="form-control" placeholder="Ex: SP, PR...">
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Valor de Aquisição</label>
                        <input type="text" name="acquisitionValue" class="form-control currency-mask" placeholder="0,00" required>
                    </div>
                    <div class="form-group">
                        <label>Valor Estimado Atual</label>
                        <input type="text" name="currentEstimatedValue" class="form-control currency-mask" placeholder="0,00" required>
                    </div>
                </div>
                <div class="form-group" id="ai-analysis-container" style="display: none;">
                    <label style="color: var(--gold-primary);"><i class="fas fa-brain"></i> Análise de Valorização (IA)</label>
                    <div id="ai-valuation-text" style="font-size: 0.85rem; color: #fff; padding: 0.8rem; background: rgba(255,255,255,0.05); border: 1px dashed var(--gold-primary); border-radius: 8px; line-height: 1.4;">
                        Processando análise...
                    </div>
                </div>
            `;

            // Add listener for type-specific fields
            const typeSelect = document.getElementById('asset-type-select');
            typeSelect.addEventListener('change', () => this.toggleAssetTypeFields(typeSelect.value));
            
            // Initial toggle check (important for edit mode)
            setTimeout(() => this.toggleAssetTypeFields(typeSelect.value), 0);
        } else if (type === 'goal') {
            container.innerHTML = `
                <div class="form-group">
                    <label>Nome da Meta</label>
                    <input type="text" name="name" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Valor Alvo</label>
                    <input type="text" name="target" class="form-control currency-mask" placeholder="0,00" required>
                </div>
                <div class="form-group">
                    <label>Valor Atual</label>
                    <input type="text" name="current" class="form-control currency-mask" placeholder="0,00" value="0,00">
                </div>
            `;
        } else {
            const categories = store.getCategories() || [];
            container.innerHTML = `
                <div class="form-group">
                    <label>Descrição</label>
                    <input type="text" name="description" class="form-control" placeholder="Salário, Aluguel, etc" required>
                </div>
                <div class="form-group">
                    <label>Valor</label>
                    <input type="text" name="amount" class="form-control currency-mask" placeholder="0,00" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Data</label>
                        <input type="date" name="date" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Tipo</label>
                        <select name="type" class="form-control">
                            <option value="expense">Despesa</option>
                            <option value="income">Receita</option>
                        </select>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Categoria</label>
                        <select name="category" class="form-control">
                            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Subcategoria</label>
                        <input type="text" name="subcategory" class="form-control" placeholder="Ex: mercado, lazer...">
                    </div>
                </div>
            `;
        }

        // Apply Masks to all new currency fields
        container.querySelectorAll('.currency-mask').forEach(input => {
            window.applyCurrencyMask(input);
        });
    }

    async handleFormSubmit(formData) {
        const type = document.getElementById('entry-type').value;
        const entryData = Object.fromEntries(formData.entries());
        
        if (this.editingId) {
            // Edit Flow
            if (type === 'asset') {
                const updated = {
                    assetName: entryData.assetName,
                    assetType: entryData.assetType,
                    acquisitionDate: entryData.acquisitionDate,
                    acquisitionValue: window.parseCurrency(entryData.acquisitionValue),
                    currentEstimatedValue: window.parseCurrency(entryData.currentEstimatedValue),
                    // Specialized Fields
                    manufacturer: entryData.manufacturer || '',
                    model: entryData.model || '',
                    version: entryData.version || '',
                    modelYear: entryData.modelYear || '',
                    municipality: entryData.municipality || '',
                    state: entryData.state || ''
                };

                // Re-calculate Valuation Logic
                const diff = updated.currentEstimatedValue - updated.acquisitionValue;
                updated.valuationPercent = ((diff / updated.acquisitionValue) * 100).toFixed(2);
                updated.valuationStatus = diff > 0 ? 'valorização' : (diff < 0 ? 'depreciação' : 'estável');

                // Force new AI Analysis on edit
                const submitBtn = document.querySelector('#entry-form button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-brain fa-spin"></i> Reanalisando...';
                if (submitBtn) submitBtn.disabled = true;

                try {
                    updated.valuationAnalysis = await window.brain.analyzeAssetValuation(updated);
                } catch (err) {
                    updated.valuationAnalysis = "Análise inteligente indisponível no momento.";
                }

                store.updateAsset(this.editingId, updated);
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } else {
                const updated = {
                    description: entryData.description,
                    amount: window.parseCurrency(entryData.amount),
                    date: entryData.date,
                    type: entryData.type || type,
                    category: entryData.category,
                    subcategory: entryData.subcategory
                };
                store.updateCashflow(this.editingId, updated);
                syncMonthlyBalance((updated.date || '').substring(0, 7));
            }
            this.modal.style.display = 'none';
            this.editingId = null;
            this.renderActivePage(); // Ensure refresh after edit
            return;
        }

        // New Entry Flow
        const entry = { ...entryData };
        if (type === 'asset') {
            entry.acquisitionValue = window.parseCurrency(entry.acquisitionValue);
            entry.currentEstimatedValue = window.parseCurrency(entry.currentEstimatedValue);
            
            // Normalize specialized fields
            entry.manufacturer = entry.manufacturer || '';
            entry.model = entry.model || '';
            entry.version = entry.version || '';
            entry.modelYear = entry.modelYear || '';
            entry.municipality = entry.municipality || '';
            entry.state = entry.state || '';

            // Valuation Logic
            const diff = entry.currentEstimatedValue - entry.acquisitionValue;
            entry.valuationPercent = ((diff / entry.acquisitionValue) * 100).toFixed(2);
            entry.valuationStatus = diff > 0 ? 'valorização' : (diff < 0 ? 'depreciação' : 'estável');

            // AI Analysis
            const aiContainer = document.getElementById('ai-analysis-container');
            if (aiContainer) aiContainer.style.display = 'block';
            
            const submitBtn = document.querySelector('#entry-form button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-brain fa-spin"></i> Analisando...';
            submitBtn.disabled = true;

            try {
                entry.valuationAnalysis = await window.brain.analyzeAssetValuation(entry);
            } catch (err) {
                console.warn('AI Valuation Analysis failed:', err);
                entry.valuationAnalysis = "Análise inteligente indisponível no momento.";
            }

            store.addAsset(entry);
            
            // Restore button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        } else if (type === 'goal') {
            entry.target = window.parseCurrency(entry.target);
            entry.current = window.parseCurrency(entry.current);
            store.addGoal(entry);
        } else {
            entry.amount = window.parseCurrency(entry.amount);
            
            // AI Smart Detection for modal entries (Silent fallback)
            entry.category = 'CUSTO_DE_VIDA';
            entry.subcategory = 'outro';
            try {
                const aiResult = await window.brain.processEntry(entry.description, type);
                if (aiResult) {
                    entry.type = aiResult.type || type;
                    entry.category = aiResult.category || entry.category;
                    entry.subcategory = aiResult.subcategory || entry.subcategory;
                }
            } catch (err) {
                console.warn('AI Processing Error (using local):', err);
            }
            
            store.addCashflow(entry);
            syncMonthlyBalance((entry.date || '').substring(0, 7));

            // Show toast if categorized
            if (entry.subcategory !== 'outro') {
                const cat = store.getCategories().find(c => c.id === entry.category);
                const toast = document.getElementById('ai-feedback-toast');
                if (toast && cat) {
                    document.getElementById('ai-cat-name').innerText = `${cat.name} > ${entry.subcategory}`;
                    toast.classList.remove('hidden');
                    setTimeout(() => toast.classList.add('hidden'), 3000);
                }
            }
        }
        this.modal.style.display = 'none';
        document.getElementById('entry-form').reset();
        this.renderActivePage();
    }

    openIndicesManualModal() {
        const modal = document.getElementById('indices-manual-modal');
        if (!modal) return;

        const indices = store.getMarketIndices();
        const form = document.getElementById('indices-manual-form');
        
        // Populate fields
        form.cdi.value = indices.cdi || 0;
        form.selic.value = indices.selic || 0;
        form.ipca.value = indices.ipca || 0;
        form.lci.value = indices.lci || 0;
        form.lca.value = indices.lca || 0;
        form.cdb.value = indices.cdb || 0;

        modal.classList.add('active');
    }

    closeIndicesManualModal() {
        document.getElementById('indices-manual-modal')?.classList.remove('active');
    }

    handleManualIndicesSubmit(formData) {
        const indices = {
            cdi: parseFloat(formData.get('cdi')) || 0,
            selic: parseFloat(formData.get('selic')) || 0,
            ipca: parseFloat(formData.get('ipca')) || 0,
            lci: parseFloat(formData.get('lci')) || 0,
            lca: parseFloat(formData.get('lca')) || 0,
            cdb: parseFloat(formData.get('cdb')) || 0
        };

        store.updateMarketIndices(indices);
        this.closeIndicesManualModal();
        this.renderInvestments();
        alert('Índices atualizados manualmente! ⚙️✍️');
    }

    // --- RECORRENCIAS (RECURRING) LOGIC ---

    async renderRecorrenciasView() {
        const selector = document.getElementById('recorrencias-month-selector');
        if (selector) selector.classList.remove('hidden');

        this.updateRecMonthDisplay();
        
        try {
            await Promise.all([
                this.fetchRecurringItems(),
                this.fetchMonthlyStatuses(),
                this.fetchNetIncome()
            ]);
            
            this.mergeMonthlyStatuses();
            this.calculateRecMetrics();
            this.renderRecChart();
            this.renderRecList();
        } catch (err) {
            console.error('Recorrências fetch error:', err);
        }
    }

    updateRecMonthDisplay() {
        const display = document.getElementById('current-rec-month');
        const badge = document.getElementById('rec-projection-badge');
        if (!display) return;

        const [y, m] = this.currentRecMonth.split('-');
        const date = new Date(y, m - 1, 1);
        const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
        display.innerText = label;

        const now = new Date();
        const currentMonthISO = window.getLocalISODate(now).substring(0, 7);
        badge?.classList.toggle('hidden', this.currentRecMonth <= currentMonthISO);
    }

    changeRecMonth(delta) {
        const [y, m] = this.currentRecMonth.split('-').map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        this.currentRecMonth = window.getLocalISODate(d).substring(0, 7);
        this.renderRecorrenciasView();
    }

    changeCardsMonth(delta) {
        if (!this.currentCardsMonth) {
            const now = new Date();
            this.currentCardsMonth = window.getLocalISODate(now).substring(0, 7);
        }
        const [y, m] = this.currentCardsMonth.split('-').map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        this.currentCardsMonth = window.getLocalISODate(d).substring(0, 7);
        this.renderCardsView();
    }

    async fetchRecurringItems() {
        const res = await fetch(`${REC_TABLE}?select=*&order=name.asc`, { headers: SB_HEADERS });
        if (!res.ok) throw new Error('Recorrências error');
        this.recurringItems = await res.json();
    }

    async fetchMonthlyStatuses() {
        try {
            const res = await fetch(`${MONTH_STATUS_TABLE}?month=eq.${this.currentRecMonth}`, { headers: SB_HEADERS });
            if (!res.ok) { this.monthlyStatuses = []; return; }
            this.monthlyStatuses = await res.json();
        } catch (e) {
            this.monthlyStatuses = [];
        }
    }

    mergeMonthlyStatuses() {
        this.recurringItems.forEach(item => {
            const override = (this.monthlyStatuses || []).find(s => s.recurring_item_id === item.id);
            // Local state for the current render - doesn't alter global item.active unless intended
            item.currentMonthActive = override ? override.is_active : item.active;
        });
    }

    async fetchNetIncome() {
        const res = await fetch(`${INCOME_TABLE}?month=eq.${this.currentRecMonth}`, { headers: SB_HEADERS });
        if (!res.ok) throw new Error('Net Income error');
        const data = await res.json();
        this.netIncome = data.length > 0 ? data[0] : { amount: 0, month: this.currentRecMonth };
    }

    calculateRecMetrics() {
        const activeItems = (this.recurringItems || []).filter(item => item.currentMonthActive);
        const totalRec = activeItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
        const income = parseFloat(this.netIncome?.amount) || 0;
        const balance = income - totalRec;
        const commitment = income > 0 ? (totalRec / income) * 100 : 0;

        const elTotal = document.getElementById('rec-total-amount');
        const elCount = document.getElementById('rec-total-count');
        const elIncome = document.getElementById('fo-btn-net-income');
        const elBalance = document.getElementById('rec-available-balance');
        const elCommit = document.getElementById('rec-commitment-pct');
        const elLabel = document.getElementById('rec-commitment-label');

        if (elTotal) elTotal.innerText = window.formatBRL(totalRec);
        if (elCount) elCount.innerText = `${activeItems.length} assinaturas ativas`;
        if (elIncome) elIncome.innerText = window.formatBRL(income);
        if (elBalance) {
            elBalance.innerText = window.formatBRL(balance);
            elBalance.parentElement.style.color = balance >= 0 ? '' : '#f87171';
        }
        if (elCommit) elCommit.innerText = `${commitment.toFixed(1)}%`;
        
        if (elLabel) {
            if (commitment > 70) {
                elLabel.innerHTML = '<span style="color:#f87171">ALTO COMPROMETIMENTO</span>';
            } else if (commitment > 40) {
                elLabel.innerHTML = '<span style="color:#f59e0b">ATENÇÃO MODERADA</span>';
            } else {
                elLabel.innerHTML = 'da receita líquida';
            }
        }
    }

    renderRecChart() {
        const container = document.getElementById('rec-category-chart');
        if (!container) return;

        const activeItems = (this.recurringItems || []).filter(item => item.currentMonthActive);
        const total = activeItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
        
        const catMap = {};
        activeItems.forEach(item => {
            catMap[item.category] = (catMap[item.category] || 0) + parseFloat(item.amount);
        });

        const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        
        const catLabels = {
            moradia: 'Moradia',
            saude_seguro: 'Saúde & Seguros',
            mensalidade: 'Mensalidades',
            streaming: 'Streaming',
            software: 'Software & SaaS',
            outros: 'Outros'
        };

        const catColors = {
            moradia: 'linear-gradient(90deg, #d4af37, #f5e6b8)',       // Gold
            saude_seguro: 'linear-gradient(90deg, #B76E79, #E4B4B4)',  // Rose Gold
            mensalidade: 'linear-gradient(90deg, #CFB53B, #F2E0BD)',   // Champagne
            streaming: 'linear-gradient(90deg, #804A00, #CD7F32)',     // Bronze
            software: 'linear-gradient(90deg, #E5E4E2, #FFFFFF)',      // Platinum
            outros: 'linear-gradient(90deg, #3A3B3C, #71797E)'         // Titanium
        };

        if (sorted.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted); font-size:12px;">Nenhuma recorrência ativa no período.</div>';
            return;
        }

        container.innerHTML = sorted.map(([cat, val]) => {
            const pct = total > 0 ? (val / total) * 100 : 0;
            return `
                <div class="fo-bar-row" style="margin-bottom: 24px;">
                    <div class="fo-bar-label-group" style="font-size: 17px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end;">
                        <span style="font-weight: 500; color: var(--text-primary); letter-spacing: 0.5px;">${catLabels[cat] || cat}</span>
                        <span style="font-weight: 600; color: var(--gold-200); font-size: 15px;">${window.formatBRL(val)} <span style="font-weight: 400; font-size: 13px; opacity: 0.8;">(${pct.toFixed(0)}%)</span></span>
                    </div>
                    <div class="fo-bar-bg" style="height: 6px; background: rgba(255,255,255,0.03); border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.01);">
                        <div class="fo-bar-fill" style="width: ${pct}%; height: 100%; background: ${catColors[cat] || 'var(--gold-primary)'}; border-radius: 20px; transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 15px rgba(212, 175, 55, 0.1);"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRecList() {
        const container = document.getElementById('rec-items-list');
        const inactiveContainer = document.getElementById('rec-inactive-list');
        const inactiveSection = document.getElementById('rec-inactive-section');
        if (!container) return;

        const allItems = this.recurringItems || [];
        const activeItems = allItems.filter(item => item.currentMonthActive);
        const inactiveItems = allItems.filter(item => !item.currentMonthActive);

        // Group active by category
        const groups = {};
        activeItems.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });

        const catLabels = {
            moradia: { label: 'Moradia', icon: 'fa-home' },
            saude_seguro: { label: 'Saúde & Seguros', icon: 'fa-shield-heart' },
            mensalidade: { label: 'Mensalidades', icon: 'fa-graduation-cap' },
            streaming: { label: 'Streaming', icon: 'fa-play-circle' },
            software: { label: 'Software & SaaS', icon: 'fa-code' },
            outros: { label: 'Outros', icon: 'fa-ellipsis-h' }
        };

        container.innerHTML = Object.entries(groups).map(([cat, items]) => {
            const catTotal = items.reduce((s, i) => s + parseFloat(i.amount), 0);
            const info = catLabels[cat] || { label: cat, icon: 'fa-layer-group' };
            
            return `
                <div class="fo-rec-category-group">
                    <div class="fo-rec-category-header">
                        <div class="fo-rec-category-title">
                            <i class="fas ${info.icon}"></i>
                            ${info.label}
                        </div>
                        <div class="fo-rec-category-total">${window.formatBRL(catTotal)}</div>
                    </div>
                    <div class="fo-rec-items-container">
                        ${items.map(item => this.renderRecItemCard(item)).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Render Inactive
        if (inactiveItems.length > 0) {
            if (inactiveSection) inactiveSection.classList.remove('hidden');
            if (inactiveContainer) {
                inactiveContainer.innerHTML = '<div class="fo-rec-items-container">' + 
                    inactiveItems.map(item => this.renderRecItemCard(item)).join('') + 
                    '</div>';
            }
        } else {
            if (inactiveSection) inactiveSection.classList.add('hidden');
        }
    }

    renderRecItemCard(item) {
        return `
            <div class="fo-rec-item">
                <div class="fo-rec-item-main">
                    <div class="fo-rec-switch ${item.currentMonthActive ? 'active' : ''}" onclick="window.app.toggleRecActive('${item.id}', ${!item.currentMonthActive})"></div>
                    <div class="fo-rec-item-info">
                        <div class="fo-rec-item-name">${item.name}</div>
                        <div class="fo-rec-item-meta">Vence dia ${String(item.due_day).padStart(2, '0')} ${item.notes ? ' • ' + item.notes : ''}</div>
                    </div>
                </div>
                <div class="fo-rec-item-amount">${window.formatBRL(item.amount)}</div>
                <div class="fo-rec-item-actions">
                    <button class="fo-action-btn" onclick="window.app.openRecModal('${item.id}')"><i class="fas fa-edit"></i></button>
                    <button class="fo-action-btn delete" onclick="window.app.deleteRecItem('${item.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }

    // Modal Recorrência
    openRecModal(id = null) {
        console.log("DEBUG: openRecModal called with id:", id);
        const overlay = document.getElementById('fo-rec-modal-overlay');
        if (!overlay) return console.error("CRITICAL: fo-rec-modal-overlay not found");

        const form = document.getElementById('fo-rec-form');
        if (form) form.reset();
        
        document.getElementById('fo-rec-id').value = id || '';
        document.getElementById('fo-rec-modal-title').innerText = id ? 'Editar Recorrência' : 'Nova Recorrência';
        
        if (id) {
            const item = this.recurringItems.find(i => i.id == id);
            if (item) {
                document.getElementById('fo-rec-name').value = item.name;
                document.getElementById('fo-rec-amount').value = window.formatBRL(item.amount);
                document.getElementById('fo-rec-category').value = item.category;
                document.getElementById('fo-rec-due-day').value = item.due_day || '';
                document.getElementById('fo-rec-notes').value = item.notes || '';
            }
        }
        
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
    }

    closeRecModal() {
        const overlay = document.getElementById('fo-rec-modal-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }
    }

    async saveRecItem() {
        const id = document.getElementById('fo-rec-id').value;
        const payload = {
            name: document.getElementById('fo-rec-name').value,
            category: document.getElementById('fo-rec-category').value,
            due_day: parseInt(document.getElementById('fo-rec-due-day').value),
            amount: window.parseBRL(document.getElementById('fo-rec-amount').value),
            notes: document.getElementById('fo-rec-notes').value,
            active: true
        };

        try {
            const method = id ? 'PATCH' : 'POST';
            const url = id ? `${REC_TABLE}?id=eq.${id}` : REC_TABLE;
            const res = await fetch(url, {
                method,
                headers: SB_HEADERS,
                body: JSON.stringify(id ? payload : withUser(payload))
            });
            if (!res.ok) throw new Error('Save error');
            this.closeRecModal();
            this.renderRecorrenciasView();
        } catch (err) {
            alert('Erro ao salvar item.');
        }
    }

    async deleteRecItem(id) {
        if (!confirm('Deseja excluir esta recorrência?')) return;
        try {
            const res = await fetch(`${REC_TABLE}?id=eq.${id}`, { method: 'DELETE', headers: SB_HEADERS });
            if (!res.ok) throw new Error('Delete error');
            this.renderRecorrenciasView();
        } catch (err) {
            alert('Erro ao excluir.');
        }
    }

    async toggleRecActive(id, status) {
        try {
            // Try monthly override first
            const check = await fetch(`${MONTH_STATUS_TABLE}?recurring_item_id=eq.${id}&month=eq.${this.currentRecMonth}`, { headers: SB_HEADERS });
            
            if (check.ok) {
                const existing = await check.json();
                const payload = {
                    recurring_item_id: id,
                    month: this.currentRecMonth,
                    is_active: status
                };

                if (existing.length > 0) {
                    await fetch(`${MONTH_STATUS_TABLE}?id=eq.${existing[0].id}`, {
                        method: 'PATCH', headers: SB_HEADERS, body: JSON.stringify(payload)
                    });
                } else {
                    await fetch(MONTH_STATUS_TABLE, {
                        method: 'POST', headers: SB_HEADERS, body: JSON.stringify(withUser(payload))
                    });
                }
            } else {
                // Fallback: toggle on the item itself
                await fetch(`${REC_TABLE}?id=eq.${id}`, {
                    method: 'PATCH', headers: SB_HEADERS,
                    body: JSON.stringify({ active: status })
                });
            }
            this.renderRecorrenciasView();
        } catch (err) {
            // Final fallback: toggle on the item itself
            try {
                await fetch(`${REC_TABLE}?id=eq.${id}`, {
                    method: 'PATCH', headers: SB_HEADERS,
                    body: JSON.stringify({ active: status })
                });
                this.renderRecorrenciasView();
            } catch (e) {
                console.error(e);
            }
        }
    }

    // Modal Net Income
    openNetIncomeModal() {
        console.log("DEBUG: openNetIncomeModal called");
        const overlay = document.getElementById('fo-income-modal-overlay');
        if (!overlay) return console.error("CRITICAL: fo-income-modal-overlay not found");

        const label = document.getElementById('fo-income-month-label');
        const input = document.getElementById('fo-income-amount');
        if (label) label.innerText = `Referência: ${this.currentRecMonth}`;
        if (input) input.value = window.formatBRL(this.netIncome?.amount || 0);
        
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
    }

    closeNetIncomeModal() {
        const overlay = document.getElementById('fo-income-modal-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }
    }

    async saveNetIncome(e) {
        if (e) e.preventDefault();
        const input = document.getElementById('fo-income-amount');
        if (!input) return;
        
        const amount = window.parseBRL(input.value);
        const payload = {
            month: this.currentRecMonth,
            amount: amount
        };

        try {
            const check = await fetch(`${INCOME_TABLE}?month=eq.${this.currentRecMonth}`, { headers: SB_HEADERS });
            const existing = await check.json();
            
            let res;
            if (existing.length > 0) {
                res = await fetch(`${INCOME_TABLE}?id=eq.${existing[0].id}`, {
                    method: 'PATCH',
                    headers: SB_HEADERS,
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch(INCOME_TABLE, {
                    method: 'POST',
                    headers: SB_HEADERS,
                    body: JSON.stringify(withUser(payload))
                });
            }
            
            if (!res.ok) throw new Error('Save Income error');
            this.closeNetIncomeModal();
            this.renderRecorrenciasView();
        } catch (err) {
            alert('Erro ao salvar receita.');
        }
    }

    /* ─── CONSULTOR IA MODULE ───────────────────────────────────── */
    renderConsultorIA() {
        const btn = document.getElementById('fo-ai-generate-btn');
        const startBtn = document.getElementById('fo-ai-start-btn');
        const chatSend = document.getElementById('fo-ai-chat-send');
        const chatInput = document.getElementById('fo-ai-chat-input');

        if (btn) btn.onclick = () => this.runAIAnalysis();
        if (startBtn) startBtn.onclick = () => this.runAIAnalysis();
        
        if (chatSend && chatInput) {
            chatSend.onclick = () => this.handleAIChat();
            chatInput.onkeypress = (e) => { if(e.key === 'Enter') this.handleAIChat(); };
        }

        // Horizontal tabs for projections
        document.querySelectorAll('.fo-ai-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.fo-ai-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateProjectionDisplay(tab.getAttribute('data-horizon'));
            };
        });
    }

    async collectFinancialData() {
        const now = new Date();
        const currentMonth = now.toISOString().substring(0, 7);

        try {
            // Parallel fetch A-E
            const [cashflowRes, cardTxRes, cardsRes, recRes, incomeRes] = await Promise.all([
                fetch(`${SB_TABLE}?status=eq.approved&order=date.desc&limit=500`, { headers: SB_HEADERS }),
                fetch(`${CARD_TX_TABLE}?status=in.(pending,posted)&order=due_date.desc&limit=500`, { headers: SB_HEADERS }),
                fetch(`${CARDS_TABLE}?select=*`, { headers: SB_HEADERS }),
                fetch(`${REC_TABLE}?active=eq.true`, { headers: SB_HEADERS }),
                fetch(`${INCOME_TABLE}?order=month.desc&limit=12`, { headers: SB_HEADERS })
            ]);

            const [cashflow, cardTx, cards, recurring, netIncome] = await Promise.all([
                cashflowRes.json(), cardTxRes.json(), cardsRes.json(), recRes.json(), incomeRes.json()
            ]);

            // --- COMPUTATIONS ---
            
            // 1. Monthly Summary (last 12 months)
            const monthlySummary = {};
            cashflow.forEach(item => {
                const m = item.date.substring(0, 7);
                if (!monthlySummary[m]) monthlySummary[m] = { income: 0, expense: 0, by_category: {} };
                if (item.type === 'income') monthlySummary[m].income += item.amount;
                else {
                    monthlySummary[m].expense += item.amount;
                    monthlySummary[m].by_category[item.category] = (monthlySummary[m].by_category[item.category] || 0) + item.amount;
                }
            });
            Object.keys(monthlySummary).forEach(m => monthlySummary[m].balance = monthlySummary[m].income - monthlySummary[m].expense);

            // 2. Card Summary
            const cardSummary = cards.map(card => {
                const txs = cardTx.filter(tx => tx.card_id === card.id);
                const usedThisMonth = txs.filter(tx => tx.due_date?.startsWith(currentMonth))
                                       .reduce((s, t) => s + (t.amount || 0), 0);
                const future = txs.filter(tx => tx.due_date > currentMonth)
                                 .reduce((s, t) => s + (t.amount || 0), 0);
                return {
                    name: card.name,
                    limit: card.total_limit,
                    used: usedThisMonth,
                    future_committed: future,
                    effective_pct: ((usedThisMonth + future) / card.total_limit) * 100
                };
            });

            // 3. Health Score & Recurring
            const recurringTotal = recurring.reduce((s, r) => s + (r.amount || 0), 0);
            const currentNetIncome = netIncome.find(i => i.month === currentMonth)?.amount || netIncome[0]?.amount || 0;
            const committedPct = currentNetIncome > 0 ? (recurringTotal / currentNetIncome) * 100 : 0;
            
            let healthScore = 100;
            if (committedPct > 75) healthScore -= 30;
            else if (committedPct > 50) healthScore -= 20;
            
            if (cardSummary.some(c => c.effective_pct > 70)) healthScore -= 20;
            else if (cardSummary.some(c => c.effective_pct > 40)) healthScore -= 10;

            // Trend analysis (last 3 months)
            const months = Object.keys(monthlySummary).sort().reverse().slice(0, 3);
            if (months.length >= 2) {
                if (monthlySummary[months[0]].expense > monthlySummary[months[1]].expense) healthScore -= 10;
                if (months.some(m => monthlySummary[m].balance < 0)) healthScore -= 10;
            }
            healthScore = Math.max(0, healthScore);

            // 4. Projections
            const baseExpense = months.length > 0 ? months.reduce((s, m) => s + monthlySummary[m].expense, 0) / months.length : 0;
            const horizons = [3, 6, 12, 24];
            const projections = {};
            horizons.forEach(h => {
                const cardInstallmentsInHorizon = cardTx.filter(tx => tx.due_date > currentMonth)
                    .reduce((s, t) => s + (t.amount || 0), 0); // Simplified: all committed card debt
                projections[`${h}m`] = {
                    expense_base: baseExpense * h,
                    card_debt: cardInstallmentsInHorizon,
                    net_expected: currentNetIncome * h,
                    projected_balance: (currentNetIncome * h) - (baseExpense * h) - cardInstallmentsInHorizon
                };
            });

            return {
                current_month: currentMonth,
                health_score: healthScore,
                financial_status: {
                    monthly_income_avg: currentNetIncome,
                    recurring_fixed: recurringTotal,
                    committed_ratio: committedPct
                },
                wallets: cardSummary,
                history: monthlySummary,
                projections: projections
            };
        } catch (err) {
            console.error("Data Collection Error:", err);
            throw err;
        }
    }

    async runAIAnalysis() {
        const btn = document.getElementById('fo-ai-generate-btn');
        const results = document.getElementById('fo-ai-results');
        const initial = document.getElementById('fo-ai-initial-state');
        if (!btn || !window.brain) return;

        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Analisando...</span>';

        // Show skeletons (simplified via UI reset)
        initial.classList.add('hidden');
        results.classList.remove('hidden');
        this.showAISkeletons();

        try {
            const payload = await this.collectFinancialData();
            this.lastAIPayload = payload; // Store for chat context

            const systemInstruction = `Você é um Consultor Estratégico Executivo. Analise os dados e retorne APENAS um JSON válido. Tom: direto, formal, sem rodeios. Proibido: introduções ou texto fora do JSON.
            JSON: { "diagnostico":"string", "score_comentario":"string", "gargalos":[{"titulo":"string","descricao":"string", "impacto":"alto|medio|baixo"}], "sugestoes":[{"acao":"string","economia_estimada":number, "prazo":"imediato|curto"}], "projecoes":{"3m": {"cenario":"string","saldo_projetado":number}, "6m": {"cenario":"string","saldo_projetado":number}, "12m":{"cenario":"string","saldo_projetado":number}, "24m":{"cenario":"string","saldo_projetado":number} }, "alertas_criticos":["string"], "oportunidades":["string"] }`;

            const response = await window.brain.execute({
                userPrompt: JSON.stringify(payload),
                systemPrompt: systemInstruction,
                responseFormat: 'json'
            });

            if (!response.success) throw new Error(response.message || "IA_ERROR");

            this.lastAIResult = response.data;
            this.renderAIBlocks(response.data, payload);
            
            document.getElementById('fo-ai-last-updated').innerText = `Última análise: ${new Date().toLocaleString('pt-BR')}`;
        } catch (err) {
            console.error("AI Analysis Failed:", err);
            alert("Ocorreu um erro na análise: " + err.message);
            initial.classList.remove('hidden');
            results.classList.add('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText.replace('Gerar', 'Atualizar');
        }
    }

    showAISkeletons() {
        const ids = ['fo-ai-diagnosis', 'fo-ai-score-comment', 'fo-ai-bottlenecks', 'fo-ai-suggestions', 'fo-ai-opportunities', 'fo-ai-proj-scenario', 'fo-ai-proj-value'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = '<div class="fo-ai-skeleton" style="height:20px; width:100%;"></div>';
        });
    }

    renderAIBlocks(data, payload) {
        if (!data || !payload) return;

        // Block A: Health Score
        const scoreRing = document.getElementById('fo-ai-score-container');
        const scoreComment = document.getElementById('fo-ai-score-comment');
        const score = typeof payload.health_score === 'number' ? payload.health_score : 0;

        if (scoreRing) {
            scoreRing.innerText = score;
            scoreRing.className = 'fo-ai-score-ring ' + (score < 50 ? 'low' : (score < 75 ? 'medium' : 'high'));
        }
        if (scoreComment) scoreComment.innerText = data.score_comentario || 'Análise de saúde concluída.';

        // Block B: Diagnosis
        const diagEl = document.getElementById('fo-ai-diagnosis');
        if (diagEl) diagEl.innerText = data.diagnostico || 'Não foi possível gerar um diagnóstico detalhado no momento.';

        // Block C: Critical Alerts
        const alertsCont = document.getElementById('fo-ai-alerts');
        if (alertsCont) {
            alertsCont.innerHTML = '';
            (data.alertas_criticos || []).forEach(msg => {
                alertsCont.innerHTML += `<div class="fo-alert danger" style="margin-bottom: 10px;"><i class="fas fa-exclamation-triangle"></i> ${msg}</div>`;
            });
        }

        // Block D: Bottlenecks
        const bottleCont = document.getElementById('fo-ai-bottlenecks');
        if (bottleCont) {
            bottleCont.innerHTML = '';
            const gargalos = data.gargalos || [];
            if (gargalos.length === 0) bottleCont.innerHTML = '<div class="text-secondary">Nenhum gargalo crítico identificado.</div>';
            gargalos.forEach(item => {
                const impacto = (item.impacto || 'medio').toLowerCase();
                bottleCont.innerHTML += `
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:600; color:#fff;">${item.titulo || 'Gargalo'}</span>
                            <span class="fo-ai-impact ${impacto}">${impacto}</span>
                        </div>
                        <div class="text-secondary" style="font-size:0.8rem;">${item.descricao || ''}</div>
                    </div>
                `;
            });
        }

        // Block E: Projections
        this.updateProjectionDisplay('3m');

        // Block F: Suggestions
        const suggCont = document.getElementById('fo-ai-suggestions');
        if (suggCont) {
            suggCont.innerHTML = '';
            const sugestoes = data.sugestoes || [];
            if (sugestoes.length === 0) suggCont.innerHTML = '<div class="text-secondary">Continue com sua estratégia atual.</div>';
            sugestoes.forEach(item => {
                const prazo = (item.prazo || 'curto').toLowerCase();
                const prazoClass = prazo === 'imediato' ? 'alto' : (prazo === 'curto' ? 'medio' : 'baixo');
                suggCont.innerHTML += `
                    <div style="border-left: 2px solid var(--gold-primary); padding-left: 12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:500; font-family:var(--font-display);">${item.acao || 'Ação Sugerida'}</span>
                            <span class="fo-ai-impact ${prazoClass}">${prazo}</span>
                        </div>
                        <div style="font-size:0.75rem; color:var(--accent-color); margin-top:4px;">Economia estimada: ${window.formatBRL(item.economia_estimada || 0)}</div>
                    </div>
                `;
            });
        }

        // Block G: Opportunities
        const oppCont = document.getElementById('fo-ai-opportunities');
        if (oppCont) {
            oppCont.innerHTML = '';
            const oportunidades = data.oportunidades || [];
            if (oportunidades.length === 0) oppCont.innerHTML = '<div class="text-secondary">Mantenha seus ativos sob vigilância.</div>';
            oportunidades.forEach(item => {
                oppCont.innerHTML += `
                    <div style="display:flex; gap:10px; align-items:flex-start;">
                        <i class="fas fa-check-circle" style="color:#22c55e; margin-top:3px;"></i>
                        <div style="font-size:0.85rem;">${item}</div>
                    </div>
                `;
            });
        }
    }

    updateProjectionDisplay(horizon) {
        if (!this.lastAIResult || !this.lastAIResult.projecoes) return;
        const proj = this.lastAIResult.projecoes[horizon];
        if (!proj) return;

        const scenEl = document.getElementById('fo-ai-proj-scenario');
        const valEl = document.getElementById('fo-ai-proj-value');
        
        scenEl.innerText = proj.cenario;
        valEl.innerText = window.formatBRL(proj.saldo_projetado);
        valEl.style.color = proj.saldo_projetado >= 0 ? 'var(--gold-200)' : '#f87171';
    }

    async handleAIChat() {
        const input = document.getElementById('fo-ai-chat-input');
        const cont = document.getElementById('fo-ai-chat-messages');
        const btn = document.getElementById('fo-ai-chat-send');
        const question = input?.value.trim();

        if (!question || !window.brain) return;

        // User message
        cont.innerHTML += `<div class="fo-ai-msg user">${question}</div>`;
        input.value = '';
        cont.scrollTop = cont.scrollHeight;

        // Loading bubble
        const loadId = 'ai-load-' + Date.now();
        cont.innerHTML += `<div class="fo-ai-msg ai" id="${loadId}"><i class="fas fa-ellipsis-h fa-beat"></i></div>`;
        cont.scrollTop = cont.scrollHeight;

        try {
            // Get conversation history
            const messages = Array.from(cont.querySelectorAll('.fo-ai-msg')).map(m => ({
                role: m.classList.contains('user') ? 'user' : 'model',
                text: m.innerText
            })).slice(-10); // Last 10 exchanges

            const response = await window.brain.execute({
                userPrompt: `Contexto do Patrimônio: ${JSON.stringify(this.lastAIPayload || {})}\n\nÚltima Análise: ${JSON.stringify(this.lastAIResult || {})}\n\nPergunta do Usuário: ${question}`,
                systemPrompt: "Você é um consultor financeiro executivo. Responda à dúvida do usuário com base nos dados fornecidos de forma clara, técnica e direta. Não use markdown exagerado.",
                responseFormat: 'text'
            });

            document.getElementById(loadId).innerText = response.data || "Desculpe, não consegui processar sua dúvida.";
        } catch (err) {
            document.getElementById(loadId).innerText = "Erro ao conectar com o consultor.";
        }
        cont.scrollTop = cont.scrollHeight;
    }
    // --- REPORTS LOGIC (DYNAMIC INJECTION) ---

    ensureReportsUI() {
        if (document.getElementById('reports-view')) return;

        // 1. Inject Menu Item if not present
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu && !document.querySelector('[data-page="reports"]')) {
            const reportLink = document.createElement('a');
            reportLink.href = 'javascript:void(0)';
            reportLink.className = 'nav-item';
            reportLink.setAttribute('data-page', 'reports');
            reportLink.innerHTML = '<i class="fas fa-file-invoice-dollar"></i><span>Relatórios</span>';
            
            // Insert after cashflow if possible
            const cfLink = navMenu.querySelector('[data-page="cashflow"]');
            if (cfLink) cfLink.after(reportLink);
            else navMenu.appendChild(reportLink);

            // Re-bind click event
            reportLink.addEventListener('click', () => {
                window.location.hash = 'reports';
                this.renderActivePage();
            });
        }

        // 2. Inject View Container
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
            const reportsView = document.createElement('div');
            reportsView.id = 'reports-view';
            reportsView.className = 'hidden';
            reportsView.innerHTML = `
                <div class="fo-header-row">
                    <div class="fo-view-header">
                        <h2 class="view-title">Relatórios Mensais</h2>
                        <p class="view-subtitle">Visibilidade de gastos por categoria e subcategoria.</p>
                    </div>
                    <div class="fo-month-selector glass">
                        <button class="nav-btn" id="reports-prev-month"><i class="fas fa-chevron-left"></i></button>
                        <span id="current-reports-month">---</span>
                        <button class="nav-btn" id="reports-next-month"><i class="fas fa-chevron-right"></i></button>
                        <button class="nav-btn" onclick="app.renderReportsView()" title="Atualizar dados" style="margin-left: 10px; border-left: 1px solid var(--glass-border); padding-left: 10px;">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="fo-metrics" id="reports-metrics"></div>
                <div class="fo-reports-grid" id="fo-reports-container"></div>
            `;
            pageContent.appendChild(reportsView);

            // Re-assign in the class pages registry
            this.pages.reports = reportsView;

            // Bind month nav
            document.getElementById('reports-prev-month').onclick = () => this.changeReportsMonth(-1);
            document.getElementById('reports-next-month').onclick = () => this.changeReportsMonth(1);
        }
    }

    changeReportsMonth(dir) {
        const [y, m] = this.currentViewedMonth.split('-').map(Number);
        const d = new Date(y, m - 1 + dir, 1);
        this.currentViewedMonth = window.getLocalISODate(d).substring(0, 7);
        this.renderReportsView();
    }

    async renderReportsView() {
        this.ensureReportsUI();

        // Update Month UI
        const monthElem = document.getElementById('current-reports-month');
        if (monthElem) {
            const [y, m] = this.currentViewedMonth.split('-').map(Number);
            const d = new Date(y, m - 1, 1);
            monthElem.textContent = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
        }

        try {
            // 1. Get Local Store Data (Ground Truth for what the user sees)
            const localData = store.getData();
            const localCashflow = localData.cashflow || [];
            const localCards = localData.cardTransactions || [];

            // 2. Fetch Latest from Supabase (to merge any new remote changes)
            // We'll use a broader range to avoid strict date filter issues
            const [cfRes, cardRes] = await Promise.all([
                fetch(`${SB_TABLE}`, { headers: SB_HEADERS }),
                fetch(`${CARD_TX_TABLE}`, { headers: SB_HEADERS })
            ]).catch(err => {
                console.warn('Silent fetch error, falling back to local store:', err);
                return [null, null];
            });

            let remoteCashflow = cfRes ? await cfRes.json() : [];
            let remoteCards = cardRes ? await cardRes.json() : [];

            // Merge and Deduplicate (simple id check)
            const merge = (local, remote) => {
                const ids = new Set(local.map(i => i.id));
                const merged = [...local];
                if (Array.isArray(remote)) {
                    remote.forEach(r => { if (!ids.has(r.id)) merged.push(r); });
                }
                return merged;
            };

            const allCashflow = merge(localCashflow, remoteCashflow);
            const allCards = merge(localCards, remoteCards);

            // Grouping Logic
            const reportData = {};
            let totalExpenses = 0;

            const process = (items) => {
                items.forEach(item => {
                    if (!item.date) return;
                    
                    // Normalize Month
                    const rowMonth = FamilyOfficeStore.normalizeMonth(item.date);
                    if (rowMonth !== this.currentViewedMonth) return;

                    const amount = window.parseBRL(item.amount);
                    if (amount <= 0 || item.type === 'income') return;

                    totalExpenses += amount;
                    const cat = item.category || 'OUTROS';
                    const sub = item.subcategory || 'Diversos';

                    if (!reportData[cat]) reportData[cat] = { total: 0, subs: {} };
                    reportData[cat].total += amount;
                    reportData[cat].subs[sub] = (reportData[cat].subs[sub] || 0) + amount;
                });
            };

            process(allCashflow);
            process(allCards);

            // Render Metrics
            const metricsContainer = document.getElementById('reports-metrics');
            if (metricsContainer) {
                metricsContainer.innerHTML = `
                    <div class="fo-metric glass">
                        <div class="fo-metric-label">GASTO TOTAL NO MÊS</div>
                        <div class="fo-metric-value">${totalExpenses.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                        <div class="fo-metric-sub">Consolidado (${allCashflow.length + allCards.length} registros analisados)</div>
                    </div>
                `;
            }

            // Render Accordion
            const container = document.getElementById('fo-reports-container');
            if (container) {
                if (Object.keys(reportData).length === 0) {
                    container.innerHTML = `
                        <div style="color:var(--gold-200); text-align:center; padding: 60px 20px; border: 1px dashed var(--glass-border); border-radius: var(--radius-lg); background: rgba(0,0,0,0.2);">
                            <i class="fas fa-receipt" style="font-size: 32px; margin-bottom: 15px; opacity: 0.5;"></i>
                            <div style="font-size: 14px; letter-spacing: 0.05em;">Nenhum gasto registrado para o período de ${monthElem.textContent}.</div>
                        </div>`;
                    return;
                }

                container.innerHTML = Object.entries(reportData)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([cat, data], idx) => {
                        const subRows = Object.entries(data.subs)
                            .sort((a, b) => b[1] - a[1])
                            .map(([sub, val]) => `
                                <div class="fo-report-sub-row">
                                    <span>${sub}</span>
                                    <span>${val.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                </div>
                            `).join('');

                        return `
                        <div class="fo-report-cat-item glass">
                            <div class="fo-report-cat-header" onclick="this.closest('.fo-report-cat-item').classList.toggle('expanded')">
                                <span class="fo-report-cat-name"><i class="fas fa-chevron-right"></i> ${cat}</span>
                                <span class="fo-report-cat-total">${data.total.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                            </div>
                            <div class="fo-report-sub-list">
                                ${subRows}
                            </div>
                        </div>
                        `;
                    }).join('');
            }

        } catch (err) {
            console.error('Reports processing error:', err);
        }
    }
}

// Initialize App — aguarda login + carregamento do Supabase
window.initApp = async function() {
    await window.store.loadFromSupabase();
    if (!window.app) {
        window.app = new FamilyOfficeApp();
    } else {
        window.app.renderActivePage();
    }
    // Verifica fechamento de cartões (gera fatura pendente se for o dia de fechamento)
    await window.app.checkCardClosings();
};

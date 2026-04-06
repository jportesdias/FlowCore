/**
 * FamilyOfficeStore - Supabase-first persistence
 * Interface pública idêntica à versão localStorage — app.js não precisa mudar.
 */
class FamilyOfficeStore {
    constructor() {
        this.DB_KEY = 'family_office_data';
        this._cache = null; // cache em memória
        this._ready = false;
        // SB config — herdado do app.js via globals
        this.SB_URL = 'https://lruqphwlcimzcqpafjrn.supabase.co';
        this.SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxydXFwaHdsY2ltemNxcGFmanJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTI2ODcsImV4cCI6MjA5MDQ4ODY4N30.uPEAdV2rKcZ7SuXC6A_KH3Ili6fq72ytsReRZEXijWQ';
    }

    /* ─── HELPERS INTERNOS ─────────────────────────────────── */

    get _uid() { return window.FO_USER_ID || null; }

    get _baseHeaders() {
        const token = window.AUTH_TOKEN || this.SB_KEY;
        return {
            'apikey': this.SB_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    async _get(table, params = '') {
        const uid = this._uid;
        const userFilter = uid && uid !== 'admin-local' ? `user_id=eq.${uid}&` : '';
        const url = `${this.SB_URL}/rest/v1/${table}?${userFilter}${params}`;
        const r = await fetch(url, { headers: this._baseHeaders, cache: 'no-store' });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }

    async _post(table, payload) {
        const uid = this._uid;
        const data = Array.isArray(payload)
            ? payload.map(p => uid && uid !== 'admin-local' ? { ...p, user_id: uid } : p)
            : (uid && uid !== 'admin-local' ? { ...payload, user_id: uid } : payload);
        const r = await fetch(`${this.SB_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: { ...this._baseHeaders, 'Prefer': 'resolution=merge-duplicates,return=representation' },
            body: JSON.stringify(data)
        });
        if (!r.ok) {
            const errText = await r.text();
            console.error(`[store._post] ${table} falhou:`, errText);
            throw new Error(errText);
        }
        return r.json();
    }

    async _patch(table, id, payload) {
        const r = await fetch(`${this.SB_URL}/rest/v1/${table}?id=eq.${id}`, {
            method: 'PATCH',
            headers: { ...this._baseHeaders, 'Prefer': 'return=representation' },
            body: JSON.stringify(payload)
        });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }

    async _delete(table, id) {
        const r = await fetch(`${this.SB_URL}/rest/v1/${table}?id=eq.${id}`, {
            method: 'DELETE',
            headers: this._baseHeaders
        });
        if (!r.ok) throw new Error(await r.text());
    }

    _genId(prefix = '') {
        return prefix + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2));
    }

    _normalizeDate(d) {
        if (!d) return new Date().toISOString().split('T')[0];
        let s = d.toString().trim();
        if (s.includes('T')) s = s.split('T')[0];
        s = s.replace(/\//g, '-');
        const parts = s.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
            if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }
        return s;
    }

    static normalizeMonth(dateInput) {
        if (!dateInput) return '';
        const s = String(dateInput).trim();
        const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})/);
        if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}`;
        const brMatch = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}`;
        const d = new Date(s);
        if (!isNaN(d.getTime())) return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        return '';
    }

    /* ─── INIT / LOAD ──────────────────────────────────────── */

    init() {
        // Carregado via loadFromSupabase() após login — init é no-op aqui
        if (!this._cache) {
            this._cache = this._emptyData();
        }
    }

    _emptyData() {
        return {
            cashflow: [], assets: [], goals: [], investments: [],
            recurring: [], cards: [], cardTransactions: [],
            categories: [
                { id: 'CUSTO_DE_VIDA',              name: 'Custo de Vida',              color: '#F87171', icon: 'fa-home' },
                { id: 'DIVIDAS_E_OBRIGACOES',        name: 'Dívidas e Obrigações',       color: '#94A3B8', icon: 'fa-credit-card' },
                { id: 'ESTILO_DE_VIDA',              name: 'Estilo de Vida',             color: '#D4AF37', icon: 'fa-glass-cheers' },
                { id: 'INVESTIMENTOS_E_PATRIMONIO',  name: 'Investimentos e Patrimônio', color: '#22C55E', icon: 'fa-chart-line' },
                { id: 'RESERVAS_E_SEGURANCA',        name: 'Reservas e Segurança',       color: '#38BDF8', icon: 'fa-shield-alt' }
            ],
            config: { theme: 'dark', currency: 'BRL' },
            aiConfig: { provider: 'gemini', providers: { gemini: { enabled: true, apiKey: '', model: null }, openai: { enabled: false, apiKey: '', model: 'gpt-4o' } } },
            marketIndices: { cdi: 11.15, selic: 11.25, ipca: 4.50, last_updated: new Date().toISOString() },
            history: []
        };
    }

    async loadFromSupabase() {
        console.log('[store] Carregando dados do Supabase...');
        try {
            const [cashflow, assets, goals, investments] = await Promise.all([
                this._get('cash_flow_entries', 'order=date.desc').catch(() => []),
                this._get('assets', 'order=created_at.desc').catch(() => []),
                this._get('goals', 'order=created_at.desc').catch(() => []),
                this._get('investments', 'order=created_at.desc').catch(() => [])
            ]);

            const base = this._emptyData();

            // Mapeia campos do Supabase para o formato interno
            base.cashflow = (cashflow || []).map(r => ({
                id: r.id, date: r.date, description: r.description,
                amount: parseFloat(r.amount) || 0, type: r.type,
                category: r.category, subcategory: r.subcategory,
                notes: r.notes, status: r.status, origin: r.origin,
                account: r.account, source: r.source
            }));

            base.assets = (assets || []).map(r => ({
                id: r.id,
                assetType:             r.asset_type    || r.type,
                assetName:             r.asset_name    || r.name,
                acquisitionDate:       r.acquisition_date || r.purchase_date,
                acquisitionValue:      parseFloat(r.acquisition_value  || r.purchase_price) || 0,
                currentEstimatedValue: parseFloat(r.current_estimated_value || r.value) || 0,
                valuationStatus:  r.valuation_status,
                valuationPercent: parseFloat(r.valuation_percent) || 0,
                valuationAnalysis: r.valuation_analysis,
                manufacturer: r.manufacturer, model: r.model,
                version: r.version, modelYear: r.model_year,
                municipality: r.municipality, state: r.state, notes: r.notes,
                created_at: r.created_at
            }));

            base.goals = (goals || []).map(r => ({
                id: r.id, name: r.name, target: parseFloat(r.target) || 0,
                current: parseFloat(r.current) || 0, deadline: r.deadline, notes: r.notes
            }));

            base.investments = (investments || []).map(r => ({
                id: r.id, institution: r.institution, investmentName: r.investment_name,
                allocatedValue: parseFloat(r.allocated_value) || 0,
                benchmarkIndex: r.benchmark_index, benchmarkPercentage: parseFloat(r.benchmark_percentage) || 0,
                startDate: r.start_date,
                history: Array.isArray(r.history) ? r.history : (r.history ? JSON.parse(r.history) : []),
                contributionHistory: Array.isArray(r.contribution_history) ? r.contribution_history : (r.contribution_history ? JSON.parse(r.contribution_history) : [])
            }));

            // Preserva config local (tema, chave AI)
            const local = localStorage.getItem(this.DB_KEY);
            if (local) {
                try {
                    const parsed = JSON.parse(local);
                    if (parsed.aiConfig) base.aiConfig = parsed.aiConfig;
                    if (parsed.config)   base.config   = parsed.config;
                    if (parsed.marketIndices) base.marketIndices = parsed.marketIndices;
                } catch(e) {}
            }

            this._cache = base;
            this._ready = true;
            console.log(`[store] Carregado: ${base.cashflow.length} lançamentos, ${base.assets.length} ativos, ${base.goals.length} metas`);
            window.dispatchEvent(new CustomEvent('dataChanged'));
        } catch(e) {
            console.error('[store] Erro ao carregar do Supabase:', e);
            // Fallback: tenta localStorage
            const local = localStorage.getItem(this.DB_KEY);
            if (local) {
                try { this._cache = JSON.parse(local); this._ready = true; } catch(ex) {}
            }
            if (!this._cache) this._cache = this._emptyData();
        }
    }

    /* ─── getData / save (compatibilidade) ─────────────────── */

    getData() {
        return this._cache || this._emptyData();
    }

    save(data, allowScopeCollapse = false) {
        // Atualiza cache em memória
        this._cache = data;
        // Persiste config local (tema, AI key)
        try {
            const local = { aiConfig: data.aiConfig, config: data.config, marketIndices: data.marketIndices };
            localStorage.setItem(this.DB_KEY, JSON.stringify(local));
        } catch(e) {}
    }

    /* ─── CASHFLOW ──────────────────────────────────────────── */

    getCashflow() { return this.getData().cashflow || []; }

    getMonthlyCashflow(monthStr) {
        const target = FamilyOfficeStore.normalizeMonth(monthStr);
        return this.getCashflow().filter(c => FamilyOfficeStore.normalizeMonth(c.date) === target);
    }

    addCashflow(entry) {
        entry.id = entry.id || this._genId();
        entry.date = this._normalizeDate(entry.date);
        if (typeof entry.amount === 'string') {
            entry.amount = parseFloat(entry.amount.replace(/\./g,'').replace(',','.')) || 0;
        }
        entry.amount = parseFloat(entry.amount) || 0;
        entry.type = entry.type || 'expense';

        // Atualiza cache
        this._cache.cashflow = [entry, ...(this._cache.cashflow || [])];
        window.dispatchEvent(new CustomEvent('dataChanged'));

        // Persiste no Supabase
        this._post('cash_flow_entries', {
            id: entry.id, date: entry.date, description: entry.description,
            amount: entry.amount, type: entry.type, category: entry.category,
            subcategory: entry.subcategory, notes: entry.notes,
            status: entry.status || 'posted', origin: entry.origin || 'desktop',
            account: entry.account, source: entry.source
        }).catch(e => console.error('[store] addCashflow falhou:', e));
    }

    addCashflowBatch(entries) {
        const normalized = entries.map((entry, i) => {
            entry.id = entry.id || this._genId();
            entry.date = this._normalizeDate(entry.date);
            if (typeof entry.amount === 'string') {
                entry.amount = parseFloat(entry.amount.replace(/\./g,'').replace(',','.')) || 0;
            }
            entry.amount = parseFloat(entry.amount) || 0;
            entry.type = entry.type || 'expense';
            return entry;
        });

        this._cache.cashflow = [...normalized, ...(this._cache.cashflow || [])];
        window.dispatchEvent(new CustomEvent('dataChanged'));

        const rows = normalized.map(entry => ({
            id: entry.id, date: entry.date, description: entry.description,
            amount: entry.amount, type: entry.type, category: entry.category,
            subcategory: entry.subcategory, notes: entry.notes,
            status: entry.status || 'posted', origin: entry.origin || 'desktop',
            account: entry.account, source: entry.source
        }));
        this._post('cash_flow_entries', rows)
            .catch(e => console.error('[store] addCashflowBatch falhou:', e));
    }

    updateCashflow(id, updatedFields) {
        const idx = (this._cache.cashflow || []).findIndex(c => c.id === id);
        if (idx === -1) return false;

        const allowed = ['date', 'description', 'amount', 'category', 'subcategory', 'type'];
        allowed.forEach(field => {
            if (updatedFields[field] !== undefined) {
                let val = updatedFields[field];
                if (field === 'amount') {
                    if (typeof val === 'string') val = parseFloat(val.replace(/\./g,'').replace(',','.')) || 0;
                    val = parseFloat(val) || 0;
                }
                this._cache.cashflow[idx][field] = val;
            }
        });

        window.dispatchEvent(new CustomEvent('dataChanged'));

        const patch = {};
        allowed.forEach(f => { if (updatedFields[f] !== undefined) patch[f] = updatedFields[f]; });
        this._patch('cash_flow_entries', id, patch)
            .catch(e => console.error('[store] updateCashflow falhou:', e));
        return true;
    }

    deleteCashflow(id) {
        this._cache.cashflow = (this._cache.cashflow || []).filter(c => c.id !== id);
        window.dispatchEvent(new CustomEvent('dataChanged'));
        this._delete('cash_flow_entries', id)
            .catch(e => console.error('[store] deleteCashflow falhou:', e));
    }

    checkMonthlyArchive() { /* no-op — Supabase não precisa */ }

    /* ─── ASSETS ────────────────────────────────────────────── */

    getAssets() { return this.getData().assets || []; }

    addAsset(entry) {
        entry.id = entry.id || this._genId('asset_');
        entry.created_at = entry.created_at || new Date().toISOString();
        entry.acquisitionValue = parseFloat(entry.acquisitionValue) || 0;
        entry.currentEstimatedValue = parseFloat(entry.currentEstimatedValue) || 0;
        entry.valuationPercent = parseFloat(entry.valuationPercent) || 0;

        this._cache.assets = [...(this._cache.assets || []), entry];
        window.dispatchEvent(new CustomEvent('dataChanged'));

        this._post('assets', {
            id: entry.id,
            name: entry.assetName, asset_name: entry.assetName,
            type: entry.assetType, asset_type: entry.assetType,
            purchase_date: entry.acquisitionDate || null, acquisition_date: entry.acquisitionDate || null,
            purchase_price: entry.acquisitionValue, acquisition_value: entry.acquisitionValue,
            value: entry.currentEstimatedValue, current_estimated_value: entry.currentEstimatedValue,
            valuation_status: entry.valuationStatus, valuation_percent: entry.valuationPercent,
            valuation_analysis: entry.valuationAnalysis, manufacturer: entry.manufacturer,
            model: entry.model, version: entry.version, model_year: entry.modelYear,
            municipality: entry.municipality, state: entry.state, notes: entry.notes,
            created_at: entry.created_at
        }).catch(e => console.error('[store] addAsset falhou:', e));
    }

    updateAsset(id, fields) {
        const idx = (this._cache.assets || []).findIndex(a => a.id === id);
        if (idx === -1) return false;

        const allowed = ['assetType','assetName','acquisitionDate','acquisitionValue',
            'currentEstimatedValue','valuationStatus','valuationPercent','valuationAnalysis',
            'manufacturer','model','version','modelYear','municipality','state'];
        allowed.forEach(field => {
            if (fields[field] !== undefined) this._cache.assets[idx][field] = fields[field];
        });

        window.dispatchEvent(new CustomEvent('dataChanged'));

        this._patch('assets', id, {
            asset_type: fields.assetType, asset_name: fields.assetName, name: fields.assetName,
            acquisition_date: fields.acquisitionDate || null,
            acquisition_value: fields.acquisitionValue,
            current_estimated_value: fields.currentEstimatedValue,
            valuation_status: fields.valuationStatus, valuation_percent: fields.valuationPercent,
            valuation_analysis: fields.valuationAnalysis, manufacturer: fields.manufacturer,
            model: fields.model, version: fields.version, model_year: fields.modelYear,
            municipality: fields.municipality, state: fields.state
        }).catch(e => console.error('[store] updateAsset falhou:', e));
        return true;
    }

    deleteAsset(id) {
        this._cache.assets = (this._cache.assets || []).filter(a => a.id !== id);
        window.dispatchEvent(new CustomEvent('dataChanged'));
        this._delete('assets', id).catch(e => console.error('[store] deleteAsset falhou:', e));
    }

    calculateAssetDashboardMetrics(assets) {
        if (!assets || assets.length === 0) return { totalInvestedValue:0, totalEstimatedValue:0, totalDifference:0, totalVariationPercent:0 };
        let totalInvested = 0, totalEstimated = 0;
        assets.forEach(a => {
            totalInvested  += parseFloat(a.acquisitionValue) || 0;
            totalEstimated += parseFloat(a.currentEstimatedValue) || 0;
        });
        const totalDifference = totalEstimated - totalInvested;
        const totalVariationPercent = totalInvested > 0 ? (totalDifference / totalInvested) * 100 : 0;
        return { totalInvestedValue: totalInvested, totalEstimatedValue: totalEstimated, totalDifference, totalVariationPercent };
    }

    /* ─── GOALS ─────────────────────────────────────────────── */

    getGoals() { return this.getData().goals || []; }

    addGoal(goal) {
        goal.id = goal.id || this._genId('g_');
        goal.created_at = goal.created_at || new Date().toISOString();
        this._cache.goals = [...(this._cache.goals || []), goal];
        window.dispatchEvent(new CustomEvent('dataChanged'));
        this._post('goals', {
            id: goal.id, name: goal.name,
            target: parseFloat(goal.target) || 0,
            current: parseFloat(goal.current) || 0,
            deadline: goal.deadline || null, notes: goal.notes || null,
            created_at: goal.created_at
        }).catch(e => console.error('[store] addGoal falhou:', e));
    }

    /* ─── INVESTMENTS ───────────────────────────────────────── */

    getInvestments() { return this.getData().investments || []; }

    addInvestment(entry) {
        entry.id = entry.id || this._genId('inv_');
        entry.created_at = entry.created_at || new Date().toISOString();
        entry.history = entry.history || [];
        this._cache.investments = [...(this._cache.investments || []), entry];
        window.dispatchEvent(new CustomEvent('dataChanged'));
        this._post('investments', {
            id: entry.id, institution: entry.institution, investment_name: entry.investmentName,
            allocated_value: parseFloat(entry.allocatedValue) || 0,
            benchmark_index: entry.benchmarkIndex, benchmark_percentage: parseFloat(entry.benchmarkPercentage) || 0,
            start_date: entry.startDate || null, history: JSON.stringify(entry.history || []),
            contribution_history: JSON.stringify(entry.contributionHistory || []),
            created_at: entry.created_at
        }).catch(e => console.error('[store] addInvestment falhou:', e));
    }

    updateInvestment(id, fields) {
        const idx = (this._cache.investments || []).findIndex(inv => inv.id === id);
        if (idx === -1) return false;
        const allowed = ['institution','investmentName','benchmarkIndex','benchmarkPercentage','startDate'];
        allowed.forEach(field => {
            if (fields[field] !== undefined) {
                let val = fields[field];
                if (field === 'benchmarkPercentage') val = parseFloat(val) || 0;
                if (field === 'benchmarkIndex') val = val.toUpperCase();
                this._cache.investments[idx][field] = val;
            }
        });
        window.dispatchEvent(new CustomEvent('dataChanged'));
        this._patch('investments', id, {
            institution: fields.institution, investment_name: fields.investmentName,
            benchmark_index: fields.benchmarkIndex,
            benchmark_percentage: parseFloat(fields.benchmarkPercentage) || 0,
            start_date: fields.startDate || null
        }).catch(e => console.error('[store] updateInvestment falhou:', e));
        return true;
    }

    withdrawInvestment(id, principalAmount, netAmount, date) {
        const idx = (this._cache.investments || []).findIndex(inv => inv.id === id);
        if (idx === -1) return false;
        const inv = this._cache.investments[idx];
        inv.allocatedValue = (parseFloat(inv.allocatedValue) - parseFloat(principalAmount)).toFixed(2);
        if (!inv.history) inv.history = [];
        inv.history.push({ date, amount: parseFloat(netAmount), type: 'withdraw' });

        const cashflowEntry = {
            id: this._genId('resgate_'), date,
            description: `Resgate Investimento (Líquido): ${inv.investmentName || inv.institution}`,
            amount: parseFloat(netAmount), type: 'income',
            category: 'INVESTIMENTOS_E_PATRIMONIO', subcategory: 'resgate', source: 'investment_module'
        };
        this.addCashflow(cashflowEntry);

        this._patch('investments', id, {
            allocated_value: parseFloat(inv.allocatedValue),
            history: JSON.stringify(inv.history)
        }).catch(e => console.error('[store] withdrawInvestment falhou:', e));
        return true;
    }

    addInvestmentContribution(id, amount, date) {
        const idx = (this._cache.investments || []).findIndex(inv => inv.id === id);
        if (idx === -1) return false;
        const inv = this._cache.investments[idx];
        inv.allocatedValue = parseFloat(inv.allocatedValue) + parseFloat(amount);
        if (!inv.contributionHistory) inv.contributionHistory = [];
        inv.contributionHistory.push({ date, amount, type: 'contribution' });

        const cashflowEntry = {
            id: this._genId('aporte_'), date,
            description: `Aporte Investimento: ${inv.investmentName || inv.institution}`,
            amount: parseFloat(amount), type: 'expense',
            category: 'INVESTIMENTOS_E_PATRIMONIO', subcategory: 'investimento', source: 'investment_contribution'
        };
        this.addCashflow(cashflowEntry);

        this._patch('investments', id, {
            allocated_value: inv.allocatedValue,
            contribution_history: JSON.stringify(inv.contributionHistory)
        }).catch(e => console.error('[store] addInvestmentContribution falhou:', e));
        return true;
    }

    /* ─── CARDS (já estão no Supabase — mantém compatibilidade) */

    getCards()            { return this.getData().cards || []; }
    getCardTransactions() { return this.getData().cardTransactions || []; }

    saveCard(card) {
        const data = this.getData();
        if (!data.cards) data.cards = [];
        if (!card.id) {
            card.id = this._genId();
            data.cards.push(card);
        } else {
            const idx = data.cards.findIndex(c => c.id === card.id);
            if (idx !== -1) data.cards[idx] = { ...data.cards[idx], ...card };
            else data.cards.push(card);
        }
        this._cache = data;
        window.dispatchEvent(new CustomEvent('dataChanged'));
    }

    deleteCard(id) {
        const data = this.getData();
        data.cards = (data.cards || []).filter(c => c.id !== id);
        data.cardTransactions = (data.cardTransactions || []).filter(tx => tx.card_id !== id);
        this._cache = data;
        window.dispatchEvent(new CustomEvent('dataChanged'));
    }

    saveCardTransaction(tx) {
        const data = this.getData();
        if (!data.cardTransactions) data.cardTransactions = [];
        if (!tx.id) {
            tx.id = this._genId();
            data.cardTransactions.push(tx);
        } else {
            const idx = data.cardTransactions.findIndex(t => t.id === tx.id);
            if (idx !== -1) data.cardTransactions[idx] = { ...data.cardTransactions[idx], ...tx };
            else data.cardTransactions.push(tx);
        }
        this._cache = data;
        window.dispatchEvent(new CustomEvent('dataChanged'));
    }

    deleteCardTransaction(id) {
        const data = this.getData();
        data.cardTransactions = (data.cardTransactions || []).filter(tx => tx.id !== id);
        this._cache = data;
        window.dispatchEvent(new CustomEvent('dataChanged'));
    }

    /* ─── RECURRING (legacy — mantém compatibilidade) ─────── */

    getRecurring() { return this.getData().recurring || []; }

    addRecurring(item) {
        item.id = Date.now().toString();
        item.remaining = item.installments ? parseInt(item.installments) : null;
        item.current_installment = 1;
        const data = this.getData();
        data.recurring.push(item);
        this._cache = data;
    }

    useRecurring(id) {
        const data = this.getData();
        const item = data.recurring.find(r => r.id === id);
        if (item && item.remaining !== null) {
            item.current_installment++;
            item.remaining--;
            if (item.remaining <= 0) data.recurring = data.recurring.filter(r => r.id !== id);
        }
        this._cache = data;
    }

    deleteRecurring(id) {
        const data = this.getData();
        data.recurring = data.recurring.filter(r => r.id !== id);
        this._cache = data;
    }

    /* ─── CATEGORIAS ────────────────────────────────────────── */

    getCategories() { return this.getData().categories || []; }

    /* ─── AI CONFIG (local) ─────────────────────────────────── */

    getAIConfig()      { return this.getData().aiConfig; }
    saveAIConfig(cfg)  { this._cache.aiConfig = cfg; this.save(this._cache); }
    getApiKey()        { const c = this.getAIConfig(); return c?.providers?.[c.provider]?.apiKey || ''; }
    saveApiKey(key)    {
        const data = this.getData();
        const p = data.aiConfig.provider;
        if (data.aiConfig.providers[p]) {
            data.aiConfig.providers[p].apiKey = key;
            data.aiConfig.providers[p].enabled = true;
            this._cache = data;
            this.save(data);
        }
    }

    /* ─── MARKET INDICES (local) ────────────────────────────── */

    getMarketIndices()       { return this.getData().marketIndices || {}; }
    updateMarketIndices(idx) {
        this._cache.marketIndices = { ...idx, last_updated: new Date().toISOString() };
        this.save(this._cache);
    }

    /* ─── SUMMARY ───────────────────────────────────────────── */

    getSummary() {
        const assets = this.getAssets();
        const totalNetWorth = assets.reduce((s, a) => s + (parseFloat(a.currentEstimatedValue) || 0), 0);
        const totalInvested = assets.reduce((s, a) => s + (parseFloat(a.acquisitionValue) || 0), 0);
        return {
            totalNetWorth, totalInvested,
            liquidity: totalNetWorth * 0.1,
            passiveIncome: totalNetWorth * 0.005
        };
    }

    /* ─── IMAGE DEDUP (local) ───────────────────────────────── */

    isImageProcessed(fp) {
        const data = this.getData();
        return (data.processed_images || []).includes(fp);
    }

    markImageProcessed(fp) {
        const data = this.getData();
        if (!data.processed_images) data.processed_images = [];
        if (!data.processed_images.includes(fp)) {
            data.processed_images.push(fp);
            if (data.processed_images.length > 50) data.processed_images.shift();
            this._cache = data;
        }
    }

    /* ─── IMPORT (migração histórica) ──────────────────────── */

    async importFromJSON(jsonData) {
        const uid = this._uid;
        if (!uid) throw new Error('Usuário não autenticado');

        const results = { cashflow: 0, assets: 0, goals: 0, investments: 0, errors: [] };

        // Cashflow — apenas colunas existentes na tabela
        if (jsonData.cashflow?.length) {
            const rows = jsonData.cashflow.map(e => ({
                id: e.id || this._genId(),
                date: this._normalizeDate(e.date),
                description: e.description,
                amount: parseFloat(e.amount) || 0,
                type: e.type || 'expense',
                category: e.category || null,
                subcategory: e.subcategory || null,
                source: e.source || null,
                notes: e.notes || null,
                status: e.status || 'posted',
                origin: e.origin || 'desktop',
                account: e.account || null,
                user_id: uid !== 'admin-local' ? uid : undefined
            }));
            // Envia em lotes de 100
            for (let i = 0; i < rows.length; i += 100) {
                try {
                    await this._post('cash_flow_entries', rows.slice(i, i + 100));
                    results.cashflow += Math.min(100, rows.length - i);
                } catch(e) { results.errors.push(`cashflow lote ${i}: ${e.message}`); }
            }
        }

        // Assets
        if (jsonData.assets?.length) {
            for (const a of jsonData.assets) {
                try {
                    await this._post('assets', {
                        id: a.id || this._genId('asset_'), asset_type: a.assetType || a.asset_type,
                        asset_name: a.assetName || a.asset_name || a.name, name: a.assetName || a.name,
                        acquisition_date: a.acquisitionDate || null,
                        acquisition_value: parseFloat(a.acquisitionValue || a.acquisition_value) || 0,
                        current_estimated_value: parseFloat(a.currentEstimatedValue || a.current_estimated_value || a.current_value) || 0,
                        valuation_status: a.valuationStatus, valuation_percent: parseFloat(a.valuationPercent) || 0,
                        notes: a.notes, created_at: a.created_at || new Date().toISOString(),
                        user_id: uid !== 'admin-local' ? uid : undefined
                    });
                    results.assets++;
                } catch(e) { results.errors.push(`asset ${a.id}: ${e.message}`); }
            }
        }

        // Goals
        if (jsonData.goals?.length) {
            for (const g of jsonData.goals) {
                try {
                    await this._post('goals', {
                        id: g.id || this._genId('g_'), name: g.name,
                        target: parseFloat(g.target) || 0, current: parseFloat(g.current) || 0,
                        deadline: g.deadline || null, notes: g.notes || null,
                        created_at: g.created_at || new Date().toISOString(),
                        user_id: uid !== 'admin-local' ? uid : undefined
                    });
                    results.goals++;
                } catch(e) { results.errors.push(`goal ${g.id}: ${e.message}`); }
            }
        }

        // Recarrega cache após import
        await this.loadFromSupabase();
        return results;
    }

    // Stubs de compatibilidade
    repairDates()              { /* no-op */ }
    migrateData()              { /* no-op */ }
    discoverAndMergeLegacyData() { /* no-op */ }
    cleanupBackups()           { /* no-op */ }
    bootstrapInitialData()     { /* no-op */ }
    addCashflowBatch(entries)  {
        entries.forEach(e => this.addCashflow(e));
    }
}

// Inicializa instância global
window.store = new FamilyOfficeStore();
window.store.init();

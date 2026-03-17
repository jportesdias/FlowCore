// ============================================================
//  Evergreen Log book — Seed Data (Offshore Demo)
//  All data stored in localStorage. Keys: ph_tags, ph_events,
//  ph_activities, ph_inspections, ph_materials, ph_systems,
//  ph_notes, ph_alerts, ph_media
// ============================================================

const SEED_TAGS = [
  // --- 10 METROLOGY & FISCAL TAGS ---
  { id: 'tag-fc-101', platform_id: 'plat-flowcore', tag_code: 'FT-1101', name: 'Gas Export Meter A', system: 'Gas Custody Transfer', location: 'Skid 01 - Main Deck', type: 'Meter', status: 'ok', notes: 'Ultrasonic 6-path Daniel meter. Serial: 24-001.' },
  { id: 'tag-fc-102', platform_id: 'plat-flowcore', tag_code: 'FT-1102', name: 'Gas Export Meter B', system: 'Gas Custody Transfer', location: 'Skid 01 - Main Deck', type: 'Meter', status: 'ok', notes: 'Ultrasonic 6-path Daniel meter. Serial: 24-002.' },
  { id: 'tag-fc-103', platform_id: 'plat-flowcore', tag_code: 'FT-2101', name: 'Oil Export Coriolis A', system: 'Oil Custody Transfer', location: 'Skid 02 - Lower Deck', type: 'Meter', status: 'ok', notes: 'MicroMotion CMF400. Serial: MM-8821.' },
  { id: 'tag-fc-104', platform_id: 'plat-flowcore', tag_code: 'FT-2102', name: 'Oil Export Coriolis B', system: 'Oil Custody Transfer', location: 'Skid 02 - Lower Deck', type: 'Meter', status: 'ok', notes: 'MicroMotion CMF400. Serial: MM-8822.' },
  { id: 'tag-fc-105', platform_id: 'plat-flowcore', tag_code: 'AT-1101', name: 'Gas Chromatograph', system: 'Gas Analysis', location: 'Skid 01 - Analyzer Room', type: 'Analyzer', status: 'ok', notes: 'Rosemount 700XA. C6+ analysis.' },
  { id: 'tag-fc-106', platform_id: 'plat-flowcore', tag_code: 'DS-2101', name: 'Oil Density Meter', system: 'Oil Analysis', location: 'Skid 02 - Analyzer Room', type: 'Analyzer', status: 'ok', notes: 'Sarasota PD3000.' },
  { id: 'tag-fc-107', platform_id: 'plat-flowcore', tag_code: 'FT-3001', name: 'Fuel Gas Meter', system: 'Fuel Gas', location: 'Module M05', type: 'Meter', status: 'ok', notes: 'Turbine meter for turbine consumption.' },
  { id: 'tag-fc-108', platform_id: 'plat-flowcore', tag_code: 'FT-4001', name: 'Flare Gas Meter', system: 'Flare', location: 'Flare Deck', type: 'Meter', status: 'ok', notes: 'Fluenta Ultrasonic flare meter.' },
  { id: 'tag-fc-109', platform_id: 'plat-flowcore', tag_code: 'ST-5001', name: 'Automatic Sampler', system: 'Oil Sampling', location: 'Offloading Skids', type: 'Sampler', status: 'ok', notes: 'Jiskoot controlled sampler unit.' },
  { id: 'tag-fc-110', platform_id: 'plat-flowcore', tag_code: '30XX001', name: 'Compact Prover FC', system: 'Proproving System', location: 'Metering Skid', type: 'Prover', status: 'ok', notes: 'Main calibration standard for liquid meters.', is_available: true },

  // --- 10 PROCESS & INSTRUMENTATION TAGS ---
  { id: 'tag-fc-111', platform_id: 'plat-flowcore', tag_code: 'PT-1101A', name: 'Header Pressure A', system: 'Gas Export', location: 'Skid 01', type: 'Instrument', status: 'ok' },
  { id: 'tag-fc-112', platform_id: 'plat-flowcore', tag_code: 'PT-1101B', name: 'Header Pressure B', system: 'Gas Export', location: 'Skid 01', type: 'Instrument', status: 'ok' },
  { id: 'tag-fc-113', platform_id: 'plat-flowcore', tag_code: 'TT-1101A', name: 'Header Temp A', system: 'Gas Export', location: 'Skid 01', type: 'Instrument', status: 'ok' },
  { id: 'tag-fc-114', platform_id: 'plat-flowcore', tag_code: 'TT-1101B', name: 'Header Temp B', system: 'Gas Export', location: 'Skid 01', type: 'Instrument', status: 'ok' },
  { id: 'tag-fc-115', platform_id: 'plat-flowcore', tag_code: 'PT-2101A', name: 'Oil Pressure A', system: 'Oil Export', location: 'Skid 02', type: 'Instrument', status: 'ok' },
  { id: 'tag-fc-116', platform_id: 'plat-flowcore', tag_code: 'TT-2101A', name: 'Oil Temp A', system: 'Oil Export', location: 'Skid 02', type: 'Instrument', status: 'ok' },
  { id: 'tag-fc-117', platform_id: 'plat-flowcore', tag_code: 'PDT-1101', name: 'Filter Diff Pressure', system: 'Gas Intake', location: 'Skid 01', type: 'Instrument', status: 'ok' },
  { id: 'tag-fc-118', platform_id: 'plat-flowcore', tag_code: 'LT-2001', name: 'Separator Level', system: 'Separation', location: 'M01 1st Level', type: 'Instrument', status: 'ok' },
  { id: 'tag-fc-119', platform_id: 'plat-flowcore', tag_code: 'PIT-3001', name: 'Tank Pressure', system: 'Storage', location: 'Hull Tank 4', type: 'Instrument', status: 'ok' },
  { id: 'tag-fc-120', platform_id: 'plat-flowcore', tag_code: 'ZT-901', name: 'SDV Position', system: 'Safety', location: 'Riser Balcony', type: 'Instrument', status: 'ok' },

  // --- 5 WELL TAGS ---
  { id: 'tag-fc-121', platform_id: 'plat-flowcore', tag_code: 'WELL-P01', name: 'Production Well South', system: 'Production', location: 'Subsea Cluster 1', type: 'Well', status: 'ok' },
  { id: 'tag-fc-122', platform_id: 'plat-flowcore', tag_code: 'WELL-P02', name: 'Production Well North', system: 'Production', location: 'Subsea Cluster 1', type: 'Well', status: 'ok' },
  { id: 'tag-fc-123', platform_id: 'plat-flowcore', tag_code: 'WELL-I01', name: 'Water Injector Alpha', system: 'Injection', location: 'Subsea Cluster 2', type: 'Well', status: 'ok' },
  { id: 'tag-fc-124', platform_id: 'plat-flowcore', tag_code: 'WELL-I02', name: 'Gas Injector Beta', system: 'Injection', location: 'Subsea Cluster 2', type: 'Well', status: 'ok' },
  { id: 'tag-fc-125', platform_id: 'plat-flowcore', tag_code: 'WELL-P03', name: 'Production Well East', system: 'Production', location: 'Subsea Cluster 3', type: 'Well', status: 'ok' },

  // --- 5 VALVES & CONTROL TAGS ---
  { id: 'tag-fc-126', platform_id: 'plat-flowcore', tag_code: 'FC-1101', name: 'Flow Computer Gas', system: 'Gas Metering', location: 'CCR Central', type: 'Flow Computer', status: 'ok' },
  { id: 'tag-fc-127', platform_id: 'plat-flowcore', tag_code: 'FC-2101', name: 'Flow Computer Oil', system: 'Oil Metering', location: 'CCR Central', type: 'Flow Computer', status: 'ok' },
  { id: 'tag-fc-128', platform_id: 'plat-flowcore', tag_code: 'SDV-9001', name: 'Main Inlet SDV', system: 'Safety', location: 'Riser Inlet', type: 'Valve', status: 'ok' },
  { id: 'tag-fc-129', platform_id: 'plat-flowcore', tag_code: 'BDV-1001', name: 'Flare Blowdown Valve', system: 'Safety', location: 'Flare Bridge', type: 'Valve', status: 'ok' },
  { id: 'tag-fc-130', platform_id: 'plat-flowcore', tag_code: 'SIS-001', name: 'Safety Logic Solver', system: 'SIS', location: 'Telecom Room', type: 'Electronic', status: 'ok' },

  // --- PROTECTED ATLANTA DATA ---
  { 
    id: 'tag-prover-001', 
    platform_id: 'plat-atlanta', 
    tag_code: '30XX001', 
    name: 'Compact Prover', 
    system: 'Proving System', 
    location: 'Offloading Skid', 
    type: 'Prover', 
    status: 'ok', 
    notes: 'Technical specification for offloading verification.',
    avg_volume: '454 272 mL',
    repeatability: '0,014%',
    uncertainty: '209 mL / 0,046%',
    last_vendor: 'ODS',
    last_calibration: '2026-02-05',
    calibration_interval: '36',
    deadline: '2029-02-05',
    is_available: true
  },
];

const SEED_EVENTS = [];

const SEED_ACTIVITIES = [];
const SEED_INSPECTIONS = [];
const SEED_MATERIALS = [];
const SEED_SYSTEMS = [];
const SEED_NOTES = [];
const SEED_ALERTS = [];

const SEED_PLATFORMS = [
  { id: 'plat-atlanta', name: 'FPSO Atlanta', type: 'FPSO', basin: 'Santos Basin', operator: 'Enauta', active: true },
  { id: 'plat-flowcore', name: 'FPSO FlowCore Solutions', type: 'FPSO', basin: 'Santos Basin', operator: 'FlowCore', active: true },
];

// ---- Seed Users ----
const SEED_USERS = [
  { id: 'user-admin', name: 'Administrator', username: 'admin', password: 'xxptoTT33//jcfd', role: 'Admin', module: 'all', platforms: ['plat-atlanta', 'plat-flowcore'], created_at: new Date().toISOString() },
  { id: 'user-supervisor', name: 'Production Supervisor', username: 'supervisor', password: 'supervisor123', role: 'Supervisor', module: 'supervisor', platforms: ['plat-atlanta', 'plat-flowcore'], created_at: new Date().toISOString() },
];

const SEED_SUBSYSTEMS = [
  { id: 'sub-gas-001', platform_id: 'plat-flowcore', parent_system: 'Gas', name: 'HP Fuel Gas', status: 'ok', description: 'High pressure fuel gas system for main turbines.', tags: ['21-FG-101', '21-FG-102'] },
  { id: 'sub-gas-002', platform_id: 'plat-flowcore', parent_system: 'Gas', name: 'LP Fuel Gas', status: 'ok', description: 'Low pressure fuel gas for boiler and auxiliary systems.', tags: ['21-FG-201'] },
  { id: 'sub-gas-003', platform_id: 'plat-flowcore', parent_system: 'Gas', name: 'Flare System', status: 'minor-issue', description: 'HP and LP flare headers and knock-out drums.', tags: ['flare-01'] },
  { id: 'sub-gas-004', platform_id: 'plat-flowcore', parent_system: 'Gas', name: 'VRU Compressor', status: 'ok', description: 'Vapor Recovery Unit for low pressure stabilization.', tags: ['K-501', 'K-502'] },
  { id: 'sub-gas-005', platform_id: 'plat-flowcore', parent_system: 'Gas', name: 'HP Compressor', status: 'ok', description: 'Main export gas compression train.', tags: ['K-101A/B', 'K-201'] },
];

// ---- LocalStorage helpers ----
const KEYS = {
  tags: 'ph_tags',
  events: 'ph_events',
  activities: 'ph_activities',
  inspections: 'ph_inspections',
  materials: 'ph_materials',
  systems: 'ph_systems',
  notes: 'ph_notes',
  alerts: 'ph_alerts',
  media: 'ph_media',
  orifice_plates: 'ph_orifice_plates',
  embarkations: 'ph_embarkations',
  user: 'ph_user',
  users: 'ph_users',
  platforms: 'ph_platforms',
  activePlatform: 'ph_active_platform',
  seeded: 'ph_seeded_v20', // v2.00: Evergreen Pro Demo Reconstruction
  calibrations: 'ph_calibrations',
  crew: 'ph_crew',
  personnel: 'ph_personnel',
  vacations: 'ph_vacations',
  subsystems: 'ph_subsystems',
};

// Sandbox storage for GUEST mode (memory only)
const SEED_ORIFICE_PLATES = [
  { id: 'op-fc-001', platform_id: 'plat-flowcore', tag_code: '21-FE-601', serial_number: 'OP-23441', system: 'Gas Flare HP', material: 'SS316', inner_diameter: '154.22 mm', thickness: '6.35 mm', beta: '0.6022', op_mode: 'Duty', status: 'ok', last_inspection: '2025-01-15', deadline: '2026-01-15', notes: 'Edge integrity confirmed. No pitting.' },
  { id: 'op-fc-002', platform_id: 'plat-flowcore', tag_code: '21-FE-602', serial_number: 'OP-23442', system: 'Gas Flare LP', material: 'SS316', inner_diameter: '154.22 mm', thickness: '6.35 mm', beta: '0.6022', op_mode: 'Duty', status: 'minor-wear', last_inspection: '2024-11-10', deadline: '2025-11-10', notes: 'Slight discoloration on downstream face. Measured within tolerance.' },
  { id: 'op-fc-003', platform_id: 'plat-flowcore', tag_code: '45-FE-001', serial_number: 'OP-9981', system: 'Fuel Gas Skid', material: 'Monel 400', inner_diameter: '42.10 mm', thickness: '3.18 mm', beta: '0.4501', op_mode: 'Idle', status: 'ok', last_inspection: '2025-02-20', deadline: '2026-02-20', notes: 'Spare plate in storage. Greased.' },
  { id: 'op-fc-004', platform_id: 'plat-flowcore', tag_code: '45-FE-002', serial_number: 'OP-9982', system: 'Fuel Gas Skid', material: 'Monel 400', inner_diameter: '42.10 mm', thickness: '3.18 mm', beta: '0.4501', op_mode: 'Duty', status: 'ok', last_inspection: '2025-03-01', deadline: '2026-03-01', notes: 'Installed during last turnaround.' },
  { id: 'op-fc-005', platform_id: 'plat-flowcore', tag_code: '77-FE-001', serial_number: 'OP-8811', system: 'Test Separator Gas', material: 'SS316', inner_diameter: '80.00 mm', thickness: '4.00 mm', beta: '0.5500', op_mode: 'Duty', status: 'ok', last_inspection: '2025-01-05', deadline: '2026-01-05', notes: 'Checked against ISO 5167 specs.' },
];

let GUEST_SESSIONS = {
  tags: [],
  events: [],
  activities: [],
  inspections: [],
  materials: [],
  systems: [],
  notes: [],
  alerts: [],
  orifice_plates: [],
  calibrations: [],
};

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('ph_user')); } catch { return null; }
}

// ---- Backup & Export (JSON) ----
// ---- Backup & Export (JSON) ----
function exportDatabase() {
    console.log('📦 Iniciando exportação do banco de dados...');
    try {
        const backup = {};
        if (typeof KEYS === 'undefined') {
            console.error('❌ KEYS não está definido!');
            if (window.toast) toast('Erro interno: KEYS indefinido.', 'error');
            return;
        }

        Object.values(KEYS).forEach(lsKey => {
            const data = localStorage.getItem(lsKey);
            if (data) {
                try {
                    backup[lsKey] = JSON.parse(data);
                } catch (e) {
                    console.warn(`⚠️ Dado em ${lsKey} não é JSON válido, salvando como texto.`);
                    backup[lsKey] = data;
                }
            }
        });
        
        const json = JSON.stringify(backup, null, 2);
        console.log(`✅ JSON gerado (${json.length} bytes). Preparando download...`);

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `evergreen_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        
        console.log('🖱️ Disparando clique de download...');
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log('🧹 Cleanup concluído.');
        }, 500);
        
        if (window.toast) toast('Arquivo de backup gerado!', 'success');
    } catch (err) {
        console.error('❌ Erro crítico na exportação:', err);
        if (window.toast) toast('Falha ao gerar exportação. Verifique o console (F12).', 'error');
    }
}

async function importDatabase(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (confirm('Isso substituirá todos os seus dados locais. Continuar?')) {
                    Object.entries(data).forEach(([lsKey, content]) => {
                        localStorage.setItem(lsKey, JSON.stringify(content));
                    });
                    
                    // AUTO-SYNC AFTER IMPORT: Crucial to make it global
                    if (window.toast) toast('Processando importação e sincronizando com a nuvem...', 'syncing');
                    await pushLocalToCloud();
                    
                    resolve(true);
                } else {
                    resolve(false);
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsText(file);
    });
}

// ---- Data Shielding (Blindagem) ----
function createLocalSnapshot() {
    try {
        const snapshot = {};
        Object.values(KEYS).forEach(k => {
            const data = localStorage.getItem(k);
            if (data) snapshot[k] = data;
        });
        localStorage.setItem('evergreen_backup_snapshot', JSON.stringify(snapshot));
        localStorage.setItem('evergreen_backup_date', new Date().toISOString());
        console.log('🛡️ Snapshot local criado com sucesso. Seus dados estão protegidos.');
    } catch (e) {
        console.error('❌ Falha ao criar snapshot local:', e);
    }
}

function restoreLocalSnapshot() {
    const raw = localStorage.getItem('evergreen_backup_snapshot');
    if (!raw) return alert('Nenhum backup encontrado.');
    if (!confirm('Deseja restaurar o backup local? Isso substituirá os dados atuais.')) return;
    
    const snapshot = JSON.parse(raw);
    Object.entries(snapshot).forEach(([k, v]) => {
        localStorage.setItem(k, v);
    });
    alert('Dados restaurados. A página será reiniciada.');
    location.reload();
}

// ---- Data Sync UI ----
// Environment Detection: Master Console (Local) vs Field Collector (Web)
function isMasterLocal() {
    const h = window.location.hostname;
    const p = window.location.protocol;
    return h === 'localhost' || h === '127.0.0.1' || p === 'file:';
}

function updateStatusUI(status) {
    const dot = document.getElementById('cloud-status-dot');
    const text = document.getElementById('cloud-status-text');
    if (!dot || !text) return;

    // Remove existing animations
    dot.classList.remove('animate-pulse');

    switch (status) {
        case 'online':
            dot.className = 'w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
            text.innerText = 'Online';
            text.className = 'text-[10px] font-bold uppercase tracking-wider text-green-400';
            break;
        case 'syncing':
            dot.className = 'w-2 h-2 rounded-full bg-orange-400 animate-pulse';
            text.innerText = 'Sincronizando';
            text.className = 'text-[10px] font-bold uppercase tracking-wider text-orange-400';
            break;
        case 'offline':
        default:
            dot.className = 'w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
            text.innerText = 'Offline';
            text.className = 'text-[10px] font-bold uppercase tracking-wider text-red-400';
    }
}

function loadStore(key) {
  const stored = JSON.parse(localStorage.getItem(key)) || [];
  const user = getCurrentUser();

  if (user && user.isGuest) {
    // Map key to guest session section
    const section = Object.keys(KEYS).find(k => KEYS[k] === key);
    if (section && GUEST_SESSIONS[section]) {
      return [...GUEST_SESSIONS[section], ...stored];
    }
  }
  return stored;
}

function saveStore(key, data, delta = null) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    
    // --- COLLECTOR FLOW (WEB ONLY) ---
    // If we are on the web, we push changes automatically.
    // If we are on Local (Master), we wait for manual sync.
    if (!isMasterLocal()) {
        syncToCloud(key, delta || data);
    }
    
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.error('LocalStorage Quota Exceeded');
    }
    console.error('Storage error:', e);
    return false;
  }
}

// Background Cloud Sync - Pushes local changes to Supabase
async function syncToCloud(key, data) {
    if (!window.supabaseClient || !data) return;
    const user = getCurrentUser();

    // Map local keys to Supabase tables
    const tableMap = {
        [KEYS.events]: 'events',
        [KEYS.tags]: 'tags',
        [KEYS.activities]: 'activities',
        [KEYS.inspections]: 'inspections',
        [KEYS.materials]: 'materials',
        [KEYS.systems]: 'systems',
        [KEYS.notes]: 'notes',
        [KEYS.alerts]: 'alerts',
        [KEYS.orifice_plates]: 'orifice_plates',
        [KEYS.calibrations]: 'calibrations',
        [KEYS.embarkations]: 'embarkations',
        [KEYS.users]: 'users',
        [KEYS.platforms]: 'platforms'
    };

    const tableName = tableMap[key];
    if (!tableName) return;

    // --- SOBERANIA MASTER (ADMIN ONLY FOR STRUCTURAL TABLES) ---
    const structuralTables = ['tags', 'platforms', 'systems', 'orifice_plates', 'users'];
    if (structuralTables.includes(tableName)) {
        if (!user || user.role !== 'Admin') {
            console.warn(`🛡️ Bloqueio de Sincronização: Usuário ${user?.name || 'anônimo'} tentou alterar a Engenharia (Master).`);
            return;
        }
    }

    try {
        const rows = Array.isArray(data) ? data : [data];
        if (rows.length === 0) return;

        updateStatusUI('syncing');
        
        // Use upsert for delta sync
        const { error } = await window.supabaseClient
            .from(tableName)
            .upsert(rows, { onConflict: 'id' });

        if (error) {
            updateStatusUI('offline');
            console.error(`❌ Cloud Sync Error (${tableName}):`, error);
        } else {
            updateStatusUI('online');
        }
    } catch (e) {
        updateStatusUI('offline');
        console.error('❌ Cloud Sync Critical Failure:', e);
    }
}

// Global Delete Sync - Removes from Cloud if local is deleted (Admin Only)
async function syncDeleteToCloud(key, id) {
    if (!window.supabaseClient) return;
    const user = getCurrentUser();
    if (!user || user.role !== 'Admin') return; // Only Admins can modify the Master structure

    const tableMap = {
        [KEYS.events]: 'events',
        [KEYS.tags]: 'tags',
        [KEYS.activities]: 'activities',
        [KEYS.inspections]: 'inspections',
        [KEYS.materials]: 'materials',
        [KEYS.systems]: 'systems',
        [KEYS.notes]: 'notes',
        [KEYS.alerts]: 'alerts',
        [KEYS.orifice_plates]: 'orifice_plates',
        [KEYS.calibrations]: 'calibrations',
        [KEYS.embarkations]: 'embarkations'
    };

    const tableName = tableMap[key];
    if (!tableName) return;

    try {
        updateStatusUI('syncing');
        const { error } = await window.supabaseClient
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`❌ Cloud Delete Error (${tableName}):`, error);
        }
        updateStatusUI('online');
    } catch (e) {
        console.error('❌ Deletion Sync Failure:', e);
    }
}

// Pull Data from Cloud - Downloads all cloud records into LocalStorage
// Check Cloud Updates - Compares cloud state with local without applying
async function checkCloudUpdates() {
    if (!window.supabaseClient) return null;

    const tableMap = {
        'events': KEYS.events,
        'tags': KEYS.tags,
        'activities': KEYS.activities,
        'inspections': KEYS.inspections,
        'materials': KEYS.materials,
        'systems': KEYS.systems,
        'notes': KEYS.notes,
        'alerts': KEYS.alerts,
        'orifice_plates': KEYS.orifice_plates,
        'calibrations': KEYS.calibrations,
        'embarkations': KEYS.embarkations,
        'users': KEYS.users,
        'platforms': KEYS.platforms
    };

    console.log('🔍 Checking for cloud updates...');
    const pendingUpdates = {};
    let totalPending = 0;

    for (const [tableName, localKey] of Object.entries(tableMap)) {
        try {
            const { data, error } = await window.supabaseClient
                .from(tableName)
                .select('id, updated_at, created_at');

            if (error) throw error;

            if (data) {
                const localData = JSON.parse(localStorage.getItem(localKey)) || [];
                const localMap = new Map(localData.map(item => [item.id, item]));

                const tableUpdates = [];
                data.forEach(cloudRow => {
                    const localItem = localMap.get(cloudRow.id);
                    const cloudTime = new Date(cloudRow.updated_at || cloudRow.created_at || 0).getTime();
                    
                    if (!localItem) {
                        tableUpdates.push({ id: cloudRow.id, type: 'new' });
                    } else {
                        const localTime = new Date(localItem.updated_at || localItem.created_at || 0).getTime();
                        if (cloudTime > localTime) {
                            tableUpdates.push({ id: cloudRow.id, type: 'update' });
                        }
                    }
                });

                if (tableUpdates.length > 0) {
                    pendingUpdates[tableName] = tableUpdates;
                    totalPending += tableUpdates.length;
                }
            }
        } catch (e) {
            console.warn(`⚠️ Erro ao verificar tabela ${tableName}:`, e);
        }
    }

    updateStatusUI(totalPending > 0 ? 'syncing' : 'online');
    return totalPending > 0 ? pendingUpdates : null;
}

// Internal logic for pulling (moved from public to private-ish)
async function performPullSync() {
    if (!window.supabaseClient) return;

    const tableMap = {
        'events': KEYS.events, 'tags': KEYS.tags, 'activities': KEYS.activities,
        'inspections': KEYS.inspections, 'materials': KEYS.materials,
        'systems': KEYS.systems, 'notes': KEYS.notes, 'alerts': KEYS.alerts,
        'orifice_plates': KEYS.orifice_plates, 'calibrations': KEYS.calibrations,
        'embarkations': KEYS.embarkations, 'users': KEYS.users, 'platforms': KEYS.platforms
    };

    console.log('🔄 Executing Authorized Pull Sync...');
    for (const [tableName, localKey] of Object.entries(tableMap)) {
        try {
            const { data, error } = await window.supabaseClient.from(tableName).select('*');
            if (error) throw error;
            if (data) {
                const localData = JSON.parse(localStorage.getItem(localKey)) || [];
                const merged = [...localData];
                data.forEach(cloudRow => {
                    const idx = merged.findIndex(l => l.id === cloudRow.id);
                    if (idx >= 0) {
                        const localItem = merged[idx];
                        const cloudTime = new Date(cloudRow.updated_at || cloudRow.created_at || 0).getTime();
                        const localTime = new Date(localItem.updated_at || localItem.created_at || 0).getTime();
                        if (cloudTime >= localTime) merged[idx] = cloudRow;
                    } else {
                        merged.push(cloudRow);
                    }
                });
                localStorage.setItem(localKey, JSON.stringify(merged));
            }
        } catch (e) { console.error(`Sync error (${tableName}):`, e); }
    }
    updateStatusUI('online');
    if (window.refreshCurrentPage) window.refreshCurrentPage();
}

async function pullFromCloud() {
    // legacy wrapper, now calls performPullSync if user wants
    return performPullSync();
}

// --- END REALTIME LISTENERS ---

// Push Local Data to Cloud - Uploads all local records to Supabase
async function pushLocalToCloud() {
    if (!window.supabaseClient) {
        console.warn('Supabase não conectado.');
        return;
    }

    const tableMap = {
        [KEYS.events]: 'events',
        [KEYS.tags]: 'tags',
        [KEYS.activities]: 'activities',
        [KEYS.inspections]: 'inspections',
        [KEYS.materials]: 'materials',
        [KEYS.systems]: 'systems',
        [KEYS.notes]: 'notes',
        [KEYS.alerts]: 'alerts',
        [KEYS.orifice_plates]: 'orifice_plates',
        [KEYS.users]: 'users',
        [KEYS.platforms]: 'platforms'
    };

    const user = getCurrentUser();
    if (!user || user.role !== 'Admin') {
        console.warn('Push Master negado: Requer privilégios de Administrador.');
        return;
    }

    console.log('🚀 Executando Push Master para a Matrix...');
    updateStatusUI('syncing');
    
    let totalSynced = 0;
    for (const [localKey, tableName] of Object.entries(tableMap)) {
        const localData = JSON.parse(localStorage.getItem(localKey)) || [];
        if (localData.length > 0) {
            // Upsert all records (Engineers Master overwrites Cloud)
            const { error } = await window.supabaseClient
                .from(tableName)
                .upsert(localData, { onConflict: 'id' });
            
            if (error) console.error(`❌ Erro de Push em ${tableName}:`, error);
            else totalSynced += localData.length;
        }
    }
    
    console.log(`✅ Push Master concluído: ${totalSynced} registros atualizados na Matrix.`);
    updateStatusUI('online');
    return totalSynced;
}

// Real-time Cloud Listeners - DETECT ONLY (Master Local Flow)
function initRealtimeListeners() {
    if (!window.supabaseClient) return;

    const tables = ['events', 'tags', 'activities', 'inspections', 'materials', 'systems', 'notes', 'alerts', 'orifice_plates'];
    
    tables.forEach(table => {
        window.supabaseClient
            .channel(`realtime:${table}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: table }, payload => {
                console.log(`☁️ Cloud modification detected (${table}):`, payload.eventType);
                
                if (isMasterLocal()) {
                    // MASTER FLOW: Only notify, don't apply automatically
                    if (window.showSyncNotification) window.showSyncNotification();
                    updateStatusUI('syncing');
                } else {
                    // COLLECTOR FLOW: Apply immediately to keep web in sync
                    const localKey = Object.keys(KEYS).find(k => k === (table === 'orifice_plates' ? 'orifice_plates' : table));
                    const key = KEYS[localKey] || `ph_${table}`;
                    const localData = JSON.parse(localStorage.getItem(key)) || [];
                    let merged = [...localData];

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const idx = merged.findIndex(i => i.id === payload.new.id);
                        if (idx >= 0) merged[idx] = payload.new;
                        else merged.push(payload.new);
                    } else if (payload.eventType === 'DELETE') {
                        merged = merged.filter(i => i.id !== payload.old.id);
                    }

                    localStorage.setItem(key, JSON.stringify(merged));
                    if (window.refreshCurrentPage) window.refreshCurrentPage();
                }
            })
            .subscribe();
    });
}

function initSeed() {
  const latestV = '2.12'; // v2.12: Security Update (Admin Password)
  const currentV = localStorage.getItem(KEYS.seeded);
  
  if (currentV === latestV) return;

  console.log(`🚀 Initing Seed Evolution: ${currentV || 'INITIAL'} -> ${latestV}`);

  // FORCE CLEANUP OF OLD SYSTEMS LOGS (FlowCore only)
  if (currentV !== latestV) {
     const systems = loadStore(KEYS.systems);
     const cleaned = systems.filter(s => s.platform_id !== 'plat-flowcore' || (s.tag_id && !s.id.startsWith('sys-fc-')));
     saveStore(KEYS.systems, cleaned);
  }

  // Ensure Default accounts exist
  const users = loadStore(KEYS.users);
  let usersChanged = false;
  
  SEED_USERS.forEach(seedUser => {
    const existingIdx = users.findIndex(u => u.username === seedUser.username);
    if (existingIdx === -1) {
      users.push(seedUser);
      usersChanged = true;
    } else {
      // SECURITY PATCH: Force update admin password if it's the old default or if seed changed
      if (seedUser.username === 'admin' && users[existingIdx].password !== seedUser.password) {
        console.log('🔒 Security Patch: Updating Admin password to new standard.');
        users[existingIdx].password = seedUser.password;
        usersChanged = true;
      }
    }
  });
  
  if (usersChanged) {
    saveStore(KEYS.users, users);
  }

  // --- SURGICAL RESET (FlowCore ONLY) ---
  // We keep records from plat-atlanta or global (*), but reset plat-flowcore to the new Seed.
  const resetFlowCoreStore = (key, seedData) => {
    let current = loadStore(key);
    
    // Cloud Cleanup: If upgrading to 2.11, explicitly remove common demo IDs from Cloud
    if (currentV !== latestV && latestV === '2.11') {
        const demoPrefixes = ['evt-fc-', 'act-fc-', 'insp-fc-', 'mat-fc-', 'note-fc-', 'alert-fc-'];
        const itemsToDelete = current.filter(x => x.id && demoPrefixes.some(p => x.id.startsWith(p)));
        itemsToDelete.forEach(item => {
            // Use existing sync function (Admin only, but if user is not admin, it fails silently as expected)
            syncDeleteToCloud(key, item.id);
        });
    }

    // Keep Atlanta data
    // Keep Atlanta data
    const protectedData = current.filter(x => x && (x.platform_id === 'plat-atlanta' || x.platform_id === '*'));
    // Filter Seed data to ONLY include FlowCore items (preventing re-adding Atlanta items from seed)
    const filteredSeed = seedData.filter(x => x.platform_id === 'plat-flowcore' || x.platform_id === '*');
    const merged = [...protectedData, ...filteredSeed];
    saveStore(key, merged);
  };

  resetFlowCoreStore(KEYS.tags, SEED_TAGS);
  resetFlowCoreStore(KEYS.events, SEED_EVENTS);
  resetFlowCoreStore(KEYS.activities, SEED_ACTIVITIES);
  resetFlowCoreStore(KEYS.inspections, SEED_INSPECTIONS);
  resetFlowCoreStore(KEYS.materials, SEED_MATERIALS);
  resetFlowCoreStore(KEYS.systems, SEED_SYSTEMS);
  resetFlowCoreStore(KEYS.notes, SEED_NOTES);
  resetFlowCoreStore(KEYS.alerts, SEED_ALERTS);
  resetFlowCoreStore(KEYS.orifice_plates, SEED_ORIFICE_PLATES);
  resetFlowCoreStore(KEYS.subsystems, SEED_SUBSYSTEMS);

  // Post-process: Ensure Atlanta Excel tags are merged into the registry
  // Final deduplication for safety (Global)
  let currentTags = loadStore(KEYS.tags);
  let cleanTags = [];
  let seen = new Set();
  
  currentTags.forEach(t => {
    const key = `${t.tag_code}|${t.platform_id}`;
    if (!seen.has(key)) {
      cleanTags.push(t);
      seen.add(key);
    }
  });

  saveStore(KEYS.tags, cleanTags);
  localStorage.setItem(KEYS.seeded, latestV);
  console.log('✅ Surgical Seed Reconstruction Complete.');
}

// Data Migration Patch (v1.1) - Sync new field 'overhaul_comments' from Excel source if missing in localStorage

// Data Migration Patch (v1.1) - Sync new field 'overhaul_comments' from Excel source if missing in localStorage
function migrateData() {
  const tags = loadStore(KEYS.tags);
  let updated = false;

  if (typeof EXCEL_TAGS !== 'undefined') {
    EXCEL_TAGS.forEach(ext => {
      // Find ALL instances of this tag (in case of duplicates)
      const matches = tags.filter(t => t.tag_code === ext.tag_code);
      matches.forEach(match => {
        // Force overwrite if Excel has a comment and it's different from what's stored
        if (ext.overhaul_comments && match.overhaul_comments !== ext.overhaul_comments) {
          match.overhaul_comments = ext.overhaul_comments;
          updated = true;
        }
      });
    });
  }

  // Ensure Compact Prover 30XX001 exists
  if (!tags.some(t => t.tag_code === '30XX001')) {
    const active = window.DB?.getActivePlatform();
    tags.push({ 
      id: 'tag-prover-mig-' + Date.now(), 
      platform_id: active ? active.id : 'plat-atlanta', 
      tag_code: '30XX001', 
      name: 'Compact Prover', 
      system: 'Proving System', 
      location: 'Offloading Skid', 
      type: 'Prover', 
      status: 'ok', 
      notes: 'Technical specification for offloading verification.',
      avg_volume: '454 272 mL',
      repeatability: '0,014%',
      uncertainty: '209 mL / 0,046%',
      last_vendor: 'ODS',
      last_calibration: '2026-02-05',
      calibration_interval: '36',
      deadline: '2029-02-05',
      is_available: true,
      created_at: new Date().toISOString()
    });
    updated = true;
  }

  // Phase 125 Cleanup: Disabled to prevent data loss.
  // Root cause fixed via metadata inheritance.
  console.log('🛡️ Persistence Shield Active: No auto-cleanup performed.');

  if (updated) saveStore(KEYS.tags, tags);
}

window.genId = function(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

// Exposed as window.DB
window.DB = {
  // Tags
  getTags: () => {
    const active = window.DB.getActivePlatform();
    const all = loadStore(KEYS.tags);
    return active ? all.filter(x => x.platform_id === active.id) : all;
  },
  saveTag: (t) => {
    const user = getCurrentUser();
    if (user && user.isGuest) {
      const i = GUEST_SESSIONS.tags.findIndex(x => x.id === t.id);
      if (i >= 0) {
        GUEST_SESSIONS.tags[i] = { ...GUEST_SESSIONS.tags[i], ...t };
      } else if (t.id) {
        // Update to an existing SEED tag: store in sandbox with same ID
        GUEST_SESSIONS.tags.push({ ...t });
      } else {
        // Create a new tag: check limit
        if (GUEST_SESSIONS.tags.filter(x => !x.id.startsWith('tag-')).length >= 3) return { success: false, limitReached: true };
        GUEST_SESSIONS.tags.push({ ...t, id: 'demo-tag-' + Date.now(), platform_id: window.DB.getActivePlatform()?.id || null, created_at: new Date().toISOString() });
      }
      return { success: true };
    }

    const s = loadStore(KEYS.tags);
    const active = window.DB.getActivePlatform();
    const i = s.findIndex(x => x.id === t.id);
    if (i >= 0) {
      s[i] = { ...s[i], ...t };
    } else {
      s.push({ ...t, id: genId('tag'), platform_id: active ? active.id : null, created_at: new Date().toISOString() });
    }
    saveStore(KEYS.tags, s);
    return { success: true };
  },
  deleteTag: (id) => {
    syncDeleteToCloud(KEYS.tags, id);
    return saveStore(KEYS.tags, loadStore(KEYS.tags).filter(x => x.id !== id));
  },
  getTag: (id) => loadStore(KEYS.tags).find(x => x.id === id),

  // Events
  getEvents: () => {
    const active = window.DB.getActivePlatform();
    const user = getCurrentUser();
    const all = [...loadStore(KEYS.events), ...GUEST_SESSIONS.events];
    
    // Fallback: If no active platform is selected (or Admin), show all relevant
    if (!active || (user && user.role === 'Admin')) return all;
    
    return all.filter(x => {
        // Show if explicitly matches active platform OR has no platform_id (legacy/shared)
        return x.platform_id === active.id || !x.platform_id;
    });
  },
  saveEvent: (e) => {
    const user = getCurrentUser();
    if (user && user.isGuest) {
      const i = GUEST_SESSIONS.events.findIndex(x => x.id === e.id);
      if (i >= 0) {
        GUEST_SESSIONS.events[i] = { ...GUEST_SESSIONS.events[i], ...e, updated_at: new Date().toISOString() };
      } else if (e.id) {
        GUEST_SESSIONS.events.unshift({ ...e, updated_at: new Date().toISOString() });
      } else {
        if (GUEST_SESSIONS.events.filter(x => !x.id.startsWith('ev')).length >= 3) return { success: false, limitReached: true };
        const active = window.DB.getActivePlatform();
        GUEST_SESSIONS.events.unshift({
          ...e,
          id: 'demo-' + Date.now(),
          follow_ups: [],
          platform_id: active ? active.id : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      return { success: true };
    }

    const s = loadStore(KEYS.events);
    const active = window.DB.getActivePlatform();
    
    // Robustness: fallback to user's first platform if active is missing
    const pid = active ? active.id : (user && user.platforms ? user.platforms[0] : null);
    
    const i = s.findIndex(x => x.id === e.id);
    if (i >= 0) {
      s[i] = { ...s[i], ...e, updated_at: new Date().toISOString() };
    } else {
      s.unshift({
        ...e,
        id: genId('evt'),
        follow_ups: [],
        platform_id: pid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    saveStore(KEYS.events, s);
    return { success: true };
  },
  deleteEvent: (id) => {
    syncDeleteToCloud(KEYS.events, id);
    return saveStore(KEYS.events, loadStore(KEYS.events).filter(x => x.id !== id));
  },
  getEvent: (id) => loadStore(KEYS.events).find(x => x.id === id) || GUEST_SESSIONS.events.find(x => x.id === id),

  // Activities
  getActivities: () => {
    const active = window.DB.getActivePlatform();
    const all = [...loadStore(KEYS.activities), ...GUEST_SESSIONS.activities];
    if (!active) return all;
    return all.filter(x => x.platform_id === active.id || !x.platform_id);
  },
  saveActivity: (a) => {
    const user = getCurrentUser();
    if (user && user.isGuest) {
      const i = GUEST_SESSIONS.activities.findIndex(x => x.id === a.id);
      if (i >= 0) {
        GUEST_SESSIONS.activities[i] = { ...GUEST_SESSIONS.activities[i], ...a };
      } else if (a.id) {
        GUEST_SESSIONS.activities.unshift({ ...a });
      } else {
        if (GUEST_SESSIONS.activities.filter(x => !x.id.startsWith('act')).length >= 3) return { success: false, limitReached: true };
        const active = window.DB.getActivePlatform();
        GUEST_SESSIONS.activities.unshift({ ...a, id: 'demo-' + Date.now(), platform_id: active ? active.id : null, created_at: new Date().toISOString() });
      }
      return { success: true };
    }

    const s = loadStore(KEYS.activities);
    const active = window.DB.getActivePlatform();
    const i = s.findIndex(x => x.id === a.id);
    if (i >= 0) {
      s[i] = { ...s[i], ...a };
    } else {
      s.unshift({ 
        ...a, 
        id: genId('act'), 
        platform_id: active ? active.id : null, 
        created_at: new Date().toISOString() 
      });
    }
    saveStore(KEYS.activities, s);
    return { success: true };
  },
  deleteActivity: (id) => {
    syncDeleteToCloud(KEYS.activities, id);
    return saveStore(KEYS.activities, loadStore(KEYS.activities).filter(x => x.id !== id));
  },
  getActivity: (id) => loadStore(KEYS.activities).find(x => x.id === id) || GUEST_SESSIONS.activities.find(x => x.id === id),

  // Inspections
  getInspections: () => {
    const active = window.DB.getActivePlatform();
    const all = [...loadStore(KEYS.inspections), ...GUEST_SESSIONS.inspections];
    if (!active) return all;
    return all.filter(x => x.platform_id === active.id || !x.platform_id);
  },
  saveInspection: (insp) => {
    const user = getCurrentUser();
    if (user && user.isGuest) {
      if (GUEST_SESSIONS.inspections.length >= 3 && !insp.id) return { success: false, limitReached: true };
      const active = window.DB.getActivePlatform();
      const i = GUEST_SESSIONS.inspections.findIndex(x => x.id === insp.id);
      if (i >= 0) GUEST_SESSIONS.inspections[i] = { ...GUEST_SESSIONS.inspections[i], ...insp };
      else GUEST_SESSIONS.inspections.unshift({ ...insp, id: 'demo-' + Date.now(), platform_id: active ? active.id : null, created_at: new Date().toISOString() });
      return { success: true };
    }

    const s = loadStore(KEYS.inspections);
    const active = window.DB.getActivePlatform();
    const i = s.findIndex(x => x.id === insp.id);
    if (i >= 0) {
      s[i] = { ...s[i], ...insp };
    } else {
      s.unshift({ ...insp, id: genId('ins'), platform_id: active ? active.id : null, created_at: new Date().toISOString() });
    }
    saveStore(KEYS.inspections, s);
    return { success: true };
  },
  deleteInspection: (id) => {
    syncDeleteToCloud(KEYS.inspections, id);
    return saveStore(KEYS.inspections, loadStore(KEYS.inspections).filter(x => x.id !== id));
  },
  getInspection: (id) => loadStore(KEYS.inspections).find(x => x.id === id) || GUEST_SESSIONS.inspections.find(x => x.id === id),

  // Materials
  getMaterials: () => {
    const active = window.DB.getActivePlatform();
    const all = [...loadStore(KEYS.materials), ...GUEST_SESSIONS.materials];
    return active ? all.filter(x => x.platform_id === active.id) : all;
  },
  saveMaterial: (m) => {
    const user = getCurrentUser();
    if (user && user.isGuest) {
      if (GUEST_SESSIONS.materials.length >= 3 && !m.id) return { success: false, limitReached: true };
      const active = window.DB.getActivePlatform();
      const i = GUEST_SESSIONS.materials.findIndex(x => x.id === m.id);
      if (i >= 0) {
        GUEST_SESSIONS.materials[i] = { ...GUEST_SESSIONS.materials[i], ...m, updated_at: new Date().toISOString() };
      } else {
        GUEST_SESSIONS.materials.unshift({ ...m, id: 'demo-' + Date.now(), platform_id: active ? active.id : null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
      return { success: true };
    }

    const s = loadStore(KEYS.materials);
    const active = window.DB.getActivePlatform();
    const i = s.findIndex(x => x.id === m.id);
    const now = new Date().toISOString();

    // --- PHASE 73: Intelligent Movement Lifecycle ---
    if (!m.id && m.tag_id) {
       const existingMovements = s.filter(x => x.tag_id === m.tag_id);
       const tags = loadStore(KEYS.tags);
       const tag = tags.find(t => t.id === m.tag_id);

       if (existingMovements.length === 0) {
          // 1st Movement: If removed, go to Calibration
          if (tag && tag.installation_status === 'removed') {
             m.status = 'on-shore-calibration';
             // Generate intelligent note
             window.DB.saveNote({
                tag_id: tag.id,
                tag_code: tag.tag_code,
                note_type: 'calibration',
                system: tag.system,
                condition: 'On Shore Calibration',
                guidance: `Intelligent Trigger: Meter ${tag.tag_code} dispatched for onshore calibration (IFS: ${m.ifs_code || 'TBD'}).`
             });
          }
       } else if (existingMovements.length === 1) {
          // 2nd Movement: Return
          m.status = 'awaiting-installation';
          if (tag) {
             tag.installation_status = 'awaiting-installation';
             window.DB.saveTag(tag);
             // Generate intelligent note
             window.DB.saveNote({
                tag_id: tag.id,
                tag_code: tag.tag_code,
                note_type: 'maintenance',
                system: tag.system,
                condition: 'Ready for Install',
                guidance: `Intelligent Trigger: Meter ${tag.tag_code} returned from shore. Logistics status: Waiting Installation.`
             });
          }
       }
    }
    // ------------------------------------------------

    if (i >= 0) {
      s[i] = { ...s[i], ...m, updated_at: now };
    } else {
      s.unshift({ ...m, id: genId('mat'), platform_id: active ? active.id : null, created_at: now, updated_at: now });
    }
    saveStore(KEYS.materials, s);
    return { success: true };
  },
  deleteMaterial: (id) => {
    syncDeleteToCloud(KEYS.materials, id);
    return saveStore(KEYS.materials, loadStore(KEYS.materials).filter(x => x.id !== id));
  },
  getMaterial: (id) => loadStore(KEYS.materials).find(x => x.id === id) || GUEST_SESSIONS.materials.find(x => x.id === id),

  // Systems
  getSystems: () => {
    const active = window.DB.getActivePlatform();
    const all = [...loadStore(KEYS.systems), ...GUEST_SESSIONS.systems];
    if (!active) return all;
    return all.filter(x => x.platform_id === active.id || !x.platform_id);
  },
  saveSystem: (s_obj) => {
    const user = getCurrentUser();
    const active = window.DB.getActivePlatform();
    const now = new Date().toISOString();
    
    if (user && user.isGuest) {
      if (GUEST_SESSIONS.systems.length >= 3 && !s_obj.id) return { success: false, limitReached: true };
      const i = GUEST_SESSIONS.systems.findIndex(x => x.id === s_obj.id);
      if (i >= 0) {
        GUEST_SESSIONS.systems[i] = { ...GUEST_SESSIONS.systems[i], ...s_obj, updated_at: now };
      } else {
        GUEST_SESSIONS.systems.unshift({ 
          ...s_obj, 
          id: 'demo-' + Date.now(), 
          platform_id: active ? active.id : null, 
          created_at: now, 
          updated_at: now
        });
      }
      return { success: true };
    }

    const a = loadStore(KEYS.systems);
    const i = a.findIndex(x => x.id === s_obj.id);
    let finalItem;

    // SANITIZATION: Ensure only Supabase-compatible fields are sent/saved
    const cleanObj = {
      id: s_obj.id,
      platform_id: s_obj.platform_id || (active ? active.id : null),
      tag_id: s_obj.tag_id,
      tag_code: s_obj.tag_code,
      system_name: s_obj.system_name,
      manufacturer: s_obj.manufacturer,
      model: s_obj.model,
      firmware: s_obj.firmware,
      serial_number: s_obj.serial_number,
      expire_date: s_obj.expire_date,
      status: s_obj.status,
      notes: s_obj.notes,
      media: s_obj.media,
      created_at: s_obj.created_at || now,
      updated_at: now
    };

    if (i >= 0) {
      a[i] = { ...a[i], ...cleanObj };
      finalItem = a[i];
    } else {
      finalItem = { 
        ...cleanObj, 
        id: s_obj.id || genId('sys'), 
        created_at: now 
      };
      a.unshift(finalItem);
    }
    saveStore(KEYS.systems, a, finalItem);
    return { success: true };
  },
  deleteSystem: (id) => {
    syncDeleteToCloud(KEYS.systems, id);
    return saveStore(KEYS.systems, loadStore(KEYS.systems).filter(x => x.id !== id));
  },
  getSystem: (id) => loadStore(KEYS.systems).find(x => x.id === id) || GUEST_SESSIONS.systems.find(x => x.id === id),

  // Notes
  getNotes: () => {
    const active = window.DB.getActivePlatform();
    const all = [...loadStore(KEYS.notes), ...GUEST_SESSIONS.notes];
    if (!active) return all;
    return all.filter(x => x.platform_id === active.id || !x.platform_id);
  },
  saveNote: (n) => {
    const user = getCurrentUser();
    if (user && user.isGuest) {
      if (GUEST_SESSIONS.notes.length >= 3 && !n.id) return { success: false, limitReached: true };
      const active = window.DB.getActivePlatform();
      const i = GUEST_SESSIONS.notes.findIndex(x => x.id === n.id);
      if (i >= 0) GUEST_SESSIONS.notes[i] = { ...GUEST_SESSIONS.notes[i], ...n };
      else GUEST_SESSIONS.notes.unshift({ ...n, id: 'demo-' + Date.now(), platform_id: active ? active.id : null, created_at: new Date().toISOString() });
      return { success: true };
    }

    const s = loadStore(KEYS.notes);
    const active = window.DB.getActivePlatform();
    const i = s.findIndex(x => x.id === n.id);
    if (i >= 0) {
      s[i] = { ...s[i], ...n };
    } else {
      s.unshift({ ...n, id: genId('note'), platform_id: active ? active.id : null, created_at: new Date().toISOString() });
    }
    saveStore(KEYS.notes, s);
    return { success: true };
  },
  deleteNote: (id) => {
    syncDeleteToCloud(KEYS.notes, id);
    return saveStore(KEYS.notes, loadStore(KEYS.notes).filter(x => x.id !== id));
  },
  getNote: (id) => loadStore(KEYS.notes).find(x => x.id === id) || GUEST_SESSIONS.notes.find(x => x.id === id),

  // Alerts
  getAlerts: () => {
    const active = window.DB.getActivePlatform();
    const all = [...loadStore(KEYS.alerts), ...GUEST_SESSIONS.alerts];
    if (!active) return all;
    return all.filter(x => x.platform_id === active.id || !x.platform_id);
  },
  saveAlert: (a) => {
    const user = getCurrentUser();
    if (user && user.isGuest) {
      if (GUEST_SESSIONS.alerts.length >= 3 && !a.id) return { success: false, limitReached: true };
      const active = window.DB.getActivePlatform();
      const i = GUEST_SESSIONS.alerts.findIndex(x => x.id === a.id);
      if (i >= 0) GUEST_SESSIONS.alerts[i] = { ...GUEST_SESSIONS.alerts[i], ...a };
      else GUEST_SESSIONS.alerts.unshift({ ...a, id: 'demo-' + Date.now(), platform_id: active ? active.id : null, created_at: new Date().toISOString() });
      return { success: true };
    }

    const s = loadStore(KEYS.alerts);
    const active = window.DB.getActivePlatform();
    const i = s.findIndex(x => x.id === a.id);
    if (i >= 0) {
      s[i] = { ...s[i], ...a };
    } else {
      s.unshift({ ...a, id: genId('alert'), platform_id: active ? active.id : null, created_at: new Date().toISOString() });
    }
    saveStore(KEYS.alerts, s);
    return { success: true };
  },
  deleteAlert: (id) => {
    syncDeleteToCloud(KEYS.alerts, id);
    return saveStore(KEYS.alerts, loadStore(KEYS.alerts).filter(x => x.id !== id));
  },
  getAlert: (id) => loadStore(KEYS.alerts).find(x => x.id === id) || GUEST_SESSIONS.alerts.find(x => x.id === id),

  // Orifice Plates
  getOrificePlates: () => {
    const active = window.DB.getActivePlatform();
    const all = [...loadStore(KEYS.orifice_plates), ...GUEST_SESSIONS.orifice_plates];
    return active ? all.filter(x => x.platform_id === active.id) : all;
  },
  saveOrificePlate: (p) => {
    const user = getCurrentUser();
    const active = window.DB.getActivePlatform();
    if (user && user.isGuest) {
      if (GUEST_SESSIONS.orifice_plates.length >= 3 && !p.id) return { success: false, limitReached: true };
      const i = GUEST_SESSIONS.orifice_plates.findIndex(x => x.id === p.id);
      if (i >= 0) GUEST_SESSIONS.orifice_plates[i] = { ...GUEST_SESSIONS.orifice_plates[i], ...p };
      else GUEST_SESSIONS.orifice_plates.unshift({ ...p, id: 'demo-' + Date.now(), platform_id: active ? active.id : null, created_at: new Date().toISOString() });
      return { success: true };
    }

    const s = loadStore(KEYS.orifice_plates);
    const i = s.findIndex(x => x.id === p.id);
    if (i >= 0) {
      s[i] = { ...s[i], ...p };
    } else {
      s.unshift({ ...p, id: genId('op'), platform_id: active ? active.id : null, created_at: new Date().toISOString() });
    }
    saveStore(KEYS.orifice_plates, s);
    return { success: true };
  },
  deleteOrificePlate: (id) => {
    syncDeleteToCloud(KEYS.orifice_plates, id);
    return saveStore(KEYS.orifice_plates, loadStore(KEYS.orifice_plates).filter(x => x.id !== id));
  },
  getOrificePlate: (id) => loadStore(KEYS.orifice_plates).find(x => x.id === id) || GUEST_SESSIONS.orifice_plates.find(x => x.id === id),

  // Calibrations
  getCalibrations: () => {
    const active = window.DB.getActivePlatform();
    const all = [...loadStore(KEYS.calibrations), ...GUEST_SESSIONS.calibrations];
    return active ? all.filter(x => x.platform_id === active.id) : all;
  },
  saveCalibration: (c) => {
    const user = getCurrentUser();
    const active = window.DB.getActivePlatform();
    const now = new Date().toISOString();
    
    if (user && user.isGuest) {
      const i = GUEST_SESSIONS.calibrations.findIndex(x => x.id === c.id);
      if (i >= 0) GUEST_SESSIONS.calibrations[i] = { ...GUEST_SESSIONS.calibrations[i], ...c, updated_at: now };
      else GUEST_SESSIONS.calibrations.unshift({ ...c, id: 'demo-' + Date.now(), platform_id: active ? active.id : null, created_at: now, updated_at: now });
      return { success: true };
    }

    const s = loadStore(KEYS.calibrations);
    const i = s.findIndex(x => x.id === c.id);
    let finalItem;
    if (i >= 0) {
      s[i] = { ...s[i], ...c, updated_at: now };
      finalItem = s[i];
    } else {
      finalItem = { 
        ...c, 
        id: genId('cal'), 
        platform_id: active ? active.id : null, 
        created_at: now, 
        updated_at: now 
      };
      s.unshift(finalItem);
    }
    saveStore(KEYS.calibrations, s, finalItem);

    // Sync back to TAG
    if (c.tag_id) {
       const tags = loadStore(KEYS.tags);
       const tIdx = tags.findIndex(t => t.id === c.tag_id);
       if (tIdx >= 0) {
          tags[tIdx].last_calibration = c.calibration_date;
          tags[tIdx].deadline = c.deadline;
          if (c.serial_number) tags[tIdx].serial_number = c.serial_number;
          saveStore(KEYS.tags, tags);
       }
    }
    return { success: true };
  },
  deleteCalibration: (id) => {
    syncDeleteToCloud(KEYS.calibrations, id);
    return saveStore(KEYS.calibrations, loadStore(KEYS.calibrations).filter(x => x.id !== id));
  },

  // Platforms
  getPlatforms: () => loadStore(KEYS.platforms),
  savePlatform: (p) => {
    const s = loadStore(KEYS.platforms);
    const i = s.findIndex(x => x.id === p.id);
    if (i >= 0) s[i] = { ...s[i], ...p };
    else s.push({ ...p, id: genId('plat'), created_at: new Date().toISOString() });
    saveStore(KEYS.platforms, s);
  },
  deletePlatform: (id) => {
    syncDeleteToCloud(KEYS.platforms, id);
    return saveStore(KEYS.platforms, loadStore(KEYS.platforms).filter(x => x.id !== id));
  },
  getPlatform: (id) => loadStore(KEYS.platforms).find(x => x.id === id),
  getActivePlatform: () => { const id = localStorage.getItem(KEYS.activePlatform); return id ? loadStore(KEYS.platforms).find(x => x.id === id) || null : null; },
  setActivePlatform: (id) => localStorage.setItem(KEYS.activePlatform, id),

  // Embarkations (Calibration Campaigns)
  getEmbarkations: () => loadStore(KEYS.embarkations),
  saveEmbarkation: (data) => {
    const s = loadStore(KEYS.embarkations);
    s.push({
      ...data,
      id: genId('emb'),
      created_at: new Date().toISOString()
    });
    saveStore(KEYS.embarkations, s);
    return { success: true };
  },
  getLatestEmbarkation: () => {
    const active = window.DB.getActivePlatform();
    if (!active) return null;
    const all = loadStore(KEYS.embarkations).filter(e => e.platform_id === active.id);
    if (!all.length) return null;
    return all.sort((a,b) => new Date(b.date) - new Date(a.date))[0];
  },

  // Users
  getUsers: () => loadStore(KEYS.users),
  getUser: (id) => loadStore(KEYS.users).find(x => x.id === id),
  saveUser: (u) => {
    const s = loadStore(KEYS.users);
    const i = s.findIndex(x => x.id === u.id);
    if (i >= 0) s[i] = { ...s[i], ...u };
    else s.push({ ...u, id: genId('user'), created_at: new Date().toISOString() });
    saveStore(KEYS.users, s);
  },
  deleteUser: (id) => {
    syncDeleteToCloud(KEYS.users, id);
    return saveStore(KEYS.users, loadStore(KEYS.users).filter(x => x.id !== id));
  },
  loginUser: (username, password) => {
    const users = loadStore(KEYS.users);
    const u = (username || '').toLowerCase().trim();
    return users.find(user => user.username.toLowerCase() === u && user.password === password) || null;
  },
  usernameExists: (username, excludeId) => {
    return loadStore(KEYS.users).some(u => u.username === username && u.id !== excludeId);
  },
  updateUserPassword: (userId, newPassword) => {
    const s = loadStore(KEYS.users);
    const i = s.findIndex(x => x.id === userId);
    if (i >= 0) {
      s[i].password = newPassword;
      saveStore(KEYS.users, s);
      return true;
    }
    return false;
  },

  // Core search
  searchAll: (query) => {
    const active = window.DB.getActivePlatform();
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const results = [];
    const match = (item, fields, module, label) => {
      if (active && item.platform_id && item.platform_id !== active.id) return;
      if (fields.some(f => (item[f] || '').toLowerCase().includes(q))) {
        results.push({ module, label, item });
      }
    };
    loadStore(KEYS.tags).forEach(t => match(t, ['tag_code', 'name', 'system', 'location', 'type', 'notes'], 'tags', t.system || t.name));
    loadStore(KEYS.events).forEach(e => match(e, ['tag_code', 'title', 'description', 'author', 'category', 'system', 'actions_taken'], 'events', e.title));
    loadStore(KEYS.activities).forEach(a => match(a, ['tag_code', 'title', 'description', 'responsible'], 'activities', a.title));
    loadStore(KEYS.inspections).forEach(i => match(i, ['tag_code', 'findings', 'recommendation', 'inspector', 'condition'], 'inspections', i.tag_code + ' Inspection'));
    loadStore(KEYS.materials).forEach(m => match(m, ['tag_code', 'material_name', 'ifs_code', 'serial_number', 'pr_number', 'po_number', 'destination', 'notes'], 'materials', (m.material_name || m.tag_code || 'Material')));
    loadStore(KEYS.notes).forEach(n => match(n, ['tag_code', 'guidance', 'required_action', 'condition'], 'notes', n.tag_code + ' Note'));
    loadStore(KEYS.alerts).forEach(a => match(a, ['tag_code', 'title', 'description'], 'alerts', a.title));
    loadStore(KEYS.systems).forEach(s => match(s, ['tag_code', 'system_name', 'serial_number', 'metering_point', 'manufacturer', 'model', 'firmware', 'status', 'notes'], 'systems', s.system_name || s.tag_code || 'System'));
    return results;
  },

  importTagsXml: (xmlString) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      
      // Check for Raw Dump format
      const isRawDump = xmlDoc.getElementsByTagName("excel_dump").length > 0;
      let updatedCount = 0;
      const tags = loadStore(KEYS.tags);

      if (isRawDump) {
        // Find "Main" sheet for Tag Registry updates
        const sheets = xmlDoc.getElementsByTagName("sheet");
        let mainSheet = null;
        for (let s = 0; s < sheets.length; s++) {
          if (sheets[s].getAttribute("name") === "Main") {
            mainSheet = sheets[s];
            break;
          }
        }

        if (!mainSheet) return { success: false, message: 'Sheet "Main" not found in Raw Dump.' };

        const rows = mainSheet.getElementsByTagName("row");
        for (let r = 0; r < rows.length; r++) {
          const cols = rows[r].getElementsByTagName("col");
          const mapping = {};
          for (let c = 0; c < cols.length; c++) {
            mapping[cols[c].getAttribute("index")] = cols[c].textContent;
          }

          const code = mapping["2"]; // Col 2 is Tag Code in "Main"
          if (!code || !code.match(/[0-9]/)) continue; // Skip headers/empty

          const tagIdx = tags.findIndex(t => t.tag_code === code.toUpperCase().trim());
          if (tagIdx >= 0) {
            if (mapping["27"]) tags[tagIdx].last_calibration = mapping["27"];
            if (mapping["28"]) tags[tagIdx].deadline = mapping["28"];
            if (mapping["4"]) tags[tagIdx].classification = mapping["4"];
            if (mapping["26"]) tags[tagIdx].calibration_interval = mapping["26"];
            updatedCount++;
          }
        }
      } else {
        // Handle Legacy/Simple XML format
        const tagNodes = xmlDoc.getElementsByTagName("tag");
        if (tagNodes.length === 0) return { success: false, message: 'No <tag> elements found in XML.' };

        for (let i = 0; i < tagNodes.length; i++) {
          const node = tagNodes[i];
          const code = node.getElementsByTagName("tag_code")[0]?.textContent;
          if (!code) continue;

          const tagIdx = tags.findIndex(t => t.tag_code === code.toUpperCase());
          if (tagIdx >= 0) {
            const lastCal = node.getElementsByTagName("last_calibration")[0]?.textContent;
            const deadline = node.getElementsByTagName("deadline")[0]?.textContent;
            const classification = node.getElementsByTagName("classification")[0]?.textContent;
            const interval = node.getElementsByTagName("calibration_interval")[0]?.textContent;

            if (lastCal) tags[tagIdx].last_calibration = lastCal;
            if (deadline) tags[tagIdx].deadline = deadline;
            if (classification) tags[tagIdx].classification = classification;
            if (interval) tags[tagIdx].calibration_interval = interval;
            
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        saveStore(KEYS.tags, tags);
        return { success: true, count: updatedCount };
      }
      return { success: false, message: 'No matching TAGs found to update.' };
    } catch (e) {
      console.error('XML Import Error:', e);
      return { success: false, message: 'Invalid XML format.' };
    }
  },

  // TAG timeline
  getTagTimeline: (tagId) => {
    const tag = loadStore(KEYS.tags).find(t => t.id === tagId);
    if (!tag) return [];
    const tc = tag.tag_code;
    const timeline = [];
    loadStore(KEYS.events).filter(e => e.tag_id === tagId || e.tag_code === tc).forEach(e => {
      timeline.push({ type: 'event', date: e.created_at, data: e });
      if (e.follow_ups && Array.isArray(e.follow_ups)) {
        e.follow_ups.forEach(f => {
          timeline.push({ type: 'event_followup', date: f.date, data: { ...f, event_title: e.title, event_id: e.id } });
        });
      }
    });
    loadStore(KEYS.inspections).filter(i => i.tag_id === tagId || i.tag_code === tc).forEach(i =>
      timeline.push({ type: 'inspection', date: i.created_at, data: i }));
    loadStore(KEYS.alerts).filter(a => a.tag_id === tagId || a.tag_code === tc).forEach(a =>
      timeline.push({ type: 'alert', date: a.created_at, data: a }));
    loadStore(KEYS.materials).filter(m => m.tag_id === tagId || m.tag_code === tc).forEach(m =>
      timeline.push({ type: 'material', date: m.created_at, data: m }));
    loadStore(KEYS.notes).filter(n => n.tag_id === tagId || n.tag_code === tc).forEach(n =>
      timeline.push({ type: 'note', date: n.created_at, data: n }));
    loadStore(KEYS.calibrations).filter(c => c.tag_id === tagId || c.tag_code === tc).forEach(c =>
      timeline.push({ type: 'calibration', date: c.calibration_date || c.created_at, data: c }));
    loadStore(KEYS.systems).filter(s => s.tag_id === tagId || s.tag_code === tc).forEach(s =>
      timeline.push({ type: 'system', date: s.updated_at || s.created_at, data: s }));
    return timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // Automation: System-wide sync for overdue tests
  syncWellAlerts: () => {
    const active = window.DB.getActivePlatform();
    if (!active) return;

    const wells = loadStore(KEYS.tags).filter(t => t.platform_id === active.id && t.type === 'Well' && t.status !== 'closed');
    const notes = loadStore(KEYS.notes).filter(n => n.platform_id === active.id && (n.note_type === 'well-test' || n.system === 'Production'));
    const alerts = loadStore(KEYS.alerts).filter(a => a.platform_id === active.id && a.status !== 'closed');

    // Group notes by well to find latest
    const latestByWell = {};
    notes.forEach(n => {
      if (!latestByWell[n.tag_code] || new Date(n.created_at) > new Date(latestByWell[n.tag_code].created_at)) {
        latestByWell[n.tag_code] = n;
      }
    });

    const now = new Date();
    const threshold = 90 * 24 * 60 * 60 * 1000; // 90 days in ms

    wells.forEach(well => {
      const note = latestByWell[well.tag_code];
      const hasNote = !!note;
      const isOverdue = hasNote ? (now - new Date(note.test_date || note.created_at) > threshold) : true;

      if (isOverdue) {
        // Check if a critical alert already exists for this TAG
        const existingAlert = alerts.find(a => a.tag_code === well.tag_code && a.priority === 'critical' && a.title.includes('OVERDUE'));
        
        if (!existingAlert) {
          const title = `CRITICAL: Well Test OVERDUE — ${well.tag_code}`;
          const description = hasNote 
            ? `The latest well test for ${well.tag_code} was recorded on ${fmtDate(note.test_date || note.created_at)}. Re-testing is required per 90-day protocol.`
            : `No well test has been recorded yet for ${well.tag_code}. Initial testing is required.`;

          window.DB.saveAlert({
            tag_id: well.id,
            tag_code: well.tag_code,
            title: title,
            description: description,
            reminder_type: 'alert',
            priority: 'critical',
            due_date: new Date().toISOString().split('T')[0],
            status: 'overdue'
          });
        }
      }
    });
  },

  // Prover visibility/availability
  toggleProverAvailability: (tagId) => {
    const s = loadStore(KEYS.tags);
    const i = s.findIndex(x => x.id === tagId);
    if (i >= 0) {
      s[i].is_available = !s[i].is_available;
      saveStore(KEYS.tags, s);
      return s[i].is_available;
    }
    return null;
  },

  // Toggle Operational Mode (Duty/Idle)
  toggleTagOpMode: (tagId) => {
    const s = loadStore(KEYS.tags);
    const i = s.findIndex(x => x.id === tagId);
    if (i >= 0) {
      s[i].op_mode = (s[i].op_mode === 'Idle') ? 'Duty' : 'Idle';
      saveStore(KEYS.tags, s);
      return s[i].op_mode;
    }
    return null;
  },

  // Manual Cloud Control
  pushLocalToCloud: pushLocalToCloud,
  pullFromCloud: pullFromCloud,
  checkCloudUpdates: checkCloudUpdates,
  authorizeSync: async () => {
    try {
        updateStatusUI('syncing');
        await performPullSync();
        toast('Sincronização concluída com sucesso.', 'success');
        return true;
    } catch (e) {
        console.error('Authorization sync failed:', e);
        return false;
    }
  },
  forceSync: async () => {
    const user = getCurrentUser();
    try {
        updateStatusUI('syncing');
        
        // Push Master changes if user is Admin
        await pushLocalToCloud(); 
        
        // Pull latest updates
        await pullFromCloud(); 
        
        if (window.refreshCurrentPage) window.refreshCurrentPage();
        updateStatusUI('online');
        return true;
    } catch (e) {
        console.error('Force Sync failed:', e);
        updateStatusUI('offline');
        return false;
    }
  },

  // ===== Production Supervisor Module =====

  // Crew / Turmas
  getCrew: () => loadStore(KEYS.crew),
  saveCrew: (item) => {
    const s = loadStore(KEYS.crew);
    const i = s.findIndex(x => x.id === item.id);
    if (i >= 0) s[i] = { ...s[i], ...item };
    else s.unshift({ ...item, id: genId('crw'), created_at: new Date().toISOString() });
    saveStore(KEYS.crew, s);
    return { success: true };
  },
  deleteCrew: (id) => {
    syncDeleteToCloud(KEYS.crew, id);
    return saveStore(KEYS.crew, loadStore(KEYS.crew).filter(x => x.id !== id));
  },

  // Personnel
  getPersonnel: () => loadStore(KEYS.personnel),
  savePersonnel: (item) => {
    const s = loadStore(KEYS.personnel);
    const i = s.findIndex(x => x.id === item.id);
    if (i >= 0) s[i] = { ...s[i], ...item };
    else s.unshift({ ...item, id: genId('per'), created_at: new Date().toISOString() });
    saveStore(KEYS.personnel, s);
    return { success: true };
  },
  deletePersonnel: (id) => {
    syncDeleteToCloud(KEYS.personnel, id);
    return saveStore(KEYS.personnel, loadStore(KEYS.personnel).filter(x => x.id !== id));
  },

  // Vacations
  getVacations: () => loadStore(KEYS.vacations),
  saveVacation: (item) => {
    const s = loadStore(KEYS.vacations);
    const i = s.findIndex(x => x.id === item.id);
    if (i >= 0) s[i] = { ...s[i], ...item };
    else s.unshift({ ...item, id: genId('vac'), created_at: new Date().toISOString() });
    saveStore(KEYS.vacations, s);
    return { success: true };
  },
  deleteVacation: (id) => {
    syncDeleteToCloud(KEYS.vacations, id);
    return saveStore(KEYS.vacations, loadStore(KEYS.vacations).filter(x => x.id !== id));
  },

  // Sub-systems
  getSubsystems: () => loadStore(KEYS.subsystems),
  saveSubsystem: (item) => {
    const s = loadStore(KEYS.subsystems);
    const i = s.findIndex(x => x.id === item.id);
    if (i >= 0) s[i] = { ...s[i], ...item };
    else s.unshift({ ...item, id: genId('sub'), created_at: new Date().toISOString() });
    saveStore(KEYS.subsystems, s);
    return { success: true };
  },
  deleteSubsystem: (id) => {
    syncDeleteToCloud(KEYS.subsystems, id);
    return saveStore(KEYS.subsystems, loadStore(KEYS.subsystems).filter(x => x.id !== id));
  },

  // Export/Import
  exportDatabase,
  importDatabase,

  // Environment
  isMasterLocal: isMasterLocal
};

// Initialize seed on load
createLocalSnapshot();
initSeed();
migrateData();

// BOOT SYNC LOGIC
if (isMasterLocal()) {
    console.log('🛡️ Master Local Mode: Skipping auto-pull. Waiting for engineer authorization.');
    // We already do a checkCloudUpdates in app.js at boot
} else {
    console.log('📡 Field Collector Mode (Web): Automatic pull active.');
    pullFromCloud(); 
}

initRealtimeListeners();

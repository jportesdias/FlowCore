// ============================================================
//  Evergreen Log book — Seed Data (Offshore Demo)
//  All data stored in localStorage. Keys: ph_tags, ph_events,
//  ph_activities, ph_inspections, ph_materials, ph_systems,
//  ph_notes, ph_alerts, ph_media
// ============================================================

const SEED_TAGS = [
  { id: 'tag-009', platform_id: 'plat-flowcore', tag_code: 'WELL-A1', name: 'Production Well A1', system: 'Production', location: 'Subsea Cluster 1', type: 'Well', status: 'ok', notes: 'High-pressure producer.' },
  { id: 'tag-010', platform_id: 'plat-flowcore', tag_code: 'WELL-B5', name: 'Production Well B5', system: 'Production', location: 'Subsea Cluster 2', type: 'Well', status: 'ok', notes: 'Water injector candidate.' },
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

const SEED_EVENTS = [
  {
    id: 'evt-001',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-001',
    tag_code: 'FT-1001',
    title: 'Fuel Gas Meter — Flow Drop Below Threshold',
    description: 'FT-1001 recorded an unexpected 23% reduction in flow rate during night shift. DCS alarm triggered at 02:14. Initial investigation suggests partial blockage at strainer upstream. Differential pressure across strainer above normal range (3.2 bar vs normal 0.8 bar). Flow not recovered after manual drain.',
    author: 'J. Santos',
    category: 'Process Anomaly',
    priority: 'critical',
    status: 'open',
    system: 'Gas Metering',
    actions_taken: 'Isolated strainer for cleaning. Notified production supervisor. Opened bypass valve to maintain minimal flow.',
    follow_up_required: true,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: 'evt-002',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-002',
    tag_code: 'PT-2045',
    title: 'PT-2045 — Impulse Line Obstruction Suspected',
    description: 'Pressure reading from PT-2045 showing deviation of +1.8 bar vs redundant instruments PT-2046 and PT-2047. Sluggish response observed during pressure test. Technician suspects wax deposition in impulse line. Equipment recently returned from corrective maintenance on diaphragm seal.',
    author: 'A. Ferreira',
    category: 'Calibration / Obstruction',
    priority: 'high',
    status: 'in-progress',
    system: 'Separation',
    actions_taken: 'Raised AVO for impulse line winterization. Requested instrument engineer evaluation. Scheduled manifold blowdown for next shift.',
    follow_up_required: true,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: 'evt-003',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-003',
    tag_code: 'PB-0012',
    title: 'Pilot Flare PB-0012 — Intermittent Flame Loss',
    description: 'South flare pilot PB-0012 extinguished 3 times during current shift. Ambient temperature 4°C. Igniter cycling detected in SCADA. Each re-ignition took between 2 and 7 minutes. Root cause suspected: moisture in fuel gas line causing intermittent flame starvation during cold weather. Freeze protection trace heating checked — appears functional but thermostat setpoint may be too low.',
    author: 'M. Oliveira',
    category: 'Safety Critical',
    priority: 'critical',
    status: 'open',
    system: 'Flare System',
    actions_taken: 'Increased fuel gas flow to pilot. Raised thermostat setpoint from 5°C to 12°C. Notified Safety Officer. Standby operator assigned to monitor flare deck.',
    follow_up_required: true,
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'evt-004',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-004',
    tag_code: 'TT-3301',
    title: 'TT-3301 — 4-20mA Return Signal Loss to DCS',
    description: 'Gas export temperature transmitter TT-3301 lost communication to DCS I/O card at 09:45. Field instrument reading correct locally (38.4°C on HART communicator). DCS showing signal failure alarm. Cable continuity test performed — loop resistance abnormal (1.2 kΩ vs expected 500 Ω). Cable splice at junction box JB-T33 suspected.',
    author: 'R. Costa',
    category: 'Communication / Instrument Fault',
    priority: 'high',
    status: 'in-progress',
    system: 'Gas Export',
    actions_taken: 'Raised work permit for cable repair. Tagged out signal at DCS. Instrument using HART bypass value as temporary measure. Spare cable identified in workshop.',
    follow_up_required: true,
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'evt-005',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-006',
    tag_code: 'FT-0501',
    title: 'FT-0501 — Sent for Laboratory Calibration',
    description: 'Allocation meter FT-0501 removed from service and dispatched to onshore calibration lab. Last calibration was 13 months ago — exceeded 12-month interval per company procedure INS-CAL-007. K-factor deviation of 0.3% observed during in-situ verification. Meter serial: 7840-FT-01.',
    author: 'J. Santos',
    category: 'Calibration',
    priority: 'medium',
    status: 'closed',
    system: 'Gas Metering',
    actions_taken: 'Meter isolated and removed. Spare meter installed (FT-0501-SPARE). Calibration certificate requested from lab.',
    follow_up_required: false,
    created_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
  },
  {
    id: 'evt-006',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-007',
    tag_code: 'SKID-001',
    title: 'SKID-001 — Configuration Update After Flow Computer Replacement',
    description: 'Fiscal metering skid flow computer (FC-OMC7) replaced following CPU failure. All configuration parameters re-entered per as-built documentation. K-factor, meter factors, base conditions, and composition tables reloaded. Comparison test between old and new FC showed <0.01% difference.',
    author: 'A. Ferreira',
    category: 'Configuration Change',
    priority: 'medium',
    status: 'closed',
    system: 'Gas Metering',
    actions_taken: 'New flow computer commissioned. All parameters verified by lead metering engineer. Configuration backup saved to shared drive.',
    follow_up_required: false,
    created_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
  },
];

const SEED_ACTIVITIES = [
  {
    id: 'act-001',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-001',
    tag_code: 'FT-1001',
    title: 'Clean FT-1001 Upstream Strainer',
    description: 'Remove, clean, and reinstall strainer element. Verify DP returns to normal range post-cleaning.',
    responsible: 'J. Santos',
    due_date: new Date(Date.now() + 8 * 3600000).toISOString().split('T')[0],
    priority: 'critical',
    status: 'open',
    comments: ['Strainer bypass confirmed open — do not close until cleaning complete.'],
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'act-002',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-003',
    tag_code: 'PB-0012',
    title: 'PB-0012 — Inspect and Replace Fuel Gas KO Drum Drain',
    description: 'Possible carried liquid in pilot fuel gas. KO drum drain inspection required. Check level and drain if necessary.',
    responsible: 'M. Oliveira',
    due_date: new Date(Date.now() + 4 * 3600000).toISOString().split('T')[0],
    priority: 'critical',
    status: 'in-progress',
    comments: ['Standby operator monitoring continuously.'],
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'act-003',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-004',
    tag_code: 'TT-3301',
    title: 'Cable Repair — JB-T33 Splice for TT-3301',
    description: 'Repair or replace cable splice at junction box JB-T33. Verify 4-20mA signal integrity end-to-end after repair.',
    responsible: 'R. Costa',
    due_date: new Date(Date.now() + 24 * 3600000).toISOString().split('T')[0],
    priority: 'high',
    status: 'open',
    comments: ['Spare cable confirmed available. Work permit pending approval.'],
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'act-004',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-006',
    tag_code: 'FT-0501',
    title: 'Receive and Reinstall FT-0501 After Calibration',
    description: 'Receive calibration certificate from lab. Reinstall FT-0501 with updated K-factor. Perform in-service verification.',
    responsible: 'J. Santos',
    due_date: new Date(Date.now() + 15 * 24 * 3600000).toISOString().split('T')[0],
    priority: 'medium',
    status: 'open',
    comments: [],
    created_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
  },
];

const SEED_INSPECTIONS = [
  {
    id: 'insp-001',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-005',
    tag_code: 'SP-4402',
    date: new Date(Date.now() - 3 * 24 * 3600000).toISOString().split('T')[0],
    inspector: 'G. Almeida',
    condition: 'Degraded',
    findings: 'Crude oil sampler SP-4402 inspected during scheduled maintenance window. Relief valve RV-SP44 found with setpoint deviation: lifting pressure observed at 8.5 bar vs design 10 bar. Possible spring fatigue. Internal sampler cylinder O-rings showing minor extrusion — within tolerance but to be monitored.',
    recommendation: 'Replace RV-SP44 at earliest opportunity. Re-inspect O-rings at next 3-month check. Review sampler pressure rating vs current operating conditions.',
    status: 'open',
    created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
  },
  {
    id: 'insp-002',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-001',
    tag_code: 'FT-1001',
    date: new Date(Date.now() - 30 * 24 * 3600000).toISOString().split('T')[0],
    inspector: 'J. Santos',
    condition: 'Good',
    findings: 'Monthly physical inspection. No external leaks detected. Transmitter housing in good condition. Upstream isolation valve confirmed operational. Impulse lines dry and well insulated.',
    recommendation: 'Continue routine monitoring. Schedule next inspection in 30 days.',
    status: 'closed',
    created_at: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
  },
];

const SEED_MATERIALS = [
  {
    id: 'mat-001',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-006',
    tag_code: 'FT-0501',
    ifs_code: 'IFS-99201',
    serial_number: '7840-FT-01',
    shipment_date: new Date(Date.now() - 5 * 24 * 3600000).toISOString().split('T')[0],
    destination: 'Onshore Calibration Lab — FlowTech Metrology',
    status: 'in-transit',
    expected_return: new Date(Date.now() + 15 * 24 * 3600000).toISOString().split('T')[0],
    notes: 'K-factor deviation triggered lab cal. Spare installed (FT-0501-SPARE). AWB: FT-2026-0305.',
    created_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
  },
  {
    id: 'mat-002',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-005',
    tag_code: 'SP-4402',
    ifs_code: 'IFS-99205',
    serial_number: 'RV-SP44-2019',
    shipment_date: '',
    destination: 'Pending workshop evaluation',
    status: 'pending',
    expected_return: '',
    notes: 'Relief valve to be removed and sent for setpoint adjustment. Not yet dispatched.',
    created_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
  },
];

const SEED_SYSTEMS = [
  {
    id: 'sys-001',
    platform_id: 'plat-flowcore',
    system_name: 'Fiscal Gas Metering — Train 1',
    tag_id: 'tag-007',
    tag_code: 'SKID-001',
    serial_number: 'FC-OMC7-2024',
    expire_date: '2027-03-01',
    active: true,
    notes: 'Flow computer replaced March 2026. K-factor and meter factors updated. Configuration backup at \\\\OFFSHORE-NAS\\Metering\\SKID-001-config-2026.xml',
    created_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
  },
  {
    id: 'sys-002',
    platform_id: 'plat-flowcore',
    system_name: 'Crude Sampling System — Module C',
    tag_id: 'tag-005',
    tag_code: 'SP-4402',
    serial_number: 'SPL-CRD-C-07',
    expire_date: '2026-09-15',
    active: true,
    notes: 'Next scheduled maintenance: September 2026. Relief valve inspection overdue.',
    created_at: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
  },
];

const SEED_NOTES = [
  {
    id: 'note-001',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-001',
    tag_code: 'FT-1001',
    note_type: 'offloading',
    system: 'Gas Metering',
    condition: 'Normal — Strainer issue active',
    guidance: 'FT-1001 is the primary custody transfer flow meter. Monitor hourly during current strainer cleaning.',
    created_at: new Date(Date.now() - 15 * 24 * 3600000).toISOString(),
  },
  {
    id: 'note-003',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-009',
    tag_code: 'WELL-A1',
    note_type: 'well-test',
    system: 'Production',
    condition: 'Stable Production',
    test_date: new Date(Date.now() - 10 * 24 * 3600000).toISOString().split('T')[0],
    deadline_date: new Date(Date.now() + 80 * 24 * 3600000).toISOString().split('T')[0],
    guidance: 'Well A1 performing within expected parameters. Water cut at 2%.',
    created_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
  },
  {
    id: 'note-004',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-006',
    tag_code: 'FT-0501',
    note_type: 'offloading',
    system: 'Offloading',
    condition: 'Tanker Alpha Load Out',
    vessel_name: 'Tanker Alpha',
    volume: '250000.50',
    guidance: 'Offloading completed successfully. No spills reported. All documentation signed.',
    created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
  }
];

const SEED_ALERTS = [
  {
    id: 'alert-001',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-001',
    tag_code: 'FT-1001',
    title: 'CRITICAL: FT-1001 Strainer DP Exceeding Limit',
    description: 'Differential pressure across FT-1001 strainer has exceeded 3 bar. Immediate action required to prevent meter damage and flow disruption.',
    reminder_type: 'alert',
    recurrence: 'none',
    priority: 'critical',
    due_date: new Date(Date.now() - 1 * 3600000).toISOString().split('T')[0],
    status: 'overdue',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'alert-002',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-003',
    tag_code: 'PB-0012',
    title: 'SAFETY: Pilot Flare Monitoring — 1hr Check',
    description: 'Pilot flare PB-0012 showing intermittent extinguishing. Manual 1-hour monitoring check required on flare deck. Log all observations.',
    reminder_type: 'reminder',
    recurrence: 'hourly',
    priority: 'critical',
    due_date: new Date().toISOString().split('T')[0],
    status: 'open',
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: 'alert-003',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-005',
    tag_code: 'SP-4402',
    title: 'Reminder: Replace RV-SP44 Relief Valve',
    description: 'Relief valve found with setpoint deviation during inspection. Must be replaced before next production increase cycle.',
    reminder_type: 'reminder',
    recurrence: 'none',
    priority: 'high',
    due_date: new Date(Date.now() + 2 * 24 * 3600000).toISOString().split('T')[0],
    status: 'open',
    created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
  },
  {
    id: 'alert-004',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-006',
    tag_code: 'FT-0501',
    title: 'Track: FT-0501 Calibration Return',
    description: 'Monitor calibration lab for certificate and return shipping. Update material movement record on arrival.',
    reminder_type: 'reminder',
    recurrence: 'none',
    priority: 'medium',
    due_date: new Date(Date.now() + 15 * 24 * 3600000).toISOString().split('T')[0],
    status: 'open',
    created_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
  },
  {
    id: 'alert-005',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-007',
    tag_code: 'SKID-001',
    title: 'Calibration Certificate — SKID-001 Flow Computer Due',
    description: 'Annual verification of flow computer FC-OMC7 configuration and output signals against reference standards. Due per INS-CAL-007.',
    reminder_type: 'reminder',
    recurrence: 'annually',
    priority: 'medium',
    due_date: new Date(Date.now() + 60 * 24 * 3600000).toISOString().split('T')[0],
    status: 'open',
    created_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
  },
];

const SEED_PLATFORMS = [
  { id: 'plat-atlanta', name: 'FPSO Atlanta', type: 'FPSO', basin: 'Santos Basin', operator: 'Enauta', active: true },
  { id: 'plat-flowcore', name: 'FPSO FlowCore Solutions', type: 'FPSO', basin: 'Santos Basin', operator: 'FlowCore', active: true },
];

// ---- Seed Users ----
const SEED_USERS = [
  { id: 'user-admin', name: 'Administrator', username: 'admin', password: 'admin', role: 'Admin', platforms: ['plat-atlanta', 'plat-flowcore'], created_at: new Date().toISOString() },
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
  seeded: 'ph_seeded_v17', // v17: Calibration Embarkation Plan
  calibrations: 'ph_calibrations',
};

// Sandbox storage for GUEST mode (memory only)
const SEED_ORIFICE_PLATES = [
  { id: 'op-001', platform_id: 'plat-flowcore', tag_code: '30-FE-001', serial_number: 'OP-23441', system: 'Gas Header A', material: 'SS316', inner_diameter: '154.22 mm', thickness: '6.35 mm', beta: '0.6022', op_mode: 'Duty', status: 'ok', last_inspection: '2024-01-15', deadline: '2025-01-15', notes: 'Perfect edge condition.' },
  { id: 'op-002', platform_id: 'plat-flowcore', tag_code: '30-FE-002', serial_number: 'OP-23442', system: 'Gas Header B', material: 'SS316', inner_diameter: '154.22 mm', thickness: '6.35 mm', beta: '0.6022', op_mode: 'Duty', status: 'minor-wear', last_inspection: '2023-11-10', deadline: '2024-11-10', notes: 'Slight discoloration on downstream face.' },
  { id: 'op-003', platform_id: 'plat-flowcore', tag_code: '21-FE-601', serial_number: 'OP-9981', system: 'Fuel Gas Skid', material: 'Monel 400', inner_diameter: '42.10 mm', thickness: '3.18 mm', beta: '0.4501', op_mode: 'Idle', status: 'ok', last_inspection: '2024-02-20', deadline: '2025-02-20', notes: 'Spare plate in storage.' }
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

function saveStore(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Trigger background cloud sync if available
    syncToCloud(key, data);
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
        [KEYS.users]: 'users',
        [KEYS.platforms]: 'platforms'
    };

    const tableName = tableMap[key];
    if (!tableName) return;

    try {
        // Prepare data for upsert (handle arrays vs single objects if needed)
        const rows = Array.isArray(data) ? data : [data];
        if (rows.length === 0) return;

        console.log(`☁️ Syncing ${rows.length} records to Cloud table: ${tableName}...`);
        
        const { error } = await window.supabaseClient
            .from(tableName)
            .upsert(rows, { onConflict: 'id' });

        if (error) {
            // Usually happens if table doesn't exist yet in Supabase
            if (error.code === 'PGRST116' || error.message.includes('not found')) {
                console.warn(`⚠️ Table "${tableName}" not yet created in Supabase. Run SQL in dashboard.`);
            } else {
                console.error(`❌ Cloud Sync Error (${tableName}):`, error);
            }
        }
    } catch (e) {
        console.error('❌ Cloud Sync Critical Failure:', e);
    }
}

// Pull Data from Cloud - Downloads all cloud records into LocalStorage
async function pullFromCloud() {
    if (!window.supabaseClient) return;

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
        'users': KEYS.users,
        'platforms': KEYS.platforms
    };

    console.log('🔄 Pulling global data from Supabase Cloud...');

    for (const [tableName, localKey] of Object.entries(tableMap)) {
        try {
            const { data, error } = await window.supabaseClient
                .from(tableName)
                .select('*');

            if (data && data.length > 0) {
                // Merge cloud data into local storage (Cloud takes priority for existing IDs)
                const localData = JSON.parse(localStorage.getItem(localKey)) || [];
                const merged = [...localData];

                data.forEach(cloudRow => {
                    const idx = merged.findIndex(l => l.id === cloudRow.id);
                    if (idx >= 0) merged[idx] = cloudRow;
                    else merged.push(cloudRow);
                });

                localStorage.setItem(localKey, JSON.stringify(merged));
                console.log(`✅ ${tableName}: ${data.length} records pulled.`);
            }
        } catch (e) {
            // Silently fail for missing tables
        }
    }
}

function initSeed() {
  const latestV = '1.19'; // v19: Protect User Wells
  if (localStorage.getItem(KEYS.seeded) === latestV) return;

  const seedIfEmpty = (key, data) => {
    const existing = localStorage.getItem(key);
    if (!existing || existing === '[]' || existing === 'null') {
      saveStore(key, data);
    }
  };

  // Ensure Admin account always exists
  const users = loadStore(KEYS.users);
  const adminIdx = users.findIndex(u => u.username === 'admin');
  if (adminIdx === -1) {
    users.push(SEED_USERS[0]);
    saveStore(KEYS.users, users);
  }

  // --- CORE INVENTORY SYNC ---
  let currentTags = loadStore(KEYS.tags);
  const excelPool = (typeof EXCEL_TAGS !== 'undefined' ? EXCEL_TAGS : []);
  const activePlat = window.DB?.getActivePlatform();
  
  // 1. CLEANUP Stage: Remove any dummy tags NOT in Excel AND NOT Prover AND NOT official SEED Wells
  // Also remove previous random seeds (tag-001 to tag-008)
  currentTags = currentTags.filter(t => {
    // Keep it if it's in Excel
    if (excelPool.some(et => et.tag_code === t.tag_code)) return true;
    // Keep it if it's the Prover
    if (t.tag_code === '30XX001') return true;
    // Keep it if it's a Well (User added or SEED)
    if (t.type === 'Well') return true;
    // Keep it if it's a real Flow Computer already registered in systems
    if (t.type === 'Flow Computer') return true;
    
    return false; // Remove random tags
  });

  // 2. BASE Stage: Merge Spreadsheet (Excel) + Core SEED (Wells)
  const basePool = [
    ...SEED_TAGS, 
    ...excelPool.map(t => ({ ...t, id: t.id || genId('tag') }))
  ];

  basePool.forEach(newTag => {
    const exists = currentTags.find(t => t.tag_code === newTag.tag_code && t.platform_id === newTag.platform_id);
    if (!exists) {
      currentTags.push({ ...newTag, status: newTag.status || 'ok' });
    }
  });

  // 3. SYSTEM SYNC Stage: Bring the 19 Flow Computers from "System Config" session
  const realSystems = loadStore(KEYS.systems);
  realSystems.forEach(sys => {
    if (sys.tag_code) {
      const tagExists = currentTags.find(t => t.tag_code === sys.tag_code);
      if (!tagExists) {
        currentTags.push({
          id: genId('tag'),
          platform_id: sys.platform_id || (activePlat ? activePlat.id : 'plat-flowcore'),
          tag_code: sys.tag_code,
          name: sys.system_name || 'Flow Computer',
          system: 'Flow Control',
          location: 'Metering Station',
          type: 'Flow Computer',
          status: 'ok',
          op_mode: sys.status === 'Duty' ? 'Duty' : 'Idle',
          notes: sys.notes || 'Synced from System Configuration.'
        });
      } else {
        // Just ensure type and op_mode are correct for the registry view logic
        tagExists.type = 'Flow Computer';
        if (sys.status === 'Duty') tagExists.op_mode = 'Duty';
      }
    }
  });

  saveStore(KEYS.tags, currentTags);

  seedIfEmpty(KEYS.events, SEED_EVENTS);
  seedIfEmpty(KEYS.activities, SEED_ACTIVITIES);
  seedIfEmpty(KEYS.inspections, SEED_INSPECTIONS);
  seedIfEmpty(KEYS.materials, SEED_MATERIALS);
  seedIfEmpty(KEYS.systems, SEED_SYSTEMS);
  seedIfEmpty(KEYS.notes, SEED_NOTES);
  seedIfEmpty(KEYS.alerts, SEED_ALERTS);
  seedIfEmpty(KEYS.orifice_plates, SEED_ORIFICE_PLATES);
  seedIfEmpty(KEYS.platforms, SEED_PLATFORMS);
  seedIfEmpty(KEYS.embarkations, []);

  // Basic backup for rest of users if empty
  seedIfEmpty(KEYS.users, SEED_USERS);

  localStorage.setItem(KEYS.seeded, latestV);
}

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
  deleteTag: (id) => saveStore(KEYS.tags, loadStore(KEYS.tags).filter(x => x.id !== id)),
  getTag: (id) => loadStore(KEYS.tags).find(x => x.id === id),

  // Events
  getEvents: () => {
    const active = window.DB.getActivePlatform();
    const all = loadStore(KEYS.events);
    return active ? all.filter(x => x.platform_id === active.id) : all;
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
    const i = s.findIndex(x => x.id === e.id);
    if (i >= 0) {
      s[i] = { ...s[i], ...e, updated_at: new Date().toISOString() };
    } else {
      s.unshift({
        ...e,
        id: genId('evt'),
        follow_ups: [],
        platform_id: active ? active.id : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    saveStore(KEYS.events, s);
    return { success: true };
  },
  deleteEvent: (id) => saveStore(KEYS.events, loadStore(KEYS.events).filter(x => x.id !== id)),
  getEvent: (id) => loadStore(KEYS.events).find(x => x.id === id) || GUEST_SESSIONS.events.find(x => x.id === id),

  // Activities
  getActivities: () => {
    const active = window.DB.getActivePlatform();
    const all = loadStore(KEYS.activities);
    return active ? all.filter(x => x.platform_id === active.id) : all;
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
      s.unshift({ ...a, id: genId('act'), platform_id: active ? active.id : null, created_at: new Date().toISOString() });
    }
    saveStore(KEYS.activities, s);
    return { success: true };
  },
  deleteActivity: (id) => saveStore(KEYS.activities, loadStore(KEYS.activities).filter(x => x.id !== id)),
  getActivity: (id) => loadStore(KEYS.activities).find(x => x.id === id) || GUEST_SESSIONS.activities.find(x => x.id === id),

  // Inspections
  getInspections: () => {
    const active = window.DB.getActivePlatform();
    const all = loadStore(KEYS.inspections);
    return active ? all.filter(x => x.platform_id === active.id) : all;
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
  deleteInspection: (id) => saveStore(KEYS.inspections, loadStore(KEYS.inspections).filter(x => x.id !== id)),
  getInspection: (id) => loadStore(KEYS.inspections).find(x => x.id === id) || GUEST_SESSIONS.inspections.find(x => x.id === id),

  // Materials
  getMaterials: () => {
    const active = window.DB.getActivePlatform();
    const all = loadStore(KEYS.materials);
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
  deleteMaterial: (id) => saveStore(KEYS.materials, loadStore(KEYS.materials).filter(x => x.id !== id)),
  getMaterial: (id) => loadStore(KEYS.materials).find(x => x.id === id) || GUEST_SESSIONS.materials.find(x => x.id === id),

  // Systems
  getSystems: () => {
    const active = window.DB.getActivePlatform();
    const all = loadStore(KEYS.systems);
    return active ? all.filter(x => x.platform_id === active.id) : all;
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
          updated_at: now,
          author_name: user ? user.name : 'Guest'
        });
      }
      return { success: true };
    }

    const a = loadStore(KEYS.systems);
    const i = a.findIndex(x => x.id === s_obj.id);
    if (i >= 0) {
      a[i] = { ...a[i], ...s_obj, updated_at: now };
    } else {
      a.unshift({ 
        ...s_obj, 
        id: genId('sys'), 
        platform_id: active ? active.id : null, 
        created_at: now, 
        updated_at: now,
        author_name: user ? user.name : 'System'
      });
    }
    saveStore(KEYS.systems, a);
    return { success: true };
  },
  deleteSystem: (id) => saveStore(KEYS.systems, loadStore(KEYS.systems).filter(x => x.id !== id)),
  getSystem: (id) => loadStore(KEYS.systems).find(x => x.id === id) || GUEST_SESSIONS.systems.find(x => x.id === id),

  // Notes
  getNotes: () => {
    const active = window.DB.getActivePlatform();
    const all = loadStore(KEYS.notes);
    return active ? all.filter(x => x.platform_id === active.id) : all;
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
  deleteNote: (id) => saveStore(KEYS.notes, loadStore(KEYS.notes).filter(x => x.id !== id)),
  getNote: (id) => loadStore(KEYS.notes).find(x => x.id === id) || GUEST_SESSIONS.notes.find(x => x.id === id),

  // Alerts
  getAlerts: () => {
    const active = window.DB.getActivePlatform();
    const all = loadStore(KEYS.alerts);
    return active ? all.filter(x => x.platform_id === active.id) : all;
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
  deleteAlert: (id) => saveStore(KEYS.alerts, loadStore(KEYS.alerts).filter(x => x.id !== id)),
  getAlert: (id) => loadStore(KEYS.alerts).find(x => x.id === id) || GUEST_SESSIONS.alerts.find(x => x.id === id),

  // Orifice Plates
  getOrificePlates: () => {
    const active = window.DB.getActivePlatform();
    const all = loadStore(KEYS.orifice_plates);
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
  deleteOrificePlate: (id) => saveStore(KEYS.orifice_plates, loadStore(KEYS.orifice_plates).filter(x => x.id !== id)),
  getOrificePlate: (id) => loadStore(KEYS.orifice_plates).find(x => x.id === id) || GUEST_SESSIONS.orifice_plates.find(x => x.id === id),

  // Calibrations
  getCalibrations: () => {
    const active = window.DB.getActivePlatform();
    const all = loadStore(KEYS.calibrations);
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
    if (i >= 0) {
      s[i] = { ...s[i], ...c, updated_at: now };
    } else {
      s.unshift({ 
        ...c, 
        id: genId('cal'), 
        platform_id: active ? active.id : null, 
        created_at: now, 
        updated_at: now 
      });
    }
    saveStore(KEYS.calibrations, s);

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
  deleteCalibration: (id) => saveStore(KEYS.calibrations, loadStore(KEYS.calibrations).filter(x => x.id !== id)),

  // Platforms
  getPlatforms: () => loadStore(KEYS.platforms),
  savePlatform: (p) => {
    const s = loadStore(KEYS.platforms);
    const i = s.findIndex(x => x.id === p.id);
    if (i >= 0) s[i] = { ...s[i], ...p };
    else s.push({ ...p, id: genId('plat'), created_at: new Date().toISOString() });
    saveStore(KEYS.platforms, s);
  },
  deletePlatform: (id) => saveStore(KEYS.platforms, loadStore(KEYS.platforms).filter(x => x.id !== id)),
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
  deleteUser: (id) => saveStore(KEYS.users, loadStore(KEYS.users).filter(x => x.id !== id)),
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
  }
};

// Initialize seed on load
initSeed();
migrateData();
pullFromCloud();

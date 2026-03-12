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

const SEED_EVENTS = [
  {
    id: 'evt-fc-001',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-126',
    tag_code: 'FC-1101',
    title: 'Morning Shift Handover — 07:00',
    description: 'Relief of night shift (R. Costa). All custody transfer skids operating normally. No active alarms in the Metering Room. Allocation factor for previous day calculated at 0.9982.',
    author: 'J. Santos',
    category: 'Handover',
    priority: 'medium',
    status: 'closed',
    system: 'Management',
    actions_taken: 'Verbal briefing completed. Daily reports signed and filed.',
    follow_up_required: false,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'evt-fc-002',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-103',
    tag_code: 'FT-2101',
    title: 'Coriolis Calibration Successful — FT-2101',
    description: 'Verification with Compact Prover (30XX001) completed on Oil Export line A. All five runs showed repeatability within 0.05%. Meter factor adjusted from 0.9984 to 0.9987.',
    author: 'A. Ferreira',
    category: 'Calibration',
    priority: 'high',
    status: 'closed',
    system: 'Oil Metering',
    actions_taken: 'New MF updated in Flow Computer FC-2101. Report signed by third-party witness.',
    follow_up_required: false,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'evt-fc-003',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-117',
    tag_code: 'PDT-1101',
    title: 'Minor Oil Leak — Strainer Flange F-101',
    description: 'A small weeping leak (approx. 2 drops per minute) detected at the upstream strainer flange of Skid 01. No immediate fire hazard, but requires gasket replacement during next maintenance window.',
    author: 'M. Oliveira',
    category: 'Maintenance',
    priority: 'low',
    status: 'open',
    system: 'Gas Intake',
    actions_taken: 'Spillage contained with absorbent pads. Tightened bolts — leak persists at reduced rate.',
    follow_up_required: true,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'evt-fc-004',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-126',
    tag_code: 'FC-1101',
    title: 'Flow Computer Firmware Patch — Security Fix',
    description: 'Applied critical security patch (v2.4.1) to Flow Computer FC-1101 following corporate IT directive. Patch addresses vulnerabilities in the Modbus over IP communication layer.',
    author: 'R. Costa',
    category: 'IT/Automation',
    priority: 'high',
    status: 'closed',
    system: 'Control Systems',
    actions_taken: 'Backup configuration saved before update. Post-patch hashing confirmed integrity.',
    follow_up_required: false,
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
  {
    id: 'evt-fc-005',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-130',
    tag_code: 'SIS-001',
    title: 'Quarterly Safety Loop Test — Pass',
    description: 'Annual functional safety test for SIS logic solver and final elements (SDVs). All response times remained below 2.0 seconds. No diagnostic failures found.',
    author: 'J. Santos',
    category: 'Safety',
    priority: 'medium',
    status: 'closed',
    system: 'ESD System',
    actions_taken: 'Logged into the SIS maintenance register. Bypass removed post-test.',
    follow_up_required: false,
    created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 96).toISOString(),
  },
];

const SEED_ACTIVITIES = [
  {
    id: 'act-fc-001',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-117',
    tag_code: 'PDT-1101',
    title: 'Gasket Replacement — Skid 01 Flange',
    description: 'Isolate strainer S-101, vent to flare, and replace defective gasket at the upstream flange. Torque to design specs.',
    responsible: 'M. Oliveira',
    due_date: new Date(Date.now() + 3600000 * 48).toISOString().split('T')[0],
    priority: 'high',
    status: 'open',
    comments: ['Absorbent pads already in place. Verify depressurization before opening.'],
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'act-fc-002',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-126',
    tag_code: 'FC-1101',
    title: 'Monthly Data Dump and Verification',
    description: 'Extract monthly totalization and event logs from Gas Flow Computer. Reconcile against DCS daily averages.',
    responsible: 'J. Santos',
    due_date: new Date(Date.now() + 3600000 * 24).toISOString().split('T')[0],
    priority: 'medium',
    status: 'in-progress',
    comments: ['USB token collected from CCR safe.'],
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'act-fc-003',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-130',
    tag_code: 'SIS-001',
    title: 'Annual Alarm Logic Validation',
    description: 'Ensure cross-departmental witnesses are available for the annual SIL-3 loop certification. Test SDV travel times.',
    responsible: 'R. Costa',
    due_date: new Date(Date.now() + 3600000 * 720).toISOString().split('T')[0],
    priority: 'low',
    status: 'open',
    comments: ['Third-party specialist arriving on Monday flight.'],
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'act-fc-004',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-105',
    tag_code: 'AT-1101',
    title: 'Replacement of Calibration Gas Cylinder',
    description: 'The current GC calibration gas (N2/Methane/Ethane mix) is at 150 psi. Replace with new certified cylinder before night shift.',
    responsible: 'A. Ferreira',
    due_date: new Date(Date.now() + 3600000 * 2).toISOString().split('T')[0],
    priority: 'critical',
    status: 'open',
    comments: ['New cylinder SN: 88442 confirmed in analyzer house.'],
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'act-fc-005',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-109',
    tag_code: 'ST-5001',
    title: 'Purge Oil Sampling Bottle Rack',
    description: 'Empty and clean all 15 production sampling bottles. Ensure vacuum sealing is intact for upcoming offloading.',
    responsible: 'M. Oliveira',
    due_date: new Date(Date.now() + 3600000 * 12).toISOString().split('T')[0],
    priority: 'medium',
    status: 'open',
    comments: ['Chemical cleaning agent identified in storage.'],
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

const SEED_INSPECTIONS = [
  {
    id: 'insp-fc-001',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-101',
    tag_code: 'FT-1101',
    date: new Date(Date.now() - 3600000 * 24 * 5).toISOString().split('T')[0],
    inspector: 'G. Almeida',
    condition: 'Excellent',
    findings: 'Visual inspection of meter FT-1101 body and impulse lines. No corrosion detected. Cable glands tight and no moisture ingress in the junction box. Grounding straps confirmed low resistance.',
    recommendation: 'Next visual check due in 90 days.',
    status: 'closed',
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
  {
    id: 'insp-fc-002',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-128',
    tag_code: 'SDV-9001',
    date: new Date(Date.now() - 3600000 * 24 * 2).toISOString().split('T')[0],
    inspector: 'J. Santos',
    condition: 'Good',
    findings: 'Full stroke test during planned shutdown. Valve closure time: 1.8s (Limit < 2s). Local indicator matches DCS feedback. No stem leaks observed during high pressure hold.',
    recommendation: 'Scheduled for annual overhaul in Q4.',
    status: 'closed',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: 'insp-fc-003',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-117',
    tag_code: 'PDT-1101',
    date: new Date(Date.now() - 3600000 * 24 * 1).toISOString().split('T')[0],
    inspector: 'M. Oliveira',
    condition: 'Degraded',
    findings: 'External weeping at flange connection. Gasket appears brittle. Tightening attempt was unsuccessful. No sign of impulse line plugging.',
    recommendation: 'Replace gasket. See related Activity act-fc-001.',
    status: 'open',
    created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
  },
  {
    id: 'insp-fc-004',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-130',
    tag_code: 'SIS-001',
    date: new Date(Date.now() - 3600000 * 24 * 10).toISOString().split('T')[0],
    inspector: 'R. Costa',
    condition: 'Excellent',
    findings: 'Logic solver diagnostic battery check. Voltage: 3.61V (Nominal 3.6V). No memory parity errors. Cabinet cooling fans operating within current limits.',
    recommendation: 'Replace internal backup battery in 6 months.',
    status: 'closed',
    created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
  },
  {
    id: 'insp-fc-005',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-110',
    tag_code: '30XX001',
    date: new Date(Date.now()).toISOString().split('T')[0],
    inspector: 'F. Silva',
    condition: 'Good',
    findings: 'Compact Prover pre-operation check. Piston seal leak test performed successfully (0 pressure drop in 5 mins). Optical switches cleaned.',
    recommendation: 'Ready for use in next calibration campaign.',
    status: 'closed',
    created_at: new Date().toISOString(),
  },
];

const SEED_MATERIALS = [
  {
    id: 'mat-fc-001',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-103',
    tag_code: 'FT-2101',
    ifs_code: 'IFS-99201',
    serial_number: 'MM-8821',
    shipment_date: new Date(Date.now() - 3600000 * 24 * 7).toISOString().split('T')[0],
    destination: 'Onshore Lab — Metroland',
    status: 'in-transit',
    expected_return: new Date(Date.now() + 3600000 * 24 * 14).toISOString().split('T')[0],
    notes: 'Meter pulled for recertification. AWB: ML-2026-001.',
    created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
  },
  {
    id: 'mat-fc-002',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-127',
    tag_code: 'FC-2101',
    ifs_code: 'IFS-99205',
    serial_number: 'S-77442',
    shipment_date: '',
    destination: 'Site Storage — Zone 1',
    status: 'available',
    expected_return: '',
    notes: 'Spare CPU card for Flow Computer. Tested and functional.',
    created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
  },
  {
    id: 'mat-fc-003',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-121',
    tag_code: 'WELL-P01',
    ifs_code: 'IFS-99208',
    serial_number: 'DH-GAUGE-99',
    shipment_date: new Date(Date.now() - 3600000 * 24 * 2).toISOString().split('T')[0],
    destination: 'Workshop — Maintenance Area',
    status: 'in-overhaul',
    expected_return: new Date(Date.now() + 3600000 * 24 * 5).toISOString().split('T')[0],
    notes: 'Downhole gauge retrieved for battery replacement.',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: 'mat-fc-004',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-105',
    tag_code: 'AT-1101',
    ifs_code: 'IFS-99210',
    serial_number: 'GC-PROC-33',
    shipment_date: '',
    destination: 'Onboard Spare',
    status: 'available',
    expected_return: '',
    notes: 'Set of replacement solenoid valves for GC analyzer.',
    created_at: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
  },
  {
    id: 'mat-fc-005',
    platform_id: 'plat-flowcore',
    tag_id: null,
    tag_code: 'M-TOOLS',
    ifs_code: 'IFS-99215',
    serial_number: 'HART-475-01',
    shipment_date: '',
    destination: 'Instrumentation Shop',
    status: 'available',
    expected_return: '',
    notes: 'Portable HART Communicator (Field Unit 1). Battery healthy.',
    created_at: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
  },
];

const SEED_SYSTEMS = [
  {
    id: 'sys-fc-001',
    platform_id: 'plat-flowcore',
    system_name: 'Main Metering Station',
    tag_id: 'tag-fc-126',
    tag_code: 'FC-1101',
    serial_number: 'FC-FLOWCORE-01',
    expire_date: '2027-12-31',
    active: true,
    notes: 'Central custody transfer system for gas export. v2.4.1 firmware.',
    created_at: new Date(Date.now() - 3600000 * 24 * 365).toISOString(),
  },
  {
    id: 'sys-fc-002',
    platform_id: 'plat-flowcore',
    system_name: 'Oil Export Control',
    tag_id: 'tag-fc-127',
    tag_code: 'FC-2101',
    serial_number: 'FC-FLOWCORE-02',
    expire_date: '2027-12-31',
    active: true,
    notes: 'Central custody transfer system for liquid export.',
    created_at: new Date(Date.now() - 3600000 * 24 * 365).toISOString(),
  },
  {
    id: 'sys-fc-003',
    platform_id: 'plat-flowcore',
    system_name: 'Gas Analysis Rack',
    tag_id: 'tag-fc-105',
    tag_code: 'AT-1101',
    serial_number: 'ANALYZER-FC-01',
    expire_date: '2026-06-30',
    active: true,
    notes: 'Online GC for calorific value determination.',
    created_at: new Date(Date.now() - 3600000 * 24 * 180).toISOString(),
  },
  {
    id: 'sys-fc-004',
    platform_id: 'plat-flowcore',
    system_name: 'Safety & ESD Logic',
    tag_id: 'tag-fc-130',
    tag_code: 'SIS-001',
    serial_number: 'SIS-SIL3-FC',
    expire_date: '2030-01-01',
    active: true,
    notes: 'Main logic solver for functional safety. All cards healthy.',
    created_at: new Date(Date.now() - 3600000 * 24 * 500).toISOString(),
  },
  {
    id: 'sys-fc-005',
    platform_id: 'plat-flowcore',
    system_name: 'Flare Monitoring Unit',
    tag_id: 'tag-fc-108',
    tag_code: 'FT-4001',
    serial_number: 'FLARE-MON-01',
    expire_date: '2026-11-20',
    active: true,
    notes: 'Environmental monitoring system for venting/flaring logs.',
    created_at: new Date(Date.now() - 3600000 * 24 * 100).toISOString(),
  },
];

const SEED_NOTES = [
  {
    id: 'note-fc-001',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-121',
    tag_code: 'WELL-P01',
    note_type: 'well-test',
    system: 'Production',
    condition: 'Optimal flow',
    test_date: new Date(Date.now() - 3600000 * 24 * 5).toISOString().split('T')[0],
    deadline_date: new Date(Date.now() + 3600000 * 24 * 85).toISOString().split('T')[0],
    guidance: 'Well steady at 2400 bopd. BSW: 0.5%. RGO: 120.',
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
  {
    id: 'note-fc-002',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-122',
    tag_code: 'WELL-P02',
    note_type: 'well-test',
    system: 'Production',
    condition: 'Stable',
    test_date: new Date(Date.now() - 3600000 * 24 * 2).toISOString().split('T')[0],
    deadline_date: new Date(Date.now() + 3600000 * 24 * 88).toISOString().split('T')[0],
    guidance: 'Stable performance. Sand detection trace only.',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: 'note-fc-003',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-125',
    tag_code: 'WELL-P03',
    note_type: 'well-test',
    system: 'Production',
    condition: 'High Pressure',
    test_date: new Date(Date.now() - 3600000 * 24 * 45).toISOString().split('T')[0],
    deadline_date: new Date(Date.now() + 3600000 * 24 * 45).toISOString().split('T')[0],
    guidance: 'Monitoring choke setting closely. No acidification required yet.',
    created_at: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
  },
  {
    id: 'note-fc-004',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-121',
    tag_code: 'WELL-P01',
    note_type: 'well-test',
    system: 'Production',
    condition: 'Follow up',
    test_date: new Date(Date.now() - 3600000 * 24 * 1).toISOString().split('T')[0],
    deadline_date: new Date(Date.now() + 3600000 * 24 * 89).toISOString().split('T')[0],
    guidance: 'Small adjustment to choke. Recovery observed.',
    created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
  },
  {
    id: 'note-fc-005',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-122',
    tag_code: 'WELL-P02',
    note_type: 'well-test',
    system: 'Production',
    condition: 'Verification',
    test_date: new Date().toISOString().split('T')[0],
    deadline_date: new Date(Date.now() + 3600000 * 24 * 90).toISOString().split('T')[0],
    guidance: 'Routine verification complete. No deviations found.',
    created_at: new Date().toISOString(),
  },
];

const SEED_ALERTS = [
  {
    id: 'alert-fc-001',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-117',
    tag_code: 'PDT-1101',
    title: 'OBSERVATION: Gasket Leak on Skid 01',
    description: 'Minor weeping confirmed by mechanical crew. Scheduled for repair.',
    reminder_type: 'alert',
    recurrence: 'none',
    priority: 'medium',
    due_date: new Date(Date.now() + 3600000 * 24).toISOString().split('T')[0],
    status: 'open',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'alert-fc-002',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-105',
    tag_code: 'AT-1101',
    title: 'CRITICAL: Gas Calibration Cylinder Low',
    description: 'Analyzer House Skid 01 pressure at critical level. Replacement required before shift ends.',
    reminder_type: 'alert',
    recurrence: 'none',
    priority: 'critical',
    due_date: new Date().toISOString().split('T')[0],
    status: 'overdue',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'alert-fc-003',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-128',
    tag_code: 'SDV-9001',
    title: 'REMINDER: SDV Travel Time Review',
    description: 'Review stroke test results from yesterday. Final entry in logbook needed.',
    reminder_type: 'reminder',
    recurrence: 'none',
    priority: 'low',
    due_date: new Date(Date.now() + 3600000 * 48).toISOString().split('T')[0],
    status: 'open',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'alert-fc-004',
    platform_id: 'plat-flowcore',
    tag_id: 'tag-fc-130',
    tag_code: 'SIS-001',
    title: 'Quarterly Safety Loop Audit',
    description: 'Ensure all proof test records for the current quarter are uploaded to the shared repository.',
    reminder_type: 'reminder',
    recurrence: 'quarterly',
    priority: 'medium',
    due_date: new Date(Date.now() + 3600000 * 24 * 15).toISOString().split('T')[0],
    status: 'open',
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
  {
    id: 'alert-fc-005',
    platform_id: 'plat-flowcore',
    tag_id: null,
    tag_code: 'GEN-ADMIN',
    title: 'Weekly Management Report Generation',
    description: 'Compile event and activity logs from Evergreen for the weekly production meeting.',
    reminder_type: 'reminder',
    recurrence: 'weekly',
    priority: 'low',
    due_date: new Date().toISOString().split('T')[0],
    status: 'open',
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
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
  seeded: 'ph_seeded_v20', // v2.00: Evergreen Pro Demo Reconstruction
  calibrations: 'ph_calibrations',
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
        'calibrations': KEYS.calibrations,
        'embarkations': KEYS.embarkations,
        'users': KEYS.users,
        'platforms': KEYS.platforms
    };

    console.log('🔄 Pulling global data from Supabase Cloud...');

    for (const [tableName, localKey] of Object.entries(tableMap)) {
        try {
            const { data, error } = await window.supabaseClient
                .from(tableName)
                .select('*');

            if (error) throw error;

            // If we have data (or even an empty array if correctly queried), we reconcile
            if (data) {
                const localData = JSON.parse(localStorage.getItem(localKey)) || [];
                
                // Identify IDs from Cloud
                const cloudIds = new Set(data.map(r => r.id));
                
                // 1. Merge Strategy: Update existing or add new
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

                // 2. RECONCILIATION: Remove local items NOT in Cloud (Mirroring Deletions)
                // SAFETY LOCK: Only reconcile if the Cloud HAS records. 
                // If Cloud is empty, we DON'T assume a wipe; we assume it's a first run or sync failure.
                const coreTables = ['tags', 'platforms', 'events', 'activities', 'orifice_plates', 'systems'];
                let reconciled;
                
                if (coreTables.includes(tableName) && data.length > 0) {
                    // Match the cloud state exactly (If it's gone from Master, it's gone from Local)
                    reconciled = merged.filter(item => cloudIds.has(item.id));
                } else {
                    // Keep merged local data if cloud is empty
                    reconciled = merged;
                }

                localStorage.setItem(localKey, JSON.stringify(reconciled));
                console.log(`✅ ${tableName}: ${data.length} registros (Reconciliado).`);
            }
        } catch (e) {
            console.warn(`⚠️ Erro ao puxar tabela ${tableName}:`, e);
        }
    }
    // If we reach here and supabaseClient is active, we are effectively Online
    updateStatusUI('online');
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

// Real-time Cloud Listeners - Reage a mudanças vindas de outros usuários
function initRealtimeListeners() {
    if (!window.supabaseClient) return;

    const tables = ['events', 'tags', 'activities', 'inspections', 'materials', 'systems', 'notes', 'alerts', 'orifice_plates'];
    
    tables.forEach(table => {
        window.supabaseClient
            .channel(`realtime:${table}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: table }, payload => {
                console.log(`☁️ Mudança em tempo real (${table}):`, payload.eventType);
                
                // Get the local key for this table
                const localKey = Object.keys(KEYS).find(k => k === (table === 'orifice_plates' ? 'orifice_plates' : table));
                const key = KEYS[localKey] || `ph_${table}`;

                const localData = JSON.parse(localStorage.getItem(key)) || [];
                let merged = [...localData];

                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const idx = merged.findIndex(i => i.id === payload.new.id);
                    if (idx >= 0) merged[idx] = payload.new;
                    else merged.push(payload.new);
                } else if (payload.eventType === 'DELETE') {
                    merged = merged.filter(i => i.id === payload.old.id);
                }

                localStorage.setItem(key, JSON.stringify(merged));
                
                // Refresh UI if necessary
                if (window.refreshCurrentPage) {
                    window.refreshCurrentPage();
                    toast('Dados atualizados via nuvem.', 'info');
                }
            })
            .subscribe();
    });
    
    updateStatusUI('online');
}

function initSeed() {
  const latestV = '2.00'; // v2.00: Evergreen Pro Demo Reconstruction
  const currentV = localStorage.getItem(KEYS.seeded);
  
  if (currentV === latestV) return;

  console.log(`🚀 Initing Seed Evolution: ${currentV || 'INITIAL'} -> ${latestV}`);

  const seedIfEmpty = (key, data) => {
    const existing = localStorage.getItem(key);
    if (!existing || existing === '[]' || existing === 'null') {
      saveStore(key, data);
    }
  };

  // Ensure Admin account always exists
  const users = loadStore(KEYS.users);
  if (users.length === 0) {
    saveStore(KEYS.users, SEED_USERS);
  } else {
    const adminIdx = users.findIndex(u => u.username === 'admin');
    if (adminIdx === -1) {
      users.push(SEED_USERS[0]);
      saveStore(KEYS.users, users);
    }
  }

  // --- SURGICAL RESET (FlowCore ONLY) ---
  // We keep records from plat-atlanta or global (*), but reset plat-flowcore to the new Seed.
  const resetFlowCoreStore = (key, seedData) => {
    let current = loadStore(key);
    const protectedData = current.filter(x => x && (x.platform_id === 'plat-atlanta' || x.platform_id === '*'));
    const merged = [...protectedData, ...seedData];
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

  // Post-process: Ensure Atlanta Excel tags are merged into the registry
  let currentTags = loadStore(KEYS.tags);
  const excelPool = (typeof EXCEL_TAGS !== 'undefined' ? EXCEL_TAGS : []);
  
  excelPool.forEach(newTag => {
    const exists = currentTags.find(t => t.tag_code === newTag.tag_code && t.platform_id === newTag.platform_id);
    if (!exists) {
      currentTags.push({ ...newTag, id: newTag.id || genId('tag'), status: newTag.status || 'ok' });
    }
  });

  saveStore(KEYS.tags, currentTags);
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
  deleteEvent: (id) => {
    syncDeleteToCloud(KEYS.events, id);
    return saveStore(KEYS.events, loadStore(KEYS.events).filter(x => x.id !== id));
  },
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
  deleteActivity: (id) => {
    syncDeleteToCloud(KEYS.activities, id);
    return saveStore(KEYS.activities, loadStore(KEYS.activities).filter(x => x.id !== id));
  },
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
  deleteInspection: (id) => {
    syncDeleteToCloud(KEYS.inspections, id);
    return saveStore(KEYS.inspections, loadStore(KEYS.inspections).filter(x => x.id !== id));
  },
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
  deleteMaterial: (id) => {
    syncDeleteToCloud(KEYS.materials, id);
    return saveStore(KEYS.materials, loadStore(KEYS.materials).filter(x => x.id !== id));
  },
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
  deleteSystem: (id) => {
    syncDeleteToCloud(KEYS.systems, id);
    return saveStore(KEYS.systems, loadStore(KEYS.systems).filter(x => x.id !== id));
  },
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
  deleteNote: (id) => {
    syncDeleteToCloud(KEYS.notes, id);
    return saveStore(KEYS.notes, loadStore(KEYS.notes).filter(x => x.id !== id));
  },
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
  deleteAlert: (id) => {
    syncDeleteToCloud(KEYS.alerts, id);
    return saveStore(KEYS.alerts, loadStore(KEYS.alerts).filter(x => x.id !== id));
  },
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
  deleteOrificePlate: (id) => {
    syncDeleteToCloud(KEYS.orifice_plates, id);
    return saveStore(KEYS.orifice_plates, loadStore(KEYS.orifice_plates).filter(x => x.id !== id));
  },
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

  deleteEvent: (id) => {
    syncDeleteToCloud(KEYS.events, id);
    const s = loadStore(KEYS.events);
    const filtered = s.filter(e => e.id !== id);
    saveStore(KEYS.events, filtered);
    return { success: true };
  },

  // Manual Cloud Control
  pushLocalToCloud: pushLocalToCloud,
  pullFromCloud: pullFromCloud,
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

  // Export/Import
  exportDatabase,
  importDatabase
};

// Initialize seed on load
createLocalSnapshot(); // Guardar 90% atual antes de tudo
initSeed();
migrateData();
pullFromCloud();
initRealtimeListeners();

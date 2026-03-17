// ============================================================
//  pages-tags.js — TAG Registry & TAG Detail/Timeline
// ============================================================

let currentTagFilter = 'all';
let currentTagSearch = '';

function tagFormHtml(t) {
  const types = ['Flow Computer', 'Flow Meter', 'Transmitter', 'Well', 'Pilot Burner', 'Sampler', 'Skid', 'Valve', 'Analyser', 'Other'];
  const statuses = ['ok', 'open-issue', 'inspection', 'decommissioned'];
  const isWell = (t && t.type === 'Well');
  
  return `
    <form id="tag-form" class="space-y-0">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label" id="lbl-tag-code">${isWell ? 'Well Number' : 'TAG Code'}</label>
          <input class="form-input" id="tf-code" value="${escHtml(t ? t.tag_code : '')}" placeholder="${isWell ? 'e.g. 7-ABC-123-XY' : 'e.g. FT-1001'}" required />
        </div>
        <div class="form-group"><label class="form-label">Serial Number</label><input class="form-input" id="tf-serial" value="${escHtml(t ? t.serial_number : '')}" placeholder="S/N" /></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Instrument / System</label><input class="form-input" id="tf-system" value="${escHtml(t ? (t.system || t.name) : '')}" placeholder="Description from System column" required /></div>
        <div class="form-group"><label class="form-label">Location</label><input class="form-input" id="tf-location" value="${escHtml(t ? t.location : '')}" placeholder="e.g. Skid A, Module B" /></div>
      </div>
      <div class="grid-3">
        <div class="form-group"><label class="form-label">Type</label>
          <select class="form-select" id="tf-type" onchange="document.getElementById('lbl-tag-code').textContent = this.value === 'Well' ? 'Well Number' : 'TAG Code'">
            ${types.map(tp => `<option ${t && t.type === tp ? 'selected' : ''}>${tp}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-select" id="tf-status">${statuses.map(s => `<option value="${s}" ${t && t.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Classification</label>
          <select class="form-select" id="tf-class">
            ${['Fiscal', 'Allocation', 'Custody Transfer', 'Operational', 'Unclassified'].map(c => `<option ${t && t.classification === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grid-3">
        <div class="form-group"><label class="form-label">Installation Status</label>
          <select class="form-select" id="tf-inst-status">
            ${['Installed', 'Removed'].map(s => `<option ${t && t.installation_status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Last Calibration</label><input class="form-input" id="tf-last-cal" value="${escHtml(t ? t.last_calibration : '')}" placeholder="e.g. 1-Jan-2024" /></div>
        <div class="form-group"><label class="form-label">Calibration Due (Deadline)</label><input class="form-input" id="tf-deadline" value="${escHtml(t ? t.deadline : '')}" placeholder="e.g. 1-Jan-2025" /></div>
      </div>
      <div class="grid-3">
        <div class="form-group"><label class="form-label">Interval (Months)</label><input type="number" class="form-input" id="tf-interval" value="${t ? (t.calibration_interval || '') : ''}" placeholder="e.g. 12" /></div>
      </div>
      <div class="form-group"><label class="form-label">Overhaul Comments / Technical Note</label><textarea class="form-textarea" id="tf-overhaul" placeholder="Specific technical notes for this instrument...">${escHtml(t ? (t.overhaul_comments || '') : '')}</textarea></div>
      
      ${t && t.tag_code === '30XX001' ? `
      <div class="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl mb-4">
        <h4 class="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Compact Prover Technical Specs</h4>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Avg Volume at 20ºC</label><input class="form-input" id="tf-avg-vol" value="${escHtml(t.avg_volume || '')}" placeholder="454 272 mL" /></div>
          <div class="form-group"><label class="form-label">Repeatability</label><input class="form-input" id="tf-repeat" value="${escHtml(t.repeatability || '')}" placeholder="0,014%" /></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Uncertainty</label><input class="form-input" id="tf-uncertainty" value="${escHtml(t.uncertainty || '')}" placeholder="209 mL / 0,046%" /></div>
          <div class="form-group"><label class="form-label">Last Vendor</label><input class="form-input" id="tf-vendor" value="${escHtml(t.last_vendor || '')}" placeholder="ODS" /></div>
        </div>
      </div>
      ` : ''}

      <div class="form-group"><label class="form-label">Notes (General)</label><textarea class="form-textarea" id="tf-notes" style="min-height:60px">${escHtml(t ? t.notes : '')}</textarea></div>
      <div class="flex gap-3 justify-end pt-2">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${t ? 'Update TAG' : 'Register TAG'}</button>
      </div>
    </form>`;
}

function bindTagForm(existing) {
  document.getElementById('tag-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const systemVal = document.getElementById('tf-system').value;
    const result = DB.saveTag({
      id: existing ? existing.id : null,
      tag_code: document.getElementById('tf-code').value.toUpperCase(),
      name: systemVal,
      system: systemVal,
      location: document.getElementById('tf-location').value,
      type: document.getElementById('tf-type').value,
      status: document.getElementById('tf-status').value,
      serial_number: document.getElementById('tf-serial').value,
      classification: document.getElementById('tf-class').value,
      calibration_interval: document.getElementById('tf-interval').value,
      last_calibration: document.getElementById('tf-last-cal').value,
      deadline: document.getElementById('tf-deadline').value,
      notes: document.getElementById('tf-notes').value,
      overhaul_comments: document.getElementById('tf-overhaul').value,
      // Special fields
      avg_volume: document.getElementById('tf-avg-vol')?.value,
      repeatability: document.getElementById('tf-repeat')?.value,
      uncertainty: document.getElementById('tf-uncertainty')?.value,
      last_vendor: document.getElementById('tf-vendor')?.value,
      installation_status: document.getElementById('tf-inst-status').value,
    });

    if (!handleSaveResult(result)) return;

    toast(existing ? 'TAG updated' : 'TAG registered', 'success');
    closeModal();
    renderTags(document.getElementById('page-container'));
  });
}

function editTag(id) {
  const t = DB.getTag(id);
  if (!t) return;
  openModal('Edit TAG', tagFormHtml(t), () => bindTagForm(t));
}

function classBadge(c) {
  if (!c || c === 'Unclassified') return '';
  const map = { 'Fiscal': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', 'Allocation': 'bg-blue-500/10 text-blue-400 border-blue-500/20', 'Custody Transfer': 'bg-purple-500/10 text-purple-400 border-purple-500/20', 'Operational': 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
  return `<span class="px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${map[c] || map.Operational}">${c}</span>`;
}

function renderTags(container) {
  // Philosophy: Registry shows instruments/computers, but excludes Wells (managed via Well Test card)
  const allTags = DB.getTags();
  const tags = allTags.filter(t => t.type !== 'Well');
  const dutyCount = tags.filter(t => t.op_mode !== 'Idle').length;
  const idleCount = tags.filter(t => t.op_mode === 'Idle').length;

  function render(f, q) {
    currentTagFilter = f; 
    currentTagSearch = q !== undefined ? q : currentTagSearch;
    let list = tags;
    if (currentTagFilter === 'issues') list = list.filter(t => t.status === 'open-issue');
    if (currentTagFilter === 'inspection') list = list.filter(t => t.status === 'inspection');
    if (currentTagFilter === 'duty') list = list.filter(t => t.op_mode !== 'Idle');
    if (currentTagFilter === 'idle') list = list.filter(t => t.op_mode === 'Idle');
    
    if (currentTagSearch) {
      const qk = currentTagSearch.toLowerCase();
      list = list.filter(t => [t.tag_code, t.name, t.system, t.location, t.type, t.classification].some(x => (x || '').toLowerCase().includes(qk)));
    }

    // Sort: Prover (30XX001) always last
    list.sort((a, b) => {
      if (a.tag_code === '30XX001') return 1;
      if (b.tag_code === '30XX001') return -1;
      return (a.tag_code || '').localeCompare(b.tag_code || '');
    });
    
     const countEl = document.getElementById('tag-filtered-count');
    if (countEl) {
      countEl.textContent = `${list.length} shown`;
      // Visibility toggle without layout shift (use opacity or fixed slot)
      if (list.length === tags.length && !currentTagSearch) {
        countEl.style.opacity = '0';
        countEl.style.pointerEvents = 'none';
      } else {
        countEl.style.opacity = '1';
        countEl.style.pointerEvents = 'auto';
      }
    }

    document.getElementById('tag-grid').innerHTML = list.length === 0 ?
      `<div class="empty-state" style="grid-column:1/-1"><p>No TAGs found.</p></div>` :
      list.map(t => {
        const evtCount = DB.getEvents().filter(e => e.tag_id === t.id && !e.archived).length;
        const inspCount = DB.getInspections().filter(i => i.tag_id === t.id).length;
        const isIdle = t.op_mode === 'Idle';
        
        return `
          <div class="card card-interactive p-5" onclick="navigate('tag-detail', {id:'${t.id}'})">
            <div class="flex items-start justify-between mb-3">
              <span class="tag-chip text-base">${t.tag_code}</span>
              <div class="flex items-center gap-2">
                ${installationStatusBadge(t.installation_status)}
                ${opModeBadge(t.op_mode)}
                <button class="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-navy transition-all shadow-sm" 
                        title="Change Operational Mode" 
                        onclick="event.stopPropagation(); window.toggleTagMode('${t.id}')">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">${escHtml(t.system || t.name)}</div>
            <div class="text-navy font-bold flex items-center gap-2">
               ${escHtml(t.tag_code)}
               <span class="text-[10px] text-slate-400 font-medium">/ ${escHtml(t.serial_number || 'No S/N')}</span>
               ${classBadge(t.classification)}
            </div>

            ${t.tag_code === '30XX001' ? `
            <div class="mt-4 pt-4 border-t border-slate-800/50">
               <div class="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div class="text-[10px] text-slate-500 uppercase font-black">Avg Vol @ 20°C</div>
                    <div class="text-xs text-blue-400 font-bold">${escHtml(t.avg_volume || '---')}</div>
                  </div>
                  <div>
                    <div class="text-[10px] text-slate-500 uppercase font-black">Repeatability</div>
                    <div class="text-xs text-emerald-400 font-bold">${escHtml(t.repeatability || '---')}</div>
                  </div>
                  <div>
                    <div class="text-[10px] text-slate-500 uppercase font-black">Uncertainty</div>
                    <div class="text-[10px] text-orange-400 font-bold">${escHtml(t.uncertainty || '---')}</div>
                  </div>
                  <div>
                    <div class="text-[10px] text-slate-500 uppercase font-black">Last Vendor</div>
                    <div class="text-xs text-navy opacity-80 font-bold">${escHtml(t.last_vendor || '---')}</div>
                  </div>
               </div>
               <div class="flex items-center justify-between bg-slate-800/20 p-3 rounded-xl border border-slate-700/50">
                 <div class="flex flex-col">
                   <span class="text-[10px] uppercase font-black tracking-widest text-slate-500">Service Status</span>
                   <span class="text-xs font-bold ${t.is_available ? 'text-green-400' : 'text-red-400'}">${t.is_available ? 'Available' : 'Unavailable'}</span>
                 </div>
                 <label class="switch" onclick="event.stopPropagation()">
                   <input type="checkbox" ${t.is_available ? 'checked' : ''} onchange="toggleProverStatus('${t.id}')">
                   <span class="slider round"></span>
                 </label>
               </div>
               <button class="w-full mt-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all" onclick="event.stopPropagation(); editTag('${t.id}')">
                 Edit Technical Specs
               </button>
            </div>
            ` : `
            <div class="text-xs text-slate-500 mb-4">
              ${escHtml(t.system)} · ${escHtml(t.location)}
            </div>
            `}
            <div class="flex items-center justify-between text-xs text-slate-400 mt-auto">
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg>
                  ${evtCount}
                </span>
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  ${inspCount}
                </span>
                <span class="text-slate-600 text-[10px] uppercase font-bold tracking-tighter">${escHtml(t.type)}</span>
              </div>
              ${t.calibration_interval ? `<span class="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-black text-[9px] shadow-sm">CYCLE: ${t.calibration_interval}M</span>` : ''}
            </div>
          </div>`;
      }).join('');
    document.querySelectorAll('.tag-filter').forEach(c => c.classList.toggle('active', c.dataset.filter === currentTagFilter));
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">TAG Registry</h1>
        <div class="flex gap-4 mt-1">
          <div class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1.5 ring-1 ring-slate-800 px-2 py-0.5 rounded-full bg-navy-900/50 cursor-pointer hover:bg-slate-800/50 transition-all tag-filter" data-filter="all">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>${tags.length} Total
          </div>
          <div class="text-[10px] font-bold text-green-400 uppercase tracking-[0.2em] flex items-center gap-1.5 ring-1 ring-green-900/30 px-2 py-0.5 rounded-full bg-green-500/5 cursor-pointer hover:bg-green-500/10 transition-all tag-filter" data-filter="duty">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>${dutyCount} Duty
          </div>
          <div class="text-[10px] font-bold text-orange-400 uppercase tracking-[0.2em] flex items-center gap-1.5 ring-1 ring-orange-900/30 px-2 py-0.5 rounded-full bg-orange-500/5 cursor-pointer hover:bg-orange-500/10 transition-all tag-filter" data-filter="idle">
            <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>${idleCount} Idle
          </div>
          <div id="tag-filtered-count" class="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-1.5 ring-1 ring-blue-900/30 px-2 py-0.5 rounded-full bg-blue-500/5 transition-opacity duration-200" style="opacity:0">
            <!-- Dynamic count -->
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary flex items-center gap-2" onclick="openImportModal()">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
          Update on Demand
        </button>
        <button class="btn btn-primary" onclick="openModal('Register New TAG', tagFormHtml(null), () => bindTagForm(null))">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>Register TAG
        </button>
      </div>
    </div>
    <div class="filter-bar">
      <input id="tag-search" class="form-input" style="max-width:220px;padding:0.4rem 0.75rem" placeholder="Search TAG…" value="${escHtml(currentTagSearch)}" />
      <button class="filter-chip tag-filter" data-filter="all">All</button>
      <button class="filter-chip tag-filter" data-filter="issues">Open Issues</button>
      <button class="filter-chip tag-filter" data-filter="inspection">Inspection</button>
    </div>
    <div id="tag-grid" class="grid-3"></div>`;

  render(currentTagFilter, currentTagSearch);
  document.querySelectorAll('.tag-filter').forEach(b => b.addEventListener('click', () => render(b.dataset.filter, document.getElementById('tag-search').value)));
  document.getElementById('tag-search').addEventListener('input', e => render(currentTagFilter, e.target.value));
}

window.toggleTagMode = function(id, isDetail = false) {
  DB.toggleTagOpMode(id);
  toast('Operational mode updated', 'success');
  if (isDetail) {
    renderTagDetail(document.getElementById('page-container'), { id });
  } else {
    renderTags(document.getElementById('page-container'));
  }
};

// ---- TAG DETAIL / TIMELINE ----
function renderTagDetail(container, params) {
  if (!params || !params.id) { navigate('tags'); return; }
  const tag = DB.getTag(params.id);
  if (!tag) { toast('TAG not found', 'error'); navigate('tags'); return; }

  const timeline = DB.getTagTimeline(params.id);
  const typeLabels = { event: 'Event', inspection: 'Inspection', alert: 'Alert / Reminder', material: 'Material Movement', note: 'Operational Note', event_followup: 'Event Follow-up', system: 'System Config' };
  const typeColors = { event: 'timeline-event', inspection: 'timeline-inspection', alert: 'timeline-alert', material: 'timeline-material', note: 'timeline-note', event_followup: 'timeline-event', system: 'timeline-material', calibration: 'timeline-inspection' };
  const typeBgColors = { event: 'rgba(249,115,22,0.08)', inspection: 'rgba(99,102,241,0.08)', alert: 'rgba(239,68,68,0.08)', material: 'rgba(16,185,129,0.08)', note: 'rgba(245,158,11,0.08)', event_followup: 'rgba(249,115,22,0.04)', system: 'rgba(59,130,246,0.08)', calibration: 'rgba(16,185,129,0.04)' };
  const typeBorders = { event: 'rgba(249,115,22,0.2)', inspection: 'rgba(99,102,241,0.2)', alert: 'rgba(239,68,68,0.2)', material: 'rgba(16,185,129,0.2)', note: 'rgba(245,158,11,0.2)', event_followup: 'rgba(249,115,22,0.1)', system: 'rgba(59,130,246,0.2)', calibration: 'rgba(16,185,129,0.2)' };

  function tlItemHtml(item) {
    const d = item.data;
    let title = '', detail = '';
    if (item.type === 'event') { title = d.title; detail = d.description; }
    if (item.type === 'inspection') { title = `Inspection — ${d.condition}`; detail = d.findings; }
    if (item.type === 'alert') { title = d.title; detail = d.description; }
    if (item.type === 'material') { title = `Material: ${d.serial_number} → ${d.destination}`; detail = d.notes; }
    if (item.type === 'note') { title = `Note: ${d.condition}`; detail = d.guidance; }
    if (item.type === 'event_followup') { title = `Follow-up: ${d.event_title}`; detail = d.comment; }
    if (item.type === 'calibration') { title = `Manual Calibration Update`; detail = `New Deadline: ${d.deadline} | Work: ${d.notes}`; }
    if (item.type === 'system') { title = `System Config: ${d.system_name}`; detail = `Status: ${d.status} | FW: ${d.firmware} | SN: ${d.serial_number}`; }

    return `
      <div class="timeline-item">
        <div class="timeline-dot ${typeColors[item.type] || ''}"></div>
        <div class="rounded-xl p-4" style="background:${typeBgColors[item.type]};border:1px solid ${typeBorders[item.type]}">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wide">${typeLabels[item.type] || item.type}</span>
            <span class="text-xs text-slate-500">${fmt(item.date)}</span>
            ${item.type === 'event' ? priorityBadge(d.priority) + statusBadge(d.status) : ''}
            ${item.type === 'system' ? `<span class="badge ${d.status === 'Duty' ? 'badge-low' : 'status-open'}">${d.status}</span>` : ''}
          </div>
          <div class="text-sm font-semibold text-navy mb-1">${escHtml(title)}</div>
          ${detail ? `<div class="text-xs text-slate-400 line-clamp-3">${escHtml(detail)}</div>` : ''}
        </div>
      </div>`;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-4">
        <button class="btn btn-secondary btn-sm" onclick="navigate('tags')">← Back</button>
        <div>
          <div class="flex items-center gap-3 mb-1">
            <span class="tag-chip text-lg px-3 py-1">${tag.tag_code}</span>
            <div class="flex items-center gap-2">
              ${opModeBadge(tag.op_mode)}
              <button class="p-1 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-navy transition-all shadow-sm flex items-center gap-2" 
                      title="Change Operational Mode" 
                      onclick="window.toggleTagMode('${tag.id}', true)">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span class="text-[10px] uppercase font-bold tracking-widest">Switch Mode</span>
              </button>
            </div>
          </div>
          <h1 class="page-title">${escHtml(tag.system || tag.name)}</h1>
          <p class="page-subtitle">${escHtml(tag.system)} · ${escHtml(tag.location)} · ${escHtml(tag.type)}</p>
        </div>
      </div>
      <button class="btn btn-secondary" onclick="editTag('${tag.id}')">Edit TAG</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:1.5rem;align-items:start">

      <!-- Left info panel -->
      <div class="space-y-4">
        <div class="card p-5">
          <div class="section-label">Equipment Details</div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-slate-500">Type</span><span class="text-navy">${escHtml(tag.type)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">System</span><span class="text-navy">${escHtml(tag.system)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500" style="margin-right: 1.5rem">Location</span><span class="text-navy">${escHtml(tag.location)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Serial No.</span><span class="text-navy font-mono">${escHtml(tag.serial_number || '—')}</span></div>
            <div class="flex justify-between items-center"><span class="text-slate-500">Mode</span>
              <div class="flex items-center gap-2">
                ${opModeBadge(tag.op_mode)}
                <button class="p-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 transition-colors" 
                        onclick="window.toggleTagMode('${tag.id}', true)">
                   <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                </button>
              </div>
            </div>
          </div>
          <hr class="divider">
          <div class="section-label mb-2">Calibration Status</div>
          <div class="space-y-3">
             <div class="flex justify-between items-center">
                <span class="text-xs text-slate-400 italic">Last Cal:</span>
                <span class="text-xs text-navy font-bold">${escHtml(tag.last_calibration || 'N/A')}</span>
             </div>
             <div class="flex justify-between items-center">
                <span class="text-xs text-slate-400 italic">Deadline:</span>
                <span class="text-xs font-bold ${isOverdue(tag.deadline) ? 'text-red-400' : 'text-green-400'}">${escHtml(tag.deadline || 'N/A')}</span>
             </div>
             <div class="flex justify-between items-center">
                <span class="text-[10px] text-slate-500 uppercase">Interval Cycles:</span>
                <span class="text-[10px] text-orange-400 font-bold">${tag.calibration_interval ? tag.calibration_interval + ' Months' : 'Not Defined'}</span>
             </div>
             <button class="btn btn-secondary btn-sm w-full mt-2" onclick="openCalibrationHistory('${tag.id}')">
                <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Manage Calibration
             </button>
          </div>
          ${tag.notes ? `<hr class="divider"><div class="text-xs text-slate-400">${escHtml(tag.notes)}</div>` : ''}
        </div>

        <div class="card p-5">
          <div class="section-label">Summary</div>
          <div class="space-y-2">
            ${[
      ['Events', DB.getEvents().filter(e => e.tag_id === tag.id && !e.archived).length, '#f97316'],
      ['Inspections', DB.getInspections().filter(i => i.tag_id === tag.id).length, '#6366f1'],
      ['Alerts', DB.getAlerts().filter(a => a.tag_id === tag.id).length, '#ef4444'],
      ['Materials', DB.getMaterials().filter(m => m.tag_id === tag.id).length, '#10b981'],
      ['Notes', DB.getNotes().filter(n => n.tag_id === tag.id).length, '#f59e0b'],
    ].map(([label, count, color]) => `
              <div class="flex justify-between items-center text-sm">
                <span class="text-slate-400">${label}</span>
                <span class="font-bold" style="color:${color}">${count}</span>
              </div>`).join('')}
          </div>
        </div>

        <button class="btn btn-primary w-full" onclick="openModal('New Event for ${tag.tag_code}', eventFormHtml({tag_id:'${tag.id}',tag_code:'${tag.tag_code}'}), () => bindEventForm({tag_id:'${tag.id}',tag_code:'${tag.tag_code}'}))">
          + Add Event
        </button>
      </div>

      <!-- Right timeline -->
      <div class="card p-5">
        <div class="section-label mb-4">Full History Timeline (${timeline.length} records)</div>
        ${timeline.length === 0 ?
      '<div class="empty-state"><p>No history records for this TAG yet.</p></div>' :
      `<div class="py-2">${timeline.map(tlItemHtml).join('')}</div>`}
      </div>
    </div>`;

  // Fix responsive
  if (window.innerWidth < 768) {
    container.querySelector('[style*="grid-template-columns:1fr 2fr"]').style.gridTemplateColumns = '1fr';
  }
}

// Minimalist Well Registration for Operational Notes
function wellRegisterFormHtml() {
  return `
    <form id="well-min-form" class="space-y-4 pt-2">
      <div class="bg-navy-950/40 p-5 rounded-xl border border-slate-800/60 shadow-inner">
        <label class="form-label text-slate-400 uppercase tracking-widest font-bold text-[9px] mb-2 block">Well Number</label>
        <input class="form-input text-lg py-3.5 px-4 bg-navy-900 border-slate-700/50 focus:border-orange-500/50 transition-all shadow-sm" 
               id="wf-number" placeholder="e.g. 7-ABC-123-XY" required autofocus />
        <p class="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 justify-center">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Simplified registration for immediate use in Operational Notes.
        </p>
      </div>
      <div class="flex gap-3 justify-end mt-6">
        <button type="button" class="btn btn-secondary py-2.5 px-5" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary py-2.5 px-6 shadow-md shadow-orange-500/10">Register Well</button>
      </div>
    </form>`;
}

function bindWellRegisterForm() {
  const f = document.getElementById('well-min-form');
  if (!f) return;
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = DB.saveTag({
      tag_code: document.getElementById('wf-number').value.toUpperCase(),
      name: 'Well Production System',
      system: 'Production',
      location: 'Production Field',
      type: 'Well',
      status: 'ok',
      notes: 'Registered via Operational Notes (+ Well Register shortcut)',
      op_mode: 'Duty'
    });

    if (!handleSaveResult(result)) return;

    toast('Well registered successfully', 'success');
    closeModal();
    if (currentPage === 'notes') renderNotes(document.getElementById('page-container'));
    else renderTags(document.getElementById('page-container'));
  });
}

window.handleXmlFile = function(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const result = DB.importTagsXml(content);
    if (result.success) {
      toast(`Successfully updated ${result.count} TAGs.`, 'success');
      closeModal();
      renderTags(document.getElementById('page-container'));
    } else {
      toast(result.message || 'Error processing XML.', 'error');
    }
  };
  reader.readAsText(file);
}

window.toggleProverStatus = function(tagId) {
  DB.toggleProverAvailability(tagId);
  toast('Prover status updated', 'success');
  renderTags(document.getElementById('page-container'));
}

window.openImportModal = function() {
  const body = `
    <div class="space-y-4">
      <div class="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
        <h4 class="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          XML Import Options
        </h4>
        <p class="text-xs text-navy opacity-80 mb-2">You can now import data in two ways:</p>
        <ul class="text-[10px] text-slate-400 list-disc ml-4 space-y-1 mb-4">
          <li><strong>Universal Raw Dump</strong>: Select the <code class="text-blue-300">RawDataDump.xml</code> generated by the extraction script.</li>
          <li><strong>Legacy XML</strong>: A simple XML with <code class="text-blue-300">&lt;tag&gt;</code> blocks for specific updates.</li>
        </ul>
        <pre class="bg-navy-950 p-3 rounded-lg border border-slate-700 text-[10px] text-green-400 font-mono overflow-x-auto">
&lt;!-- Simple Format Sample --&gt;
&lt;tag_registry&gt;
  &lt;tag&gt;
    &lt;tag_code&gt;FT-1001&lt;/tag_code&gt;
    &lt;last_calibration&gt;2024-05-15&lt;/last_calibration&gt;
    &lt;deadline&gt;2025-05-15&lt;/deadline&gt;
  &lt;/tag&gt;
&lt;/tag_registry&gt;</pre>
      </div>

      <div class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-2xl bg-navy-900/20 hover:border-orange-500/40 transition-colors">
        <input type="file" id="xml-upload-input" accept=".xml" class="hidden" onchange="handleXmlFile(this)">
        <button class="btn btn-primary px-8" onclick="document.getElementById('xml-upload-input').click()">
          Select XML File (Legacy or Raw)
        </button>
        <p class="text-[10px] text-slate-500 mt-3 uppercase font-bold tracking-widest">Only .xml files accepted</p>
      </div>

      <div class="flex justify-end pt-2">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
  openModal('Update on Demand — Bulk Import', body);
}

window.handleXmlFile = function(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const result = DB.importTagsXml(content);
    if (result.success) {
      toast(`Successfully updated ${result.count} TAGs.`, 'success');
      closeModal();
      renderTags(document.getElementById('page-container'));
    } else {
      toast(result.message || 'Error processing XML.', 'error');
    }
  };
  reader.readAsText(file);
}

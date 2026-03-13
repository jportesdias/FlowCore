// ============================================================
//  pages-supervisor.js — Production Supervisor Module
// ============================================================

// ---- Rotation Logic (14x14) ----
window.getRotationInfo = function(p) {
  if (!p.base_boarding_date) return null;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Manual local parsing to avoid UTC offset issues
  const [y, m, d] = p.base_boarding_date.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  base.setHours(0,0,0,0);
  
  const diffMs = today.getTime() - base.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  
  // Cycle is 28 days (14 on / 14 off)
  const cycleDay = ((diffDays % 28) + 28) % 28;
  const isOnboard = cycleDay < 14; // Day 1 (index 0) to Day 14 (index 13)
  
  // Current/Next period
  const cycleStart = new Date(base);
  cycleStart.setDate(base.getDate() + Math.floor(diffDays / 28) * 28);
  
  const boardDate = new Date(cycleStart);
  const offboardDate = new Date(boardDate);
  offboardDate.setDate(boardDate.getDate() + 14);
  
  if (!isOnboard) {
      if (today >= offboardDate) {
          boardDate.setDate(boardDate.getDate() + 28);
          offboardDate.setDate(offboardDate.getDate() + 28);
      }
  }

  return {
    isOnboard,
    boardDate: boardDate.toISOString().split('T')[0],
    offboardDate: offboardDate.toISOString().split('T')[0],
    cycleDay
  };
};

window.generate12MonthScale = function(p) {
    if (!p.base_boarding_date) return '';
    
    const [y, m, d] = p.base_boarding_date.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);
    baseDate.setHours(0,0,0,0);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Vacation start/end
    let vacStart = null, vacEnd = null;
    if (p.vacation_date) {
        const [vy, vm, vd] = p.vacation_date.split('-').map(Number);
        vacStart = new Date(vy, vm - 1, vd);
        vacStart.setHours(0,0,0,0);
        vacEnd = new Date(vacStart);
        vacEnd.setDate(vacStart.getDate() + (p.vacation_sold ? 20 : 30));
    }

    const months = [];
    const currentYear = today.getFullYear();
    const startMonth = today.getMonth();

    // Helper to check if a day is ONBOARD
    const checkOnboard = (date) => {
        const diffMs = date.getTime() - baseDate.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        const cycleDay = ((diffDays % 28) + 28) % 28;
        return cycleDay < 14;
    };

    for (let i = 0; i < 12; i++) {
        const monthDate = new Date(currentYear, startMonth + i, 1);
        const monthName = monthDate.toLocaleString('default', { month: 'long' });
        const year = monthDate.getFullYear();
        
        const daysInMonth = new Date(year, monthDate.getMonth() + 1, 0).getDate();
        const firstDayIdx = new Date(year, monthDate.getMonth(), 1).getDay(); // 0-6

        const dayElements = [];
        // Empty slots at start
        for (let j = 0; j < firstDayIdx; j++) dayElements.push('<div class="cal-day"></div>');
        
        // Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, monthDate.getMonth(), day);
            date.setHours(0,0,0,0);
            
            let classes = ['cal-day'];
            const isToday = date.getTime() === today.getTime();
            if (isToday) classes.push('cal-day-today');
            
            const isOn = checkOnboard(date);
            if (isOn) classes.push('cal-day-onboard');
            
            if (vacStart && date >= vacStart && date < vacEnd) {
                classes.push('cal-day-vacation');
            }
            
            dayElements.push(`<div class="${classes.join(' ')}">${day}</div>`);
        }
        
        months.push(`
            <div class="cal-month-box">
                <div class="cal-month-title">${monthName} ${year}</div>
                <div class="cal-grid">
                    ${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(wd => `<div class="cal-weekday">${wd}</div>`).join('')}
                    ${dayElements.join('')}
                </div>
            </div>
        `);
    }

    return `
        <div class="mt-6">
            <div class="section-label mb-4 flex items-center gap-2">
                🗓️ Annual Scale Calendar (14x14)
                <span class="flex items-center gap-1 text-[8px] ml-4 font-normal"><span class="w-2 h-2 rounded-full bg-orange-500/30 border border-orange-500/40"></span> Onboard</span>
                <span class="flex items-center gap-1 text-[8px] ml-2 font-normal"><span class="w-2 h-2 rounded-full bg-amber-500/30 border border-amber-500/40"></span> Vacation</span>
            </div>
            <div class="cal-container scroll-container max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                ${months.join('')}
            </div>
        </div>
    `;
};

// ---- Supervisor Dashboard ----
window.renderSupervisorDashboard = function(container) {
  const crew = window.DB.getCrew ? window.DB.getCrew() : [];
  const personnel = window.DB.getPersonnel ? window.DB.getPersonnel() : [];
  const vacations = window.DB.getVacations ? window.DB.getVacations() : [];
  const today = new Date();

  // Who is onboard today
  const onboard = crew.filter(c => {
    if (!c.boarding_date || !c.offboarding_date) return false;
    const b = new Date(c.boarding_date);
    const o = new Date(c.offboarding_date);
    return today >= b && today <= o;
  });

  // Who is on vacation
  const onVacation = vacations.filter(v => {
    const s = new Date(v.start_date);
    const e = new Date(v.end_date);
    return today >= s && today <= e;
  });

  // Covering vacations
  const covering = crew.filter(c => c.covering_for && onboard.find(o => o.id === c.id) &&
    onVacation.find(v => v.personnel_id === c.covering_for));

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Production Dashboard</h1>
        <p class="page-subtitle">${today.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="card p-5">
        <div class="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Onboard Today</div>
        <div class="text-3xl font-black text-white">${onboard.length}</div>
        <div class="text-slate-500 text-xs mt-1">personnel aboard</div>
      </div>
      <div class="card p-5">
        <div class="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">On Vacation</div>
        <div class="text-3xl font-black text-slate-300">${onVacation.length}</div>
        <div class="text-slate-500 text-xs mt-1">off rotation</div>
      </div>
      <div class="card p-5">
        <div class="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Covering</div>
        <div class="text-3xl font-black text-slate-300">${covering.length}</div>
        <div class="text-slate-500 text-xs mt-1">covering vacations</div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Onboard Crew -->
      <div class="card p-5">
        <div class="section-label mb-4">⚓ Crew Onboard</div>
        ${onboard.length === 0
          ? '<p class="text-slate-500 text-sm italic">No crew registered for today.</p>'
          : onboard.map(c => `
          <div class="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                ${(c.name || 'X').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div class="text-white font-medium text-sm">${window.escHtml(c.name)}</div>
                <div class="text-slate-500 text-xs">${window.escHtml(c.role || '—')}</div>
              </div>
            </div>
            ${c.covering_for ? '<span class="badge status-pending text-[9px]">Covering</span>' : '<span class="badge status-closed text-[9px]">Regular</span>'}
          </div>`).join('')}
      </div>

      <!-- On Vacation -->
      <div class="card p-5">
        <div class="section-label mb-4">🏖️ On Vacation</div>
        ${onVacation.length === 0
          ? '<p class="text-slate-500 text-sm italic">No crew currently on vacation.</p>'
          : onVacation.map(v => {
          const p = personnel.find(x => x.id === v.personnel_id);
          return `
          <div class="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
            <div>
              <div class="text-white font-medium text-sm">${window.escHtml(p ? p.name : v.personnel_name || '—')}</div>
              <div class="text-slate-500 text-xs">Returns: ${window.fmtDate(v.end_date)}</div>
            </div>
            <span class="badge badge-medium text-[9px]">Vacation</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
};

// ---- System Pages (shared template) ----
function renderSystemPage(container, systemName, icon) {
  const events = (window.DB.getEvents ? window.DB.getEvents() : []).filter(e =>
    !e.archived && (e.system || e.category || '').toLowerCase().includes(systemName.toLowerCase())
  );
  const alerts = (window.DB.getAlerts ? window.DB.getAlerts() : []).filter(a =>
    !a.archived && (a.system || a.tag_code || '').toLowerCase().includes(systemName.toLowerCase())
  );

  container.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">${icon} ${systemName} System</h1>
        <p class="page-subtitle">Overview · Events · Alerts</p></div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
      <div class="badge badge-low px-4 py-2 w-fit text-sm">📋 ${events.length} Open Events</div>
      <div class="badge badge-critical px-4 py-2 w-fit text-sm">🔔 ${alerts.filter(a => a.status !== 'closed').length} Active Alerts</div>
    </div>

    <div class="section-label mt-6 mb-3">Recent Events</div>
    <div class="space-y-3">
      ${events.length === 0
        ? '<div class="empty-state"><p>No events for this system.</p></div>'
        : events.slice(0, 8).map(e => `
        <div class="card p-4">
          <div class="flex items-center justify-between">
            <div class="text-white font-medium">${window.escHtml(e.title)}</div>
            <div class="flex gap-2">${window.priorityBadge(e.priority)} ${window.statusBadge(e.status)}</div>
          </div>
          <div class="text-slate-400 text-xs mt-1">${window.escHtml(e.description).slice(0,120)}…</div>
          <div class="text-slate-600 text-[10px] mt-2">${window.fmt(e.created_at)}</div>
        </div>`).join('')}
    </div>

    <div class="section-label mt-6 mb-3">Active Alerts</div>
    <div class="space-y-3">
      ${alerts.length === 0
        ? '<div class="empty-state"><p>No alerts for this system.</p></div>'
        : alerts.slice(0, 6).map(a => `
        <div class="card p-4">
          <div class="flex items-center justify-between">
            <div class="text-white font-medium">${window.escHtml(a.title)}</div>
            ${window.priorityBadge(a.priority)}
          </div>
          <div class="text-slate-400 text-xs mt-1">${window.escHtml(a.description).slice(0,100)}…</div>
        </div>`).join('')}
    </div>`;
}

window.renderWaterSystem = (c) => renderSystemPage(c, 'Water', '💧');

window.renderGasSystem = function(container) {
  const subsystems = (window.DB.getSubsystems ? window.DB.getSubsystems() : []).filter(s => s.parent_system === 'Gas');
  const allEvents = (window.DB.getEvents ? window.DB.getEvents() : []);
  const gasEvents = allEvents.filter(e => !e.archived && (e.system || '').toLowerCase().includes('gas'));
  const alerts = (window.DB.getAlerts ? window.DB.getAlerts() : []).filter(a => !a.archived && (a.system || '').toLowerCase().includes('gas'));

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">🔥 Gas System</h1>
        <p class="page-subtitle">Production Units & Monitoring</p>
      </div>
      <button class="btn btn-primary" onclick="window.openAddSubsystemModal('Gas')">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>New Sub-system
      </button>
    </div>

    <div class="section-label mb-3">📍 Production Units</div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      ${subsystems.length === 0 
        ? '<div class="card p-5 border-dashed flex items-center justify-center text-slate-500 italic">No units registered for this system.</div>' 
        : subsystems.map(s => {
          const subEvents = gasEvents.filter(e => e.subsystem_id === s.id && e.status !== 'closed');
          return `
          <div class="card p-5 group relative">
            <div class="flex items-start justify-between mb-3">
              <div class="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <div class="flex gap-2">
                ${subEvents.length > 0 ? `<span class="badge status-pending text-[9px]">${subEvents.length} Events</span>` : ''}
                ${window.statusBadge(s.status || 'ok')}
              </div>
            </div>
            
            <div class="text-white font-bold text-lg mb-1">${window.escHtml(s.name)}</div>
            <p class="text-slate-500 text-xs line-clamp-2 mb-4">${window.escHtml(s.description || 'No description.')}</p>
            
            <div class="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
               <div class="flex flex-wrap gap-1">
                 ${(s.tags || []).map(t => `<span class="tag-chip text-[9px]">${t}</span>`).join('')}
               </div>
               <div class="flex gap-2">
                 <button class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition" 
                   onclick="window.editSubsystem('${s.id}')" title="Edit Unit">
                   <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                 </button>
                 <button class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition text-xs font-bold" 
                   onclick="window.openAddEventFromSubsystem('${s.id}', '${window.escHtml(s.name)}', 'Gas')" title="Add Event">
                   <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                   EVENT
                 </button>
               </div>
            </div>
          </div>
        `;}).join('')}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div class="section-label mb-3">📋 Recent Gas Events</div>
        <div class="space-y-3">
          ${gasEvents.length === 0 ? '<div class="empty-state">No events.</div>' : gasEvents.slice(0, 5).map(e => `
            <div class="card p-4">
              <div class="flex items-center justify-between mb-1">
                <span class="text-white font-medium text-sm">${window.escHtml(e.title)}</span>
                ${window.priorityBadge(e.priority)}
              </div>
              <div class="flex justify-between items-center text-xs">
                <div class="text-slate-500">${window.fmt(e.created_at)}</div>
                ${e.subsystem_id ? `<div class="text-orange-500 font-bold uppercase tracking-widest text-[9px]">${subsystems.find(s=>s.id===e.subsystem_id)?.name || ''}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div>
        <div class="section-label mb-3">🔔 Active Gas Alerts</div>
        <div class="space-y-3">
          ${alerts.length === 0 ? '<div class="empty-state">No alerts.</div>' : alerts.slice(0, 5).map(a => `
            <div class="card p-4 border-l-2 ${a.priority === 'critical' ? 'border-l-red-500' : 'border-l-orange-500'}">
              <div class="text-white font-medium text-sm">${window.escHtml(a.title)}</div>
              <div class="text-slate-500 text-xs mt-1">${window.escHtml(a.description)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
};
window.renderOilSystem   = (c) => renderSystemPage(c, 'Oil',   '🛢️');
window.renderUtilities   = (c) => renderSystemPage(c, 'Utilities', '⚡');

// ---- People Management ----
window.renderPeopleManagement = function(container) {
  const personnel = window.DB.getPersonnel ? window.DB.getPersonnel() : [];
  let searchVal = '';

  function draw() {
    let list = personnel.filter(p => !p.archived);
    if (searchVal) {
      const q = searchVal.toLowerCase();
      list = list.filter(p => [p.name, p.position, p.area].some(v => (v||'').toLowerCase().includes(q)));
    }

    const listEl = document.getElementById('people-list');
    if (!listEl) return;

    listEl.innerHTML = list.length === 0
      ? '<div class="empty-state"><p>No personnel registered.</p></div>'
      : list.map(p => `
      <div class="card p-5 card-interactive group" onclick="window.openPersonnelDetail('${p.id}')">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div class="flex items-center gap-4">
            <div class="relative">
              <div class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                ${(p.name||'X').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              ${(() => {
                const rot = window.getRotationInfo(p);
                return rot ? `
                  <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${rot.isOnboard ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-500'}"></div>
                ` : '';
              })()}
            </div>
            <div>
              <div class="text-white font-bold text-base line-clamp-1">${window.escHtml(p.name)}</div>
              <div class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">${window.escHtml(p.position || '—')}</div>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-secondary" onclick="window.editPersonnel('${p.id}')">Edit</button>
            <button class="btn btn-sm btn-primary" onclick="window.openPersonnelDetail('${p.id}')">View</button>
          </div>
        </div>

        <div class="p-3 bg-navy-800/40 rounded-lg border border-slate-700/30 mb-4">
           ${(() => {
             const rot = window.getRotationInfo(p);
             if (!rot) return '<p class="text-slate-500 text-[10px] italic">Rotation not configured</p>';
             return `
               <div class="flex justify-between items-center">
                 <div>
                   <div class="text-[9px] uppercase font-black text-slate-500 mb-0.5">${rot.isOnboard ? 'Current Boarding' : 'Next Boarding'}</div>
                   <div class="text-xs text-white font-mono">${window.fmtDate(rot.boardDate)} → ${window.fmtDate(rot.offboardDate)}</div>
                 </div>
                 <span class="text-[9px] font-black uppercase tracking-widest ${rot.isOnboard ? 'text-green-400' : 'text-slate-500'}">${rot.isOnboard ? 'ONBOARD' : 'OFFBOARD'}</span>
               </div>
             `;
           })()}
           ${p.vacation_date ? `
             <div class="mt-2 pt-2 border-t border-slate-700/30 flex justify-between items-center">
                <div class="text-[9px] uppercase font-black text-slate-500">Planned Vacation</div>
                <div class="text-xs text-amber-400 font-bold">${window.fmtDate(p.vacation_date)} <span class="text-[8px] opacity-70">(${p.vacation_sold ? '20' : '30'}d)</span></div>
             </div>
           ` : ''}
        </div>

        <div class="grid grid-cols-3 gap-2 text-center text-[10px] pt-3 border-t border-slate-800/50">
          <div>
            <div class="text-white font-bold">${(p.evaluations||[]).length}</div>
            <div class="text-slate-500">Evaluations</div>
          </div>
          <div>
            <div class="text-white font-bold">${(p.trainings||[]).length}</div>
            <div class="text-slate-500">Trainings</div>
          </div>
          <div>
            <div class="text-white font-bold">${p.seniority_years || 0}y</div>
            <div class="text-slate-500">Seniority</div>
          </div>
        </div>
      </div>`).join('');
  }

  container.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">People Management</h1><p class="page-subtitle">${personnel.length} registered</p></div>
      <button class="btn btn-primary" onclick="window.openModal('New Personnel', window.personnelFormHtml(null), () => window.bindPersonnelForm(null))">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>Add Person
      </button>
    </div>
    <div class="filter-bar">
      <input id="people-search" class="form-input" style="max-width:260px" placeholder="Search name, position…" />
    </div>
    <div id="people-list" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>`;

  draw();
  document.getElementById('people-search').addEventListener('input', e => { searchVal = e.target.value; draw(); });
};

// Personnel Detail Modal
window.openPersonnelDetail = function(id) {
  const p = (window.DB.getPersonnel()||[]).find ? window.DB.getPersonnel().find(x => x.id === id) : null;
  if (!p) return;
  const evalList = (p.evaluations||[]).map(ev => `
    <div class="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 mb-2">
      <div class="flex justify-between text-xs text-slate-500 mb-1"><span>${window.fmtDate(ev.date)}</span><span>${window.escHtml(ev.type||'')}</span></div>
      <div class="text-sm text-slate-300">${window.escHtml(ev.notes||'')}</div>
      <div class="text-xs mt-1 font-bold ${ev.score >= 7 ? 'text-green-400' : ev.score >= 5 ? 'text-amber-400' : 'text-red-400'}">Score: ${ev.score||'—'}/10</div>
    </div>`).join('') || '<p class="text-slate-500 text-xs italic">No evaluations yet.</p>';

  const trainList = (p.trainings||[]).map(t => `
    <div class="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 mb-2">
      <div class="flex justify-between">
        <div class="text-sm text-slate-300 font-medium">${window.escHtml(t.name||'')}</div>
        <span class="badge ${t.completed ? 'status-closed' : 'status-pending'} text-[10px]">${t.completed ? 'Done' : 'Pending'}</span>
      </div>
      <div class="text-xs text-slate-500 mt-1">${window.fmtDate(t.date)} · ${window.escHtml(t.institution||'')}</div>
    </div>`).join('') || '<p class="text-slate-500 text-xs italic">No trainings registered.</p>';

  window.openModal(p.name, `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><div class="section-label">Position</div><div class="text-slate-300">${window.escHtml(p.position||'—')}</div></div>
        <div><div class="section-label">Area</div><div class="text-slate-300">${window.escHtml(p.area||'—')}</div></div>
        <div><div class="section-label">Seniority</div><div class="text-slate-300">${p.seniority_years||0} years</div></div>
        <div><div class="section-label">Since</div><div class="text-slate-300">${window.fmtDate(p.hire_date)||'—'}</div></div>
        <div><div class="section-label">Base Boarding</div><div class="text-slate-300">${window.fmtDate(p.base_boarding_date)||'—'}</div></div>
        <div><div class="section-label">Vacation Sold</div><div class="text-slate-300">${p.vacation_sold ? 'Yes (10 days)' : 'No'}</div></div>
      </div>
      ${window.generate12MonthScale(p)}
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="section-label mb-0">Evaluations</div>
          <button class="btn btn-sm btn-primary" onclick="window.openAddEvalModal('${p.id}')">+ Add</button>
        </div>
        ${evalList}
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="section-label mb-0">Trainings</div>
          <button class="btn btn-sm btn-primary" onclick="window.openAddTrainingModal('${p.id}')">+ Add</button>
        </div>
        ${trainList}
      </div>
    </div>`);
};

// Personnel Form
window.personnelFormHtml = function(p) {
  return `<form id="pf-form" class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input class="form-input" id="pf-name" value="${window.escHtml(p ? p.name : '')}" placeholder="Full name" required />
      </div>
      <div class="form-group">
        <label class="form-label">Position / Role</label>
        <input class="form-input" id="pf-position" value="${window.escHtml(p ? p.position||'' : '')}" placeholder="e.g. Operator, Supervisor" />
      </div>
      <div class="form-group">
        <label class="form-label">Area / System</label>
        <input class="form-input" id="pf-area" value="${window.escHtml(p ? p.area||'' : '')}" placeholder="e.g. Water System, Oil" />
      </div>
      <div class="form-group">
        <label class="form-label">Seniority (years)</label>
        <input type="number" class="form-input" id="pf-seniority" value="${p ? p.seniority_years||0 : 0}" min="0" />
      </div>
      <div class="form-group">
        <label class="form-label">Hire Date</label>
        <input type="date" class="form-input" id="pf-hire" value="${p ? p.hire_date||'' : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Reference Boarding Date (14x14 Anchor)</label>
        <input type="date" class="form-input" id="pf-base-board" value="${p ? p.base_boarding_date||'' : ''}" required />
      </div>
      <div class="form-group">
        <label class="form-label">Next Vacation Date</label>
        <input type="date" class="form-input" id="pf-vac-date" value="${p ? p.vacation_date||'' : ''}" />
      </div>
      <div class="form-group flex items-end">
        <label class="flex items-center gap-2 cursor-pointer pb-2">
          <input type="checkbox" id="pf-vac-sold" class="w-4 h-4" ${p && p.vacation_sold ? 'checked' : ''} />
          <span class="text-sm text-slate-300">Sold 10 days (Abono)</span>
        </label>
      </div>
    </div>
    <div class="flex gap-3 justify-end pt-4">
      <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary">${p ? 'Update' : 'Add Person'}</button>
    </div>
  </form>`;
};

window.bindPersonnelForm = function(existingId) {
  const form = document.getElementById('pf-form');
  if (!form) return;
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const existing = existingId ? window.DB.getPersonnel().find(x => x.id === existingId) : null;
    window.DB.savePersonnel({
      id: existingId || null,
      name: document.getElementById('pf-name').value.trim(),
      position: document.getElementById('pf-position').value.trim(),
      area: document.getElementById('pf-area').value.trim(),
      seniority_years: parseInt(document.getElementById('pf-seniority').value) || 0,
      hire_date: document.getElementById('pf-hire').value,
      base_boarding_date: document.getElementById('pf-base-board').value,
      vacation_date: document.getElementById('pf-vac-date').value,
      vacation_sold: document.getElementById('pf-vac-sold').checked,
      evaluations: existing ? (existing.evaluations||[]) : [],
      trainings: existing ? (existing.trainings||[]) : [],
    });
    window.toast(existingId ? 'Updated' : 'Person added', 'success');
    window.closeModal();
    window.renderPeopleManagement(document.getElementById('page-container'));
  });
};

window.editPersonnel = function(id) {
  const p = window.DB.getPersonnel().find(x => x.id === id);
  if (!p) return;
  window.openModal('Edit Personnel', window.personnelFormHtml(p), () => window.bindPersonnelForm(id));
};

// Add Evaluation Modal
window.openAddEvalModal = function(personnelId) {
  window.openModal('Add Evaluation', `
    <form id="eval-form" class="space-y-4">
      <div class="form-group"><label class="form-label">Type</label>
        <select class="form-select" id="ef-type">
          ${['Performance Review','Safety Audit','Competency Test','360 Feedback'].map(v => `<option>${v}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label">Score (0-10)</label>
        <input type="number" class="form-input" id="ef-score" min="0" max="10" value="8" /></div>
      <div class="form-group"><label class="form-label">Date</label>
        <input type="date" class="form-input" id="ef-date" value="${new Date().toISOString().split('T')[0]}" /></div>
      <div class="form-group"><label class="form-label">Notes</label>
        <textarea class="form-textarea" id="ef-notes" style="min-height:80px" placeholder="Evaluation notes..."></textarea></div>
      <div class="flex gap-3 justify-end pt-4">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Evaluation</button>
      </div>
    </form>`, () => {
    document.getElementById('eval-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const p = window.DB.getPersonnel().find(x => x.id === personnelId);
      if (!p) return;
      if (!p.evaluations) p.evaluations = [];
      p.evaluations.push({
        id: 'ev-' + Date.now(),
        type: document.getElementById('ef-type').value,
        score: parseFloat(document.getElementById('ef-score').value) || 0,
        date: document.getElementById('ef-date').value,
        notes: document.getElementById('ef-notes').value.trim(),
      });
      window.DB.savePersonnel(p);
      window.toast('Evaluation added', 'success');
      window.openPersonnelDetail(personnelId);
    });
  });
};

// Add Training Modal
window.openAddTrainingModal = function(personnelId) {
  window.openModal('Add Training', `
    <form id="train-form" class="space-y-4">
      <div class="form-group"><label class="form-label">Training Name</label>
        <input class="form-input" id="tf-name" placeholder="e.g. OPITO HUET, H2S Safety" required /></div>
      <div class="form-group"><label class="form-label">Institution</label>
        <input class="form-input" id="tf-inst" placeholder="Institution or provider" /></div>
      <div class="form-group"><label class="form-label">Date</label>
        <input type="date" class="form-input" id="tf-date" value="${new Date().toISOString().split('T')[0]}" /></div>
      <div class="flex items-center gap-2">
        <input type="checkbox" id="tf-done" class="w-4 h-4" checked />
        <label for="tf-done" class="text-sm text-slate-300">Completed</label>
      </div>
      <div class="flex gap-3 justify-end pt-4">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Training</button>
      </div>
    </form>`, () => {
    document.getElementById('train-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const p = window.DB.getPersonnel().find(x => x.id === personnelId);
      if (!p) return;
      if (!p.trainings) p.trainings = [];
      p.trainings.push({
        id: 'tr-' + Date.now(),
        name: document.getElementById('tf-name').value.trim(),
        institution: document.getElementById('tf-inst').value.trim(),
        date: document.getElementById('tf-date').value,
        completed: document.getElementById('tf-done').checked,
      });
      window.DB.savePersonnel(p);
      window.toast('Training added', 'success');
      window.openPersonnelDetail(personnelId);
    });
  });
};

// ---- Crew Manager ----
window.renderCrewManager = function(container) {
  const crew = window.DB.getCrew ? window.DB.getCrew() : [];
  const personnel = window.DB.getPersonnel ? window.DB.getPersonnel() : [];
  const today = new Date();

  const crewOnboard = crew.filter(c => {
    const b = new Date(c.boarding_date);
    const o = new Date(c.offboarding_date);
    return today >= b && today <= o;
  });

  container.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Crew Manager</h1><p class="page-subtitle">${crew.length} rotation records</p></div>
      <button class="btn btn-primary" onclick="window.openModal('New Crew Entry', window.crewFormHtml(null, personnel), () => window.bindCrewForm(null))">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>Add Entry
      </button>
    </div>

    <div class="section-label mb-3">📍 Currently Onboard (${crewOnboard.length})</div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      ${crewOnboard.length === 0
        ? '<div class="empty-state"><p>No crew onboard today based on schedule.</p></div>'
        : crewOnboard.map(c => `
        <div class="card p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-white font-bold">${window.escHtml(c.name)}</div>
              <div class="text-slate-400 text-xs">${window.escHtml(c.role||'—')}</div>
            </div>
            <div class="text-right text-xs text-slate-500">
              <div>Aboard: ${window.fmtDate(c.boarding_date)}</div>
              <div>Off: ${window.fmtDate(c.offboarding_date)}</div>
            </div>
          </div>
          ${c.covering_for ? `<div class="text-xs text-amber-400 mt-2">↩ Covering: ${window.escHtml(c.covering_for_name||c.covering_for)}</div>` : ''}
        </div>`).join('')}
    </div>

    <div class="section-label mb-3">All Rotation Entries</div>
    <div class="card overflow-x-auto">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Role</th><th>Boarding</th><th>Off-boarding</th><th>Covering</th><th></th></tr></thead>
        <tbody>
          ${crew.length === 0
            ? '<tr><td colspan="6"><div class="empty-state"><p>No rotation entries.</p></div></td></tr>'
            : crew.map(c => `
            <tr>
              <td class="text-white font-medium">${window.escHtml(c.name)}</td>
              <td class="text-slate-400">${window.escHtml(c.role||'—')}</td>
              <td class="text-slate-400 font-mono text-xs">${window.fmtDate(c.boarding_date)}</td>
              <td class="text-slate-400 font-mono text-xs">${window.fmtDate(c.offboarding_date)}</td>
              <td class="text-slate-500 text-xs">${c.covering_for_name ? '↩ '+window.escHtml(c.covering_for_name) : '—'}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-sm btn-secondary" onclick="window.editCrewEntry('${c.id}')">Edit</button>
                  <button class="btn btn-sm btn-danger" onclick="window.DB.deleteCrew('${c.id}'); window.renderCrewManager(document.getElementById('page-container'))">Del</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
};

window.crewFormHtml = function(c, personnel) {
  const people = personnel || (window.DB.getPersonnel ? window.DB.getPersonnel() : []);
  return `<form id="crew-form" class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-group">
        <label class="form-label">Personnel</label>
        <select class="form-select" id="cf-person">
          <option value="">— Select —</option>
          ${people.map(p => `<option value="${p.id}" data-name="${p.name}" ${c && c.personnel_id === p.id ? 'selected' : ''}>${p.name} · ${p.position||''}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Role on this rotation</label>
        <input class="form-input" id="cf-role" value="${window.escHtml(c ? c.role||'' : '')}" placeholder="e.g. Operator A" />
      </div>
      <div class="form-group">
        <label class="form-label">Boarding Date</label>
        <input type="date" class="form-input" id="cf-board" value="${c ? c.boarding_date||'' : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Off-boarding Date</label>
        <input type="date" class="form-input" id="cf-offboard" value="${c ? c.offboarding_date||'' : ''}" />
      </div>
      <div class="form-group md:col-span-2">
        <label class="form-label">Covering for (optional)</label>
        <select class="form-select" id="cf-covering">
          <option value="">— Not covering —</option>
          ${people.map(p => `<option value="${p.id}" data-name="${p.name}" ${c && c.covering_for === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="flex gap-3 justify-end pt-4">
      <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary">${c ? 'Update' : 'Add Entry'}</button>
    </div>
  </form>`;
};

window.bindCrewForm = function(existingId) {
  const form = document.getElementById('crew-form');
  if (!form) return;
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const personSel = document.getElementById('cf-person');
    const personOpt = personSel.options[personSel.selectedIndex];
    const coverSel = document.getElementById('cf-covering');
    const coverOpt = coverSel.options[coverSel.selectedIndex];
    window.DB.saveCrew({
      id: existingId || null,
      personnel_id: personSel.value,
      name: personOpt ? (personOpt.dataset.name || personOpt.text) : '',
      role: document.getElementById('cf-role').value.trim(),
      boarding_date: document.getElementById('cf-board').value,
      offboarding_date: document.getElementById('cf-offboard').value,
      covering_for: coverSel.value || null,
      covering_for_name: coverSel.value && coverOpt ? (coverOpt.dataset.name || coverOpt.text) : null,
    });
    window.toast(existingId ? 'Entry updated' : 'Crew entry added', 'success');
    window.closeModal();
    window.renderCrewManager(document.getElementById('page-container'));
  });
};

window.editCrewEntry = function(id) {
  const c = (window.DB.getCrew()||[]).find(x => x.id === id);
  if (!c) return;
  window.openModal('Edit Crew Entry', window.crewFormHtml(c, window.DB.getPersonnel()), () => window.bindCrewForm(id));
};

// ---- Vacation Ranking ----
window.renderVacationRanking = function(container) {
  const personnel = window.DB.getPersonnel ? window.DB.getPersonnel() : [];
  const vacations = window.DB.getVacations ? window.DB.getVacations() : [];

  // Score = seniority + time since last vacation
  const ranked = [...personnel].map(p => {
    const lastVac = vacations
      .filter(v => v.personnel_id === p.id)
      .sort((a,b) => new Date(b.end_date) - new Date(a.end_date))[0];
    const daysSince = lastVac
      ? Math.floor((Date.now() - new Date(lastVac.end_date)) / 86400000)
      : 9999;
    const score = (p.seniority_years||0) * 10 + Math.min(daysSince, 365);
    return { ...p, lastVac, daysSince, score };
  }).sort((a,b) => b.score - a.score);

  container.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">🏖️ Vacation Ranking</h1><p class="page-subtitle">Priority based on seniority + time since last vacation</p></div>
      <button class="btn btn-primary" onclick="window.openAddVacationModal()">+ Register Vacation</button>
    </div>

    <div class="card overflow-x-auto">
      <table class="data-table">
        <thead><tr><th>#</th><th>Name</th><th>Position</th><th>Seniority</th><th>Last Vacation</th><th>Days Since</th><th>Score</th></tr></thead>
        <tbody>
          ${ranked.length === 0
            ? '<tr><td colspan="7"><div class="empty-state"><p>No personnel registered.</p></div></td></tr>'
            : ranked.map((p,i) => `
            <tr class="${i < 3 ? 'opacity-100' : ''}">
              <td><span class="font-black text-lg ${i===0?'text-amber-400':i===1?'text-slate-400':i===2?'text-orange-600':'text-slate-600'}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</span></td>
              <td class="text-white font-medium">${window.escHtml(p.name)}</td>
              <td class="text-slate-400 text-xs">${window.escHtml(p.position||'—')}</td>
              <td class="text-slate-300">${p.seniority_years||0}y</td>
              <td class="text-slate-400 text-xs">${p.lastVac ? window.fmtDate(p.lastVac.end_date) : '<span class="text-red-400">Never</span>'}</td>
              <td class="${p.daysSince >= 365 ? 'text-red-400 font-bold' : p.daysSince >= 180 ? 'text-amber-400' : 'text-slate-400'}">${p.daysSince >= 9999 ? '—' : p.daysSince+'d'}</td>
              <td class="text-white font-black">${p.score}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="section-label mt-6 mb-3">Vacation History</div>
    <div class="space-y-2">
      ${vacations.length === 0
        ? '<div class="empty-state"><p>No vacations registered.</p></div>'
        : vacations.sort((a,b) => new Date(b.start_date)-new Date(a.start_date)).map(v => {
          const p = personnel.find(x => x.id === v.personnel_id);
          return `
          <div class="card p-3 flex items-center justify-between">
            <div>
              <span class="text-white font-medium text-sm">${window.escHtml(p ? p.name : v.personnel_name||'—')}</span>
              <span class="text-slate-500 text-xs ml-3">${window.fmtDate(v.start_date)} → ${window.fmtDate(v.end_date)}</span>
            </div>
            <button class="btn btn-sm btn-danger" onclick="window.DB.deleteVacation('${v.id}'); window.renderVacationRanking(document.getElementById('page-container'))">Remove</button>
          </div>`;
        }).join('')}
    </div>`;
};

window.openAddVacationModal = function() {
  const personnel = window.DB.getPersonnel ? window.DB.getPersonnel() : [];
  window.openModal('Register Vacation', `
    <form id="vac-form" class="space-y-4">
      <div class="form-group">
        <label class="form-label">Personnel</label>
        <select class="form-select" id="vf-person">
          <option value="">— Select —</option>
          ${personnel.map(p => `<option value="${p.id}">${window.escHtml(p.name)}</option>`).join('')}
        </select>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Start Date</label>
          <input type="date" class="form-input" id="vf-start" value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label class="form-label">End Date</label>
          <input type="date" class="form-input" id="vf-end" />
        </div>
      </div>
      <div class="flex gap-3 justify-end pt-4">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Register</button>
      </div>
    </form>`, () => {
    document.getElementById('vac-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const sel = document.getElementById('vf-person');
      const opt = sel.options[sel.selectedIndex];
      window.DB.saveVacation({
        personnel_id: sel.value,
        personnel_name: opt ? opt.text : '',
        start_date: document.getElementById('vf-start').value,
        end_date: document.getElementById('vf-end').value,
      });
      window.toast('Vacation registered', 'success');
      window.closeModal();
      window.renderVacationRanking(document.getElementById('page-container'));
    });
  });
};

// Bridge function to open event modal from a Subsystem
window.openAddEventFromSubsystem = function(subId, subName, system) {
  const context = { subsystem_id: subId, system: system };
  window.openModal(`New Event: ${subName}`, window.eventFormHtml(null, context), () => window.bindEventForm(context));
};

// ---- Sub-system Management ----
window.openAddSubsystemModal = function(parentSystem) {
  window.openModal(`New ${parentSystem} Unit`, window.subsystemFormHtml({ parent_system: parentSystem }), () => window.bindSubsystemForm(null));
};

window.editSubsystem = function(id) {
  const s = window.DB.getSubsystems().find(x => x.id === id);
  if (!s) return;
  window.openModal(`Edit ${s.name}`, window.subsystemFormHtml(s), () => window.bindSubsystemForm(id));
};

window.subsystemFormHtml = function(s) {
  return `
    <form id="subs-form" class="space-y-4">
      <input type="hidden" id="sf-parent" value="${s.parent_system}" />
      <div class="form-group">
        <label class="form-label">Unit / Sub-system Name</label>
        <input class="form-input" id="sf-name" value="${window.escHtml(s.name || '')}" placeholder="e.g. HP Compressor Unit 1" required />
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="sf-status">
          <option value="ok" ${s.status === 'ok' ? 'selected' : ''}>Operational (OK)</option>
          <option value="minor-issue" ${s.status === 'minor-issue' ? 'selected' : ''}>Minor Issue</option>
          <option value="warning" ${s.status === 'warning' ? 'selected' : ''}>Warning / Maintenance</option>
          <option value="critical" ${s.status === 'critical' ? 'selected' : ''}>Critical Flow / Shutdown</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="sf-desc" placeholder="Details about this unit...">${window.escHtml(s.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Associated TAGs (comma separated)</label>
        <input class="form-input" id="sf-tags" value="${(s.tags || []).join(', ')}" placeholder="e.g. 21-FE-601, K-501" />
      </div>
      <div class="flex gap-3 justify-end pt-4">
        ${s.id ? `<button type="button" class="btn btn-danger mr-auto" onclick="if(confirm('Delete this unit?')){window.DB.deleteSubsystem('${s.id}'); window.closeModal(); window.refreshCurrentPage();}">Delete</button>` : ''}
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${s.id ? 'Save Changes' : 'Create Unit'}</button>
      </div>
    </form>
  `;
};

window.bindSubsystemForm = function(existingId) {
  const form = document.getElementById('subs-form');
  if (!form) return;
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const parent = document.getElementById('sf-parent').value;
    const name = document.getElementById('sf-name').value.trim();
    const status = document.getElementById('sf-status').value;
    const desc = document.getElementById('sf-desc').value.trim();
    const tagsStr = document.getElementById('sf-tags').value;
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];

    window.DB.saveSubsystem({
      id: existingId,
      parent_system: parent,
      name,
      status,
      description: desc,
      tags
    });

    window.toast(existingId ? 'Unit updated' : 'Unit created', 'success');
    window.closeModal();
    window.refreshCurrentPage();
  });
};

window.refreshCurrentPage = function() {
  const container = document.getElementById('page-container');
  // Check which page we are on by looking at active nav-link or body state
  const activeLink = document.querySelector('.nav-link.active');
  if (activeLink) {
    const page = activeLink.dataset.page;
    if (page === 'sup-gas') window.renderGasSystem(container);
    else if (page === 'sup-water') window.renderWaterSystem(container);
    else if (page === 'sup-oil') window.renderOilSystem(container);
    else if (page === 'sup-utilities') window.renderUtilities(container);
  }
};

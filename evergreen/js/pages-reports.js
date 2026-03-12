// ============================================================
//  pages-reports.js — Professional Handover Reporting
// ============================================================

function renderReports(container) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600000);

  const formatDate = (date) => date.toISOString().split('T')[0];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Handover Reporting</h1>
        <p class="page-subtitle">Generate professional, data-driven operational summaries.</p>
      </div>
    </div>

    <div class="card mb-8">
      <div class="flex flex-wrap items-end gap-4">
        <div class="form-group flex-1 min-w-[200px]">
          <label class="form-label">Start Date</label>
          <input type="date" id="rep-start" class="form-input" value="${formatDate(weekAgo)}">
        </div>
        <div class="form-group flex-1 min-w-[200px]">
          <label class="form-label">End Date</label>
          <input type="date" id="rep-end" class="form-input" value="${formatDate(now)}">
        </div>
        <div class="pb-5">
          <button class="btn btn-primary h-[42px] px-6 flex items-center gap-2" onclick="generateReport()">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate Professional Report
          </button>
        </div>
      </div>
    </div>

    <div id="report-output-container" class="space-y-8">
      <div class="empty-state py-20">
        <div class="w-16 h-16 bg-navy-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-slate-400">Select a period and click generate to view the report.</p>
      </div>
    </div>
  `;
}

function generateReport() {
  const start = document.getElementById('rep-start').value;
  const end = document.getElementById('rep-end').value;
  const container = document.getElementById('report-output-container');

  if (!start || !end) {
    toast('Please select both start and end dates.', 'error');
    return;
  }

  container.innerHTML = `<div class="flex items-center justify-center py-20"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>`;

  setTimeout(() => {
    const reportData = compileReportData(start, end);
    renderReportLayout(container, reportData, start, end);
    initReportCharts(reportData);
    window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
  }, 600);
}

function compileReportData(start, end) {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T23:59:59');

  // 15-day window for deadlines
  const deadlineLimit = new Date(endDate.getTime() + 15 * 24 * 3600000);

  const events = DB.getEvents().filter(e => {
    const d = new Date(e.created_at);
    return d >= startDate && d <= endDate;
  });

  const inspections = DB.getInspections().filter(i => {
    const d = new Date(i.created_at || i.date);
    return d >= startDate && d <= endDate;
  });

  const notes = DB.getNotes().filter(n => {
    const d = new Date(n.created_at);
    return d >= startDate && d <= endDate;
  });

  const materials = DB.getMaterials().filter(m => {
    const d = new Date(m.created_at);
    return d >= startDate && d <= endDate;
  });

  const allTags = DB.getTags();
  const tagsInDuty = allTags.filter(t => t.status_mode === 'Duty').length;
  const tagsInIdle = allTags.filter(t => t.status_mode === 'Idle').length;

  const expiringTags = allTags.filter(t => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return d >= endDate && d <= deadlineLimit;
  });

  return {
    events,
    inspections,
    notes,
    materials,
    expiringTags,
    stats: {
      totalEvents: events.length,
      totalInspections: inspections.length,
      totalNotes: notes.length,
      totalMaterials: materials.length,
      duty: tagsInDuty,
      idle: tagsInIdle,
      expiring: expiringTags.length
    }
  };
}

function renderReportLayout(container, data, start, end) {
  const user = getUser() || { name: 'Field Operator' };

  container.innerHTML = `
    <div class="report-wrapper bg-white text-navy-950 p-8 md:p-12 rounded-2xl shadow-xl overflow-hidden print:shadow-none print:p-0">
      <!-- Report Header -->
      <div class="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-8">
        <div>
          <img src="Flow core solutions Color.png" alt="FlowCore" class="h-20 w-auto mb-4" />
          <h1 class="text-3xl font-black uppercase tracking-tighter text-navy-900 line-clamp-1">Operational Handover Report</h1>
          <p class="text-slate-500 font-medium">Period: <span class="text-navy-800">${fmtDate(start)}</span> to <span class="text-navy-800">${fmtDate(end)}</span></p>
        </div>
        <div class="text-right">
          <div class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Generated On</div>
          <div class="text-navy-900 font-bold">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          <div class="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase tracking-wider">
            Ref: FPSO-FC-${Date.now().toString().slice(-6)}
          </div>
        </div>
      </div>

      <!-- Executives Summary Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div class="text-[10px] uppercase font-bold text-slate-400 mb-1">Events Recorded</div>
          <div class="text-2xl font-black text-navy-900">${data.stats.totalEvents}</div>
        </div>
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div class="text-[10px] uppercase font-bold text-slate-400 mb-1">Maint. & Insp.</div>
          <div class="text-2xl font-black text-navy-900">${data.stats.totalInspections}</div>
        </div>
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div class="text-[10px] uppercase font-bold text-slate-400 mb-1">Critical Expiring</div>
          <div class="text-2xl font-black ${data.stats.expiring > 0 ? 'text-red-600' : 'text-navy-900'}">${data.stats.expiring}</div>
        </div>
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div class="text-[10px] uppercase font-bold text-slate-400 mb-1">Materials Moved</div>
          <div class="text-2xl font-black text-navy-900">${data.stats.totalMaterials}</div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div class="report-chart-card">
          <h3 class="text-sm font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 bg-orange-500 rounded-full"></span> Tag Operational Status
          </h3>
          <div class="aspect-square max-h-[250px] mx-auto">
            <canvas id="chart-tag-status"></canvas>
          </div>
        </div>
        <div class="report-chart-card">
          <h3 class="text-sm font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 bg-blue-500 rounded-full"></span> Activity Distribution
          </h3>
          <div class="aspect-square max-h-[250px] mx-auto">
            <canvas id="chart-activity-mix"></canvas>
          </div>
        </div>
      </div>

      <!-- Expiring Deadlines (CRITICAL) -->
      ${data.expiringTags.length > 0 ? `
      <div class="mb-12">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 class="text-xl font-black text-navy-900 uppercase">Critical Deadlines (Next 15 Days)</h2>
        </div>
        <div class="bg-red-50 border-2 border-red-100 rounded-2xl overflow-hidden p-6">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-red-800/60 uppercase text-[10px] font-black border-b border-red-200">
                <th class="pb-3">TAG CODE</th>
                <th class="pb-3">INSTRUMENT / SYSTEM</th>
                <th class="pb-3">LOCATION</th>
                <th class="pb-3 text-right">DEADLINE</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-red-200/50">
              ${data.expiringTags.map(t => `
                <tr class="text-red-900">
                  <td class="py-4 font-black">${t.tag_code}</td>
                  <td class="py-4">${t.system || t.name}</td>
                  <td class="py-4">${t.location || '—'}</td>
                  <td class="py-4 text-right font-black">${fmtDate(t.deadline)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      <!-- Events List -->
      <div class="mb-12">
        <h2 class="text-xl font-black text-navy-900 border-b-2 border-slate-100 pb-2 mb-6 uppercase flex items-center justify-between">
          Handover Events & Logs
          <span class="text-[10px] bg-navy-100 px-2 py-0.5 rounded text-navy-600">${data.events.length} logs</span>
        </h2>
        <div class="space-y-6">
          ${data.events.length === 0 ? '<p class="text-slate-400 italic">No events recorded in this period.</p>' :
      data.events.map(e => `
            <div class="border-l-4 border-orange-500 pl-4 py-1">
              <div class="flex justify-between items-start mb-1">
                <h4 class="font-bold text-navy-900 text-lg">${e.title}</h4>
                <span class="text-xs text-slate-400 font-bold">${fmtDate(e.created_at)}</span>
              </div>
              <p class="text-slate-600 text-sm mb-2">${e.description}</p>
              <div class="flex gap-4 text-[10px] uppercase font-bold text-slate-400">
                <span>By: ${e.author}</span>
                <span>TAG: ${e.tag_code}</span>
                <span class="text-orange-600">${e.category}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Inspections & Gallery -->
      <div class="mb-12">
        <h2 class="text-xl font-black text-navy-900 border-b-2 border-slate-100 pb-2 mb-6 uppercase flex items-center justify-between">
          Maint. & Inspections
          <span class="text-[10px] bg-navy-100 px-2 py-0.5 rounded text-navy-600">${data.inspections.length} records</span>
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${data.inspections.length === 0 ? '<p class="text-slate-400 italic col-span-2">No inspections conducted in this period.</p>' :
      data.inspections.map(i => `
            <div class="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div class="flex justify-between items-center mb-2">
                <div class="flex gap-2">
                  <span class="bg-navy-900 text-white text-[10px] px-2 py-0.5 rounded font-bold">${i.tag_code}</span>
                  <span class="text-[10px] font-bold uppercase tracking-wider ${i.type === 'Maintenance' ? 'text-orange-500' : 'text-blue-500'}">${i.type === 'Maintenance' ? 'Maint' : 'Insp'}</span>
                </div>
                <span class="text-xs font-bold ${i.condition && i.condition.includes('Good') ? 'text-green-600' : 'text-red-600'}">${i.condition || ''}</span>
              </div>
              <p class="text-xs text-navy-800 font-medium mb-1 truncate">${i.findings}</p>
              <p class="text-[10px] text-slate-400 mb-3 italic">Inspector: ${i.inspector}</p>
              ${renderGallery(i.media)}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Footer / Signature -->
      <div class="mt-20 pt-10 border-t-2 border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
        <div class="text-center md:text-left">
          <p class="text-[10px] font-black uppercase text-slate-400 mb-6">Electronic Signature</p>
          <div class="mb-2">
             <span class="font-signature text-3xl text-navy-900" style="font-family: 'Dancing Script', cursive; font-style: italic;">${user.name}</span>
          </div>
          <div class="h-px w-48 bg-navy-900 mx-auto md:mx-0 mb-1"></div>
          <p class="text-xs font-bold text-navy-900">${user.name}</p>
          <p class="text-[10px] text-slate-400 uppercase tracking-widest">${user.role || 'Operational Team'}</p>
        </div>
        
        <div class="text-center md:text-right max-w-xs">
          <p class="text-[10px] text-slate-400 italic">This is a system-generated report from Evergreen Log book. All data is cryptographically timestamped and serves as an official technical record for FPSO FlowCore Solutions.</p>
          <button class="mt-4 btn btn-secondary btn-sm print:hidden" onclick="window.print()">
            🖨️ Print to PDF
          </button>
        </div>
      </div>
    </div>
  `;
}

function initReportCharts(data) {
  // Chart 1: Tag Status
  new Chart(document.getElementById('chart-tag-status'), {
    type: 'doughnut',
    data: {
      labels: ['Duty', 'Idle'],
      datasets: [{
        data: [data.stats.duty, data.stats.idle],
        backgroundColor: ['#f97316', '#334155'],
        borderWidth: 0
      }]
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { font: { weight: 'bold', size: 10 } } } },
      cutout: '70%'
    }
  });

  // Chart 2: Activity Mix
  new Chart(document.getElementById('chart-activity-mix'), {
    type: 'bar',
    data: {
      labels: ['Events', 'M&I', 'Notes', 'Materials'],
      datasets: [{
        label: 'Volume',
        data: [data.stats.totalEvents, data.stats.totalInspections, data.stats.totalNotes, data.stats.totalMaterials],
        backgroundColor: '#6366f1',
        borderRadius: 6
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true, grid: { display: false } },
        x: { grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

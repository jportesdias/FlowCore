// ============================================================
//  pages-metering.js — Metering Intelligence & TAG Search
// ============================================================

function renderMetering(container) {
  let tags = DB.getTags();
  let selectedTag = null;

  function render(searchQuery = '') {
    const q = searchQuery.toLowerCase().trim();
    const filtered = q ? tags.filter(t =>
      (t.tag_code || '').toLowerCase().includes(q) ||
      (t.system || t.name || '').toLowerCase().includes(q)
    ).slice(0, 10) : [];

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Search Hero -->
        <div class="card p-8 bg-gradient-to-br from-navy-800 to-navy-950 border-slate-700/50 relative">
          <div class="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div class="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
          </div>
          <div class="relative z-10">
            <h2 class="text-2xl font-bold text-navy mb-2">Instrument Search</h2>
            <p class="text-slate-400 mb-6 max-w-md">Search by TAG or Instrument Name to view calibration history, technical specs, and handover events.</p>
            
            <div class="flex flex-col md:flex-row gap-2 items-stretch relative max-w-5xl">
              <!-- Select Tag Dropdown (First) -->
              <div class="flex-shrink-0 min-w-[220px]">
                <select id="metering-dropdown" class="h-full w-full bg-navy-900 border-2 border-slate-700 rounded-xl px-4 py-3 text-navy font-semibold focus:outline-none focus:border-orange-500 transition-all cursor-pointer shadow-2xl">
                  <option value="">Select TAG...</option>
                  ${tags.sort((a, b) => a.tag_code.localeCompare(b.tag_code)).map(t => `
                    <option value="${t.id}" ${selectedTag && selectedTag.id === t.id ? 'selected' : ''}>${escHtml(t.tag_code)}</option>
                  `).join('')}
                </select>
              </div>

              <!-- Type Tag Input (Middle) -->
              <div class="relative flex-1">
                <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input id="metering-search" type="text" placeholder="Type TAG..." 
                  class="w-full bg-navy-900 border-2 border-slate-700 rounded-xl pl-10 pr-4 py-3 text-navy text-base focus:outline-none focus:border-orange-500 transition-all shadow-2xl"
                  value="${escHtml(searchQuery)}" />
                
                ${q && filtered.length > 0 ? `
                <div class="absolute left-0 right-0 top-full mt-2 bg-navy-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  ${filtered.map(t => `
                    <div class="p-3 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/50 last:border-0 transition" onclick="selectMeteringTag('${t.id}')">
                      <div class="flex justify-between items-center text-sm text-navy">
                        <span class="font-bold">${escHtml(t.tag_code)}</span>
                        <span class="text-[10px] text-slate-400 uppercase tracking-widest">${escHtml(t.system || t.instrument || '')}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>` : ''}
              </div>

              <!-- Search Button (Right) -->
              <button onclick="triggerMeteringSearch()" class="flex-shrink-0 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-navy font-bold rounded-xl transition-all shadow-lg flex items-center gap-2">
                <span>Search</span>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div id="metering-results">
          ${selectedTag ? renderMeteringDetail(selectedTag) : `
            <div class="flex flex-col items-center justify-center py-20 text-slate-600">
              <svg class="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 7m0 10V7" />
              </svg>
              <p>Type a TAG to view intelligence report</p>
            </div>
          `}
        </div>
      </div>
    `;

    const input = document.getElementById('metering-search');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.addEventListener('input', (e) => render(e.target.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') triggerMeteringSearch();
      });
    }

    const dropdown = document.getElementById('metering-dropdown');
    if (dropdown) {
      dropdown.addEventListener('change', (e) => {
        if (e.target.value) selectMeteringTag(e.target.value);
      });
    }
  }

  window.triggerMeteringSearch = () => {
    const q = document.getElementById('metering-search').value.trim().toLowerCase();
    if (!q) {
      toast('Please type a TAG to search', 'info');
      return;
    }
    // Simple logic: if there's a match, select the first one
    const match = tags.find(t =>
      (t.tag_code || '').toLowerCase() === q ||
      (t.tag_code || '').toLowerCase().includes(q)
    );
    if (match) selectMeteringTag(match.id);
    else toast(`No tag found matching "${q}"`, 'error');
  };

  window.setOpMode = (id, mode) => {
    const tag = tags.find(t => t.id === id);
    if (tag) {
      const updatedTag = { ...tag, op_mode: mode };
      const result = DB.saveTag(updatedTag);
      if (!handleSaveResult(result)) return;

      selectedTag = updatedTag;
      render(''); // Refresh UI
      toast(`Instrument ${tag.tag_code} set to ${mode}`, 'info');
    }
  };

  window.selectMeteringTag = (id) => {
    selectedTag = tags.find(t => t.id === id);
    render(''); // Clear search dropdown after selection
  };

  render();
}

function renderMeteringDetail(t) {
  const events = DB.getEvents().filter(e => (e.tag_id === t.id || e.tag_code === t.tag_code) && !e.archived);
  const isOperational = events.every(e => e.status === 'closed' || e.priority !== 'critical');
  const isOverdue = t.deadline && new Date(t.deadline) < new Date();

  return `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <!-- Info Card -->
      <div class="lg:col-span-2 space-y-6">
        <div class="card p-6 border-slate-700/50">
          <div class="flex items-start justify-between mb-8">
            <div>
              <div class="flex items-center gap-3 mb-1">
                <h3 class="text-3xl font-black text-navy tracking-tight">${escHtml(t.tag_code)}</h3>
                <div class="flex bg-navy-950 p-1 rounded-lg border border-slate-800 shadow-inner">
                  <button onclick="setOpMode('${t.id}', 'Duty')" 
                    class="px-3 py-1 rounded-md text-[10px] uppercase font-bold transition-all ${t.op_mode !== 'Idle' ? 'bg-green-500 text-navy shadow-lg' : 'text-slate-500 hover:text-slate-300'}">
                    Duty
                  </button>
                  <button onclick="setOpMode('${t.id}', 'Idle')" 
                    class="px-3 py-1 rounded-md text-[10px] uppercase font-bold transition-all ${t.op_mode === 'Idle' ? 'bg-orange-500 text-navy shadow-lg' : 'text-slate-500 hover:text-slate-300'}">
                    Idle
                  </button>
                </div>
              </div>
              <p class="text-slate-400 font-medium">${escHtml(t.system || t.name || 'Instrument Description N/A')}</p>
            </div>
            <div class="text-right">
              <span class="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Serial Number</span>
              <span class="text-navy font-mono bg-slate-800 px-3 py-1 rounded border border-slate-700">${escHtml(t.serial_number || 'TBD')}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div class="p-4 bg-navy-900/50 rounded-xl border border-slate-800/50">
              <span class="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">System</span>
              <span class="text-sm text-navy opacity-90 font-semibold">${escHtml(t.system || '—')}</span>
            </div>
            <div class="p-4 bg-navy-900/50 rounded-xl border border-slate-800/50">
              <span class="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Classification</span>
              <span class="text-sm text-navy opacity-90 font-semibold">${escHtml(t.classification || '—')}</span>
            </div>
            <div class="p-4 bg-navy-900/50 rounded-xl border border-slate-800/50">
              <span class="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Location</span>
              <span class="text-sm text-navy opacity-90 font-semibold">${escHtml(t.location || '—')}</span>
            </div>
            <div class="p-4 bg-navy-900/50 rounded-xl border border-slate-800/50">
              <span class="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Type</span>
              <span class="text-sm text-navy opacity-90 font-semibold">${escHtml(t.type || 'Instrument')}</span>
            </div>
          </div>
        </div>

        <div class="card p-6 border-slate-700/50">
          <h4 class="text-sm font-bold text-navy uppercase tracking-widest mb-6 border-b border-slate-800 pb-4 flex items-center gap-2">
            <svg class="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Handover Registry
          </h4>
          <div class="space-y-4">
            ${events.length === 0 ? `
              <div class="text-center py-10 text-slate-600 bg-navy-900/30 rounded-xl border border-dashed border-slate-800">
                <p>No active handover events registered for this TAG.</p>
              </div>
            ` : events.map(e => `
              <div class="p-4 bg-slate-800/40 rounded-xl border border-slate-700/30 hover:border-slate-600 transition cursor-pointer" onclick="openEventDetail('${e.id}')">
                <div class="flex justify-between items-start mb-2">
                  <span class="text-navy font-semibold">${escHtml(e.title)}</span>
                  ${priorityBadge(e.priority)}
                </div>
                <div class="text-xs text-slate-400 line-clamp-2">${escHtml(e.description)}</div>
                <div class="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                  <span>${escHtml(e.author)} · ${fmt(e.created_at)}</span>
                  ${statusBadge(e.status)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Calibration Card -->
      <div class="space-y-6">
        <div class="card p-6 bg-navy-800/50 border-slate-700/50">
          <h4 class="text-sm font-bold text-navy uppercase tracking-widest mb-6">Calibration Context</h4>
          
          <div class="space-y-6">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 flex-shrink-0">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 01-2 2" /></svg>
              </div>
              <div>
                <span class="text-[10px] uppercase tracking-widest text-slate-500 block">Last Calibration</span>
                <span class="text-lg text-navy opacity-90 font-bold">${escHtml(t.last_calibration || 'N/A')}</span>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl ${isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'} flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <span class="text-[10px] uppercase tracking-widest text-slate-500 block">Deadline</span>
                <span class="text-lg font-bold ${isOverdue ? 'text-red-400' : 'text-green-400'}">${escHtml(t.deadline || 'N/A')}</span>
              </div>
            </div>

            <div class="pt-6 border-t border-slate-700">
              <p class="text-xs text-slate-400 leading-relaxed italic">
                ${isOverdue ? 'This instrument is beyond its calibration deadline. Immediate technical review required to maintain fiscal integrity.' :
      'Calibration status is compliant with company standards. Monitor handover events for operational deviations.'}
              </p>
            </div>
            
            <button class="w-full py-3 bg-navy-700 hover:bg-navy-600 text-navy rounded-xl text-sm font-semibold border border-slate-600 transition" onclick="navigate('tag-detail', {id: '${t.id}'})">
              Full Asset Timeline
            </button>
          </div>
        </div>

        <div class="p-6 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
          <h5 class="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">Technical Note</h5>
          <p class="text-xs text-slate-300 leading-relaxed font-medium">
            ${t.overhaul_comments ? escHtml(t.overhaul_comments) : ''}
          </p>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
//  pages-orifice.js — Orifice Plate Control Module
// ============================================================

function orificeFormHtml(p) {
  const materials = ['SS316', 'SS304', 'Monel 400', 'Inconel 625', 'Hastelloy C276', 'Carbon Steel', 'Other'];
  const statuses = ['ok', 'minor-wear', 'out-of-spec', 'replace'];
  
  return `
    <form id="orifice-form" class="space-y-4">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Plate TAG Code</label>
          <input class="form-input" id="of-code" value="${escHtml(p ? p.tag_code : '')}" placeholder="e.g. 30-FE-001" required />
        </div>
        <div class="form-group">
          <label class="form-label">Serial Number</label>
          <input class="form-input" id="of-serial" value="${escHtml(p ? p.serial_number : '')}" placeholder="S/N" required />
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">System / Service</label><input class="form-input" id="of-system" value="${escHtml(p ? p.system : '')}" placeholder="e.g. Gas Export Stream A" required /></div>
        <div class="form-group">
          <label class="form-label">Material</label>
          <select class="form-select" id="of-material">
            ${materials.map(m => `<option ${p && p.material === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grid-3">
        <div class="form-group"><label class="form-label">Inlet Diameter (d)</label><input class="form-input" id="of-id" value="${escHtml(p ? p.inner_diameter : '')}" placeholder="e.g. 154.22 mm" /></div>
        <div class="form-group"><label class="form-label">Plate Thickness (E)</label><input class="form-input" id="of-thick" value="${escHtml(p ? p.thickness : '')}" placeholder="e.g. 6.35 mm" /></div>
        <div class="form-group">
          <label class="form-label">Beta Ratio (β)</label>
          <input class="form-input" id="of-beta" value="${escHtml(p ? p.beta : '')}" placeholder="e.g. 0.6022" />
        </div>
      </div>
      <div class="grid-3">
        <div class="form-group">
          <label class="form-label">Operational Mode</label>
          <select class="form-select" id="of-mode">
            <option value="Duty" ${p && p.op_mode === 'Duty' ? 'selected' : ''}>Duty (Installed)</option>
            <option value="Idle" ${p && (p.op_mode === 'Idle' || !p.op_mode) ? 'selected' : ''}>Idle (Storage)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Metrological Status</label>
          <select class="form-select" id="of-status">
            ${statuses.map(s => `<option value="${s}" ${p && p.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Last Visual Insp.</label><input type="date" class="form-input" id="of-last-insp" value="${p ? p.last_inspection : ''}" /></div>
      </div>
      <div class="form-group"><label class="form-label">Technical Notes / Edge Condition</label><textarea class="form-textarea" id="of-notes" placeholder="Notes about squareness, pitting, or flatness...">${escHtml(p ? p.notes : '')}</textarea></div>
      <div class="flex gap-3 justify-end pt-2">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${p ? 'Update plate' : 'Register Plate'}</button>
      </div>
    </form>`;
}

function bindOrificeForm(existing) {
  document.getElementById('orifice-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const lastInsp = document.getElementById('of-last-insp').value;
    let deadline = '';
    if (lastInsp) {
      const d = new Date(lastInsp);
      d.setFullYear(d.getFullYear() + 1); // 12 months cycle
      deadline = d.toISOString().split('T')[0];
    }

    const result = DB.saveOrificePlate({
      id: existing ? existing.id : null,
      tag_code: document.getElementById('of-code').value.toUpperCase(),
      serial_number: document.getElementById('of-serial').value,
      system: document.getElementById('of-system').value,
      material: document.getElementById('of-material').value,
      inner_diameter: document.getElementById('of-id').value,
      thickness: document.getElementById('of-thick').value,
      beta: document.getElementById('of-beta').value,
      op_mode: document.getElementById('of-mode').value,
      status: document.getElementById('of-status').value,
      last_inspection: lastInsp,
      deadline: deadline,
      notes: document.getElementById('of-notes').value,
    });

    if (!handleSaveResult(result)) return;
    toast(existing ? 'Plate updated' : 'Plate registered', 'success');
    closeModal();
    renderOrifice(document.getElementById('page-container'));
  });
}

function renderOrifice(container) {
  const plates = DB.getOrificePlates();
  const onDuty = plates.filter(p => p.op_mode === 'Duty');
  const inStorage = plates.filter(p => p.op_mode !== 'Duty');

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Orifice Plate Control</h1>
        <div class="flex gap-4 mt-1">
          <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ring-1 ring-slate-800 px-2 py-0.5 rounded-full bg-navy-900/50">
            ${plates.length} Registered
          </div>
          <div class="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5 ring-1 ring-blue-900/30 px-2 py-0.5 rounded-full bg-blue-500/5">
            ${onDuty.length} On Duty
          </div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="openModal('Register New Orifice Plate', orificeFormHtml(null), () => bindOrificeForm(null))">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Register Plate
      </button>
    </div>

    <div class="space-y-6">
      <div class="card p-0 overflow-hidden">
        <div class="px-6 py-4 border-b border-white/5 bg-white/2 flex justify-between items-center">
          <h3 class="font-bold text-navy uppercase text-xs tracking-widest">Master Plate Index</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-white/5 text-slate-500 font-bold uppercase tracking-widest text-xs">
              <tr>
                <th class="px-8 py-5">TAG / Serial</th>
                <th class="px-8 py-5">Service</th>
                <th class="px-8 py-5">Diameter (d) [mm]</th>
                <th class="px-8 py-5">Beta (β)</th>
                <th class="px-8 py-5">Mode</th>
                <th class="px-8 py-5">Status</th>
                <th class="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-base">
              ${plates.length === 0 ? '<tr><td colspan="7" class="px-8 py-20 text-center text-slate-500 italic text-lg">No plates registered in the current platform.</td></tr>' : 
              plates.map(p => `
                <tr class="hover:bg-white/5 transition-colors">
                  <td class="px-8 py-6">
                    <div class="text-navy font-black text-lg">${p.tag_code}</div>
                    <div class="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">${p.serial_number}</div>
                  </td>
                  <td class="px-8 py-6 text-navy opacity-80 font-bold">${escHtml(p.system)}</td>
                  <td class="px-8 py-6 text-navy font-black text-lg">${p.inner_diameter ? (p.inner_diameter.toLowerCase().includes('mm') ? p.inner_diameter : p.inner_diameter + ' mm') : '---'}</td>
                  <td class="px-8 py-6 text-navy font-black text-lg">${p.beta || '---'}</td>
                  <td class="px-8 py-6">
                     <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${p.op_mode === 'Duty' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-700'}">
                      ${p.op_mode || 'Idle'}
                     </span>
                  </td>
                  <td class="px-8 py-6">${orificeStatusBadge(p.status)}</td>
                  <td class="px-8 py-6 text-right">
                     <button class="p-2.5 hover:bg-white/10 rounded-xl transition-colors border border-white/5" onclick="editOrifice('${p.id}')">
                       <svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                     </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function orificeStatusBadge(s) {
  const map = {
    'ok': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'minor-wear': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'out-of-spec': 'bg-red-500/10 text-red-400 border-red-500/20',
    'replace': 'bg-red-500/20 text-red-500 border-red-500/30 font-black'
  };
  const labels = { 'ok': 'OK', 'minor-wear': 'MINOR WEAR', 'out-of-spec': 'OUT OF SPEC', 'replace': 'REPLACE NOW' };
  return `<span class="px-3 py-1 rounded border text-xs font-black uppercase tracking-widest ${map[s] || map.ok}">${labels[s] || s}</span>`;
}

function editOrifice(id) {
  const p = DB.getOrificePlates().find(x => x.id === id);
  if (!p) return;
  openModal('Edit Orifice Plate Specs', orificeFormHtml(p), () => bindOrificeForm(p));
}

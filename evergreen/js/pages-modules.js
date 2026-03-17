// ============================================================
//  pages-modules.js — Inspections, Materials, Systems,
//                     Operational Notes, Alerts, Search
// ============================================================

// ---- Shared Module Helpers ----
function getTagOptions(selectedId, filterType = null) {
  let tags = DB.getTags();
  if (filterType) {
    tags = tags.filter(t => (t.type || '').toLowerCase() === filterType.toLowerCase());
  }
  return tags.map(t => `<option value="${t.id}" data-code="${t.tag_code}" ${selectedId === t.id ? 'selected' : ''}>${t.tag_code} — ${t.name || t.system}</option>`).join('');
}

// ========== MAINTENANCE & INSPECTIONS ==========
function maintInspFormHtml(item, requestedType = 'Inspection') {
  const type = item ? item.type : requestedType;
  return `<form id="maint-insp-form" class="space-y-0">
      <div class="grid-2">
        <div class="form-group"><label class="form-label">TAG</label>
          <select class="form-select" id="mif-tag"><option value="">— Select TAG —</option>${getTagOptions(item && item.tag_id)}</select>
        </div>
        <div class="form-group"><label class="form-label">Date</label>
          <input type="date" class="form-input" id="mif-date" value="${item ? item.date : ''}" />
        </div>
      </div>
        <div class="form-group"><label class="form-label">Condition / Priority</label>
          <select class="form-select" id="mif-cond">
            ${['Good / Low', 'Degraded / Medium', 'Critical / High', 'Decommissioned'].map(c => `<option ${item && item.condition === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      <div class="form-group"><label class="form-label">Findings / Work Done</label>
        <textarea class="form-textarea" id="mif-find" style="min-height:90px" placeholder="Describe findings or the work performed...">${escHtml(item ? item.findings : '')}</textarea>
      </div>
      <div class="form-group"><label class="form-label">Recommendation / Follow-up</label>
        <textarea class="form-textarea" id="mif-rec" placeholder="Next steps or recommendations...">${escHtml(item ? item.recommendation : '')}</textarea>
      </div>
      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-select" id="mif-status">
          ${['open', 'in-progress', 'closed'].map(s => `<option value="${s}" ${item && item.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <input type="hidden" id="mif-type" value="${type}" />
      <div class="form-group"><label class="form-label">Attachments (Photos & PDFs)</label>
        <div id="mif-media-container"></div>
      </div>
      <div class="flex gap-3 justify-end pt-2">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${item ? 'Update' : 'Create'} ${type}</button>
      </div>
    </form>`;
}

function bindMaintInspForm(existingId, requestedType = 'Inspection') {
  const existing = existingId ? DB.getInspections().find(x => x.id === existingId) : null;
  let mediaArray = existing ? [...(existing.media || [])] : [];
  setupMediaDropzone('mif-media-container', (m) => { mediaArray = m; }, mediaArray);

  document.getElementById('maint-insp-form').addEventListener('submit', e => {
    e.preventDefault();
    const s = document.getElementById('mif-tag');
    const o = s.options[s.selectedIndex];
    const type = document.getElementById('mif-type').value;
    const result = DB.saveInspection({
      id: existingId || null,
      type: type,
      tag_id: s.value,
      tag_code: o && o.dataset.code || '',
      inspector: (window.getUser().name || 'Unknown'),
      author_id: existingId ? (DB.getInspections().find(x => x.id === existingId).author_id) : ((window.getUser().id || null)),
      date: document.getElementById('mif-date').value,
      condition: document.getElementById('mif-cond').value,
      findings: document.getElementById('mif-find').value,
      recommendation: document.getElementById('mif-rec').value,
      status: document.getElementById('mif-status').value,
      media: mediaArray
    });

    if (!handleSaveResult(result)) return;

    toast(existingId ? 'Updated' : 'Created', 'success');
    closeModal();
    renderInspections(document.getElementById('page-container'));
  });
}

function renderInspections(container) {
  let items = DB.getInspections();
  
  // Adiciona função global para toggle de arquivo
  window.toggleArchiveInspection = (id) => {
    const i = DB.getInspections().find(x => x.id === id);
    if (!i) return;
    i.archived = !i.archived;
    DB.saveInspection(i);
    toast(i.archived ? 'Record archived' : 'Record restored', 'success');
    renderInspections(document.getElementById('page-container'));
  };

  container.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Maint. & Inspections</h1><p class="page-subtitle">${items.length} records</p></div>
      <div class="flex gap-2">
        <button class="btn btn-secondary" onclick="openModal('New Maintenance', maintInspFormHtml(null, 'Maintenance'), () => bindMaintInspForm(null, 'Maintenance'))">🛠️ + Maintenance</button>
        <button class="btn btn-primary" onclick="openModal('New Inspection', maintInspFormHtml(null, 'Inspection'), () => bindMaintInspForm(null, 'Inspection'))">🔍 + Inspection</button>
      </div>
    </div>
    <div class="filter-bar mb-2">
      <button class="filter-chip mi-filter active" data-filter="open" onclick="renderInspectionsFilter('open')">Active</button>
      <button class="filter-chip mi-filter" data-filter="archived" onclick="renderInspectionsFilter('archived')">Archived</button>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table">
        <thead><tr><th>Type</th><th>TAG</th><th>Date</th><th>Findings / Work</th><th>Condition</th><th>Status</th><th></th></tr></thead>
        <tbody id="mi-table-body">
          ${renderInspectionsRows(items.filter(i => !i.archived))}
        </tbody>
      </table>
    </div>`;

  window.renderInspectionsFilter = (filterType) => {
    document.querySelectorAll('.mi-filter').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filterType));
    const isArchived = filterType === 'archived';
    document.getElementById('mi-table-body').innerHTML = renderInspectionsRows(DB.getInspections().filter(i => (i.archived || false) === isArchived));
  };
}

function renderInspectionsRows(filteredItems) {
  return filteredItems.length === 0 ? '<tr><td colspan="7"><div class="empty-state"><p>No records found.</p></div></td></tr>' :
      filteredItems.map(item => `
              <tr class="${item.archived ? 'opacity-50 grayscale' : ''}">
                <td><span class="text-[10px] font-bold uppercase tracking-wider ${item.type === 'Maintenance' ? 'text-orange-400' : 'text-blue-400'}">${item.type || 'Inspection'}</span></td>
                <td>${tagChip(item.tag_code)}</td>
                <td class="text-navy opacity-80 font-mono text-xs">${fmtDate(item.date)}</td>
                <td class="text-slate-400 max-w-xs">
                  <div class="truncate" title="${escHtml(item.findings)}">${escHtml(item.findings)}</div>
                  ${renderGallery(item.media)}
                </td>
                <td><span class="badge ${item.condition && item.condition.includes('Good') ? 'badge-low' : item.condition && item.condition.includes('Degraded') ? 'badge-medium' : 'badge-critical'}">${item.condition || '—'}</span></td>
                <td>${statusBadge(item.status)}</td>
                <td>
                  <div class="flex gap-2">
                    ${canEdit(item) ? `
                    <button class="btn btn-sm btn-secondary" onclick="openModal('Edit ${item.type || 'Record'}', maintInspFormHtml(DB.getInspections().find(x=>x.id==='${item.id}')), () => bindMaintInspForm('${item.id}'))">Edit</button>
                    <button class="btn ${item.archived ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="toggleArchiveInspection('${item.id}')">${item.archived ? '📦 Unarchive' : '📦 Archive'}</button>
                    <button class="btn btn-sm btn-danger" onclick="confirmDelete('${item.type || 'Record'} for ${item.tag_code}', () => { DB.deleteInspection('${item.id}'); renderInspections(document.getElementById('page-container')); })">Del</button>
                    ` : ''}
                  </div>
                </td>
              </tr>`).join('');
}

// ========== MATERIAL MOVEMENT ==========
function matFormHtml(item) {
  return `<form id="mat-form" class="space-y-0">
      <div class="grid-2">
        <div class="form-group"><label class="form-label">TAG (Optional)</label>
          <select class="form-select" id="mf-tag"><option value="">— Select TAG —</option>${getTagOptions(item && item.tag_id)}</select>
        </div>
        <div class="form-group"><label class="form-label">Material Name / Description</label>
          <input class="form-input" id="mf-name" value="${escHtml(item ? item.material_name : '')}" placeholder="e.g. Flow Meter, Valve" />
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Serial Number</label>
          <input class="form-input" id="mf-serial" value="${escHtml(item ? item.serial_number : '')}" placeholder="Serial / AWB" />
        </div>
        <div class="form-group"><label class="form-label">IFS Code</label>
          <input class="form-input" id="mf-ifs" value="${escHtml(item ? item.ifs_code : '')}" placeholder="IFS Code" />
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">PR Number (Requisition)</label>
          <input class="form-input" id="mf-pr" value="${escHtml(item ? item.pr_number : '')}" placeholder="e.g. PR-2024-001" />
        </div>
        <div class="form-group"><label class="form-label">PO Number (Order)</label>
          <input class="form-input" id="mf-po" value="${escHtml(item ? item.po_number : '')}" placeholder="e.g. PO-88772" />
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Destination / Source</label>
          <input class="form-input" id="mf-dest" value="${escHtml(item ? item.destination : '')}" placeholder="Lab / Workshop / Offshore / Shore" />
        </div>
        <div class="form-group"><label class="form-label">Shipment Date</label>
          <input type="date" class="form-input" id="mf-ship" value="${item ? item.shipment_date : ''}" />
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Expected Return</label>
          <input type="date" class="form-input" id="mf-ret" value="${item ? item.expected_return : ''}" />
        </div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-select" id="mf-status">
            ${[
    { id: 'purchase-requisition', label: 'Purchase Requisition (PR)' },
    { id: 'purchase-order', label: 'Purchase Order (PO)' },
    { id: 'pending', label: 'Pending' },
    { id: 'in-transit', label: 'In Transit' },
    { id: 'on-shore-calibration', label: 'On Shore Calibration' },
    { id: 'awaiting-installation', label: 'Awaiting Installation' },
    { id: 'received', label: 'Received' },
    { id: 'closed', label: 'Closed' }
  ].map(s => `<option value="${s.id}" ${item && (item.status || '').toLowerCase() === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Notes / Justification</label>
        <textarea class="form-textarea" id="mf-notes">${escHtml(item ? item.notes : '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Photos & PDFs</label>
        <div id="mf-media-container"></div>
      </div>
      <div class="flex flex-wrap gap-3 justify-end pt-2">
        ${item && (item.status || '').toLowerCase() === 'closed' && canEdit(item) ? `
          <button type="button" class="btn ${item.archived ? 'btn-secondary' : 'btn-primary'} btn-sm mr-auto" onclick="toggleArchiveMaterial('${item.id}')">
            ${item.archived ? '📦 Unarchive' : '📦 Archive Record'}
          </button>
        ` : ''}
        ${item && canEdit(item) ? `
          <button type="button" class="btn btn-danger btn-sm mr-auto" onclick="closeModal(); confirmDelete('Movement ${escHtml(item.tag_code || item.material_name)}', () => { DB.deleteMaterial('${item.id}'); renderMaterials(document.getElementById('page-container')); })">Delete Record</button>
        ` : ''}
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${item ? 'Update' : 'Add'} Record</button>
      </div>
    </form>`;
}

function bindMatForm(existingId) {
  const materials = DB.getMaterials();
  const existing = existingId ? materials.find(x => x.id === existingId) : null;
  let mediaArray = existing ? [...(existing.media || [])] : [];
  setupMediaDropzone('mf-media-container', (m) => { mediaArray = m; }, mediaArray);

  document.getElementById('mat-form').addEventListener('submit', e => {
    e.preventDefault();
    const tagSelect = document.getElementById('mf-tag');
    const selectedOption = tagSelect.options[tagSelect.selectedIndex];
    
    // Build the data object
    const matData = {
      id: existingId || null,
      tag_id: tagSelect.value,
      tag_code: selectedOption && selectedOption.dataset.code || '',
      material_name: document.getElementById('mf-name').value,
      ifs_code: document.getElementById('mf-ifs').value,
      pr_number: document.getElementById('mf-pr').value,
      po_number: document.getElementById('mf-po').value,
      serial_number: document.getElementById('mf-serial').value,
      destination: document.getElementById('mf-dest').value,
      shipment_date: document.getElementById('mf-ship').value,
      expected_return: document.getElementById('mf-ret').value,
      status: document.getElementById('mf-status').value,
      notes: document.getElementById('mf-notes').value,
      media: mediaArray
    };

    // If it's a new record, set the author. If it's an update, DB.saveMaterial will preserve it.
    if (!existingId) {
      matData.author_id = (window.getUser().id || null);
    }

    const result = DB.saveMaterial(matData);

    if (!handleSaveResult(result)) return;

    toast(existingId ? 'Record Updated' : 'Record Created', 'success');
    closeModal();
    renderMaterials(document.getElementById('page-container'));
  });
}

function openEditMaterial(id) {
  const item = DB.getMaterials().find(x => x.id === id);
  if (!item) return;
  openModal('Edit Record', matFormHtml(item), () => bindMatForm(id));
}

function toggleArchiveMaterial(id) {
  const materials = DB.getMaterials();
  const m = materials.find(x => x.id === id);
  if (!m) return;
  DB.saveMaterial({ ...m, archived: !m.archived });
  toast(m.archived ? 'Record Unarchived' : 'Record Archived', 'success');
  closeModal();
  renderMaterials(document.getElementById('page-container'));
}

function renderMaterials(container) {
  let materials = DB.getMaterials();
  let filter = 'all';

  function render(filterType, searchVal) {
    filter = filterType || filter;
    let list = materials;

    // Status Filter
    if (filter === 'archived') {
      list = list.filter(m => m.archived);
    } else {
      list = list.filter(m => !m.archived);
      if (filter !== 'all') {
        list = list.filter(m => (m.status || '').toLowerCase() === filter.toLowerCase());
      }
    }

    if (searchVal) {
      const q = searchVal.toLowerCase();
      list = list.filter(m =>
        (m.tag_code || '').toLowerCase().includes(q) ||
        (m.material_name || '').toLowerCase().includes(q) ||
        (m.ifs_code || '').toLowerCase().includes(q) ||
        (m.serial_number || '').toLowerCase().includes(q)
      );
    }

    document.getElementById('materials-list').innerHTML = `
      <div class="card overflow-x-auto">
        <table class="data-table table-hover">
          <thead><tr><th>TAG</th><th>Material</th><th>PR/PO</th><th>IFS Code</th><th>Serial</th><th>Destination</th><th>Status</th><th>Last Update</th><th></th></tr></thead>
          <tbody>
            ${list.length === 0 ? '<tr><td colspan="9"><div class="empty-state"><p>No material movements found.</p></div></td></tr>' :
        list.map(item => `
                <tr class="cursor-pointer" onclick="openMaterialDetail('${item.id}')">
                  <td>${item.tag_code ? tagChip(item.tag_code) : `<span class="text-slate-500 italic text-xs">No TAG</span>`}</td>
                  <td class="text-navy font-medium">${escHtml(item.material_name || item.tag_code || '—')}</td>
                  <td class="text-slate-400 font-mono text-xs">
                    ${item.pr_number ? `<div class="text-[10px] text-slate-500">PR: ${escHtml(item.pr_number)}</div>` : ''}
                    ${item.po_number ? `<div class="text-[10px] text-orange-400">PO: ${escHtml(item.po_number)}</div>` : ''}
                    ${!item.pr_number && !item.po_number ? '—' : ''}
                  </td>
                  <td class="text-navy opacity-80 font-mono text-xs">${escHtml(item.ifs_code || '—')}</td>
                  <td class="text-navy opacity-80 font-mono text-xs">
                    <div class="flex items-center gap-2">
                      ${escHtml(item.serial_number)}
                      ${item.media && item.media.length > 0 ? `<span class="text-orange-500" title="${item.media.length} attachments">📸</span>` : ''}
                    </div>
                  </td>
                  <td class="text-slate-400">${escHtml(item.destination)}</td>
                  <td>${statusBadge(item.status)}</td>
                  <td class="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">${timeAgo(item.updated_at || item.created_at)}</td>
                  <td onclick="event.stopPropagation()">
                    ${canEdit(item) ? `<button class="p-1 hover:text-orange-400 transition" onclick="openEditMaterial('${item.id}')">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>` : ''}
                  </td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  container.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Material Movement</h1><p class="page-subtitle">${materials.length} records</p></div>
      <button class="btn btn-primary" onclick="openModal('New Material Movement', matFormHtml(null), () => bindMatForm(null))">+ Add Movement</button>
    </div>
    <div class="filter-bar">
      <input id="mat-search" class="form-input" style="max-width:260px;padding:0.4rem 0.75rem" placeholder="Search by TAG or IFS Code…" />
      <button class="filter-chip active" data-filter="all">All</button>
      <button class="filter-chip" data-filter="purchase-requisition">PR</button>
      <button class="filter-chip" data-filter="purchase-order">PO</button>
      <button class="filter-chip" data-filter="pending">Pending</button>
      <button class="filter-chip" data-filter="in-transit">In Transit</button>
      <button class="filter-chip" data-filter="received">Received</button>
      <button class="filter-chip" data-filter="closed">Closed</button>
      <button class="filter-chip" data-filter="archived">Archived</button>
    </div>
    <div id="materials-list"></div>`;

  render('all');
  document.querySelectorAll('.filter-chip').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    render(b.dataset.filter, document.getElementById('mat-search').value);
  }));
  document.getElementById('mat-search').addEventListener('input', e => render(filter, e.target.value));

  window.toggleArchiveMaterial = (id) => {
    const m = DB.getMaterials().find(x => x.id === id);
    if (!m) return;
    m.archived = !m.archived;
    DB.saveMaterial(m);
    toast(m.archived ? 'Record archived' : 'Record restored', 'success');
    openModal(m.tag_code + ' — Movement Details', materialDetail(DB.getMaterials().find(x => x.id === id)));
    renderMaterials(container);
  };

  window.openMaterialDetail = (id) => {
    const item = DB.getMaterials().find(x => x.id === id);
    if (!item) return;
    openModal(item.tag_code + ' — Movement Details', materialDetail(item));
  };
}

function materialDetail(m) {
  return `
    <div class="space-y-4">
      <div class="flex items-center gap-2 mb-2">
        ${m.tag_code ? tagChip(m.tag_code) : ''} ${statusBadge(m.status)}
      </div>
      <div><div class="section-label">Material Name / Description</div><div class="text-xl font-bold text-navy">${escHtml(m.material_name || m.tag_code || '—')}</div></div>
      <div class="grid-2">
        <div class="bg-navy-700/30 p-3 rounded-xl border border-slate-700/50">
          <div class="section-label mb-1">PR Number</div>
          <div class="text-navy font-bold font-mono">${escHtml(m.pr_number || '—')}</div>
        </div>
        <div class="bg-navy-700/30 p-3 rounded-xl border border-slate-700/50">
          <div class="section-label mb-1">PO Number</div>
          <div class="text-orange-400 font-bold font-mono">${escHtml(m.po_number || '—')}</div>
        </div>
      </div>
      <div class="grid-2">
        <div><div class="section-label">IFS Code</div><div class="text-navy font-mono">${escHtml(m.ifs_code || '—')}</div></div>
        <div><div class="section-label">Serial / AWB</div><div class="text-navy font-mono">${escHtml(m.serial_number)}</div></div>
      </div>
      <div><div class="section-label">Destination</div><div class="text-navy opacity-80 font-bold">${escHtml(m.destination)}</div></div>
      <div class="grid-2">
        <div class="bg-navy-700/30 p-3 rounded-xl border border-slate-700/50">
          <div class="section-label mb-1">Shipment Date</div>
          <div class="text-navy font-bold flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            ${fmtDate(m.shipment_date)}
          </div>
        </div>
        <div class="bg-navy-700/30 p-3 rounded-xl border border-slate-700/50">
          <div class="section-label mb-1">Expected Return</div>
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span class="${isOverdue(m.expected_return) && m.status !== 'received' ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}">
              ${fmtDate(m.expected_return)}
            </span>
          </div>
        </div>
      </div>
      <div><div class="section-label">Notes / Justification</div><div class="text-navy opacity-80 whitespace-pre-wrap">${escHtml(m.notes)}</div></div>
      
      ${m.media && m.media.length > 0 ? `
        <div class="mt-6">
          <div class="section-label">Attachments</div>
          ${renderGallery(m.media)}
        </div>
      ` : ''}

      <div class="text-[10px] text-slate-500 pt-4 border-t border-slate-700">
        Record created: ${fmt(m.created_at)} | Last activity: ${fmt(m.updated_at || m.created_at)}
      </div>

      ${canEdit(m) ? `
        <div class="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
          <button class="btn btn-secondary btn-sm" onclick="openEditMaterial('${m.id}')">Edit Movement</button>
          
          ${(m.status || '').toLowerCase() === 'closed' ? `
            <button class="btn ${m.archived ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="toggleArchiveMaterial('${m.id}')">
              ${m.archived ? '📦 Unarchive' : '📦 Archive Record'}
            </button>
          ` : ''}

          <button class="btn btn-danger btn-sm" onclick="confirmDelete('Movement ${m.tag_code}', () => { DB.deleteMaterial('${m.id}'); navigate('materials'); closeModal(); })">Delete</button>
        </div>` : ''}
    </div>`;
}

// ========== FC CONFIG LOG (AUDIT TRAIL) ==========
function sysFormHtml(item) {
  const isIoPerformed = item && item.expire_date ? true : false;
  return `<form id="sys-form" class="space-y-4">
      <div class="form-group" style="${item && item.tag_id ? 'display:none' : ''}">
        <label class="form-label">Flow Computer (TAG)</label>
        <select class="form-select" id="sf-tag" ${item && item.tag_id ? '' : 'required'} ${item && item.id ? 'disabled' : ''}><option value="">— Select TAG —</option>${getTagOptions(item && item.tag_id, 'Flow Computer')}</select>
      </div>
      
      <div class="form-group p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl">
        <label class="relative inline-flex items-center cursor-pointer group">
          <input type="checkbox" id="sf-io-check" class="sr-only peer" ${isIoPerformed ? 'checked' : ''}>
          <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
          <span class="ms-3 text-sm font-bold text-orange-400 uppercase tracking-tighter group-hover:text-orange-300 transition-colors">Flow I/O Verification performed</span>
        </label>
        <div id="sf-exp-group" class="mt-3 ${isIoPerformed ? '' : 'hidden'}">
          <label class="form-label text-[10px] text-slate-500 uppercase">Verification Expiry Date</label>
          <input type="date" class="form-input" id="sf-exp" value="${item && item.expire_date ? item.expire_date : ''}" />
        </div>
      </div>

      <div class="form-group"><label class="form-label">Log Note / Diagnostic Details</label>
        <textarea class="form-textarea" id="sf-notes" style="min-height:100px" placeholder="Write the technical note or findings...">${escHtml(item ? item.notes : '')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label text-blue-400">Config Files (.TXT Audit)</label>
        <div id="sf-media-container" data-accept="txt"></div>
      </div>

      <div class="flex flex-wrap gap-3 justify-end pt-2">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Log Entry</button>
      </div>
    </form>`;
}

function bindSysForm(existingId, isNewLog = false) {
  try {
    const systems = DB.getSystems();
    const existing = existingId ? systems.find(x => x.id === existingId) : null;
    let currentMedia = isNewLog ? [] : (existing ? (existing.media || []) : []);

    setupMediaDropzone('sf-media-container', (m) => { currentMedia = m; }, currentMedia);

    // Toggle logic for Flow I/O Verification (Simpler Checkbox)
    const ioCheck = document.getElementById('sf-io-check');
    const expGroup = document.getElementById('sf-exp-group');
    const expInput = document.getElementById('sf-exp');
    
    if (ioCheck && expGroup && expInput) {
      ioCheck.onchange = () => {
        expGroup.classList.toggle('hidden', !ioCheck.checked);
        if (!ioCheck.checked) expInput.value = '';
      };
    }

    const form = document.getElementById('sys-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      try {
        const tagSelect = document.getElementById('sf-tag');
        const selectedOption = tagSelect.options[tagSelect.selectedIndex];
        const isIo = document.getElementById('sf-io-check').checked;
        
        const sysData = {
          id: isNewLog ? null : (existingId || null),
          // CORE STABILITY: Force inheritance of technical identity
          tag_id: tagSelect.value || (existing ? existing.tag_id : null),
          tag_code: (selectedOption && selectedOption.dataset.code) || (existing ? existing.tag_code : ''),
          system_name: existing ? existing.system_name : (selectedOption ? selectedOption.textContent.split(' — ')[1] : 'Flow Computer'),
          metering_point: existing ? existing.metering_point : (selectedOption ? selectedOption.dataset.point : '—'),
          manufacturer: existing ? existing.manufacturer : '—',
          model: existing ? existing.model : '—',
          firmware: existing ? existing.firmware : '—',
          serial_number: existing ? existing.serial_number : '—',
          // Simplified Log Fields
          expire_date: isIo ? expInput.value : null,
          status: existing ? (existing.status || 'LOG') : 'LOG', // Neutral status for logs
          notes: document.getElementById('sf-notes').value,
          media: currentMedia,
          author_id: window.getUser().id || null,
          created_at: isNewLog ? new Date().toISOString() : (existing ? existing.created_at : new Date().toISOString()),
          updated_at: new Date().toISOString()
        };

        if (!sysData.tag_code) {
          toast('Please select a Flow Computer', 'warning');
          return;
        }

        const result = DB.saveSystem(sysData);
        if (!handleSaveResult(result)) return;

        toast(isNewLog ? 'Log Entry Saved' : 'Record Updated', 'success');
        closeModal();
        renderSystems(document.getElementById('page-container'));
      } catch (innerErr) {
        console.error('Submit error:', innerErr);
        toast('Error saving log', 'error');
      }
    });
  } catch (err) {
    console.error('Binding error:', err);
  }
}

function renderSystems(container) {
  // DRIVE BY TAGS: Every Flow Computer in the registry gets a card
  const allTags = DB.getTags();
  const fcTags = allTags.filter(t => t.type === 'Flow Computer');
  
  // Sort by TAG code naturally
  fcTags.sort((a, b) => (a.tag_code || '').localeCompare(b.tag_code || '', undefined, { numeric: true, sensitivity: 'base' }));

  container.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">FC Config Log</h1><p class="page-subtitle">${fcTags.length} units</p></div>
      <div class="flex gap-2">
        <input type="file" id="fc-xml-input" accept=".xml" style="display:none" onchange="handleFCImport(this)">
        <button class="btn btn-secondary" onclick="document.getElementById('fc-xml-input').click()">
          <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Import FC XML
        </button>
        <button class="btn btn-primary" onclick="openModal('New Configuration', sysFormHtml(null), () => bindSysForm(null))">Add Config</button>
      </div>
    </div>
    
    <div id="systems-list-container" class="space-y-4">
      ${renderSystemsList(fcTags)}
    </div>`;
}

function renderSystemsList(fcTags) {
  const allSystems = DB.getSystems();
  
  if (fcTags.length === 0) return '<div class="empty-state"><p>No Flow Computers found in Tag Registry.</p></div>';

  return fcTags.map(tag => {
    // Cross-reference: Get the latest log for this specific tag
    const reports = allSystems.filter(s => s.tag_id === tag.id || s.tag_code === tag.tag_code);
    const latest = reports.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];

    // Data merging: Prefer latest log, fallback to Tag data
    const sn = tag.serial_number || (latest ? latest.serial_number : '—');
    const name = tag.name || (latest ? latest.system_name : 'Flow Computer');
    const updateTime = latest ? fmt(latest.updated_at || latest.created_at) : 'No entries yet';
    
    return `
    <div class="card p-5 hover:border-orange-500/30 transition-all border border-slate-700/50 cursor-pointer group/card" 
         onclick="openSystemHistory('${tag.tag_code}')">
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-orange-400 font-bold font-mono text-sm bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20" title="Tag Code">${escHtml(tag.tag_code)}</span>
            <span class="text-blue-400 font-bold font-mono text-[11px] uppercase bg-blue-500/10 px-2 py-1.5 rounded border border-blue-500/20 shadow-sm" title="Serial Number">S/N: ${escHtml(sn)}</span>
            <div class="text-navy font-bold text-lg group-hover/card:text-orange-400 transition-colors">${escHtml(name)}</div>
          </div>
          
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div class="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1.5 bg-navy-950 px-2 py-1 rounded border border-slate-800 shadow-inner">
              <svg class="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Latest Log: <span class="text-orange-400 font-black">${updateTime}</span></span>
            </div>
            <div class="text-[10px] text-slate-500 font-bold flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all text-blue-400">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.082.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <span>Click for Audit Trail</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-navy-900/40 p-3 rounded-lg border border-slate-700/30 mb-4">
        <div class="flex flex-col">
          <span class="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Manufacturer / Model</span>
          <span class="text-xs text-navy opacity-80">${escHtml(latest ? latest.manufacturer : '—')} / ${escHtml(latest ? latest.model : '—')}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Firmware Version</span>
          <span class="text-xs font-mono text-navy opacity-80">${escHtml(latest ? latest.firmware : '—')}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Flow I/O Verification</span>
          <span class="text-xs ${latest && isOverdue(latest.expire_date) ? 'text-red-400 font-bold' : 'text-navy opacity-80'}">${latest ? fmtDate(latest.expire_date) : 'Pending'}</span>
        </div>
      </div>
      
      <div class="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 border-r border-slate-700 pr-4">
            ${tagChip(tag.tag_code)}
          </div>
          ${(latest && latest.media && latest.media.length > 0) ? `
            <div class="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20 text-[10px] font-bold">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              <span>${latest.media.length} AUDIT FILES</span>
            </div>
          ` : ''}
        </div>
        
        <div class="flex gap-2">
          <button class="btn btn-sm btn-primary flex items-center gap-1.5 h-8 px-4" 
                  onclick="event.stopPropagation(); openModal('New log for ${tag.tag_code}', sysFormHtml({tag_id: '${tag.id}'}), () => bindSysForm('${latest ? latest.id : ''}', true))">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            <span>Log Entry</span>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

window.openSystemHistory = function(tagCode) {
  openModal(`History: ${tagCode}`, systemHistoryHtml(tagCode));
}

function systemHistoryHtml(tagCode) {
  const records = DB.getSystems()
    .filter(r => r.tag_code === tagCode)
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

  if (records.length === 0) return '<div class="empty-state"><p>No history records found for this unit.</p></div>';

  return `
    <div class="space-y-3 pb-4">
      <div class="flex items-center justify-between mb-4 bg-navy-950/40 p-3 rounded-lg border border-slate-800/50">
        <div class="text-[10px] text-slate-500 uppercase tracking-widest font-black">History Timeline: ${tagCode}</div>
        <div class="text-[10px] text-orange-400 font-bold uppercase tracking-widest">${records.length} Records</div>
      </div>
      
      <div class="max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar space-y-3 px-1">
        ${records.map(r => {
          const hasMedia = r.media && r.media.length > 0;
          return `
          <div class="group/row flex items-center justify-between p-4 bg-navy-900/60 border border-slate-800/60 rounded-xl hover:border-orange-500/40 hover:bg-navy-800/80 transition-all cursor-pointer shadow-sm relative overflow-hidden"
               onclick="downloadLogAttachments('${r.id}')">
            
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 transform -translate-x-full group-hover/row:translate-x-0 transition-transform"></div>

            <div class="flex items-center gap-4 flex-1">
               <div class="flex flex-col min-w-[110px]">
                  <span class="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">${fmt(r.updated_at || r.created_at)}</span>
                   
               </div>
               
               <div class="h-8 w-px bg-slate-800/50"></div>

               <div class="flex-1 px-2">
                  <div class="text-xs text-slate-200 font-medium line-clamp-1 group-hover/row:text-navy transition-colors">
                     ${escHtml(r.notes || '')}
                  </div>
                  <div class="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                     ${r.expire_date ? `<span class="text-blue-400/80">Calibration: ${fmtDate(r.expire_date)}</span>` : ''}
                  </div>
               </div>
            </div>

            <div class="flex items-center gap-2">
               ${hasMedia ? `
                 <div class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 shadow-sm transition-all group-hover/row:bg-orange-500/20">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span class="text-[10px] font-black uppercase tracking-widest">${r.media.length} TXT</span>
                 </div>
               ` : `
                 <span class="text-[9px] text-slate-700 uppercase font-black tracking-widest">No Evid.</span>
               `}
               
               <div class="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-500 group-hover/row:text-orange-400 group-hover/row:bg-white/10 transition-all opacity-0 group-hover/row:opacity-100">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
               </div>

               ${canEdit(r) ? `
                 <button class="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all ml-2" 
                         onclick="event.stopPropagation(); deleteHistoryEntry('${r.id}', '${tagCode}')">
                   <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
               ` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
      
      <p class="text-[10px] text-slate-500 text-center mt-2 italic px-4 py-2 border border-slate-800/20 rounded bg-navy-950/20">
        💡 Standard Log View: Click any row to download the attached TXT configuration and Audit Trail files.
      </p>
    </div>
  `;
}

window.deleteHistoryEntry = function(id, tagCode) {
  confirmDelete('this history log entry', () => {
    try {
      DB.deleteSystem(id);
      toast('History entry deleted', 'success');
      
      // Refresh the main view
      const container = document.getElementById('page-container');
      renderSystems(container);

      // Refresh the history modal (effectively closing and reopening)
      closeModal();
      setTimeout(() => {
        window.openSystemHistory(tagCode);
      }, 300);
    } catch (err) {
      console.error('Delete history error:', err);
      toast('Error deleting entry', 'error');
    }
  });
}

window.downloadLogAttachments = async function(recordId) {
  try {
    const r = DB.getSystems().find(x => x.id === recordId);
    if (!r || !r.media || r.media.length === 0) {
      toast('No files to download for this entry', 'info');
      return;
    }

    const tagCode = r.tag_code || 'FC-LOG';
    const dateStr = new Date(r.updated_at || r.created_at).toISOString().split('T')[0];
    
    if (r.media.length === 1) {
      const file = r.media[0];
      const link = document.createElement('a');
      link.href = file.data;
      link.download = file.name || `${tagCode}_Audit_${dateStr}.txt`;
      document.body.appendChild(link); // Better browser compatibility
      link.click();
      document.body.removeChild(link);
      toast('Downloading file...', 'success');
    } else {
      if (typeof JSZip === 'undefined') {
        toast('ZIP library still loading. Please wait...', 'warning');
        console.error('JSZip not found. Checking CDN...');
        return;
      }

      toast('Generating ZIP package...', 'info');
      const zip = new JSZip();
      
      for (const file of r.media) {
        if (!file.data) continue;
        const name = file.name || `audit_${Date.now()}.txt`;
        // Handle potential different data formats
        const base64Part = file.data.includes(',') ? file.data.split(',')[1] : file.data;
        zip.file(name, base64Part, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tagCode}_Full_Audit_${dateStr}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast('ZIP Package downloaded!', 'success');
    }
  } catch (err) {
    console.error('Download error:', err);
    toast('Error downloading log evidence', 'error');
  }
}

window.handleFCImport = function(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(e.target.result, "text/xml");
      const rows = xmlDoc.getElementsByTagName("Row");
      let count = 0;
      
      const allTags = DB.getTags ? DB.getTags() : [];
      const systems = DB.getSystems();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.getAttribute("ss:StyleID") === "s63") {
          const cells = row.getElementsByTagName("Cell");
          if (cells.length >= 9) {
            const getData = (idx) => {
              const data = cells[idx].getElementsByTagName("Data")[0];
              return data ? data.textContent.trim() : "";
            };

            const mp = getData(1);
            const tagCode = getData(2);
            const desc = getData(4);
            const manufacturer = getData(5);
            const model = getData(6);
            const firmware = getData(7);
            const serial = getData(8);

            // 1. Ensure Tag exists in Tag Registry
            let tagObj = allTags.find(t => t.tag_code === tagCode);
            if (!tagObj && DB.saveTag) {
                DB.saveTag({
                  tag_code: tagCode,
                  name: desc,
                  system: 'Flow Computer',
                  type: 'Flow Computer',
                  location: 'Metering Station',
                  active: true
                });
                // Re-fetch tags
                const updatedTags = DB.getTags();
                tagObj = updatedTags.find(t => t.tag_code === tagCode);
            }

            // 2. Create or Update System Configuration
            const existingSys = systems.find(s => s.tag_code === tagCode);
            DB.saveSystem({
              id: existingSys ? existingSys.id : null,
              metering_point: mp,
              tag_id: tagObj ? tagObj.id : '',
              tag_code: tagCode,
              system_name: desc,
              manufacturer: manufacturer,
              model: model,
              firmware: firmware,
              serial_number: serial,
              status: 'Duty'
            });
            count++;
          }
        }
      }
      
      toast(`Imported ${count} Flow Computers successfully`, 'success');
      renderSystems(document.getElementById('page-container'));
    } catch (err) {
      console.error(err);
      toast('Error parsing XML file', 'error');
    }
  };
  
  reader.readAsText(file);
  input.value = ''; // Reset input
};

// ========== OPERATIONAL NOTES ==========
let notesSection = 'offloading'; // 'offloading' or 'well-test'

function noteFormHtml(item) {
  const type = (item && item.note_type) || notesSection;
  const isWell = type === 'well-test';
  const isOff = type === 'offloading';

  return `<form id="note-form" class="space-y-0">
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Type</label>
          <select class="form-select" id="nf-type" ${item && item.id ? 'disabled' : ''}>
            <option value="offloading" ${type === 'offloading' ? 'selected' : ''}>🚢 Offloading</option>
            <option value="well-test" ${type === 'well-test' ? 'selected' : ''}>🛰️ Well Test</option>
          </select>
        </div>
        ${isOff ? '' : `<div class="form-group"><label class="form-label">TAG</label>
          <select class="form-select" id="nf-tag">
            <option value="">— Select TAG —</option>
            ${getTagOptions(item && item.tag_id, isWell ? 'Well' : null)}
          </select>
        </div>`}
      </div>

      <div class="grid-2">
        ${isOff ? '' : `<div class="form-group"><label class="form-label">System</label>
          <input class="form-input" id="nf-system" value="${escHtml(item ? item.system : (isWell ? 'Production' : 'Offloading'))}" placeholder="System" />
        </div>`}
        <div class="form-group"><label class="form-label">${isWell ? 'Well Status' : 'Cargo Number'}</label>
          <input class="form-input" id="nf-cond" value="${escHtml(item ? (isOff ? (item.cargo_number || item.condition) : item.condition) : '')}" placeholder="${isWell ? 'e.g. Producing, Shut-in' : 'e.g. 001/2024'}" />
        </div>
        ${isOff ? `
        <div class="form-group"><label class="form-label">Operation Date</label>
          <input type="date" class="form-input" id="nf-off-date" value="${item ? (item.operation_date || '') : ''}" />
        </div>
        <div class="form-group"><label class="form-label">Vessel Name</label>
          <input class="form-input" id="nf-vessel" value="${escHtml(item ? item.vessel_name : '')}" placeholder="Vessel Name" />
        </div>` : ''}
      </div>

      ${isWell ? `
      <div class="grid-2 bg-navy-900/30 p-3 rounded-lg border border-slate-800/50 mb-4">
        <div class="form-group mb-0">
          <label class="form-label">Test Realization Date</label>
          <input type="date" class="form-input" id="nf-test-date" value="${item ? item.test_date : ''}" onchange="updateDeadlineDisplay(this.value)" />
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Deadline (90 Days)</label>
          <input type="date" class="form-input bg-navy-950 font-bold text-orange-400" id="nf-deadline" value="${item ? item.deadline_date : ''}" readonly />
        </div>
      </div>` : ''}

      ${isOff ? `
      <div class="grid-3 bg-navy-900/30 p-3 rounded-lg border border-slate-800/50 mb-4">
        <div class="form-group mb-0">
          <label class="form-label text-[10px] text-slate-400 uppercase font-bold">Tanker Volume</label>
          <input class="form-input text-right font-mono" id="nf-tanker-vol" value="${item ? fmtNumber(item.tanker_volume) : ''}" placeholder="0,00" onblur="this.value = fmtNumber(this.value)" />
        </div>
        <div class="form-group mb-0">
          <label class="form-label text-[10px] text-slate-400 uppercase font-bold">FPSO Volume</label>
          <input class="form-input text-right font-mono" id="nf-fpso-vol" value="${item ? fmtNumber(item.fpso_volume) : ''}" placeholder="0,00" onblur="this.value = fmtNumber(this.value)" />
        </div>
        <div class="form-group mb-0">
          <label class="form-label text-[10px] text-orange-400 uppercase font-bold">Metering Volume</label>
          <input class="form-input text-right font-mono text-orange-400 border-orange-500/30" id="nf-metering-vol" value="${item ? fmtNumber(item.metering_volume) : ''}" placeholder="0,00" onblur="this.value = fmtNumber(this.value)" />
        </div>
      </div>` : ''}

      <div class="form-group"><label class="form-label">Findings / Guidance</label>
        <textarea class="form-textarea" id="nf-guidance" style="min-height:100px" placeholder="Describe findings or specific guidance...">${escHtml(item ? item.guidance : '')}</textarea>
      </div>

      <div class="form-group"><label class="form-label">Attached Photos</label>
        <div id="nf-media-container"></div>
      </div>

      <div class="flex gap-3 justify-end pt-2">
        ${item && item.id ? `
          <button type="button" class="btn ${item.archived ? 'btn-secondary' : 'btn-primary'} btn-sm mr-auto" onclick="toggleArchiveNote('${item.id}')">
            ${item.archived ? '📦 Unarchive' : '📦 Archive Note'}
          </button>
        ` : ''}
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${item && item.id ? 'Update' : 'Create'} Record</button>
      </div>
    </form>`;
}

window.updateDeadlineDisplay = function(val) {
  if(!val) return;
  const d = new Date(val);
  // Add 90 days
  d.setDate(d.getDate() + 90);
  const deadline = document.getElementById('nf-deadline');
  if(deadline) deadline.value = d.toISOString().split('T')[0];
};

function bindNoteForm(existingId) {
  const existing = existingId ? DB.getNotes().find(x => x.id === existingId) : null;
  let mediaArray = existing ? [...(existing.media || [])] : [];
  setupMediaDropzone('nf-media-container', (m) => { mediaArray = m; }, mediaArray);

  // Type switching within the form
  const typeSelect = document.getElementById('nf-type');
  if (typeSelect && !existingId) {
    typeSelect.addEventListener('change', (e) => {
      const currentTagId = document.getElementById('nf-tag').value;
      const currentModule = document.querySelector('.modal-body');
      if (currentModule) {
        currentModule.innerHTML = noteFormHtml({ note_type: e.target.value, tag_id: currentTagId });
        bindNoteForm(null);
      }
    });
  }

  document.getElementById('note-form').addEventListener('submit', e => {
    e.preventDefault();
    const type = document.getElementById('nf-type').value;
    const s = document.getElementById('nf-tag');

    if (s && !s.value && type !== 'offloading') {
      toast('Please select a TAG / Well for this record', 'error');
      return;
    }

    const o = s ? s.options[s.selectedIndex] : null;

    const parseVol = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const val = el.value.replace(/\./g, '').replace(',', '.');
      return isNaN(parseFloat(val)) ? null : parseFloat(val);
    };

    const result = DB.saveNote({
      id: existingId || null,
      note_type: type,
      tag_id: s ? s.value : null,
      tag_code: o && o.dataset.code || '',
      author_id: existingId ? (DB.getNotes().find(x => x.id === existingId).author_id) : ((window.getUser().id || null)),
      system: document.getElementById('nf-system') ? document.getElementById('nf-system').value : 'Offloading',
      condition: document.getElementById('nf-cond').value,
      cargo_number: type === 'offloading' ? document.getElementById('nf-cond').value : null,
      guidance: document.getElementById('nf-guidance').value,
      test_date: document.getElementById('nf-test-date') ? document.getElementById('nf-test-date').value : null,
      deadline_date: document.getElementById('nf-deadline') ? document.getElementById('nf-deadline').value : null,
      vessel_name: document.getElementById('nf-vessel') ? document.getElementById('nf-vessel').value : null,
      operation_date: document.getElementById('nf-off-date') ? document.getElementById('nf-off-date').value : null,
      tanker_volume: parseVol('nf-tanker-vol'),
      fpso_volume: parseVol('nf-fpso-vol'),
      metering_volume: parseVol('nf-metering-vol'),
      media: mediaArray
    });

    if (!handleSaveResult(result)) return;

    toast(existingId ? 'Updated' : 'Created', 'success');
    closeModal();
    renderNotes(document.getElementById('page-container'));
  });
}

function editNote(id) {
  const item = DB.getNotes().find(x => x.id === id);
  if (!item) return;
  openModal('Edit Note', noteFormHtml(item), () => bindNoteForm(id));
}

function generateOffloadingReport() {
  const notes = DB.getNotes().filter(n => n.note_type === 'offloading' || (!n.note_type && n.system !== 'Production'));
  if (notes.length === 0) {
    toast('No offloading records to report', 'info');
    return;
  }

  // Sorting by Cargo Number (Natural Descending)
  notes.sort((a, b) => {
    const getNum = (str) => {
      const match = (str || '').match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };
    return getNum(b.cargo_number || b.condition) - getNum(a.cargo_number || a.condition);
  });

  const totalTanker = notes.reduce((acc, n) => acc + (parseFloat(n.tanker_volume) || 0), 0);
  const totalBBL = totalTanker * 6.28981;
  const userName = window.getUser() ? (window.getUser().name) : 'Unknown User';
  const reportDate = new Date().toLocaleDateString('pt-BR');

  const win = window.open('', '_blank');
  win.document.write(`
    <html>
      <head>
        <title>Offloading Report — FPSO Atlanta</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { height: 60px; }
          .title-area h1 { margin: 0; color: #0f172a; font-size: 24px; font-weight: 800; text-transform: uppercase; }
          .title-area p { margin: 5px 0 0; color: #64748b; font-size: 14px; font-weight: 600; }
          
          .meta-info { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 30px; }
          .meta-info b { color: #0f172a; }

          .dashboard { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
          .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; rounded-xl; border-radius: 12px; text-align: center; }
          .stat-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em; margin-bottom: 8px; }
          .stat-value { font-size: 28px; font-weight: 800; color: #f97316; }
          .stat-unit { font-size: 14px; color: #94a3b8; margin-left: 5px; }

          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f1f5f9; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #e2e8f0; }
          td { padding: 12px; font-size: 12px; border: 1px solid #e2e8f0; border-bottom: 1px solid #f1f5f9; }
          .text-right { text-align: right; }
          .font-mono { font-family: monospace; }
          .badge { padding: 4px 8px; border-radius: 4px; font-weight: 700; font-size: 10px; }
          .badge-green { background: #dcfce7; color: #166534; }
          .badge-orange { background: #ffedd5; color: #9a3412; }
          .badge-red { background: #fee2e2; color: #991b1b; }

          @media print {
            body { padding: 20px; }
            .btn-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <h1>FPSO Atlanta</h1>
            <p>Offloading & Fiscal Transfer Report</p>
          </div>
          <img src="Flow core solutions Color.png" class="logo" />
        </div>

        <div class="meta-info">
          <div>Report Date: <b>${reportDate}</b></div>
          <div>Generated by: <b>${userName}</b></div>
        </div>

        <div class="dashboard">
          <div class="stat-card">
            <div class="stat-label">Total Shuttle Received</div>
            <div class="stat-value">${fmtNumber(totalTanker)}<span class="stat-unit">m³</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Barrels (Net)</div>
            <div class="stat-value">${fmtNumber(totalBBL)}<span class="stat-unit">bbl</span></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Cargo #</th>
              <th>Vessel</th>
              <th class="text-right">Tanker (m³)</th>
              <th class="text-right">Metering (m³)</th>
              <th class="text-right">Dev. Δ%</th>
            </tr>
          </thead>
          <tbody>
            ${notes.map(n => {
              const m = parseFloat(n.metering_volume) || 0;
              const t = parseFloat(n.tanker_volume) || 0;
              const diff = t === 0 ? 0 : ((m - t) / t) * 100;
              const absDiff = Math.abs(diff);
              let color = 'badge-green';
              if (absDiff >= 0.5) color = 'badge-red';
              else if (absDiff >= 0.3) color = 'badge-orange';

              return `
              <tr>
                <td>${n.operation_date ? fmtDate(n.operation_date) : '—'}</td>
                <td class="font-bold">${escHtml(n.cargo_number || n.condition)}</td>
                <td>${escHtml(n.vessel_name || '—')}</td>
                <td class="text-right font-mono">${fmtNumber(n.tanker_volume)}</td>
                <td class="text-right font-mono" style="color:#f97316; font-weight:bold">${fmtNumber(n.metering_volume)}</td>
                <td class="text-right"><span class="badge ${color}">${diff >= 0 ? '+' : ''}${fmtNumber(diff)}%</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>

        <div style="margin-top: 60px; text-align: center; font-size: 10px; color: #94a3b8;">
          This is an automatically generated document by FlowCore Evergreen Log book.<br>
          © 2026 FlowCore Solutions. All rights reserved.
        </div>
        
        <script>
          window.onload = () => { setTimeout(() => { window.print(); }, 500); };
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

function renderNotes(container) {
  let allNotes = DB.getNotes();

  container.innerHTML = `
    <div class="page-header relative">
      <div>
        <h1 class="page-title">Operational Notes</h1>
        <p class="page-subtitle">${allNotes.length} total records</p>
      </div>
      <div class="flex items-center gap-4 bg-navy-950/50 p-1 rounded-xl border border-slate-800 shadow-inner">
        <button class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${notesSection === 'offloading' ? 'bg-orange-500 text-navy shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-navy opacity-80'}"
                onclick="notesSection='offloading'; renderNotes(document.getElementById('page-container'))">
          🚢 Offloading
        </button>
        <button class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${notesSection === 'well-test' ? 'bg-orange-500 text-navy shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-navy opacity-80'}"
                onclick="notesSection='well-test'; renderNotes(document.getElementById('page-container'))">
          🛰️ Well Test
        </button>
      </div>
      <div class="flex gap-2">
        ${notesSection === 'well-test' ? `
          <button class="btn btn-secondary" onclick="openModal('Register New Well', wellRegisterFormHtml(), () => bindWellRegisterForm())">+ Well Register</button>
        ` : `
          <button class="btn btn-secondary" onclick="generateOffloadingReport()">
            <svg class="w-4 h-4 mr-1.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Generate Report
          </button>
        `}
        <button class="btn btn-primary" onclick="openModal('New Operational Note', noteFormHtml(null), () => bindNoteForm(null))">+ New Note</button>
      </div>
    </div>
    
    <div id="notes-content" class="space-y-4">
      ${notesSection === 'well-test' ? renderWellTestCards(allNotes) : renderOffloadingCards(allNotes)}
    </div>`;
}

function renderOffloadingCards(notes) {
  const items = notes.filter(n => !n.archived && (n.note_type === 'offloading' || (!n.note_type && n.system !== 'Production')));
  if (items.length === 0) return '<div class="empty-state"><p>No active offloading records found.</p></div>';

  // Natural sort by Cargo Number (Descending)
  items.sort((a, b) => {
    const getNum = (str) => {
      const match = (str || '').match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };
    return getNum(b.cargo_number || b.condition) - getNum(a.cargo_number || a.condition);
  });

  return items.map(item => {
    const m = parseFloat(item.metering_volume);
    const t = parseFloat(item.tanker_volume);
    const hasVolumes = !isNaN(m) && !isNaN(t) && t !== 0;
    const diff = hasVolumes ? ((m - t) / t) * 100 : 0;
    const absDiff = Math.abs(diff);
    
    let colorClass = 'text-slate-600 bg-slate-500/10 border-slate-500/20';
    let statusText = 'N/A';
    
    if (hasVolumes) {
      if (absDiff < 0.3) {
        colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        statusText = 'EXCELLENT';
      } else if (absDiff < 0.5) {
        colorClass = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
        statusText = 'ATTENTION';
      } else {
        colorClass = 'text-red-400 bg-red-500/10 border-red-500/20';
        statusText = 'CRITICAL';
      }
    }

    return `
    <div class="card p-0 overflow-hidden border-l-4 border-l-blue-500 hover:border-blue-500/50 transition-all">
      <div class="px-4 py-2 border-b border-slate-800/50 bg-navy-900/40 flex items-center justify-between">
        <div class="flex items-center gap-2">
          ${item.tag_code ? tagChip(item.tag_code) : '<span class="text-[9px] font-black text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">OFFLOADING</span>'}
          <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">${escHtml(item.system || 'Offloading')}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-[9px] text-slate-500 font-mono uppercase font-bold">${fmt(item.created_at)}</span>
        </div>
      </div>

      <div class="p-4">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <!-- Cargo & Vessel Info -->
          <div class="lg:col-span-4 grid grid-cols-2 gap-3 lg:border-r lg:border-slate-800/50 lg:pr-4">
            <div class="flex flex-col justify-center">
              <div class="text-[8px] text-slate-500 uppercase font-black mb-1">${item.operation_date ? 'Op. Date' : 'Cargo Number'}</div>
              <div class="flex flex-col gap-1">
                <div class="${item.operation_date ? 'text-[11px] text-navy opacity-80 font-bold' : 'text-sm text-navy font-black tracking-tighter bg-navy-950/50 px-2 py-0.5 rounded border border-slate-700/50 w-fit'}">
                  ${item.operation_date ? fmtDate(item.operation_date) : `<span class="text-orange-400 mr-1">#</span>${escHtml(item.cargo_number || item.condition || '—').replace('#','')}`}
                </div>
                ${item.operation_date ? `
                  <div class="text-[13px] text-navy font-black tracking-tighter bg-navy-950/50 px-2 py-0.5 rounded border border-slate-700/50 w-fit">
                    <span class="text-orange-400 mr-1">#</span>${escHtml(item.cargo_number || item.condition || '—').replace('#','')}
                  </div>
                ` : ''}
              </div>
            </div>
            <div>
              <div class="text-[8px] text-slate-500 uppercase font-black mb-0.5">Vessel Name</div>
              <div class="text-xs text-navy font-semibold truncate">${escHtml(item.vessel_name || '—')}</div>
            </div>
          </div>
          
          <!-- Volumes -->
          <div class="lg:col-span-5 grid grid-cols-3 gap-2">
            <div class="text-center border-r border-slate-800/30">
              <div class="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Tanker Vol.</div>
              <div class="text-[11px] text-navy opacity-80 font-mono">${fmtNumber(item.tanker_volume)} m³</div>
            </div>
            <div class="text-center border-r border-slate-800/30">
              <div class="text-[8px] text-slate-500 uppercase font-bold mb-0.5">FPSO Vol.</div>
              <div class="text-[11px] text-navy opacity-80 font-mono">${fmtNumber(item.fpso_volume)} m³</div>
            </div>
            <div class="text-center">
              <div class="text-[8px] text-orange-400 uppercase font-bold mb-0.5">Metering Vol.</div>
              <div class="text-[11px] text-orange-400 font-bold font-mono">${fmtNumber(item.metering_volume)} m³</div>
            </div>
          </div>

          <!-- Deviation Badge -->
          <div class="lg:col-span-3 flex justify-end">
            <div class="flex flex-col items-center justify-center min-w-[100px] px-3 py-1.5 rounded-lg border ${colorClass} shadow-md">
              <div class="text-[7px] uppercase font-black tracking-widest opacity-70">Dev. Δ%</div>
              <div class="text-base font-black font-mono leading-none my-0.5">${hasVolumes ? `${diff >= 0 ? '+' : ''}${fmtNumber(diff)}%` : 'N/A'}</div>
              <div class="text-[7px] font-black">${hasVolumes ? statusText : 'WAIT DATA'}</div>
            </div>
          </div>
        </div>

        <div class="mt-3 text-[11px] text-slate-400 bg-navy-950/30 p-2 rounded border border-slate-800/30 italic font-medium line-clamp-2 hover:line-clamp-none transition-all">
          ${escHtml(item.findings || item.notes || item.guidance || '—')}
        </div>

        <div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
          ${renderGallery(item.media)}
          <div class="flex gap-2">
            ${(canEdit(item) || window.getUser()?.role === 'Admin') ? `
              <button class="btn btn-sm btn-secondary h-7 px-3 text-[10px] flex items-center gap-1" onclick="editNote('${item.id}')">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Edit
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleWellStatus(tagId, status) {
  const tag = DB.getTag(tagId);
  if (!tag) return;
  
  DB.saveTag({ ...tag, status: status });
  toast(`Well ${tag.tag_code} is now ${status.toUpperCase()}`, 'success');
  renderNotes(document.getElementById('page-container'));
}

window.openWellHistory = function(tagCode) {
  const tag = DB.getTags().find(t => t.tag_code === tagCode);
  openModal(`History: ${tagCode}`, wellHistoryHtml(tagCode, '', tag ? tag.id : null));
}

function wellHistoryHtml(tagCode, query = '', tagId = null) {
  const records = DB.getNotes()
    .filter(n => n.tag_code === tagCode && (n.note_type === 'well-test' || n.system === 'Production') && !n.archived)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const q = query.toLowerCase().trim();
  const filtered = q ? records.filter(r => 
    (r.guidance || r.findings || r.notes || '').toLowerCase().includes(q) || 
    (r.condition || '').toLowerCase().includes(q) ||
    fmtDate(r.test_date).toLowerCase().includes(q) ||
    fmt(r.created_at).toLowerCase().includes(q)
  ) : records;

  const listHtml = filtered.map(r => `
    <div class="bg-navy-900/50 border border-slate-800 rounded-xl p-4 mb-3 hover:border-orange-500/30 transition-all cursor-pointer group" onclick="editNote('${r.id}')">
      <div class="flex justify-between items-start mb-2">
        <div class="flex flex-col">
          <span class="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Test Date / Created At</span>
          <span class="text-navy font-bold text-sm">
            ${r.test_date ? fmtDate(r.test_date) : fmt(r.created_at)}
          </span>
        </div>
        <div class="bg-navy-950 px-2 py-0.5 rounded border border-slate-700/50 text-[10px] text-orange-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          Click to Edit
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="bg-navy-950/50 p-2 rounded border border-slate-800/50">
          <span class="text-[9px] text-slate-500 uppercase block mb-0.5">Condition</span>
          <span class="text-xs text-navy opacity-80 font-medium">${r.condition || '—'}</span>
        </div>
        <div class="bg-navy-950/50 p-2 rounded border border-slate-800/50">
          <span class="text-[9px] text-slate-500 uppercase block mb-0.5">Attachments</span>
          <span class="text-xs text-navy opacity-80 font-medium">${r.media ? r.media.length : 0} Files</span>
        </div>
      </div>
      <div class="text-xs text-slate-400 italic bg-navy-950/30 p-2 rounded border border-slate-800/30 line-clamp-2">
        ${escHtml(r.findings || r.notes || r.guidance || 'No details.')}
      </div>
    </div>
  `).join('');

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" id="well-hist-search" placeholder="Search in history..." value="${escHtml(query)}"
                 class="w-full bg-navy-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-navy focus:outline-none focus:border-orange-500 transition-all font-medium"
                 oninput="updateWellHistoryModal('${tagCode}', this.value, '${tagId}')" />
        </div>
        <button class="btn btn-primary h-9 text-[10px]" onclick="openModal('New Well Test', noteFormHtml({tag_code:'${tagCode}', tag_id:'${tagId}', note_type:'well-test'}), () => bindNoteForm(null))">
           + New Test Item
        </button>
      </div>
      <div class="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
        ${records.length === 0 ? '<p class="text-center text-slate-500 py-8 italic text-sm">No records found for this well.</p>' : 
          filtered.length === 0 ? '<p class="text-center text-slate-500 py-8 italic text-sm">No results match your search.</p>' : listHtml}
      </div>
    </div>`;
}

window.updateWellHistoryModal = function(tagCode, query, tagId) {
  const container = document.querySelector('.modal-body');
  if (container) {
    container.innerHTML = wellHistoryHtml(tagCode, query, tagId);
    const input = document.getElementById('well-hist-search');
    if (input) {
      input.focus();
      input.setSelectionRange(query.length, query.length);
    }
  }
}

function renderWellTestCards(notes) {
  const allWells = DB.getTags().filter(t => t.type === 'Well');
  const wellNotes = notes.filter(n => !n.archived && (n.note_type === 'well-test' || (n.system === 'Production')));

  if (allWells.length === 0 && wellNotes.length === 0) return '<div class="empty-state"><p>No wells registered. Add them in the Tag Registry.</p></div>';

  // Group by Well
  const latestByWell = {};
  wellNotes.forEach(n => {
    if (!latestByWell[n.tag_code] || new Date(n.created_at) > new Date(latestByWell[n.tag_code].created_at)) {
      latestByWell[n.tag_code] = n;
    }
  });

  // Include wells that don't have notes yet
  const displayItems = allWells.map(well => {
    const note = latestByWell[well.tag_code];
    return { 
      ...(note || { tag_code: well.tag_code, system: 'Production', condition: 'No tests recorded', noData: true }),
      tag_id: well.id,
      tag_status: well.status || 'ok'
    };
  });

  return displayItems.map(item => {
    const isOverdueDeadline = item.deadline_date && new Date(item.deadline_date) < new Date();
    
    const isClosed = item.tag_status === 'closed';

    return `
    <div class="card p-5 border-l-4 ${isClosed ? 'border-l-slate-700 opacity-75' : (item.noData ? 'border-l-slate-700' : (isOverdueDeadline ? 'border-l-red-500' : 'border-l-emerald-500'))} hover:border-orange-500/30 transition-all ${isClosed ? 'grayscale-[0.5]' : ''} cursor-pointer group/card" 
         onclick="openWellHistory('${item.tag_code}')">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="flex flex-col">
            <span class="text-[9px] text-slate-500 uppercase font-bold mb-1">Well Number</span>
            ${tagChip(item.tag_code)}
          </div>
          <div>
            <div class="text-navy font-bold text-sm flex items-center gap-2">
               Test History
               <span class="text-[8px] px-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 opacity-0 group-hover/card:opacity-100 transition-opacity">Click for Full History</span>
            </div>
            <div class="text-[9px] text-slate-500 uppercase tracking-tighter">Production System</div>
          </div>
        </div>
        ${!item.noData ? `
          <div class="text-right">
            <div class="text-[9px] text-slate-500 uppercase font-bold">Last Update</div>
            <div class="text-[10px] text-orange-400 font-mono">${fmt(item.created_at)}</div>
          </div>` : `
          <div class="flex items-center gap-1 bg-navy-950/80 p-1 rounded-lg border border-slate-800" onclick="event.stopPropagation()">
            <button class="px-3 py-1 text-[10px] font-black rounded transition-all ${item.tag_status === 'closed' ? 'text-slate-500 hover:text-navy opacity-80' : 'bg-emerald-500 text-navy shadow-lg shadow-emerald-500/20'}"
                    onclick="toggleWellStatus('${item.tag_id}', 'ok')">OPEN</button>
            <button class="px-3 py-1 text-[10px] font-black rounded transition-all ${item.tag_status === 'closed' ? 'bg-slate-600 text-navy shadow-lg' : 'text-slate-500 hover:text-navy opacity-80'}"
                    onclick="toggleWellStatus('${item.tag_id}', 'closed')">CLOSED</button>
          </div>
          `}
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-navy-950/50 p-3 rounded-lg border border-slate-800/50 mb-4 cursor-pointer hover:bg-navy-900/80 hover:border-slate-700 transition-all relative group/row" 
           onclick="event.stopPropagation(); ${item.noData ? `openModal('New Well Test', noteFormHtml({tag_code:'${item.tag_code}', note_type:'well-test'}), () => bindNoteForm(null))` : `editNote('${item.id}')`}">
        <div class="absolute -top-2 right-2 opacity-0 group-hover/row:opacity-100 transition-opacity bg-orange-500 text-navy text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg z-20">
          ${item.noData ? 'START NEW TEST' : 'EDIT LATEST RECORD'}
        </div>
        <div>
          <span class="text-[9px] text-slate-500 uppercase block mb-1">Status</span>
          <span class="text-xs font-bold ${item.noData ? 'text-slate-500' : 'text-emerald-400'}">${item.noData ? 'Pending' : 'Completed'}</span>
        </div>
        <div>
          <span class="text-[9px] text-slate-500 uppercase block mb-1">Realization Date</span>
          <span class="text-xs text-navy opacity-80">${item.test_date ? fmtDate(item.test_date) : '—'}</span>
        </div>
        <div class="col-span-2">
          <span class="text-[9px] text-slate-500 uppercase block mb-1">Deadline (90 Days)</span>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold ${isOverdueDeadline ? 'text-red-400' : (item.noData ? 'text-slate-500' : 'text-orange-400')}">
              ${item.deadline_date ? fmtDate(item.deadline_date) : 'N/A'}
            </span>
            ${item.deadline_date ? `<span class="text-[9px] px-1.5 py-0.5 rounded ${isOverdueDeadline ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}">
              ${isOverdueDeadline ? 'EXPIRED' : 'ACTIVE'}
            </span>` : ''}
          </div>
        </div>
      </div>

      <div class="text-sm text-slate-400 mb-4 line-clamp-2">
        <span class="text-[9px] text-slate-500 uppercase font-bold block mb-1">Findings / Notes</span>
        ${escHtml(item.guidance || 'No operational tracking recorded yet for this well unit.')}
      </div>

      <div class="flex justify-between items-center pt-3 border-t border-slate-800/50">
        <div class="flex gap-2">
           ${renderGallery(item.media)}
        </div>
        <div class="flex gap-2">
          ${!item.noData ? `
             <div class="flex items-center gap-1 bg-navy-950/80 p-1 rounded-lg border border-slate-800 mr-2" onclick="event.stopPropagation()">
              <button class="px-3 py-1 text-[9px] font-black rounded transition-all ${item.tag_status !== 'closed' ? 'bg-emerald-500 text-navy shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-navy opacity-80 pointer-events-auto'}"
                      onclick="toggleWellStatus('${item.tag_id}', 'ok')">OPEN</button>
              <button class="px-3 py-1 text-[9px] font-black rounded transition-all ${item.tag_status === 'closed' ? 'bg-slate-600 text-navy shadow-lg' : 'text-slate-500 hover:text-navy opacity-80'}"
                      onclick="toggleWellStatus('${item.tag_id}', 'closed')">CLOSED</button>
            </div>
          ` : ''}
          ${!item.noData && canEdit(item) ? `
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editNote('${item.id}')">Edit</button>
          ` : ''}
          <button class="btn btn-sm btn-primary h-8" onclick="event.stopPropagation(); openModal('New Well Test', noteFormHtml({tag_code:'${item.tag_code}', tag_id:'${item.tag_id}', note_type:'well-test'}), () => bindNoteForm(null))">
            + New Test
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// Global Alert Archive
window.toggleArchiveAlert = function(id) {
  const alert = DB.getAlerts().find(x => x.id === id);
  if (!alert) return;
  alert.archived = !alert.archived;
  DB.saveAlert(alert);
  toast(alert.archived ? 'Alert archived' : 'Alert restored', 'success');
  renderAlerts(document.getElementById('page-container'));
};


// ========== ALERTS & REMINDERS ==========
let alertFilter = 'all';

function alertFormHtml(item) {
  return `<form id="alert-form" class="space-y-0">
      <div class="grid-2">
        <div class="form-group"><label class="form-label">TAG</label>
          <select class="form-select" id="alf-tag"><option value="">— Select TAG —</option>${getTagOptions(item && item.tag_id)}</select>
        </div>
        <div class="form-group"><label class="form-label">Type</label>
          <select class="form-select" id="alf-type">
            ${['alert', 'reminder'].map(t => `<option ${item && item.reminder_type === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Title</label>
        <input class="form-input" id="alf-title" value="${escHtml(item ? item.title : '')}" required />
      </div>
      <div class="form-group"><label class="form-label">Description</label>
        <textarea class="form-textarea" id="alf-desc">${escHtml(item ? item.description : '')}</textarea>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Priority</label>
          <select class="form-select" id="alf-pri">${['critical', 'high', 'medium', 'low'].map(p => `<option ${item && item.priority === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-select" id="alf-status">${['open', 'overdue', 'closed'].map(s => `<option value="${s}" ${item && item.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Due Date</label>
          <input type="date" class="form-input" id="alf-due" value="${item ? item.due_date : ''}" />
        </div>
        <div class="form-group"><label class="form-label">Recurrence</label>
          <select class="form-select" id="alf-rec">${['none', 'hourly', 'daily', 'weekly', 'monthly', 'annually'].map(r => `<option ${item && item.recurrence === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
        </div>
      </div>
      <div class="flex gap-3 justify-end pt-2">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${item ? 'Update' : 'Create'} Alert</button>
      </div>
    </form>`;
}

function bindAlertForm(existingId) {
  document.getElementById('alert-form').addEventListener('submit', e => {
    e.preventDefault();
    const s = document.getElementById('alf-tag');
    const o = s.options[s.selectedIndex];
    const result = DB.saveAlert({
      id: existingId || null, tag_id: s.value, tag_code: o && o.dataset.code || '',
      author_id: existingId ? (DB.getAlerts().find(x => x.id === existingId).author_id) : ((window.getUser().id || null)),
      title: document.getElementById('alf-title').value, description: document.getElementById('alf-desc').value,
      reminder_type: document.getElementById('alf-type').value, priority: document.getElementById('alf-pri').value,
      status: document.getElementById('alf-status').value, due_date: document.getElementById('alf-due').value,
      recurrence: document.getElementById('alf-rec').value
    });

    if (!handleSaveResult(result)) return;

    toast(existingId ? 'Updated' : 'Created', 'success');
    closeModal();
    renderAlerts(document.getElementById('page-container'));
  });
}

function editAlert(id) {
  const item = DB.getAlerts().find(x => x.id === id);
  if (!item) return;
  openModal('Edit Alert', alertFormHtml(item), () => bindAlertForm(id));
}

function renderAlertsInner(filter) {
  alertFilter = filter;
  let items = DB.getAlerts();
  let list = items;
  if (filter === 'critical') list = list.filter(a => a.priority === 'critical' && !a.archived);
  if (filter === 'overdue') list = list.filter(a => (a.status === 'overdue' || isOverdue(a.due_date)) && !a.archived);
  if (filter === 'open') list = list.filter(a => a.status !== 'closed' && !a.archived);
  if (filter === 'archived') list = list.filter(a => a.archived === true);
  if (filter === 'all') list = list.filter(a => !a.archived);

  document.getElementById('alert-list').innerHTML = list.length === 0 ?
    '<div class="empty-state"><p>No alerts found.</p></div>' :
    list.map(item => `
    <div class="card card-interactive p-5 mb-3 ${(item.status === 'overdue' || isOverdue(item.due_date)) && item.status !== 'closed' ? 'border-red-500/30' : ''}">
      <div class="flex items-start justify-between gap-3 mb-2">
        <div class="flex-1">
          <div class="text-navy font-semibold">${escHtml(item.title)}</div>
          <div class="text-xs text-slate-500 mt-0.5">${escHtml(item.reminder_type)} · ${item.recurrence !== 'none' ? 'Recurring: ' + item.recurrence : ''}</div>
        </div>
        <div class="flex gap-1.5 flex-shrink-0">${priorityBadge(item.priority)} ${statusBadge(item.status)}</div>
      </div>
      <div class="text-sm text-slate-400 mb-3">${escHtml(item.description)}</div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 text-xs">${tagChip(item.tag_code)}<span class="${isOverdue(item.due_date) && item.status !== 'closed' ? 'overdue' : 'text-slate-500'}">Due: ${fmtDate(item.due_date)}</span></div>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-secondary" onclick="editAlert('${item.id}')">Edit</button>
          <button class="btn ${item.archived ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="toggleArchiveAlert('${item.id}')">${item.archived ? 'Unarchive' : 'Archive'}</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDelete('${escHtml(item.title)}', () => { DB.deleteAlert('${item.id}'); renderAlerts(document.getElementById('page-container')); })">Delete</button>
        </div>
      </div>
    </div>`).join('');

  document.querySelectorAll('.al-filter').forEach(c => c.classList.toggle('active', c.dataset.filter === filter));
}

function renderAlerts(container) {
  let items = DB.getAlerts();
  container.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Alerts & Reminders</h1><p class="page-subtitle">${items.length} total</p></div>
      <button class="btn btn-primary" onclick="openModal('New Alert / Reminder', alertFormHtml(null), () => bindAlertForm(null))">+ New Alert</button>
    </div>
    <div class="filter-bar">
      <button class="filter-chip al-filter active" data-filter="all">All</button>
      <button class="filter-chip al-filter" data-filter="open">Open</button>
      <button class="filter-chip al-filter" data-filter="critical">Critical</button>
      <button class="filter-chip al-filter" data-filter="overdue">Overdue</button>
      <button class="filter-chip al-filter" data-filter="archived">Archived</button>
    </div>
    <div id="alert-list"></div>`;

  renderAlertsInner(alertFilter || 'all');
  document.querySelectorAll('.al-filter').forEach(b => b.addEventListener('click', () => renderAlertsInner(b.dataset.filter)));
}

// ========== GLOBAL SEARCH ==========
function renderSearch(container, params) {
  const q = params && params.q ? params.q : '';
  const results = q ? DB.searchAll(q) : [];

  const moduleLabels = { tags: 'TAG', events: 'Event', activities: 'Activity', inspections: 'Inspection', materials: 'Material', notes: 'Operational Note', alerts: 'Alert' };
  const moduleColors = { tags: '#f97316', events: '#6366f1', activities: '#10b981', inspections: '#8b5cf6', materials: '#06b6d4', notes: '#f59e0b', alerts: '#ef4444' };
  const modulePages = { tags: 'tags', events: 'events', activities: 'activities', inspections: 'inspections', materials: 'materials', notes: 'notes', alerts: 'alerts' };

  container.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Global Search</h1><p class="page-subtitle">${q ? `${results.length} results for "${escHtml(q)}"` : 'Enter a search term in the top bar'}</p></div>
    </div>
    ${q === '' ? `<div class="empty-state">
      <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <p class="text-lg font-semibold text-slate-400">Search by TAG, keyword, or description</p>
    </div>` :
      results.length === 0 ? `<div class="empty-state">
      <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <p class="text-lg font-semibold text-slate-400">No results found for "${escHtml(q)}"</p>
    </div>` :
        `<div class="space-y-3">
      ${results.map(r => `
        <div class="card card-interactive p-4" onclick="navigate('${modulePages[r.module] || r.module}')">
          <div class="flex items-center gap-3">
            <span class="badge" style="background:${moduleColors[r.module]}20;color:${moduleColors[r.module]};border:1px solid ${moduleColors[r.module]}40">
              ${moduleLabels[r.module] || r.module}
            </span>
            <span class="text-navy font-medium">${escHtml(r.label)}</span>
          </div>
          ${r.item.tag_code ? `<div class="mt-2 flex gap-2">${tagChip(r.item.tag_code)}</div>` : ''}
        </div>`).join('')}
    </div>`}`;

  // Pre-fill search input
  const inp = document.getElementById('global-search-input');
  if (inp) inp.value = q;
}

// ========== CALIBRATION HISTORY ==========
function calibrationFormHtml(tag, existing = null) {
  return `<form id="calibration-form" class="space-y-4">
      <div class="bg-navy-950/40 p-4 rounded-xl border border-slate-800/60 mb-4">
        <label class="text-[10px] text-slate-500 uppercase font-bold block mb-2">Instrument Info</label>
        <div class="text-sm text-navy font-bold">${escHtml(tag.tag_code)} — ${escHtml(tag.system || tag.name)}</div>
        <div class="grid-2 mt-2">
           <div class="text-[10px] text-slate-400">S/N: ${escHtml(tag.serial_number || 'N/A')}</div>
           <div class="text-[10px] text-orange-400 font-bold text-right">Cycle: ${tag.calibration_interval ? tag.calibration_interval + ' Months' : 'None'}</div>
        </div>
      </div>
      
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Calibration Date</label>
          <input type="date" class="form-input" id="clf-date" value="${existing ? existing.calibration_date : new Date().toISOString().split('T')[0]}" required />
        </div>
        <div class="form-group"><label class="form-label">Next Deadline</label>
          <input type="date" class="form-input" id="clf-deadline" value="${existing ? existing.deadline : ''}" required />
        </div>
      </div>
      
      <div class="form-group"><label class="form-label">Calibration Work / Result</label>
        <textarea class="form-textarea" id="clf-notes" placeholder="e.g. As-found, adjusted, as-left results...">${escHtml(existing ? existing.notes : '')}</textarea>
      </div>

      <div class="form-group"><label class="form-label">Certificate / Photo</label>
        <div id="clf-media-container"></div>
      </div>

      <div class="flex gap-3 justify-end pt-2">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${existing ? 'Update' : 'Register'} Calibration</button>
      </div>
    </form>`;
}

function bindCalibrationForm(tag, existingId = null) {
  const existing = existingId ? DB.getCalibrations().find(c => c.id === existingId) : null;
  let mediaArray = existing ? [...(existing.media || [])] : [];
  setupMediaDropzone('clf-media-container', (m) => { mediaArray = m; }, mediaArray);

  const dateInput = document.getElementById('clf-date');
  const deadlineInput = document.getElementById('clf-deadline');
  
  if (!existingId && tag.calibration_interval) {
     dateInput.addEventListener('change', () => {
        const d = new Date(dateInput.value + 'T12:00:00');
        d.setMonth(d.getMonth() + parseInt(tag.calibration_interval));
        deadlineInput.value = d.toISOString().split('T')[0];
     });
     // Initial trigger
     const d = new Date(dateInput.value + 'T12:00:00');
     d.setMonth(d.getMonth() + parseInt(tag.calibration_interval));
     deadlineInput.value = d.toISOString().split('T')[0];
  }

  document.getElementById('calibration-form').addEventListener('submit', e => {
    e.preventDefault();
    const result = DB.saveCalibration({
      id: existingId || null,
      tag_id: tag.id,
      tag_code: tag.tag_code,
      calibration_date: document.getElementById('clf-date').value,
      deadline: document.getElementById('clf-deadline').value,
      notes: document.getElementById('clf-notes').value,
      media: mediaArray,
      author: (window.getUser().name || 'Unknown')
    });

    if (!handleSaveResult(result)) return;

    toast(existingId ? 'Calibration updated' : 'Calibration registered', 'success');
    
    if (existingId) {
        openCalibrationHistory(tag.id);
    } else {
        closeModal();
        if (currentPage === 'tag-detail') navigate('tag-detail', { id: tag.id });
    }
  });
}

function openCalibrationHistory(tagId) {
  const tag = DB.getTag(tagId);
  if (!tag) return;
  const history = DB.getCalibrations().filter(c => c.tag_id === tagId);

  const content = `
    <div class="space-y-6">
      <div class="flex justify-between items-center bg-navy-900/40 p-4 rounded-xl border border-slate-800/60 transition-all hover:border-slate-700">
        <div>
           <div class="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Current Instrument Status</div>
           <div class="text-sm text-navy font-bold flex items-center gap-2">
              <svg class="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Last Cal: ${escHtml(tag.last_calibration || 'N/A')}
           </div>
           <div class="text-xs ${isOverdue(tag.deadline) ? 'text-red-400' : 'text-green-400'} font-medium mt-1">Deadline: ${escHtml(tag.deadline || 'N/A')}</div>
        </div>
        <button class="btn btn-primary btn-sm flex items-center gap-1.5" onclick="openModal('Register New Calibration — ${tag.tag_code}', calibrationFormHtml(DB.getTag('${tag.id}')), () => bindCalibrationForm(DB.getTag('${tag.id}')))">
           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
           Register Calibration
        </button>
      </div>

      <div class="max-h-[50vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        ${history.length === 0 ? `
           <div class="text-center py-12 text-slate-600 bg-navy-900/20 rounded-xl border border-dashed border-slate-800">
             <svg class="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <p>No calibration history recorded yet for this unit.</p>
           </div>
        ` : history.sort((a,b) => new Date(b.calibration_date) - new Date(a.calibration_date)).map(c => `
           <div class="bg-navy-950/60 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition group/item">
              <div class="flex justify-between items-start mb-2">
                 <div>
                    <div class="text-navy font-bold text-sm">Calibrated on: ${fmtDate(c.calibration_date)}</div>
                    <div class="text-[10px] text-slate-400 uppercase font-black mt-0.5 tracking-tighter shadow-sm">Deadline: ${fmtDate(c.deadline)}</div>
                 </div>
                 <div class="flex gap-1 opacity-40 group-hover/item:opacity-100 transition-opacity">
                    <button class="p-1.5 text-slate-400 hover:text-navy hover:bg-navy-800 rounded-lg transition" 
                            title="Edit Record"
                            onclick="openModal('Edit Calibration', calibrationFormHtml(DB.getTag('${tag.id}'), DB.getCalibrations().find(x=>x.id==='${c.id}')), () => bindCalibrationForm(DB.getTag('${tag.id}'), '${c.id}'))">
                       <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition" 
                            title="Delete Record"
                            onclick="confirmDelete('Calibration from ${c.calibration_date}', () => { DB.deleteCalibration('${c.id}'); openCalibrationHistory('${tag.id}'); })">
                       <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                 </div>
              </div>
              <div class="text-xs text-slate-400 bg-navy-900/40 p-3 rounded-lg border border-slate-800/50 mb-3 leading-relaxed">${escHtml(c.notes || 'No work description.')}</div>
              ${renderGallery(c.media)}
              <div class="text-[9px] text-slate-600 mt-3 font-black uppercase tracking-widest text-right flex items-center justify-end gap-1.5">
                <span class="w-1 h-1 rounded-full bg-slate-700"></span>
                Registered by: ${escHtml(c.author)}
              </div>
           </div>
        `).join('')}
      </div>
    </div>
  `;

  openModal(`Manage Calibration: ${tag.tag_code}`, content);
}

window.openCalibrationHistory = openCalibrationHistory;
window.calibrationFormHtml = calibrationFormHtml;
window.bindCalibrationForm = bindCalibrationForm;

window.toggleArchiveNote = (id) => {
  const n = DB.getNotes().find(x => x.id === id);
  if (!n) return;
  n.archived = !n.archived;
  DB.saveNote(n);
  toast(n.archived ? 'Record archived' : 'Record restored', 'success');
  
  const modalTitle = document.getElementById('modal-title');
  if (modalTitle && modalTitle.textContent.includes('Record')) {
    // Re-render the form if it was open
    // For simplicity, just refresh list
  }

  const pg = document.getElementById('page-container');
  if (pg) renderNotes(pg);
};

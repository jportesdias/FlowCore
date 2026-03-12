console.log('Evergreen: pages-events.js loading...');

// ============================================================
//  pages-events.js — Handover Events & Priority Activities
// ============================================================

window.eventFormHtml = function(e) {
  const tags = window.DB.getTags ? window.DB.getTags() : [];
  const activePlat = window.DB.getActivePlatform ? window.DB.getActivePlatform() : null;
  
  return `
    <form id="event-form" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Title</label>
          <input class="form-input" id="ef-title" value="${window.escHtml(e ? e.title : '')}" placeholder="Brief summary of the event" required />
        </div>
        <div class="form-group">
          <label class="form-label">Related TAG</label>
          <select class="form-select" id="ef-tag">
            <option value="">— Select TAG (if applicable) —</option>
            ${tags.map(t => `<option value="${t.id}" data-code="${t.tag_code}" ${e && e.tag_id === t.id ? 'selected' : ''}>${t.tag_code} — ${t.system || t.name}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Description / Problem</label>
        <textarea class="form-textarea" id="ef-desc" style="min-height:100px" placeholder="Detailed description..." required>${window.escHtml(e ? e.description : '')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Actions Taken</label>
        <textarea class="form-textarea" id="ef-actions" style="min-height:80px" placeholder="What has been done so far?">${window.escHtml(e ? e.actions_taken || '' : '')}</textarea>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" id="ef-cat">
            ${['Process Anomaly', 'Calibration / Obstruction', 'Safety Critical', 'Communication / Instrument Fault', 'Maintenance Record', 'Other'].map(v => `<option ${e && e.category === v ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-select" id="ef-pri">
            ${['critical', 'high', 'medium', 'low'].map(p => `<option ${e && e.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="ef-status">
            ${['open', 'in-progress', 'closed'].map(s => `<option value="${s}" ${e && e.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="flex items-center gap-2 py-2">
        <input type="checkbox" id="ef-follow" class="w-4 h-4 rounded border-slate-600 bg-navy-900 text-orange-500" ${e && e.follow_up_required ? 'checked' : ''}>
        <label for="ef-follow" class="text-sm text-slate-300 cursor-pointer">Follow-up actions required</label>
      </div>

      <div class="flex gap-3 items-center pt-4 border-t border-slate-700/50">
        ${e ? `
          <button type="button" class="btn bg-red-600/10 text-red-400 border border-red-500/30 hover:bg-red-600/20 transition-all text-xs font-black uppercase tracking-widest px-4" 
            onclick="window.deleteEventPermanently('${e.id}')">
            Delete Event
          </button>
        ` : ''}
        <div class="flex-grow"></div>
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${e ? 'Update Event' : 'Create Event'}</button>
      </div>
    </form>`;
}

window.bindEventForm = function(existingId) {
  const form = document.getElementById('event-form');
  if (!form) return;
  
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const tagSelect = document.getElementById('ef-tag');
    const selectedOption = tagSelect.options[tagSelect.selectedIndex];
    
    const activePlat = window.DB.getActivePlatform();
    
    const eventData = {
      id: existingId || null,
      platform_id: activePlat ? activePlat.id : null,
      title: document.getElementById('ef-title').value.trim(),
      description: document.getElementById('ef-desc').value.trim(),
      actions_taken: document.getElementById('ef-actions').value.trim(),
      tag_id: tagSelect.value,
      tag_code: selectedOption ? (selectedOption.dataset.code || '') : '',
      category: document.getElementById('ef-cat').value,
      priority: document.getElementById('ef-pri').value,
      status: document.getElementById('ef-status').value,
      follow_up_required: document.getElementById('ef-follow').checked,
      author: window.getUser ? (window.getUser() ? window.getUser().name : 'Unknown') : 'Unknown',
      author_id: window.getUser ? (window.getUser() ? window.getUser().id : null) : null,
      updated_at: new Date().toISOString()
    };

    if (!existingId) {
      eventData.created_at = new Date().toISOString();
      eventData.follow_ups = [];
    }

    const result = window.DB.saveEvent(eventData);
    if (!result || !result.success) {
      alert('Error saving event.');
      return;
    }

    window.toast(existingId ? 'Event updated' : 'Event created', 'success');
    window.closeModal();
    window.navigate('events');
  });
}

window.deleteEventPermanently = function(id) {
  if (!confirm('CRITICAL: Are you sure you want to permanently delete this event? This action cannot be undone.')) return;
  
  const result = window.DB.deleteEvent(id);
  // Note: DB.deleteEvent as currently implemented handles the saveStore internally
  window.toast('Event permanently deleted', 'success');
  window.closeModal();
  window.navigate('events');
}

window.editEvent = function(id) {
  console.log('Evergreen: editEvent called for', id);
  const e = window.DB.getEvent(id);
  if (!e) return;
  window.openModal('Edit Event', window.eventFormHtml(e), () => window.bindEventForm(id));
}

window.followUpFormHtml = function(eventId, fupId = null) {
  const event = window.DB.getEvent(eventId);
  const followUps = event.follow_ups || [];
  const fup = fupId ? followUps.find(x => x.id === fupId) : null;

  return `<form id="followup-form" class="space-y-4">
      <div class="form-group">
        <label class="form-label">${fupId ? 'Edit Comment' : 'Follow-up Comment'}</label>
        <textarea class="form-textarea" id="ff-comment" style="min-height:120px" placeholder="Describe progress, findings or actions taken..." required>${window.escHtml(fup ? fup.comment : '')}</textarea>
      </div>
      <div class="flex gap-3 justify-end pt-2">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${fupId ? 'Update Comment' : 'Add Follow-up'}</button>
      </div>
    </form>`;
}

window.bindFollowUpForm = function(eventId, fupId = null) {
  const form = document.getElementById('followup-form');
  if (!form) return;
  
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const event = window.DB.getEvent(eventId);
    if (!event) return;

    if (!event.follow_ups) event.follow_ups = [];

    const comment = document.getElementById('ff-comment').value.trim();
    const user = window.getUser();

    if (fupId) {
      const fup = event.follow_ups.find(x => x.id === fupId);
      if (fup) {
        fup.comment = comment;
        fup.updated_at = new Date().toISOString();
      }
    } else {
      const followUp = {
        id: window.genId('fup'),
        author: user ? user.name : 'Unknown',
        author_id: user ? user.id : null,
        comment,
        date: new Date().toISOString()
      };
      event.follow_ups.push(followUp);
    }

    const result = window.DB.saveEvent(event);
    if (!result || !result.success) return;

    window.toast(fupId ? 'Comment updated' : 'Follow-up added', 'success');

    // Refresh detail if open
    window.openModal(event.title, window.eventDetail(window.DB.getEvent(eventId)));
    
    // Refresh list if visible
    const listContainer = document.getElementById('events-list');
    if (listContainer) {
       window.renderEvents(document.getElementById('page-container'));
    }
  });
}

window.deleteFollowUp = function(eventId, fupId) {
  if (!confirm('Are you sure you want to delete this follow-up?')) return;
  const event = window.DB.getEvent(eventId);
  if (!event || !event.follow_ups) return;
  event.follow_ups = event.follow_ups.filter(x => x.id !== fupId);
  window.DB.saveEvent(event);
  window.toast('Comment deleted', 'success');
  window.openModal(event.title, window.eventDetail(window.DB.getEvent(eventId)));
  window.renderEvents(document.getElementById('page-container'));
}

window.openFollowUpModal = function(eventId) {
  console.log('Evergreen: openFollowUpModal called for', eventId);
  window.openModal('New Follow-up', window.followUpFormHtml(eventId), () => window.bindFollowUpForm(eventId));
}

window.openEventDetail = function(eventId) {
  console.log('Evergreen: openEventDetail called for', eventId);
  const e = window.DB.getEvent(eventId);
  if (!e) return;
  window.openModal(e.title, window.eventDetail(e));
}

window.eventDetail = function(e) {
  const tag = e.tag_id ? (window.DB.getTag ? window.DB.getTag(e.tag_id) : null) : null;
  const followUps = e.follow_ups || [];

  return `
    <div class="space-y-4">
      <div class="flex flex-wrap gap-2 mb-2">
        ${window.tagChip(e.tag_code)} ${window.priorityBadge(e.priority)} ${window.statusBadge(e.status)}
        ${window.canEdit(e) ? `<button class="badge hover:brightness-125 transition-all cursor-pointer" style="background:rgba(245,158,11,.15);color:#fbbf24;border:1px solid rgba(245,158,11,.3)" onclick="window.openFollowUpModal('${e.id}')">↩ Register Follow-up</button>` : ''}
      </div>
      <div><div class="section-label">Category / System</div><div class="text-slate-300">${window.escHtml(e.category)} · ${window.escHtml(e.system || '—')}</div></div>
      <div><div class="section-label">Timestamp</div><div class="text-slate-300">${window.fmt(e.created_at)}</div></div>
      <div><div class="section-label">Description</div><div class="text-slate-300 whitespace-pre-wrap">${window.escHtml(e.description)}</div></div>
      ${e.actions_taken ? `<div><div class="section-label">Actions Taken</div><div class="text-slate-300 whitespace-pre-wrap">${window.escHtml(e.actions_taken)}</div></div>` : ''}
      
      <div class="mt-6">
        <div class="flex items-center justify-between mb-3">
          <div class="section-label mb-0">Follow-up History</div>
          ${window.canEdit(e) ? `<button class="btn btn-sm btn-primary" onclick="window.openFollowUpModal('${e.id}')">+ Add Follow-up</button>` : ''}
        </div>
        <div class="space-y-3">
          ${followUps.length === 0 ? '<p class="text-xs text-slate-500 italic">No follow-ups recorded yet.</p>' :
      followUps.map(f => `
            <div class="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 group">
              <div class="flex justify-between items-start mb-1">
                <span class="text-[10px] text-slate-500">${window.fmt(f.date)}</span>
                ${window.canEdit(f) ? `
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button class="p-1 hover:text-orange-400 transition" title="Edit" 
                    onclick="window.openModal('Edit Comment', window.followUpFormHtml('${e.id}', '${f.id}'), () => window.bindFollowUpForm('${e.id}', '${f.id}'))">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button class="p-1 hover:text-red-400 transition" title="Delete" onclick="window.deleteFollowUp('${e.id}', '${f.id}')">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>` : ''}
              </div>
              <div class="text-sm text-slate-300 whitespace-pre-wrap">${window.escHtml(f.comment)}</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      ${tag ? `<hr class="divider"><div class="section-label">Related Equipment</div>
        <div class="card card-interactive p-3" onclick="window.navigate('tag-detail',{id:'${tag.id}'})">
          <div class="flex items-center gap-3"><span class="tag-chip">${tag.tag_code}</span><span class="text-sm text-white">${window.escHtml(tag.system || tag.name)}</span>${window.statusBadge(tag.status)}</div>
        </div>` : ''}
      
      <div class="flex gap-3 pt-4 border-t border-slate-700">
        ${window.canEdit(e) ? `<button class="btn btn-secondary btn-sm" onclick="window.editEvent('${e.id}')">Edit</button>` : ''}
        ${e.status === 'closed' ? `
          <button class="btn ${e.archived ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.toggleArchiveEvent('${e.id}')">
            ${e.archived ? '📦 Unarchive' : '📦 Archive Event'}
          </button>
        ` : ''}
      </div>
    </div>`;
}

window.renderEvents = function(container, params) {
  if (params && params.id) {
    const e = window.DB.getEvent(params.id);
    if (e) {
      window.openModal(e.title, window.eventDetail(e));
      window.navigate('events');
      return;
    }
  }

  const events = window.DB.getEvents ? window.DB.getEvents() : [];
  let filter = 'all';

  function draw(f, searchVal) {
    filter = f || filter;
    let list = events;
    if (filter === 'open') list = list.filter(e => !e.archived);
    if (filter === 'critical') list = list.filter(e => e.priority === 'critical' && !e.archived);
    if (filter === 'followup') list = list.filter(e => e.follow_up_required && !e.archived);
    if (filter === 'archived') list = list.filter(e => e.archived);
    if (filter === 'all') list = list.filter(e => !e.archived);

    if (searchVal) {
      const q = searchVal.toLowerCase();
      list = list.filter(e => [e.title, e.tag_code, e.description, e.category].some(v => (v || '').toLowerCase().includes(q)));
    }

    list.sort((a,b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

    const listEl = document.getElementById('events-list');
    if (!listEl) return;
    
    listEl.innerHTML = list.length === 0 ?
      `<div class="empty-state"><p>No events found.</p></div>` :
      list.map(e => {
        const followUps = e.follow_ups || [];
        return `
        <div class="card card-interactive p-5 mb-3" onclick="window.openEventDetail('${e.id}')">
          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="flex-1">
              <div class="text-white font-bold text-lg hover:text-orange-400 transition-colors mb-1">${window.escHtml(e.title)}</div>
              <div class="text-[10px] text-slate-500 uppercase font-bold">${window.fmt(e.created_at)}</div>
            </div>
            <div class="flex gap-1.5 flex-shrink-0">
              ${window.canEdit(e) ? `
                <button class="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-orange-400 transition-all" 
                        title="Edit Event" 
                        onclick="event.stopPropagation(); window.editEvent('${e.id}')">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              ` : ''}
              ${window.priorityBadge(e.priority)} ${window.statusBadge(e.status)}
            </div>
          </div>
          <div class="text-sm text-slate-300 mb-4 line-clamp-2">${window.escHtml(e.description)}</div>
          <div class="flex items-center justify-between text-xs pt-3 border-t border-slate-700/50">
            <div class="flex items-center gap-4">
              ${window.tagChip(e.tag_code)}
              <div class="flex items-center gap-1.5 text-slate-400 bg-navy-900 px-2 py-0.5 rounded-full border border-slate-700">
                <span class="font-bold text-slate-200">${followUps.length}</span> follow-ups
              </div>
              ${window.canEdit(e) ? `<button class="text-amber-500 hover:text-amber-400 font-bold transition-all cursor-pointer flex items-center gap-1 group" onclick="event.stopPropagation(); window.openFollowUpModal('${e.id}')">
                <span class="group-hover:translate-x-1 transition-transform">↩ Register Follow-up</span>
              </button>` : ''}
            </div>
          </div>
        </div>`;
      }).join('');
    
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === filter));
  }

  container.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Handover Events</h1><p class="page-subtitle">${events.length} total records</p></div>
      <button class="btn btn-primary" id="btn-new-event">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>New Event
      </button>
    </div>
    <div class="filter-bar">
      <input id="event-search" class="form-input" style="max-width:260px" placeholder="Search events…" />
      <button class="filter-chip active" data-filter="all">All</button>
      <button class="filter-chip" data-filter="open">Open</button>
      <button class="filter-chip" data-filter="critical">Critical</button>
      <button class="filter-chip" data-filter="followup">Follow-up</button>
      <button class="filter-chip" data-filter="archived">Archived</button>
    </div>
    <div id="events-list"></div>`;

  draw('all');

  document.getElementById('btn-new-event').addEventListener('click', () => {
     window.openModal('New Handover Event', window.eventFormHtml(null), () => window.bindEventForm(null));
  });

  document.querySelectorAll('.filter-chip').forEach(b => b.addEventListener('click', () => draw(b.dataset.filter, document.getElementById('event-search').value)));
  document.getElementById('event-search').addEventListener('input', e => draw(filter, e.target.value));

  window.toggleArchiveEvent = (id) => {
    const e = window.DB.getEvent(id);
    if (!e) return;
    e.archived = !e.archived;
    window.DB.saveEvent(e);
    window.toast(e.archived ? 'Event archived' : 'Event restored', 'success');
    window.openModal(e.title, window.eventDetail(window.DB.getEvent(id)));
    window.renderEvents(container);
  };
}

window.renderActivities = function(container) {
  const acts = window.DB.getActivities ? window.DB.getActivities() : [];
  let filter = 'all';

  function draw(f) {
    filter = f;
    let list = acts;
    if (f === 'open') list = list.filter(a => a.status !== 'closed');
    if (f === 'critical') list = list.filter(a => a.priority === 'critical');
    if (f === 'overdue') list = list.filter(a => window.isOverdue(a.due_date) && a.status !== 'closed');
    
    const listEl = document.getElementById('act-list');
    if (!listEl) return;

    listEl.innerHTML = list.length === 0 ?
      `<div class="empty-state"><p>No activities found.</p></div>` :
      `<table class="data-table"><thead><tr><th>TAG</th><th>Title</th><th>Responsible</th><th>Due Date</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>
        ${list.map(a => `<tr>
          <td>${window.tagChip(a.tag_code)}</td>
          <td class="text-white font-medium">${window.escHtml(a.title)}</td>
          <td class="text-slate-400">${window.escHtml(a.responsible)}</td>
          <td class="${window.isOverdue(a.due_date) && a.status !== 'closed' ? 'overdue font-semibold' : 'text-slate-400'}">${window.fmtDate(a.due_date)}</td>
          <td>${window.priorityBadge(a.priority)}</td>
          <td>${window.statusBadge(a.status)}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="window.editActivity('${a.id}')">Edit</button>
          </td>
        </tr>`).join('')}
      </tbody></table>`;
    document.querySelectorAll('.act-filter').forEach(c => c.classList.toggle('active', c.dataset.filter === f));
  }

  container.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Priority Activities</h1><p class="page-subtitle">${acts.length} total</p></div>
      <button class="btn btn-primary" onclick="window.openModal('New Activity', window.activityFormHtml(null), () => window.bindActivityForm(null))">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>New Activity
      </button>
    </div>
    <div class="filter-bar">
      <button class="filter-chip act-filter active" data-filter="all">All</button>
      <button class="filter-chip act-filter" data-filter="open">Open</button>
      <button class="filter-chip act-filter" data-filter="critical">Critical</button>
      <button class="filter-chip act-filter" data-filter="overdue">Overdue</button>
    </div>
    <div id="act-list" class="card overflow-x-auto"></div>`;

  draw('all');
  document.querySelectorAll('.act-filter').forEach(b => b.addEventListener('click', () => draw(b.dataset.filter)));
}

// Support functions for activities
window.activityFormHtml = function(a) {
  const tags = window.DB.getTags ? window.DB.getTags() : [];
  return `
    <form id="act-form" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">TAG</label>
          <select class="form-select" id="af-tag">
            <option value="">— Select TAG —</option>
            ${tags.map(t => `<option value="${t.id}" data-code="${t.tag_code}" ${a && a.tag_id === t.id ? 'selected' : ''}>${t.tag_code} — ${t.system || t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <select class="form-select" id="af-type">
            ${['Maintenance', 'Follow-up', 'Calibration', 'Other'].map(v => `<option ${a && a.type === v ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Title</label>
        <input class="form-input" id="af-title" value="${window.escHtml(a ? a.title : '')}" placeholder="Activity title" required />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="af-desc" style="min-height:80px">${window.escHtml(a ? a.description : '')}</textarea>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-select" id="af-pri">
            ${['critical', 'high', 'medium', 'low'].map(p => `<option ${a && a.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="af-status">
            ${['open', 'in-progress', 'closed'].map(s => `<option value="${s}" ${a && a.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Due Date</label>
        <input type="date" class="form-input" id="af-due" value="${a ? a.due_date : ''}" />
      </div>
      <div class="flex gap-3 justify-end pt-4">
        <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${a ? 'Update' : 'Create Activity'}</button>
      </div>
    </form>`;
}

window.bindActivityForm = function(existingId) {
  const form = document.getElementById('act-form');
  if (!form) return;
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const tagSelect = document.getElementById('af-tag');
    const selectedOption = tagSelect.options[tagSelect.selectedIndex];
    
    const result = window.DB.saveActivity({
      id: existingId || null,
      tag_id: tagSelect.value,
      tag_code: selectedOption ? (selectedOption.dataset.code || '') : '',
      title: document.getElementById('af-title').value,
      description: document.getElementById('af-desc').value,
      responsible: window.getUser() ? window.getUser().name : 'Unknown',
      priority: document.getElementById('af-pri').value,
      status: document.getElementById('af-status').value,
      due_date: document.getElementById('af-due').value,
      comments: []
    });

    if (!result || !result.success) return;
    window.toast(existingId ? 'Updated' : 'Activity created', 'success');
    window.closeModal();
    window.renderActivities(document.getElementById('page-container'));
  });
}

window.editActivity = function(id) {
  const acts = window.DB.getActivities();
  const a = acts.find(x => x.id === id);
  if (!a) return;
  window.openModal('Edit Activity', window.activityFormHtml(a), () => window.bindActivityForm(id));
}

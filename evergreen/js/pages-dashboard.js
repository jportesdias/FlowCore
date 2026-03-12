// ============================================================
//  pages-dashboard.js — Dashboard renderer
// ============================================================

window.renderDashboard = function(container) {
  const events = window.DB.getEvents();
  const activities = window.DB.getActivities();
  const alerts = window.DB.getAlerts();
  const tags = window.DB.getTags();
  const inspections = window.DB.getInspections();
  const activePlat = window.DB.getActivePlatform();

  const campaignBannerHtml = renderCampaignBanner(tags, activePlat);

  const criticalAlerts = alerts.filter(a => a.priority === 'critical' && a.status !== 'closed');
  const overdueAlerts = alerts.filter(a => a.status === 'overdue' || isOverdue(a.due_date));
  const openEvents = events.filter(e => e.status !== 'closed' && !e.archived);
  const recentEvents = [...events].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5);
  const openActivities = activities.filter(a => a.status !== 'closed');
  const tagsWithIssues = tags.filter(t => t.status === 'open-issue' || t.status === 'inspection');

  const stats = {
    totalTags: tags.filter(t => t.type !== 'Well').length,
    overdue: alerts.filter(a => a.status !== 'closed').length,
    priorityActivities: activities.filter(a => (a.priority === 'critical' || a.priority === 'high') && a.status !== 'closed').length
  };

  // Calculate Next Well Test
  const allWells = tags.filter(t => t.type === 'Well' && t.status !== 'closed');
  const allNotes = window.DB.getNotes();
  const wellNotes = allNotes.filter(n => n.note_type === 'well-test' || n.system === 'Production');
  
  const latestByWell = {};
  wellNotes.forEach(n => {
    if (!latestByWell[n.tag_code] || new Date(n.created_at) > new Date(latestByWell[n.tag_code].created_at)) {
      latestByWell[n.tag_code] = n;
    }
  });

  const wellDeadlines = allWells.map(well => {
    const note = latestByWell[well.tag_code];
    return {
      tag_code: well.tag_code,
      deadline: note && note.deadline_date ? new Date(note.deadline_date) : null,
      last_test: note ? note.test_date : null,
      noData: !note
    };
  }).filter(d => d.deadline || d.noData).sort((a,b) => {
    if (a.noData && !b.noData) return -1;
    if (!a.noData && b.noData) return 1;
    return (a.deadline || 0) - (b.deadline || 0);
  });

  const nextWell = wellDeadlines[0];
  let highlightHtml = '';
  if (nextWell) {
    const isOverdue = nextWell.deadline && nextWell.deadline < new Date();
    const daysLeft = nextWell.deadline ? Math.ceil((nextWell.deadline - new Date()) / (1000 * 60 * 60 * 24)) : null;
    
    highlightHtml = `
      <div class="card p-5 h-full border-l-4 ${isOverdue || nextWell.noData ? 'border-l-orange-500 bg-orange-500/5' : 'border-l-emerald-500 bg-emerald-500/5'}">
        <div class="flex flex-col h-full">
          <div class="flex items-center justify-between mb-3">
             <div class="w-12 h-12 ${isOverdue || nextWell.noData ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'} flex items-center justify-center rounded-xl">
               <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
             </div>
             <div class="text-right">
               <span class="${isOverdue || nextWell.noData ? 'text-orange-500' : 'text-emerald-500'} font-black text-[10px] tracking-widest uppercase">Routine</span>
               <div class="text-xs text-slate-500 font-bold">Well Testing</div>
             </div>
          </div>

          <div class="space-y-2 flex-grow">
            <div>
              <div class="text-[11px] font-black uppercase tracking-widest ${isOverdue || nextWell.noData ? 'text-orange-500/80' : 'text-emerald-500/80'} mb-1">Next Well Test Schedule</div>
              <h2 class="text-3xl font-black text-white">${nextWell.tag_code}</h2>
              <div class="text-sm text-slate-400 font-medium truncate">Production Well Resource</div>
            </div>

            <div class="grid grid-cols-2 gap-4 py-3 border-t border-white/5">
              <div>
                <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">System</div>
                <div class="text-xs text-white font-bold">Production</div>
              </div>
              <div>
                <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">Location</div>
                <div class="text-xs text-white font-bold">Subsea Cluster</div>
              </div>
              <div>
                <div class="text-[11px] font-bold ${isOverdue ? 'text-red-400' : (nextWell.noData ? 'text-orange-400' : 'text-emerald-400')} uppercase">
                  ${isOverdue ? 'OVERDUE' : (nextWell.noData ? 'PENDING DATA' : `${daysLeft} DAYS`)}
                </div>
              </div>
              <div class="text-right">
                <button class="btn btn-primary btn-sm px-4" onclick="navigate('notes'); notesSection='well-test'; renderNotes(document.getElementById('page-container'))">Register</button>
              </div>
            </div>
          </div>

          <div class="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-[10px]">
            <div>
              <span class="text-slate-500 uppercase font-black">Last Test:</span>
              <span class="text-white font-bold ml-1">${nextWell.last_test ? fmtDate(nextWell.last_test) : '---'}</span>
            </div>
            <div class="px-2 py-1 bg-white/5 rounded">
              <span class="text-slate-400 font-bold">Deadline: ${nextWell.deadline && !isNaN(nextWell.deadline.getTime()) ? fmtDate(nextWell.deadline.toISOString().split('T')[0]) : '---'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Prover Contingency Alert
  const prover = tags.find(t => t.tag_code === '30XX001');
  let contingencyHtml = '';
  if (prover && prover.is_available === false) {
    const today = new Date();
    const upcomingMeters = tags.filter(t => (t.tag_code.startsWith('30FT') || t.tag_code.startsWith('21FT')) && t.deadline && new Date(t.deadline) >= today);
    const sortedMeters = upcomingMeters.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const nextMeter = sortedMeters[0];

    if (nextMeter) {
      const d = new Date(nextMeter.deadline);
      const days = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      const isCritical = days <= 15;
      contingencyHtml = `
        <div class="card p-5 h-full border-l-4 ${isCritical ? 'border-l-red-500 bg-red-500/5' : 'border-l-orange-500 bg-orange-500/5'} cursor-pointer hover:bg-white/5 transition-all" onclick="openContingencyModal()">
          <div class="flex flex-col h-full">
             <div class="flex items-center justify-between mb-3">
               <div class="w-12 h-12 ${isCritical ? 'bg-red-500 critical-pulse' : 'bg-orange-500 animate-pulse'} text-white flex items-center justify-center rounded-xl">
                  <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
               </div>
               <div class="text-right">
                 <span class="${isCritical ? 'text-red-500' : 'text-orange-500'} font-black text-[10px] tracking-widest uppercase">Critical Path</span>
                 <div class="text-xs text-slate-500 font-bold">Prover Protocol</div>
               </div>
             </div>

             <div class="space-y-2 flex-grow">
               <div>
                 <div class="flex items-center gap-2 mb-1">
                   <span class="w-2 h-2 rounded-full ${isCritical ? 'bg-red-500 animate-ping' : 'bg-orange-500 animate-pulse'}"></span>
                   <h3 class="${isCritical ? 'text-red-400' : 'text-orange-400'} font-black uppercase text-[10px] tracking-[0.2em]">Priority Replacement</h3>
                 </div>
                 <div class="text-white text-3xl font-black tracking-tight">${nextMeter.tag_code}</div>
                 <div class="text-sm text-slate-400 font-medium truncate">${escHtml(nextMeter.name || 'Flow Instrument')}</div>
               </div>

               <div class="grid grid-cols-2 gap-4 py-3 border-t border-white/5">
                 <div>
                   <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">System</div>
                   <div class="text-xs text-white font-bold">${escHtml(nextMeter.system || '---')}</div>
                 </div>
                 <div>
                   <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">Location</div>
                   <div class="text-xs text-white font-bold">${escHtml(nextMeter.location || '---')}</div>
                 </div>
                 <div>
                   <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">Fluid / Media</div>
                   <div class="text-xs text-white font-bold">${escHtml(nextMeter.fluid || 'Oil / Multiphase')}</div>
                 </div>
                 <div>
                   <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">Serial Number</div>
                   <div class="text-xs text-white font-bold">${escHtml(nextMeter.serial_number || '---')}</div>
                 </div>
               </div>
             </div>

             <div class="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
               <div class="text-[10px]">
                 <span class="text-slate-500 uppercase font-black">Deadline:</span>
                 <span class="text-white font-bold ml-1">${fmtDate(nextMeter.deadline)}</span>
               </div>
               <div class="px-3 py-1 bg-white/5 rounded-lg">
                 <span class="${isCritical ? 'text-red-400' : 'text-orange-300'} font-bold text-[10px] uppercase tracking-widest">${days} days remaining</span>
               </div>
             </div>
          </div>
        </div>
      `;
    }
  }

  // Priority Replacement / Compliance Outlook logic
  const criticalMeterFilter = t => (t.tag_code.startsWith('30FT') || t.tag_code.startsWith('21FT')) && t.deadline && t.installation_status !== 'Removed';
  const otherInstrumentFilter = t => !(t.tag_code.startsWith('30FT') || t.tag_code.startsWith('21FT')) && t.deadline && t.installation_status !== 'Removed';
  
  const overdueMeters = tags.filter(t => criticalMeterFilter(t) && new Date(t.deadline) < new Date());
  const upcomingOthers = tags.filter(t => otherInstrumentFilter(t) && new Date(t.deadline) >= new Date())
                             .sort((a,b) => new Date(a.deadline) - new Date(b.deadline));

  const today = new Date();
  const next90Days = new Date(today); // Broadening window for general fleet
  next90Days.setDate(today.getDate() + 90);
  
  // Outlook logic: Show other instruments (PT/TT/etc)
  let outlookMeters = upcomingOthers.filter(t => new Date(t.deadline) <= next90Days);
  if (outlookMeters.length === 0 && upcomingOthers.length > 0) {
    outlookMeters = upcomingOthers.slice(0, 5); 
  }

  let replacementsHtml = '';
  let replacesTarget = 'replacements'; 
  let replacesIcon = `<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
  
  if (overdueMeters.length > 0) {
    replacementsHtml = overdueMeters.map(m => {
      if (overdueMeters.length === 1) {
        return `
          <div class="card p-5 h-full border-l-4 border-l-red-500 bg-red-500/5 cursor-pointer hover:bg-white/5 transition-all" onclick="navigate('tag-detail', {id:'${m.id}'})">
            <div class="flex flex-col h-full">
               <div class="flex items-center justify-between mb-3">
                 <div class="w-12 h-12 bg-red-500 text-white flex items-center justify-center rounded-xl shadow-lg shadow-red-500/20">
                    ${replacesIcon}
                 </div>
                 <div class="text-right">
                   <span class="text-red-500 font-black text-[10px] tracking-widest uppercase">Overdue</span>
                   <div class="text-xs text-slate-500 font-bold">Calibration Alert</div>
                 </div>
               </div>
               <div class="space-y-2 flex-grow">
                 <div>
                   <div class="flex items-center gap-2 mb-1">
                     <span class="w-2 h-2 rounded-full bg-red-500"></span>
                     <h3 class="text-red-500 font-black uppercase text-[10px] tracking-[0.2em]">Priority Replacement</h3>
                   </div>
                   <div class="text-white text-3xl font-black tracking-tight">${m.tag_code}</div>
                   <div class="text-sm text-slate-400 font-medium truncate">${escHtml(m.name || 'Overdue Instrument')}</div>
                 </div>
                 <div class="grid grid-cols-2 gap-4 py-3 border-t border-white/5">
                   <div>
                     <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">System</div>
                     <div class="text-xs text-white font-bold">${escHtml(m.system || '---')}</div>
                   </div>
                   <div>
                     <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">Location</div>
                     <div class="text-xs text-white font-bold">${escHtml(m.location || '---')}</div>
                   </div>
                   <div>
                     <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">Model</div>
                     <div class="text-xs text-white font-bold">${escHtml(m.model || 'Standard')}</div>
                   </div>
                   <div>
                     <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">Serial Number</div>
                     <div class="text-xs text-white font-bold">${escHtml(m.serial_number || '---')}</div>
                   </div>
                 </div>
               </div>
               <div class="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                 <div class="text-[10px]">
                   <span class="text-slate-500 uppercase font-black">Status:</span>
                   <span class="text-red-400 font-bold ml-1">EXPIRED</span>
                 </div>
                 <div class="px-3 py-1 bg-red-500/10 rounded-lg">
                   <span class="text-red-400 font-bold text-[10px] uppercase tracking-widest">Deadline: ${fmtDate(m.deadline)}</span>
                 </div>
               </div>
            </div>
          </div>`;
      }
      return `
        <div class="card p-3 mb-2 last:mb-0 border-l-4 border-l-red-500 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-all" onclick="navigate('tag-detail', {id:'${m.id}'})">
          <div class="flex items-center justify-between gap-3">
             <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-red-500 text-white flex items-center justify-center rounded-lg flex-shrink-0">
                   <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <div>
                  <div class="text-white text-base font-black tracking-tight">${m.tag_code}</div>
                  <div class="text-[9px] text-slate-500 font-bold uppercase tabular-nums">S/N: ${m.serial_number || '---'}</div>
                </div>
             </div>
             <div class="text-right">
                <div class="px-2 py-1 bg-red-500 text-white text-[9px] font-black rounded shadow-md">${fmtDate(m.deadline)}</div>
             </div>
          </div>
        </div>`;
    }).join('');
  } else if (outlookMeters.length > 0) {
    // Proactive Compliance Outlook — List View
    replacementsHtml = `
      <div class="card p-5 h-full flex flex-col border-l-4 border-l-blue-500 bg-blue-500/5 cursor-pointer hover:bg-white/5 transition-all group" onclick="openOutlookModal()">
        <div class="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
           <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-500 text-white flex items-center justify-center rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                 <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              </div>
              <div>
                <h3 class="text-blue-500 font-black uppercase text-[10px] tracking-widest">Compliance Outlook</h3>
                <div class="text-white text-lg font-black tracking-tight">Calibration Plan</div>
              </div>
           </div>
           <div class="text-right">
             <span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded border border-emerald-500/20 uppercase">90D View</span>
           </div>
        </div>

        <div class="space-y-2 flex-grow">
          ${outlookMeters.slice(0, 3).map(m => {
            const days = Math.ceil((new Date(m.deadline) - today) / (1000 * 60 * 60 * 24));
            return `
            <div class="flex items-center justify-between p-2 rounded-lg bg-white/2 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5">
               <div class="flex flex-col">
                 <span class="text-white font-black text-xs">${m.tag_code}</span>
                 <span class="text-[9px] text-slate-500 uppercase font-bold truncate max-w-[120px]">${escHtml(m.name || m.type)}</span>
               </div>
               <div class="flex flex-col items-end">
                 <span class="text-[10px] font-black ${days <= 30 ? 'text-orange-400' : 'text-emerald-400'}">${days}d</span>
                 <span class="text-[8px] text-slate-500 font-bold">${fmtDate(m.deadline)}</span>
               </div>
            </div>`;
          }).join('')}
          ${outlookMeters.length > 3 ? `<div class="text-center pt-2"><span class="text-[9px] text-slate-500 font-black uppercase">+ ${outlookMeters.length - 3} More Instruments</span></div>` : ''}
        </div>

        <div class="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
           <div class="text-[9px] text-slate-500 font-bold italic">Click for detailed strategy pop-up</div>
           <div class="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
             <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"/></svg>
           </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    ${campaignBannerHtml}
    <div class="page-header mb-8">
      <h1 class="text-3xl font-black text-white">Dashboard Monitoring</h1>
      <p class="text-slate-400 text-sm">Industrial Compliance & Operational Integrity — Site: ${window.DB.getActivePlatform()?.name || 'Main'}</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch">
      <div class="col-contingency h-full">${contingencyHtml || '<div class="card p-6 h-full border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-xs italic text-center">No Contingency Protocol Active</div>'}</div>
      <div class="col-replacements h-full">${replacementsHtml ? '<div class="flex flex-col h-full">' + replacementsHtml + '</div>' : '<div class="card p-6 h-full border-dashed border-slate-800/40 flex flex-col items-center justify-center text-slate-500 text-xs italic text-center cursor-pointer hover:bg-white/5 transition-all" onclick="openOutlookModal()"><svg class="w-8 h-8 mb-2 opacity-20 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>Compliance Strategy Active<br><span class="text-[10px] mt-1 not-italic opacity-60">Click to view full schedule</span></div>'}</div>
      <div class="col-highlight h-full">${highlightHtml || '<div class="card p-6 h-full border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-xs italic text-center">No Scheduled Well Tests</div>'}</div>
    </div>

    <div class="space-y-6 animate-in fade-in duration-500">

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${statCard('Total Assets', stats.totalTags, '#3b82f6', `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>`, 'tags')}
        ${statCard('Pending Issues', stats.overdue, '#f59e0b', `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`, 'alerts')}
        ${statCard('Priority Activities', stats.priorityActivities, '#ef4444', `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>`, 'activities')}
        ${statCard('Events Log', events.length, '#8b5cf6', `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />`, 'events')}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-bold text-white uppercase text-xs tracking-widest">Critical Path Alerts</h3>
            <button class="text-[10px] font-bold text-slate-500 hover:text-white transition-colors" onclick="navigate('alerts')">View All</button>
          </div>
          <div class="space-y-4">
            ${criticalAlerts.length === 0 ? '<p class="text-slate-500 text-xs italic">All systems nominal.</p>' :
            criticalAlerts.slice(0, 3).map(a => `
              <div class="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer" onclick="navigate('tag-detail', {id:'${tags.find(tx => tx.tag_code === a.tag_code)?.id}'})">
                <div class="flex items-start justify-between mb-2">
                  <span class="text-xs font-bold text-white">${escHtml(a.title)}</span>
                  ${statusBadge(a.status)}
                </div>
                <div class="flex items-center justify-between text-[10px] text-slate-500">
                  <span>${tagChip(a.tag_code)}</span>
                  <span>${fmtDate(a.due_date)}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-bold text-white uppercase text-xs tracking-widest">Orifice Plate HUD (On Duty)</h3>
            <button class="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20" onclick="navigate('orifice')">Control Module</button>
          </div>
          <div class="space-y-3">
            ${(() => {
              const plates = window.DB.getOrificePlates().filter(p => p.op_mode === 'Duty');
              if (plates.length === 0) return '<div class="text-sm text-slate-600 italic py-8 text-center bg-white/2 rounded-xl border border-dashed border-white/5">No plates currently installed on duty.</div>';
              return plates.slice(0, 5).map(p => `
                <div class="group flex flex-col md:flex-row md:items-center justify-between p-5 bg-white/3 rounded-2xl hover:bg-white/5 border border-white/5 hover:border-orange-500/30 transition-all cursor-pointer gap-4" onclick="navigate('orifice')">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20 font-black text-xl">
                      📀
                    </div>
                    <div>
                      <div class="text-lg font-black text-white leading-tight">${p.tag_code}</div>
                      <div class="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">S/N: ${p.serial_number || 'UNKNOWN'}</div>
                    </div>
                  </div>
                  
                  <div class="grid grid-cols-2 md:flex items-center gap-6 md:gap-8">
                    <div class="text-center md:text-left">
                       <div class="text-[9px] text-slate-500 uppercase font-black tracking-tighter mb-0.5">Diameter (d)</div>
                       <div class="text-base font-bold text-blue-400">${p.inner_diameter ? (p.inner_diameter.toLowerCase().includes('mm') ? p.inner_diameter : p.inner_diameter + ' mm') : '---'}</div>
                    </div>
                    <div class="text-center md:text-left">
                       <div class="text-[9px] text-slate-500 uppercase font-black tracking-tighter mb-0.5">Beta Ratio (β)</div>
                       <div class="text-base font-black text-white">${p.beta || '---'}</div>
                    </div>
                    <div class="hidden sm:block text-right">
                       <div class="text-[9px] text-slate-500 uppercase font-black tracking-tighter mb-0.5">State</div>
                       <div class="flex items-center justify-end gap-1.5">
                         <div class="w-2 h-2 rounded-full ${p.status === 'ok' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'}"></div>
                         <span class="text-[10px] font-black text-white uppercase">${p.status === 'ok' ? 'Healthy' : 'Check'}</span>
                       </div>
                    </div>
                  </div>
                </div>`).join('');
            })()}
          </div>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="px-6 py-4 border-b border-white/5 bg-white/2 flex justify-between items-center">
          <h3 class="font-bold text-white uppercase text-xs tracking-widest">Global Activity Log</h3>
          <button class="btn btn-sm glass text-[10px] font-bold" onclick="navigate('events')">Open Archive</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-white/5 text-slate-500 font-bold uppercase tracking-widest">
              <tr>
                <th class="px-6 py-3">Source</th>
                <th class="px-6 py-3">Description</th>
                <th class="px-6 py-3">Classification</th>
                <th class="px-6 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              ${recentEvents.map(e => `
                <tr class="hover:bg-white/5 transition-colors cursor-pointer" onclick="navigate('events', {id:'${e.id}'})">
                  <td class="px-6 py-4">${tagChip(e.tag_code)}</td>
                  <td class="px-6 py-4 text-white font-bold max-w-xs truncate">${escHtml(e.title)}</td>
                  <td class="px-6 py-4 text-slate-500 uppercase font-bold text-[10px]">${escHtml(e.category)}</td>
                  <td class="px-6 py-4 text-right text-slate-500 font-medium">${timeAgo(e.updated_at)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function statCard(label, value, color, iconPath, page, extraClass = '') {
  return `
    <div class="card p-5 cursor-pointer hover:border-white/20 transition-all group relative overflow-hidden h-full flex flex-col justify-between ${extraClass}" onclick="navigate('${page}')">
      <!-- Background Glow -->
      <div class="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-[40px] opacity-10 transition-opacity group-hover:opacity-20" style="background: ${color}"></div>
      
      <div class="flex items-start justify-between mb-4">
        <div class="w-12 h-12 flex items-center justify-center rounded-xl transition-all group-hover:scale-110 shadow-lg" 
             style="background: ${color}15; border: 1px solid ${color}30; color: ${color}">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">${iconPath}</svg>
        </div>
      </div>

      <div>
        <div class="text-[10px] text-slate-500 font-black uppercase tracking-[0.15em] mb-1 line-clamp-1">${label}</div>
        <div class="flex items-baseline gap-2">
          <div class="text-3xl font-black text-white tracking-tight">${value}</div>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-white/5 flex items-center justify-between group-hover:border-white/10 transition-colors">
        <span class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">View Details</span>
        <svg class="w-3 h-3 text-slate-600 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path d="M9 5l7 7-7 7"/></svg>
      </div>
    </div>`;
}

window.openContingencyModal = function() {
  const tags = window.DB.getTags();
  const today = new Date();
  const upcoming = tags.filter(t => (t.tag_code.startsWith('30FT') || t.tag_code.startsWith('21FT')) && t.deadline && new Date(t.deadline) >= today)
                        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const body = `
    <div class="space-y-4">
      <div class="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-center gap-3">
        <div class="w-10 h-10 bg-orange-500 text-white flex items-center justify-center rounded-lg flex-shrink-0">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
        <div>
          <h4 class="text-orange-500 font-bold text-sm uppercase tracking-widest">Replacement Queue (Contingency)</h4>
          <p class="text-slate-400 text-xs">Full schedule of upcoming meter substitutions based on calibration deadlines.</p>
        </div>
      </div>

      <div class="overflow-hidden rounded-xl border border-slate-800 bg-navy-900/50">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-800/50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-800">
            <tr>
              <th class="px-4 py-3">Meter TAG</th>
              <th class="px-4 py-3">Serial Number</th>
              <th class="px-4 py-3">Deadline</th>
              <th class="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50">
            ${upcoming.map(m => {
              const d = new Date(m.deadline);
              const days = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
              return `
              <tr class="hover:bg-white/5 transition-colors cursor-pointer" onclick="closeModal(); navigate('tag-detail', {id:'${m.id}'})">
                <td class="px-4 py-2 font-bold text-white">${m.tag_code}</td>
                <td class="px-4 py-2 text-slate-400 font-mono">${m.serial_number || '---'}</td>
                <td class="px-4 py-2 text-slate-300">${fmtDate(m.deadline)}</td>
                <td class="px-4 py-2 text-right font-black ${days <= 30 ? 'text-orange-400' : 'text-emerald-400'}">
                  ${days} DAYS
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-[10px] text-slate-500 text-center italic">Click on a row to view technical details of the instrument.</p>
    </div>
  `;

  openModal('Contingency Replacement Scale', body, 'max-w-2xl');
}

window.openOutlookModal = function() {
  const tags = window.DB.getTags();
  const today = new Date();
  
  const d30 = new Date(today); d30.setDate(today.getDate() + 30);
  const d60 = new Date(today); d60.setDate(today.getDate() + 60);

  const otherInstrumentFilter = t => !(t.tag_code.startsWith('30FT') || t.tag_code.startsWith('21FT')) && t.deadline;

  const tier1 = tags.filter(t => otherInstrumentFilter(t) && new Date(t.deadline) >= today && new Date(t.deadline) <= d30)
                    .sort((a,b) => new Date(a.deadline) - new Date(b.deadline));
  
  const tier2 = tags.filter(t => otherInstrumentFilter(t) && new Date(t.deadline) > d30 && new Date(t.deadline) <= d60)
                    .sort((a,b) => new Date(a.deadline) - new Date(b.deadline));
  
  // Fallback Tier (Future planning beyond 60 days)
  const tier3 = tags.filter(t => otherInstrumentFilter(t) && new Date(t.deadline) > d60)
                    .sort((a,b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 10);

  const renderTable = (list, color, title) => `
    <div class="mb-4 last:mb-0">
      <div class="flex items-center gap-2 mb-2">
        <div class="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-widest" style="background:${color}20; color:${color}; border:1px solid ${color}40">${title}</div>
      </div>
      <div class="overflow-hidden rounded-xl border border-white/5 bg-navy-900/40">
        <table class="w-full text-left text-sm">
          <thead class="bg-white/5 text-slate-500 font-bold uppercase tracking-widest border-b border-white/5">
            <tr>
              <th class="px-4 py-2">Meter TAG</th>
              <th class="px-4 py-2">Deadline</th>
              <th class="px-4 py-2 text-right">Remaining</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            ${list.length === 0 ? `<tr><td colspan="3" class="px-4 py-3 text-center text-slate-600 italic">No instruments scheduled in this window.</td></tr>` : 
            list.map(m => {
              const days = Math.ceil((new Date(m.deadline) - today) / (1000 * 60 * 60 * 24));
              return `
              <tr class="hover:bg-white/5 transition-colors cursor-pointer" onclick="closeModal(); navigate('tag-detail', {id:'${m.id}'})">
                <td class="px-4 py-1.5 font-bold text-white">${m.tag_code} <span class="text-[11px] text-slate-500 ml-1">S/N: ${m.serial_number || '---'}</span></td>
                <td class="px-4 py-1.5 text-slate-400">${fmtDate(m.deadline)}</td>
                <td class="px-4 py-1.5 text-right font-black text-sm" style="color:${color}">${days} DAYS</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const body = `
    <div class="space-y-2">
      <div class="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl flex items-center gap-4 mb-6">
        <div class="w-12 h-12 bg-blue-500 text-white flex items-center justify-center rounded-xl shadow-lg shadow-blue-500/30">
          <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        </div>
        <div>
          <h4 class="text-white font-black text-lg tracking-tight">Proactive Compliance Planning</h4>
          <p class="text-slate-400 text-sm">Strategically managing upcoming calibration deadlines across the facility.</p>
        </div>
      </div>
      
      ${renderTable(tier1, '#f59e0b', 'Critical Window: Next 30 Days')}
      ${renderTable(tier2, '#10b981', 'Planning Window: 31 to 60 Days')}
      ${tier3.length > 0 ? renderTable(tier3, '#3b82f6', 'Future Window: 60+ Days Outlook') : ''}
      
      <div class="mt-6 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p class="text-xs text-emerald-400/80 leading-relaxed font-medium">All instruments are currently monitored and integrated into the global compliance scale.</p>
        </div>
      </div>
    </div>
  `;

  window.openModal('Compliance Strategy Outlook', body, null, 'max-w-2xl');
}

// ========== CALIBRATION CAMPAIGN PLANNING ==========
function renderCampaignBanner(tags, activePlat) {
  if (!activePlat) return '';
  
  // Find earliest deadline across instruments (non-wells)
  const instruments = tags.filter(t => t.type !== 'Well' && t.deadline && t.installation_status !== 'Removed');
  if (instruments.length === 0) return '';
  
  const earliest = instruments.sort((a,b) => new Date(a.deadline) - new Date(b.deadline))[0];
  if (!earliest) return '';
  
  const deadlineDate = new Date(earliest.deadline);
  if (isNaN(deadlineDate.getTime())) return '';
  
  // Suggestion: 15 days before deadline
  const suggestionDate = new Date(deadlineDate);
  suggestionDate.setDate(deadlineDate.getDate() - 15);
  
  if (isNaN(suggestionDate.getTime())) return '';

  const lastEmbarkation = window.DB.getLatestEmbarkation();
  const today = new Date();
  const isClose = (suggestionDate - today) / (1000 * 60 * 60 * 24) <= 15;
  
  return `
    <div class="mb-6 overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-600/10 via-navy-900 to-navy-900 shadow-xl shadow-blue-500/5">
      <div class="flex flex-col md:flex-row items-center justify-between p-4 gap-4">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 bg-blue-500 text-white flex items-center justify-center rounded-xl shadow-lg shadow-blue-500/30 ${isClose ? 'animate-pulse' : ''}">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <div>
            <h3 class="text-white font-black text-base tracking-tight flex items-center gap-2">
              Calibration Campaign Planning
              <span class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase rounded border border-blue-500/30">Vendor Logistics</span>
            </h3>
            <p class="text-slate-400 text-xs mt-0.5">
              Earliest deadline: <span class="text-white font-bold">${fmtDate(earliest.deadline)}</span> (${earliest.tag_code})
            </p>
          </div>
        </div>
        
        <div class="flex flex-col sm:flex-row items-center gap-4">
          <div class="bg-white/5 px-4 py-2 rounded-xl border border-white/5 text-center sm:text-left">
            <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Suggested Embarkation</div>
            <div class="text-xl font-black text-blue-400 tabular-nums">${fmtDate(suggestionDate.toISOString().split('T')[0])}</div>
          </div>
          
          <div class="flex flex-col gap-1">
            <button class="btn btn-primary px-4 py-2 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:scale-105 transition-transform" onclick="window.openConfirmEmbarkationModal()">
              Confirm Embarkation
            </button>
            ${lastEmbarkation ? `
              <div class="text-[8px] text-slate-500 text-center uppercase font-bold tracking-tighter">
                Last campaign: ${fmtDate(lastEmbarkation.date)}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

window.openConfirmEmbarkationModal = function() {
  const body = `
    <div class="space-y-4 p-2">
      <p class="text-slate-400 text-sm">Please select the date when the vendor logistics/embarkation successfully occurred for the calibration campaign.</p>
      <div class="form-group">
        <label class="form-label text-[10px] uppercase font-black tracking-widest">Actual Embarkation Date</label>
        <input type="date" id="emb-date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="form-label text-[10px] uppercase font-black tracking-widest">Technician / Note</label>
        <input type="text" id="emb-note" class="form-input" placeholder="Optional notes about this campaign...">
      </div>
      <div class="mt-6 flex gap-3">
        <button class="btn btn-secondary flex-1" onclick="window.closeModal()">Cancel</button>
        <button class="btn btn-primary flex-1 font-black" onclick="window.confirmEmbarkation()">Save Record</button>
      </div>
    </div>
  `;
  openModal('Record Campaign Embarkation', body, null, 'max-w-md');
}

window.confirmEmbarkation = function() {
  const date = document.getElementById('emb-date').value;
  const note = document.getElementById('emb-note').value;
  const active = window.DB.getActivePlatform();
  
  if (!date) return alert('Please select a date.');
  
  window.DB.saveEmbarkation({
    platform_id: active ? active.id : 'plat-flowcore',
    date: date,
    note: note
  });
  
  window.toast('Embarkation record saved.', 'success');
  window.closeModal();
  window.renderDashboard(document.getElementById('page-container'));
}

// ============================================================
//  pages-admin.js — Admin-only User Management
// ============================================================

function renderUserManagement(container) {
    const users = DB.getUsers();
    const platforms = DB.getPlatforms();

    container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">User Management</h1>
        <p class="page-subtitle">Manage system access, create accounts, and reset passwords.</p>
      </div>
      <div>
        <button class="btn btn-primary flex items-center gap-2" onclick="openCreateUserModal()">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          Create User
        </button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <table class="data-table">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Username</th>
            <th>Role</th>
            <th>Assigned Sites</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr class="hover:bg-navy-800/30">
              <td class="font-medium text-white">${escHtml(u.name)}</td>
              <td><code class="text-xs bg-navy-800 px-1.5 py-0.5 rounded text-orange-400">${escHtml(u.username)}</code></td>
              <td><span class="badge ${u.role === 'Admin' ? 'status-closed' : 'status-pending'}">${u.role}</span></td>
              <td class="text-slate-400 text-sm">
                ${u.platforms.map(pid => {
        const p = platforms.find(x => x.id === pid);
        return p ? `<span class="inline-block bg-navy-800 px-2 py-0.5 rounded mr-1 mb-1">${p.name}</span>` : '';
    }).join('')}
              </td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-sm btn-secondary" onclick="editUserAccount('${u.id}')">Edit</button>
                  <button class="btn btn-sm btn-ghost text-slate-500" onclick="openResetPasswordModal('${u.id}', '${escHtml(u.username)}')">Pass</button>
                  ${u.username !== 'admin' ? `<button class="btn btn-sm btn-ghost text-red-500/60 hover:text-red-400" onclick="deleteUserAccount('${u.id}', '${escHtml(u.username)}')">Delete</button>` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Site Management Section -->
    <div class="page-header mt-12">
      <div>
        <h1 class="page-title">Site Management</h1>
        <p class="page-subtitle">Configure platforms, basins, and operators.</p>
      </div>
      <div>
        <button class="btn btn-secondary flex items-center gap-2" onclick="openCreateSiteModal()">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          Add New Site
        </button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Site Name</th>
            <th>Type</th>
            <th>Basin</th>
            <th>Operator</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${platforms.map(p => `
            <tr class="hover:bg-navy-800/30">
              <td><code class="text-[10px] bg-navy-800 px-1.5 py-0.5 rounded text-slate-500">${p.id}</code></td>
              <td class="font-medium text-white">${escHtml(p.name)}</td>
              <td><span class="text-xs text-slate-400">${escHtml(p.type)}</span></td>
              <td><span class="text-xs text-slate-400">${escHtml(p.basin)}</span></td>
              <td><span class="text-xs text-slate-400 font-bold">${escHtml(p.operator)}</span></td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-sm btn-ghost text-slate-500" onclick="editSite('${p.id}')">Edit</button>
                  ${p.id !== 'plat-atlanta' && p.id !== 'plat-flowcore' ? `<button class="btn btn-sm btn-ghost text-red-400" onclick="deleteSite('${p.id}', '${escHtml(p.name)}')">Delete</button>` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Cloud Sync Section -->
    <div class="page-header mt-12">
      <div>
        <h1 class="page-title">Cloud Synchronization</h1>
        <p class="page-subtitle">Sincronize seus dados locais com o banco de dados Supabase.</p>
      </div>
    </div>

    <div class="card p-6 border-l-4 border-orange-500 bg-orange-500/5">
      <div class="flex items-start gap-4">
        <div class="p-3 bg-orange-500/20 rounded-xl text-orange-500">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v8" /></svg>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-white mb-1">Migrar Dados Locais</h3>
          <p class="text-sm text-slate-400 mb-4">Se você já possui dados salvos neste computador e quer que eles apareçam na versão online do GitHub, clique no botão abaixo para fazer o upload massivo.</p>
          <button class="btn btn-primary" onclick="handleCloudUpload(this)">
            Enviar Tudo para Nuvem
          </button>
        </div>
      </div>
    </div>
  `;
}

async function handleCloudUpload(btn) {
    if (!confirm('Isso enviará todos os seus dados locais para o Supabase. Deseja continuar?')) return;
    
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Sincronizando...';
    
    try {
        const count = await DB.pushLocalToCloud();
        toast(`${count} registros sincronizados com sucesso!`, 'success');
    } catch (e) {
        toast('Erro na sincronização.', 'error');
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function userFormHtml(u = null) {
    const platforms = DB.getPlatforms();
    const roles = ['Metering Technician', 'Metering Engineer', 'E&I Lead', 'Admin'];
    
    return `
    <form id="admin-user-form" class="space-y-4">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="acu-name" class="form-input" required placeholder="Ex: João da Silva" value="${u ? escHtml(u.name) : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" id="acu-username" class="form-input" required placeholder="jsilva" value="${u ? escHtml(u.username) : ''}" ${u ? 'disabled' : ''}>
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">${u ? 'New Password (Optional)' : 'Temporary Password'}</label>
          <input type="password" id="acu-password" class="form-input" ${u ? '' : 'required'} placeholder="${u ? 'Leave blank to keep current' : 'Min 6 chars'}">
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select id="acu-role" class="form-select">
            ${roles.map(r => `<option value="${r}" ${u && u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Authorized Sites</label>
        <div class="grid-2 gap-2 max-h-40 overflow-y-auto p-3 bg-navy-900 border border-slate-700 rounded-lg">
          ${platforms.map(p => `
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="acu-sites" value="${p.id}" ${(!u || (u.platforms && u.platforms.includes(p.id))) ? 'checked' : ''}>
              <span class="text-sm text-slate-300">${p.name}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div id="acu-error" class="hidden text-red-400 text-sm italic"></div>
      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${u ? 'Update Account' : 'Create Account'}</button>
      </div>
    </form>
  `;
}

function bindUserForm(existing = null) {
    document.getElementById('admin-user-form').onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('acu-name').value.trim();
        const username = document.getElementById('acu-username').value.trim().toLowerCase();
        const password = document.getElementById('acu-password').value;
        const role = document.getElementById('acu-role').value;
        const sites = Array.from(document.querySelectorAll('input[name="acu-sites"]:checked')).map(el => el.value);

        if (!existing && username.length < 3) return acuError('Username too short.');
        if (!existing && password.length < 6) return acuError('Password must be at least 6 characters.');
        if (!existing && DB.usernameExists(username)) return acuError('Username already exists.');
        if (sites.length === 0) return acuError('Select at least one site.');

        const userData = { 
            id: existing ? existing.id : null,
            name, 
            username, 
            role, 
            platforms: sites 
        };
        
        // Only update password if provided
        if (password) {
            userData.password = password;
        } else if (existing) {
            userData.password = existing.password;
        }

        DB.saveUser(userData);
        toast(existing ? 'User updated.' : 'User created successfully.', 'success');
        closeModal();
        renderUserManagement(document.getElementById('page-container'));
    };
}

function openCreateUserModal() {
    openModal('Create New User', userFormHtml(null), () => bindUserForm(null));
}

function editUserAccount(id) {
    const user = DB.getUsers().find(u => u.id === id);
    if (!user) return;
    openModal(`Edit User: ${user.username}`, userFormHtml(user), () => bindUserForm(user));
}

function acuError(msg) {
    const el = document.getElementById('acu-error');
    el.textContent = msg;
    el.classList.remove('hidden');
}

function openResetPasswordModal(id, username) {
    const bodyHtml = `
    <div class="p-2">
      <p class="text-slate-400 mb-4">Resetting password for <strong>${escHtml(username)}</strong>.</p>
      <div class="form-group">
        <label class="form-label">New Password</label>
        <input type="password" id="reset-new-pass" class="form-input" placeholder="Enter new password">
      </div>
      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="confirmPasswordReset('${id}')">Reset Password</button>
      </div>
    </div>
  `;
    openModal('Reset Password', bodyHtml);
}

function confirmPasswordReset(id) {
    const pass = document.getElementById('reset-new-pass').value;
    if (pass.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
    }
    if (DB.updateUserPassword(id, pass)) {
        toast('Password updated.', 'success');
        closeModal();
    }
}

function deleteUserAccount(id, username) {
    if (confirm(`Are you sure you want to PERMANENTLY delete user "${username}"?`)) {
        DB.deleteUser(id);
        toast('User deleted.', 'success');
        renderUserManagement(document.getElementById('page-container'));
    }
}

// ---- SITE MANAGEMENT ----
function openCreateSiteModal(existingId = null) {
    const site = existingId ? DB.getPlatforms().find(p => p.id === existingId) : null;
    const bodyHtml = `
    <form id="admin-create-site-form" class="space-y-4">
      <div class="form-group">
        <label class="form-label">Site Name</label>
        <input type="text" id="acs-name" class="form-input" required placeholder="Ex: FPSO Capixaba" value="${site ? escHtml(site.name) : ''}">
      </div>
      <div class="grid-2">
        <div class="form-group">
            <label class="form-label">Type</label>
            <input type="text" id="acs-type" class="form-input" required placeholder="Ex: FPSO" value="${site ? escHtml(site.type) : 'FPSO'}">
        </div>
        <div class="form-group">
            <label class="form-label">Basin</label>
            <input type="text" id="acs-basin" class="form-input" placeholder="Ex: Santos Basin" value="${site ? escHtml(site.basin) : ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Operator</label>
        <input type="text" id="acs-operator" class="form-input" placeholder="Ex: Enauta" value="${site ? escHtml(site.operator) : ''}">
      </div>
      <div class="modal-footer mt-6">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${site ? 'Update Site' : 'Create Site'}</button>
      </div>
    </form>
  `;

    openModal(site ? 'Edit Site' : 'Add New Site', bodyHtml, () => {
        document.getElementById('admin-create-site-form').onsubmit = (e) => {
            e.preventDefault();
            const name = document.getElementById('acs-name').value.trim();
            const type = document.getElementById('acs-type').value.trim();
            const basin = document.getElementById('acs-basin').value.trim();
            const operator = document.getElementById('acs-operator').value.trim();

            DB.savePlatform({ id: existingId, name, type, basin, operator, active: true });
            toast(site ? 'Site updated.' : 'Site created successfully.', 'success');
            closeModal();
            renderUserManagement(document.getElementById('page-container'));
        };
    });
}

function editSite(id) {
    openCreateSiteModal(id);
}

function deleteSite(id, name) {
    if (confirm(`Are you sure you want to delete site "${name}"? All associated data will be hidden.`)) {
        DB.deletePlatform(id);
        toast('Site deleted.', 'success');
        renderUserManagement(document.getElementById('page-container'));
    }
}

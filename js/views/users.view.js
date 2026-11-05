App.Views = App.Views || {};

App.Views.users = {
  title: 'Usuarios',

  render() {
    const roleOptions = App.Services.users.roles()
      .map((role) => `<option value="${App.Utils.escapeHtml(role.value)}">${App.Utils.escapeHtml(role.label)}</option>`)
      .join('');

    return `
      <div class="view-head">
        <div>
          <p class="eyebrow">RF-01 · Usuarios del sistema</p>
          <h2>Usuarios y roles</h2>
          <p class="view-sub">Registra cuentas con correo y contraseña, asigna roles y desactiva accesos sin eliminar el historial.</p>
        </div>
        <button type="button" class="btn btn-primary" id="new-user">
          ${App.Icons.plus()}
          Nuevo usuario
        </button>
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="search-box">
            ${App.Icons.search()}
            <input type="search" id="user-search" placeholder="Buscar por nombre o correo" autocomplete="off">
          </div>
          <select id="user-role-filter" class="select-inline" aria-label="Filtrar por rol">
            <option value="all">Todos los roles</option>
            ${roleOptions}
          </select>
          <select id="user-status-filter" class="select-inline" aria-label="Filtrar por estado">
            <option value="all">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          <span class="toolbar-meta" id="user-count"></span>
        </div>
        <div id="users-table"></div>
      </div>

      <div class="card">
        <div class="card-head">
          <h3>Permisos por rol</h3>
        </div>
        <div id="role-matrix"></div>
      </div>
    `;
  },

  mount() {
    const escape = App.Utils.escapeHtml;
    const state = { query: '', role: 'all', status: 'all' };
    const table = document.getElementById('users-table');
    const count = document.getElementById('user-count');
    const currentUser = App.Auth.current();

    const moduleLabels = {
      dashboard: 'Panel principal',
      members: 'Miembros',
      attendance: 'Asistencia',
      events: 'Eventos',
      ministries: 'Ministerios',
      announcements: 'Comunicados',
      donations: 'Donaciones',
      reports: 'Reportes',
      settings: 'Configuración',
      users: 'Usuarios'
    };

    function row(user) {
      const isActive = user.estado !== 'inactivo';
      const isSelf = user.id === currentUser.id;

      return `
        <tr>
          <td>
            <div class="cell-main">
              <span class="avatar avatar-sm">${escape(App.Utils.initials(user.nombre))}</span>
              <div class="cell-text">
                <strong>${escape(user.nombre)}${isSelf ? ' (tú)' : ''}</strong>
                <small>${escape(user.correo)}</small>
              </div>
            </div>
          </td>
          <td><span class="badge badge-role">${escape(App.Auth.roleLabel(user.rol))}</span></td>
          <td>${escape(App.Utils.formatDate(String(user.creadoEn || '').slice(0, 10)))}</td>
          <td>${App.UI.statusBadge(user.estado)}</td>
          <td class="align-right">
            <div class="row-actions">
              <button type="button" class="icon-btn" data-action="edit" data-id="${escape(user.id)}" aria-label="Editar" title="Editar">
                ${App.Icons.edit()}
              </button>
              ${isSelf ? '' : `
                <button type="button" class="icon-btn ${isActive ? 'icon-btn-danger' : 'icon-btn-success'}" data-action="toggle" data-id="${escape(user.id)}" aria-label="${isActive ? 'Desactivar' : 'Reactivar'}" title="${isActive ? 'Desactivar' : 'Reactivar'}">
                  ${isActive ? App.Icons.x() : App.Icons.check()}
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }

    function draw() {
      const list = App.Services.users.list(state);
      count.textContent = `${list.length} ${list.length === 1 ? 'usuario' : 'usuarios'}`;

      if (!list.length) {
        table.innerHTML = App.UI.empty('Sin usuarios que mostrar', 'Ajusta los filtros o registra un nuevo usuario.', App.Icons.users());
        return;
      }

      table.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Alta</th>
                <th>Estado</th>
                <th class="align-right">Acciones</th>
              </tr>
            </thead>
            <tbody>${list.map(row).join('')}</tbody>
          </table>
        </div>
      `;
    }

    function drawMatrix() {
      const roles = App.Config.roles;
      const modules = Object.keys(moduleLabels);

      document.getElementById('role-matrix').innerHTML = `
        <div class="table-wrap">
          <table class="table table-compact">
            <thead>
              <tr>
                <th>Módulo</th>
                ${Object.keys(roles).map((key) => `<th>${escape(roles[key].label)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${modules.map((moduleName) => `
                <tr>
                  <td>${escape(moduleLabels[moduleName])}</td>
                  ${Object.keys(roles).map((key) => {
                    const role = roles[key];
                    if (!role.modules.includes(moduleName)) return '<td><span class="badge badge-muted">Sin acceso</span></td>';
                    if ((role.manage || []).includes(moduleName)) return '<td><span class="badge badge-success">Gestión</span></td>';
                    return '<td><span class="badge badge-blue">Consulta</span></td>';
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    function openForm(user) {
      const isEdit = Boolean(user);
      const data = user || {};
      const roleOptions = App.Services.users.roles().map((role) => `
        <option value="${escape(role.value)}" ${data.rol === role.value ? 'selected' : ''}>${escape(role.label)}</option>
      `).join('');

      App.UI.modal({
        title: isEdit ? 'Editar usuario' : 'Nuevo usuario',
        submitLabel: isEdit ? 'Guardar cambios' : 'Registrar usuario',
        formHtml: `
          <div class="form-grid">
            <div class="field field-full">
              <label for="user-name">Nombre completo</label>
              <input type="text" id="user-name" name="nombre" maxlength="80" required value="${escape(data.nombre || '')}" placeholder="Ej. Ana Beltrán">
            </div>
            <div class="field">
              <label for="user-email">Correo electrónico</label>
              <input type="email" id="user-email" name="correo" maxlength="100" required value="${escape(data.correo || '')}" placeholder="usuario@iglesia.com" autocomplete="off">
            </div>
            <div class="field">
              <label for="user-role">Rol</label>
              <select id="user-role" name="rol" required>${roleOptions}</select>
            </div>
            <div class="field">
              <label for="user-password">${isEdit ? 'Nueva contraseña' : 'Contraseña'}</label>
              <input type="password" id="user-password" name="password" minlength="6" ${isEdit ? '' : 'required'} autocomplete="new-password">
            </div>
            <div class="field">
              <label for="user-confirm">Confirmar contraseña</label>
              <input type="password" id="user-confirm" name="confirm" minlength="6" ${isEdit ? '' : 'required'} autocomplete="new-password">
            </div>
            <p class="field-hint field-full">${isEdit ? 'Deja la contraseña en blanco para conservar la actual.' : 'La contraseña debe tener al menos 6 caracteres.'}</p>
          </div>
        `,
        onSubmit(formData) {
          if (isEdit) {
            App.Services.users.update(user.id, formData);
            App.UI.toast('Usuario actualizado.');
          } else {
            App.Services.users.create(formData);
            App.UI.toast('Usuario registrado.');
          }

          if (isEdit && user.id === currentUser.id) {
            App.Router.handle();
            return;
          }
          draw();
        }
      });
    }

    async function toggleStatus(user) {
      const activate = user.estado === 'inactivo';

      const confirmed = await App.UI.confirm({
        title: activate ? 'Reactivar usuario' : 'Desactivar usuario',
        message: activate
          ? `¿Deseas reactivar la cuenta de <strong>${escape(user.nombre)}</strong>? Podrá volver a iniciar sesión.`
          : `¿Deseas desactivar la cuenta de <strong>${escape(user.nombre)}</strong>? No podrá iniciar sesión, pero su información se conservará.`,
        confirmLabel: activate ? 'Reactivar' : 'Desactivar',
        danger: !activate
      });

      if (!confirmed) return;

      try {
        App.Services.users.setStatus(user.id, activate ? 'activo' : 'inactivo', currentUser.id);
        App.UI.toast(activate ? 'Usuario reactivado.' : 'Usuario desactivado.');
        draw();
      } catch (error) {
        App.UI.toast(error.message, 'error');
      }
    }

    const search = document.getElementById('user-search');
    search.addEventListener('input', App.Utils.debounce(() => {
      state.query = search.value;
      draw();
    }, 160));

    document.getElementById('user-role-filter').addEventListener('change', (event) => {
      state.role = event.target.value;
      draw();
    });

    document.getElementById('user-status-filter').addEventListener('change', (event) => {
      state.status = event.target.value;
      draw();
    });

    document.getElementById('new-user').addEventListener('click', () => openForm(null));

    table.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const user = App.Services.users.get(button.dataset.id);
      if (!user) return;

      if (button.dataset.action === 'edit') openForm(user);
      if (button.dataset.action === 'toggle') toggleStatus(user);
    });

    draw();
    drawMatrix();
  }
};

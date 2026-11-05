App.Views = App.Views || {};

App.Views.members = {
  title: 'Miembros',

  render() {
    return `
      <div class="view-head">
        <div>
          <p class="eyebrow">RF-02 · Gestión de miembros</p>
          <h2>Miembros de la iglesia</h2>
          <p class="view-sub">Registra, consulta y actualiza la información de los miembros. Los registros se desactivan sin eliminarse.</p>
        </div>
        <button type="button" class="btn btn-primary" id="new-member">
          ${App.Icons.plus()}
          Nuevo miembro
        </button>
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="search-box">
            ${App.Icons.search()}
            <input type="search" id="member-search" placeholder="Buscar por nombre, correo, teléfono o ministerio" autocomplete="off">
          </div>
          <select id="member-filter" class="select-inline" aria-label="Filtrar por estado">
            <option value="all">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          <span class="toolbar-meta" id="member-count"></span>
        </div>
        <div id="members-table"></div>
      </div>
    `;
  },

  mount() {
    const state = { query: '', status: 'all' };
    const table = document.getElementById('members-table');
    const count = document.getElementById('member-count');
    const search = document.getElementById('member-search');
    const filter = document.getElementById('member-filter');

    const escape = App.Utils.escapeHtml;

    function row(member) {
      const isActive = member.estado === 'activo';
      const ministries = App.Services.ministries.namesForMember(member.id);

      return `
        <tr>
          <td>
            <div class="cell-main">
              <span class="avatar avatar-sm">${escape(App.Utils.initials(member.nombre))}</span>
              <div class="cell-text">
                <strong>${escape(member.nombre)}</strong>
                <small>${escape(ministries.length ? ministries.join(' · ') : 'Sin ministerio asignado')}</small>
              </div>
            </div>
          </td>
          <td>
            <div class="cell-text">
              <strong class="cell-soft">${escape(member.telefono || '—')}</strong>
              <small>${escape(member.correo || 'Sin correo')}</small>
            </div>
          </td>
          <td>${escape(App.Utils.formatDate(member.fechaIngreso))}</td>
          <td>${App.UI.statusBadge(member.estado)}</td>
          <td class="align-right">
            <div class="row-actions">
              <button type="button" class="icon-btn" data-action="edit" data-id="${escape(member.id)}" aria-label="Editar" title="Editar">
                ${App.Icons.edit()}
              </button>
              <button type="button" class="icon-btn ${isActive ? 'icon-btn-danger' : 'icon-btn-success'}" data-action="toggle" data-id="${escape(member.id)}" aria-label="${isActive ? 'Desactivar' : 'Reactivar'}" title="${isActive ? 'Desactivar' : 'Reactivar'}">
                ${isActive ? App.Icons.x() : App.Icons.check()}
              </button>
            </div>
          </td>
        </tr>
      `;
    }

    function draw() {
      const list = App.Services.members.list(state);
      count.textContent = `${list.length} ${list.length === 1 ? 'registro' : 'registros'}`;

      if (!list.length) {
        table.innerHTML = App.UI.empty(
          'Sin miembros que mostrar',
          'Ajusta la búsqueda o registra un nuevo miembro.',
          App.Icons.users()
        );
        return;
      }

      table.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Miembro</th>
                <th>Contacto</th>
                <th>Ingreso</th>
                <th>Estado</th>
                <th class="align-right">Acciones</th>
              </tr>
            </thead>
            <tbody>${list.map(row).join('')}</tbody>
          </table>
        </div>
      `;
    }

    function openForm(member) {
      const isEdit = Boolean(member);
      const value = (key, fallback) => escape(member && member[key] != null ? member[key] : (fallback || ''));

      const form = App.UI.modal({
        title: isEdit ? 'Editar miembro' : 'Nuevo miembro',
        submitLabel: isEdit ? 'Guardar cambios' : 'Registrar miembro',
        formHtml: `
          <div class="form-grid">
            <div class="field field-full">
              <label for="member-name">Nombre completo</label>
              <input type="text" id="member-name" name="nombre" maxlength="80" required value="${value('nombre')}" placeholder="Ej. Carlos Ramírez">
            </div>
            <div class="field">
              <label for="member-phone">Teléfono</label>
              <input type="tel" id="member-phone" name="telefono" maxlength="30" required value="${value('telefono')}" placeholder="555 000 0000">
            </div>
            <div class="field">
              <label for="member-email">Correo electrónico</label>
              <input type="email" id="member-email" name="correo" required value="${value('correo')}" placeholder="correo@ejemplo.com">
            </div>
            <div class="field">
              <label for="member-date">Fecha de ingreso</label>
              <input type="date" id="member-date" name="fechaIngreso" required value="${value('fechaIngreso', App.Utils.todayISO())}">
            </div>
            <div class="field field-full">
              <label for="member-notes">Notas</label>
              <textarea id="member-notes" name="notas" rows="3" maxlength="300" placeholder="Observaciones opcionales">${value('notas')}</textarea>
            </div>
            <p class="field-hint field-full">Los ministerios se asignan desde el módulo de Ministerios.</p>
          </div>
        `,
        onSubmit(data) {
          if (isEdit) {
            App.Services.members.update(member.id, data);
            App.UI.toast('Miembro actualizado.');
          } else {
            App.Services.members.create(data);
            App.UI.toast('Miembro registrado.');
          }
          draw();
        }
      });

      const firstName = form.querySelector('#member-name');
      if (firstName) firstName.focus();
    }

    async function toggleStatus(member) {
      const activate = member.estado === 'inactivo';

      const confirmed = await App.UI.confirm({
        title: activate ? 'Reactivar miembro' : 'Desactivar miembro',
        message: activate
          ? `¿Deseas reactivar a <strong>${escape(member.nombre)}</strong>? Volverá a contar como miembro activo.`
          : `¿Deseas desactivar a <strong>${escape(member.nombre)}</strong>? El registro se conservará y podrá reactivarse después.`,
        confirmLabel: activate ? 'Reactivar' : 'Desactivar',
        danger: !activate
      });

      if (!confirmed) return;

      App.Services.members.setStatus(member.id, activate ? 'activo' : 'inactivo');
      App.UI.toast(activate ? 'Miembro reactivado.' : 'Miembro desactivado.');
      draw();
    }

    search.addEventListener('input', App.Utils.debounce(() => {
      state.query = search.value;
      draw();
    }, 160));

    filter.addEventListener('change', () => {
      state.status = filter.value;
      draw();
    });

    document.getElementById('new-member').addEventListener('click', () => openForm(null));

    table.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const member = App.Services.members.get(button.dataset.id);
      if (!member) return;

      if (button.dataset.action === 'edit') openForm(member);
      if (button.dataset.action === 'toggle') toggleStatus(member);
    });

    draw();
  }
};

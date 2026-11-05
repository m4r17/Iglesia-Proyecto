App.Views = App.Views || {};

App.Views.ministries = {
  title: 'Ministerios',

  render() {
    const canManage = App.Auth.canManage('ministries');

    return `
      <div class="view-head">
        <div>
          <p class="eyebrow">RF-05 · Administración de ministerios</p>
          <h2>Ministerios y grupos de trabajo</h2>
          <p class="view-sub">Registra ministerios, asigna coordinadores, vincula miembros y consulta las actividades programadas.</p>
        </div>
        ${canManage ? `
          <button type="button" class="btn btn-primary" id="new-ministry">
            ${App.Icons.plus()}
            Nuevo ministerio
          </button>
        ` : ''}
      </div>

      <div class="grid grid-stats" id="ministry-stats"></div>

      <div class="ministries-layout">
        <div class="card ministry-list-card">
          <div class="card-head">
            <h3>Ministerios</h3>
            <span class="badge" id="ministry-count"></span>
          </div>
          <div id="ministry-list" class="ministry-list"></div>
        </div>

        <div id="ministry-detail"></div>
      </div>
    `;
  },

  mount() {
    const escape = App.Utils.escapeHtml;
    const canManage = App.Auth.canManage('ministries');
    const statsContainer = document.getElementById('ministry-stats');
    const listContainer = document.getElementById('ministry-list');
    const detailContainer = document.getElementById('ministry-detail');
    const countBadge = document.getElementById('ministry-count');
    const state = { memberQuery: '' };
    let selectedId = null;

    function currentMinistry() {
      return selectedId ? App.Services.ministries.get(selectedId) : null;
    }

    function drawStats() {
      const stats = App.Services.ministries.stats();
      const cards = [
        { label: 'Ministerios', value: stats.total, foot: 'grupos registrados', icon: 'church', tone: 'violet' },
        { label: 'Miembros vinculados', value: stats.linked, foot: 'con al menos un ministerio', icon: 'users', tone: 'blue' },
        { label: 'Coordinadores', value: stats.coordinators, foot: 'asignados actualmente', icon: 'usersGroup', tone: 'gold' },
        { label: 'Actividades próximas', value: stats.upcoming, foot: 'programadas por ministerio', icon: 'events', tone: 'green' }
      ];

      statsContainer.innerHTML = cards.map((card) => `
        <article class="stat-card">
          <div class="stat-icon stat-icon-${card.tone}">${App.Icons[card.icon]()}</div>
          <span class="stat-label">${escape(card.label)}</span>
          <strong class="stat-value">${card.value}</strong>
          <span class="stat-foot">${escape(card.foot)}</span>
        </article>
      `).join('');
    }

    function drawList() {
      const ministries = App.Services.ministries.list();
      countBadge.textContent = `${ministries.length} ${ministries.length === 1 ? 'grupo' : 'grupos'}`;

      if (!selectedId && ministries.length) {
        selectedId = ministries[0].id;
      }

      if (!ministries.length) {
        listContainer.innerHTML = App.UI.empty(
          'Sin ministerios registrados',
          'Crea el primer ministerio para organizar los grupos de trabajo.',
          App.Icons.church()
        );
        return;
      }

      listContainer.innerHTML = ministries.map((ministry) => {
        const coordinator = App.Services.ministries.coordinator(ministry);
        const members = (ministry.miembros || []).length;
        const activities = App.Services.ministries.activitiesOf(ministry.id, true).length;

        return `
          <button type="button" class="ministry-item ${ministry.id === selectedId ? 'is-active' : ''}" data-id="${escape(ministry.id)}">
            <span class="ministry-icon">${App.Icons.church()}</span>
            <span class="ministry-item-text">
              <strong>${escape(ministry.nombre)}</strong>
              <span>${escape(coordinator ? coordinator.nombre : 'Sin coordinador')}</span>
              <span class="ministry-chips">
                <span class="badge badge-blue">${members} ${members === 1 ? 'integrante' : 'integrantes'}</span>
                ${activities ? `<span class="badge badge-gold">${activities} ${activities === 1 ? 'actividad' : 'actividades'}</span>` : ''}
              </span>
            </span>
            ${App.Icons.chevronRight()}
          </button>
        `;
      }).join('');
    }

    function memberPickerHtml(ministry, members) {
      const allMembers = App.Repositories.members.all()
        .slice()
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      const linkedIds = new Set((ministry.miembros || []));
      const query = App.Utils.normalize(state.memberQuery);
      const base = canManage ? allMembers : members;
      const filtered = base.filter((member) => {
        if (!query) return true;
        const ministries = App.Services.ministries.namesForMember(member.id).join(' ');
        return App.Utils.normalize(`${member.nombre} ${member.correo} ${member.telefono} ${ministries}`).includes(query);
      });

      if (!filtered.length) {
        return App.UI.empty(
          'Sin coincidencias',
          canManage ? 'Ajusta la búsqueda para encontrar miembros.' : 'Este ministerio todavía no tiene integrantes.',
          App.Icons.users()
        );
      }

      return filtered.map((member) => {
        const linked = linkedIds.has(member.id);
        return `
          <label class="pick-row ${linked ? 'is-selected' : ''}">
            <span class="avatar avatar-sm">${escape(App.Utils.initials(member.nombre))}</span>
            <span class="att-name">
              <strong>${escape(member.nombre)}</strong>
              <span>${member.estado === 'inactivo' ? 'Inactivo · ' : ''}${escape(member.correo || member.telefono || '')}</span>
            </span>
            ${linked ? '<span class="badge badge-success">Vinculado</span>' : ''}
            ${canManage ? `<input type="checkbox" class="pick-check" data-member="${escape(member.id)}" ${linked ? 'checked' : ''} aria-label="Vincular a ${escape(member.nombre)}">` : ''}
          </label>
        `;
      }).join('');
    }

    function activityRow(eventItem) {
      const date = App.Utils.parseDate(eventItem.fecha);

      return `
        <div class="event-row">
          <div class="date-badge">
            <strong>${date ? date.getDate() : '—'}</strong>
            <small>${date ? date.toLocaleDateString('es-MX', { month: 'short' }) : ''}</small>
          </div>
          <div class="event-main">
            <strong>${escape(eventItem.titulo)}</strong>
            <span>${escape(App.Utils.formatDate(eventItem.fecha))} · ${escape(eventItem.hora || '')} · ${escape(eventItem.lugar || 'Sin lugar')}${eventItem.responsable ? ' · ' + escape(eventItem.responsable) : ''}</span>
            <div class="event-tags">
              <span class="badge ${eventItem.tipo === 'administrativo' ? 'badge-violet' : 'badge-blue'}">${eventItem.tipo === 'administrativo' ? 'Administrativo' : 'Religioso'}</span>
            </div>
          </div>
        </div>
      `;
    }

    function drawDetail() {
      const ministry = currentMinistry();

      if (!ministry) {
        detailContainer.innerHTML = `
          <div class="card">
            ${App.UI.empty(
              'Selecciona un ministerio',
              'Elige un ministerio de la lista para consultar sus integrantes y actividades.',
              App.Icons.church()
            )}
          </div>
        `;
        return;
      }

      const coordinator = App.Services.ministries.coordinator(ministry);
      const coordinatorDetail = coordinator
        ? coordinator.tipo === 'miembro' ? 'Integrante del ministerio' : App.Auth.roleLabel(coordinator.rol)
        : 'Asigna un coordinador';
      const members = App.Services.ministries.membersOf(ministry.id);
      const activities = App.Services.ministries.activitiesOf(ministry.id, true);

      detailContainer.innerHTML = `
        <div class="card">
          <div class="ministry-detail-head">
            <div class="ministry-detail-copy">
              <p class="eyebrow">Ministerio</p>
              <h3>${escape(ministry.nombre)}</h3>
              <p class="view-sub">${escape(ministry.descripcion || 'Sin descripción registrada.')}</p>
              <div class="ministry-meta">
                <span class="coordinator-chip">
                  <span class="avatar avatar-sm">${escape(App.Utils.initials(coordinator ? coordinator.nombre : '?'))}</span>
                  <span class="coordinator-text">
                    <strong>${escape(coordinator ? coordinator.nombre : 'Sin coordinador')}</strong>
                    <span>${escape(coordinatorDetail)}</span>
                  </span>
                </span>
                <span class="badge badge-blue">${members.length} ${members.length === 1 ? 'integrante' : 'integrantes'}</span>
                <span class="badge badge-gold">${activities.length} ${activities.length === 1 ? 'actividad próxima' : 'actividades próximas'}</span>
              </div>
            </div>
            ${canManage ? `
              <div class="event-actions">
                <button type="button" class="icon-btn" data-action="edit" aria-label="Editar ministerio" title="Editar ministerio">${App.Icons.edit()}</button>
                <button type="button" class="icon-btn icon-btn-danger" data-action="delete" aria-label="Eliminar ministerio" title="Eliminar ministerio">${App.Icons.trash()}</button>
              </div>
            ` : ''}
          </div>

          <div class="ministry-section">
            <div class="section-head">
              <h4>Integrantes</h4>
              <span class="muted">${canManage ? 'Marca o desmarca para vincular miembros' : `${members.length} vinculados`}</span>
            </div>
            ${canManage ? `
              <div class="search-box ministry-member-search">
                ${App.Icons.search()}
                <input type="search" id="ministry-member-search" placeholder="Buscar miembro para vincular" value="${escape(state.memberQuery)}" autocomplete="off">
              </div>
            ` : ''}
            <div class="member-picker" id="ministry-member-picker">
              ${memberPickerHtml(ministry, members)}
            </div>
          </div>

          <div class="ministry-section">
            <div class="section-head">
              <h4>Actividades programadas</h4>
              <a class="link" href="#/eventos">Ver calendario</a>
            </div>
            <div class="event-list">
              ${activities.length
                ? activities.map(activityRow).join('')
                : App.UI.empty(
                    'Sin actividades próximas',
                    'Crea un evento y asígnalo a este ministerio desde el calendario.',
                    App.Icons.events()
                  )}
            </div>
          </div>
        </div>
      `;

      const search = document.getElementById('ministry-member-search');
      if (search) {
        search.addEventListener('input', () => {
          state.memberQuery = search.value;
          const picker = document.getElementById('ministry-member-picker');
          if (picker) picker.innerHTML = memberPickerHtml(ministry, members);
        });
      }

      const picker = document.getElementById('ministry-member-picker');
      if (picker) {
        picker.addEventListener('change', (event) => {
          const checkbox = event.target.closest('input[data-member]');
          if (!checkbox) return;
          const scrollTop = picker.scrollTop;
          const wasCoordinator = ministry.coordinadorMiembroId === checkbox.dataset.member;
          App.Services.ministries.setMember(ministry.id, checkbox.dataset.member, checkbox.checked);
          App.UI.toast(checkbox.checked
            ? 'Miembro vinculado al ministerio.'
            : wasCoordinator
              ? 'Miembro desvinculado. La coordinación quedó vacante.'
              : 'Miembro desvinculado del ministerio.');
          drawStats();
          drawList();
          drawDetail();
          const nextPicker = document.getElementById('ministry-member-picker');
          if (nextPicker) nextPicker.scrollTop = scrollTop;
        });
      }
    }

    function parseCoordinator(value) {
      const [type, entityId] = String(value || '').split(':');

      if (type === 'miembro' && entityId) {
        return { coordinadorId: '', coordinadorMiembroId: entityId };
      }

      if (type === 'usuario' && entityId) {
        return { coordinadorId: entityId, coordinadorMiembroId: '' };
      }

      return { coordinadorId: '', coordinadorMiembroId: '' };
    }

    function coordinatorOptions(ministry) {
      const data = ministry || {};
      const selectedMemberId = data.coordinadorMiembroId || '';
      const selectedUserId = data.coordinadorId || '';
      const memberIds = new Set(Array.isArray(data.miembros) ? data.miembros : []);

      if (selectedMemberId) memberIds.add(selectedMemberId);

      const members = App.Repositories.members.all()
        .filter((member) => memberIds.has(member.id))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      const users = App.Repositories.users.all()
        .slice()
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      const selectedValue = selectedMemberId
        ? `miembro:${selectedMemberId}`
        : selectedUserId ? `usuario:${selectedUserId}` : '';

      return [
        `<option value="" ${selectedValue ? '' : 'selected'}>Sin coordinador</option>`,
        members.length ? `
          <optgroup label="Miembros del ministerio">
            ${members.map((member) => `
              <option value="miembro:${escape(member.id)}" ${selectedValue === `miembro:${member.id}` ? 'selected' : ''}>
                ${escape(member.nombre)}${member.estado === 'inactivo' ? ' (inactivo)' : ''} · Integrante
              </option>
            `).join('')}
          </optgroup>
        ` : '',
        users.length ? `
          <optgroup label="Usuarios del sistema">
            ${users.map((user) => `
              <option value="usuario:${escape(user.id)}" ${selectedValue === `usuario:${user.id}` ? 'selected' : ''}>
                ${escape(user.nombre)} · ${escape(App.Auth.roleLabel(user.rol))}
              </option>
            `).join('')}
          </optgroup>
        ` : ''
      ].join('');
    }

    function openForm(ministry) {
      const isEdit = Boolean(ministry);
      const data = ministry || {};

      App.UI.modal({
        title: isEdit ? 'Editar ministerio' : 'Nuevo ministerio',
        submitLabel: isEdit ? 'Guardar cambios' : 'Crear ministerio',
        formHtml: `
          <div class="form-grid">
            <div class="field field-full">
              <label for="ministry-name">Nombre del ministerio</label>
              <input type="text" id="ministry-name" name="nombre" maxlength="70" required value="${escape(data.nombre || '')}" placeholder="Ej. Música, Jóvenes, Niños">
            </div>
            <div class="field field-full">
              <label for="ministry-coordinator">Coordinador</label>
              <select id="ministry-coordinator" name="coordinador">${coordinatorOptions(ministry)}</select>
              <span class="field-hint">Puede ser un usuario del sistema o cualquier integrante del ministerio.</span>
            </div>
            <div class="field field-full">
              <label for="ministry-description">Descripción</label>
              <textarea id="ministry-description" name="descripcion" rows="3" maxlength="240" placeholder="Propósito y actividades del ministerio">${escape(data.descripcion || '')}</textarea>
            </div>
            <p class="field-hint field-full">Después de guardar podrás vincular miembros desde la ficha del ministerio.</p>
          </div>
        `,
        onSubmit(formData) {
          const coordinator = parseCoordinator(formData.coordinador);
          const payload = {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            coordinadorId: coordinator.coordinadorId,
            coordinadorMiembroId: coordinator.coordinadorMiembroId
          };

          if (isEdit) {
            App.Services.ministries.update(ministry.id, payload);
            App.UI.toast('Ministerio actualizado.');
          } else {
            const created = App.Services.ministries.create(payload);
            selectedId = created.id;
            App.UI.toast('Ministerio creado.');
          }
          drawStats();
          drawList();
          drawDetail();
        }
      });
    }

    async function removeMinistry(ministry) {
      const confirmed = await App.UI.confirm({
        title: 'Eliminar ministerio',
        message: `¿Deseas eliminar <strong>${escape(ministry.nombre)}</strong>? Se quitarán sus vínculos con miembros y actividades, pero no se eliminarán personas ni eventos.`,
        confirmLabel: 'Eliminar',
        danger: true
      });

      if (!confirmed) return;

      App.Services.ministries.remove(ministry.id);
      selectedId = null;
      state.memberQuery = '';
      App.UI.toast('Ministerio eliminado.');
      drawStats();
      drawList();
      drawDetail();
    }

    document.getElementById('ministry-list').addEventListener('click', (event) => {
      const item = event.target.closest('.ministry-item[data-id]');
      if (!item) return;
      selectedId = item.dataset.id;
      state.memberQuery = '';
      drawList();
      drawDetail();
    });

    if (canManage) {
      const newButton = document.getElementById('new-ministry');
      if (newButton) {
        newButton.addEventListener('click', () => openForm(null));
      }
    }

    detailContainer.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const ministry = currentMinistry();
      if (!ministry) return;

      if (button.dataset.action === 'edit') openForm(ministry);
      if (button.dataset.action === 'delete') removeMinistry(ministry);
    });

    drawStats();
    drawList();
    drawDetail();
  }
};

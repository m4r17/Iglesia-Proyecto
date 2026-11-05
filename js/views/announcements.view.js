App.Views = App.Views || {};

App.Views.announcements = {
  title: 'Comunicados',

  render() {
    const canManage = App.Auth.canManage('announcements');

    return `
      <div class="view-head">
        <div>
          <p class="eyebrow">RF-07 · Comunicados y anuncios</p>
          <h2>Comunicados de la iglesia</h2>
          <p class="view-sub">Publica avisos para la comunidad, destaca los mensajes importantes y mantén informados a los miembros.</p>
        </div>
        ${canManage ? `
          <button type="button" class="btn btn-primary" id="new-announcement">
            ${App.Icons.plus()}
            Nuevo comunicado
          </button>
        ` : ''}
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-head">
            <h3>Próximos eventos</h3>
            ${App.Auth.can('events') ? '<a class="link" href="#/eventos">Ver calendario</a>' : ''}
          </div>
          <div id="announcement-events" class="event-list"></div>
        </div>
        <div class="card">
          <div class="card-head">
            <h3>Avisos importantes</h3>
          </div>
          <div id="announcement-important" class="event-list"></div>
        </div>
      </div>

      <div class="card">
        <div class="toolbar">
          <select id="announcement-filter" class="select-inline" aria-label="Filtrar comunicados">
            <option value="all">Todos los comunicados</option>
            <option value="important">Solo importantes</option>
          </select>
          <span class="toolbar-meta" id="announcement-count"></span>
        </div>
        <div id="announcements-list" class="announcements-grid"></div>
      </div>
    `;
  },

  mount() {
    const escape = App.Utils.escapeHtml;
    const canManage = App.Auth.canManage('announcements');
    const listContainer = document.getElementById('announcements-list');
    const count = document.getElementById('announcement-count');
    const filter = document.getElementById('announcement-filter');
    const state = { filter: 'all' };

    function filteredList() {
      const list = App.Services.announcements.list();
      return state.filter === 'important'
        ? list.filter((announcement) => announcement.importante)
        : list;
    }

    function card(announcement) {
      const date = App.Utils.parseDate(announcement.fechaPublicacion);

      return `
        <article class="announcement-card ${announcement.importante ? 'is-important' : ''}">
          <div class="announcement-head">
            <div class="date-badge">
              <strong>${date ? date.getDate() : '—'}</strong>
              <small>${date ? date.toLocaleDateString('es-MX', { month: 'short' }) : ''}</small>
            </div>
            <div class="announcement-head-text">
              <div class="announcement-badges">
                ${announcement.importante ? '<span class="badge badge-gold">Importante</span>' : '<span class="badge badge-muted">Informativo</span>'}
                <span class="muted">${escape(App.Utils.formatDate(announcement.fechaPublicacion))}</span>
              </div>
              <h3>${escape(announcement.titulo)}</h3>
            </div>
            ${canManage ? `
              <div class="event-actions">
                <button type="button" class="icon-btn" data-action="toggle" data-id="${escape(announcement.id)}" aria-label="${announcement.importante ? 'Quitar importancia' : 'Marcar como importante'}" title="${announcement.importante ? 'Quitar importancia' : 'Marcar como importante'}">
                  ${App.Icons.star()}
                </button>
                <button type="button" class="icon-btn" data-action="edit" data-id="${escape(announcement.id)}" aria-label="Editar" title="Editar">
                  ${App.Icons.edit()}
                </button>
                <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${escape(announcement.id)}" aria-label="Eliminar" title="Eliminar">
                  ${App.Icons.trash()}
                </button>
              </div>
            ` : ''}
          </div>
          <p class="announcement-content">${escape(announcement.contenido)}</p>
          <div class="announcement-foot">
            <span>Publicado por ${escape(announcement.autor || 'Administración')}</span>
            ${announcement.actualizadoEn ? '<span class="badge badge-muted">Editado</span>' : ''}
          </div>
        </article>
      `;
    }

    function dateBadge(value) {
      const date = App.Utils.parseDate(value);
      return `
        <div class="date-badge">
          <strong>${date ? date.getDate() : '—'}</strong>
          <small>${date ? date.toLocaleDateString('es-MX', { month: 'short' }) : ''}</small>
        </div>
      `;
    }

    function drawHighlights() {
      const events = App.Services.events.upcoming(4);
      const important = App.Services.announcements.latest(4, true);

      document.getElementById('announcement-events').innerHTML = events.length
        ? events.map((eventItem) => `
            <div class="event-row">
              ${dateBadge(eventItem.fecha)}
              <div class="event-main">
                <strong>${escape(eventItem.titulo)}</strong>
                <span>${escape(eventItem.hora || '')} · ${escape(eventItem.lugar || 'Sin lugar')}</span>
              </div>
            </div>
          `).join('')
        : App.UI.empty('Sin eventos próximos', 'El calendario está libre por ahora.', App.Icons.events());

      document.getElementById('announcement-important').innerHTML = important.length
        ? important.map((announcement) => `
            <div class="event-row">
              ${dateBadge(announcement.fechaPublicacion)}
              <div class="event-main">
                <strong>${escape(announcement.titulo)}</strong>
                <span>Publicado el ${escape(App.Utils.formatDate(announcement.fechaPublicacion))} · ${escape(announcement.autor || 'Administración')}</span>
              </div>
            </div>
          `).join('')
        : App.UI.empty('Sin avisos importantes', 'Marca un comunicado como importante para destacarlo.', App.Icons.star());
    }

    function draw() {
      drawHighlights();
      const list = filteredList();
      count.textContent = `${list.length} ${list.length === 1 ? 'comunicado' : 'comunicados'}`;

      if (!list.length) {
        listContainer.innerHTML = App.UI.empty(
          state.filter === 'important' ? 'Sin comunicados importantes' : 'Sin comunicados publicados',
          canManage ? 'Publica un nuevo comunicado para informar a la comunidad.' : 'Aún no hay comunicados disponibles.',
          App.Icons.megaphone()
        );
        return;
      }

      listContainer.innerHTML = list.map(card).join('');
    }

    function openForm(announcement) {
      const isEdit = Boolean(announcement);
      const data = announcement || {};

      App.UI.modal({
        title: isEdit ? 'Editar comunicado' : 'Nuevo comunicado',
        submitLabel: isEdit ? 'Guardar cambios' : 'Publicar comunicado',
        formHtml: `
          <div class="form-grid">
            <div class="field field-full">
              <label for="announcement-title">Título</label>
              <input type="text" id="announcement-title" name="titulo" maxlength="100" required value="${escape(data.titulo || '')}" placeholder="Ej. Reunión de líderes este domingo">
            </div>
            <div class="field">
              <label for="announcement-date">Fecha de publicación</label>
              <input type="date" id="announcement-date" name="fechaPublicacion" required value="${escape(data.fechaPublicacion || App.Utils.todayISO())}">
            </div>
            <div class="field field-check">
              <label class="check-row">
                <input type="checkbox" id="announcement-important" name="importante" ${data.importante ? 'checked' : ''}>
                <span>Marcar como importante</span>
              </label>
              <small class="field-hint">Los avisos importantes se destacan en el panel principal.</small>
            </div>
            <div class="field field-full">
              <label for="announcement-content">Contenido</label>
              <textarea id="announcement-content" name="contenido" rows="5" maxlength="800" required placeholder="Escribe el mensaje para la comunidad">${escape(data.contenido || '')}</textarea>
            </div>
          </div>
        `,
        onSubmit(formData) {
          if (isEdit) {
            App.Services.announcements.update(announcement.id, formData);
            App.UI.toast('Comunicado actualizado.');
          } else {
            App.Services.announcements.create(formData, App.Auth.current());
            App.UI.toast('Comunicado publicado.');
          }
          draw();
        }
      });
    }

    async function toggleImportant(announcement) {
      App.Services.announcements.toggleImportant(announcement.id);
      App.UI.toast(announcement.importante ? 'Se quitó la importancia del comunicado.' : 'Comunicado marcado como importante.');
      draw();
    }

    async function removeAnnouncement(announcement) {
      const confirmed = await App.UI.confirm({
        title: 'Eliminar comunicado',
        message: `¿Deseas eliminar <strong>${escape(announcement.titulo)}</strong>? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        danger: true
      });

      if (!confirmed) return;

      App.Services.announcements.remove(announcement.id);
      App.UI.toast('Comunicado eliminado.');
      draw();
    }

    filter.addEventListener('change', () => {
      state.filter = filter.value;
      draw();
    });

    if (canManage) {
      const newButton = document.getElementById('new-announcement');
      if (newButton) {
        newButton.addEventListener('click', () => openForm(null));
      }
    }

    listContainer.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const announcement = App.Services.announcements.get(button.dataset.id);
      if (!announcement) return;

      if (button.dataset.action === 'edit') openForm(announcement);
      if (button.dataset.action === 'toggle') toggleImportant(announcement);
      if (button.dataset.action === 'delete') removeAnnouncement(announcement);
    });

    draw();
  }
};

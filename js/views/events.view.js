App.Views = App.Views || {};

App.Views.events = {
  title: 'Eventos',

  render() {
    return `
      <div class="view-head">
        <div>
          <p class="eyebrow">RF-04 · Gestión de eventos</p>
          <h2>Calendario de eventos</h2>
          <p class="view-sub">Crea actividades religiosas y administrativas, asigna responsables y consulta el calendario.</p>
        </div>
        <button type="button" class="btn btn-primary" id="new-event">
          ${App.Icons.plus()}
          Nuevo evento
        </button>
      </div>

      <div class="events-layout">
        <div class="card calendar-card">
          <div class="calendar-head">
            <button type="button" class="icon-btn" id="cal-prev" aria-label="Mes anterior">${App.Icons.chevronLeft()}</button>
            <div class="calendar-title">
              <h3 id="cal-title"></h3>
              <span class="muted" id="cal-sub"></span>
            </div>
            <button type="button" class="icon-btn" id="cal-next" aria-label="Mes siguiente">${App.Icons.chevronRight()}</button>
          </div>
          <div class="calendar-weekdays">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>
          <div class="calendar-grid" id="calendar-grid"></div>
        </div>

        <div class="card">
          <div class="card-head">
            <h3>Eventos del mes</h3>
            <span class="badge" id="events-count"></span>
          </div>
          <div id="events-list" class="event-list"></div>
        </div>
      </div>
    `;
  },

  mount() {
    const escape = App.Utils.escapeHtml;
    const grid = document.getElementById('calendar-grid');
    const title = document.getElementById('cal-title');
    const subtitle = document.getElementById('cal-sub');
    const list = document.getElementById('events-list');
    const count = document.getElementById('events-count');

    const today = new Date();
    let cursor = new Date(today.getFullYear(), today.getMonth(), 1);

    function userOptions(selected) {
      const users = App.Repositories.users.all();
      const options = ['<option value="">Sin asignar</option>'];

      users.forEach((user) => {
        const isSelected = selected && App.Utils.normalize(selected) === App.Utils.normalize(user.nombre);
        options.push(
          `<option value="${escape(user.nombre)}" ${isSelected ? 'selected' : ''}>${escape(user.nombre)} · ${escape(App.Auth.roleLabel(user.rol))}</option>`
        );
      });

      return options.join('');
    }

    function openForm(eventItem, presetDate) {
      const isEdit = Boolean(eventItem);
      const data = eventItem || {};
      const ministryOptions = [
        '<option value="">Sin ministerio</option>',
        ...App.Services.ministries.list().map((ministry) => `
          <option value="${escape(ministry.id)}" ${data.ministerioId === ministry.id ? 'selected' : ''}>${escape(ministry.nombre)}</option>
        `)
      ].join('');

      App.UI.modal({
        title: isEdit ? 'Editar evento' : 'Nuevo evento',
        submitLabel: isEdit ? 'Guardar cambios' : 'Crear evento',
        formHtml: `
          <div class="form-grid">
            <div class="field field-full">
              <label for="event-title">Título</label>
              <input type="text" id="event-title" name="titulo" maxlength="90" required value="${escape(data.titulo || '')}" placeholder="Ej. Culto de adoración">
            </div>
            <div class="field">
              <label for="event-date">Fecha</label>
              <input type="date" id="event-date" name="fecha" required value="${escape(data.fecha || presetDate || App.Utils.todayISO())}">
            </div>
            <div class="field">
              <label for="event-time">Hora</label>
              <input type="time" id="event-time" name="hora" required value="${escape(data.hora || '10:00')}">
            </div>
            <div class="field">
              <label for="event-place">Lugar</label>
              <input type="text" id="event-place" name="lugar" maxlength="80" required value="${escape(data.lugar || '')}" placeholder="Ej. Templo principal">
            </div>
            <div class="field">
              <label for="event-type">Tipo</label>
              <select id="event-type" name="tipo">
                <option value="religioso" ${data.tipo !== 'administrativo' ? 'selected' : ''}>Religioso</option>
                <option value="administrativo" ${data.tipo === 'administrativo' ? 'selected' : ''}>Administrativo</option>
              </select>
            </div>
            <div class="field">
              <label for="event-ministry">Ministerio</label>
              <select id="event-ministry" name="ministerioId">${ministryOptions}</select>
            </div>
            <div class="field">
              <label for="event-owner">Responsable</label>
              <select id="event-owner" name="responsable">${userOptions(data.responsable)}</select>
            </div>
            <div class="field">
              <label for="event-status">Estado</label>
              <select id="event-status" name="estado">
                <option value="programado" ${data.estado !== 'cancelado' ? 'selected' : ''}>Programado</option>
                <option value="cancelado" ${data.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
              </select>
            </div>
            <div class="field field-full">
              <label for="event-description">Descripción</label>
              <textarea id="event-description" name="descripcion" rows="3" maxlength="300" placeholder="Detalles del evento">${escape(data.descripcion || '')}</textarea>
            </div>
          </div>
        `,
        onSubmit(formData) {
          if (isEdit) {
            App.Services.events.update(eventItem.id, formData);
            App.UI.toast('Evento actualizado.');
          } else {
            App.Services.events.create(formData);
            App.UI.toast('Evento creado.');
          }
          draw();
        }
      });
    }

    async function changeStatus(eventItem) {
      const cancel = eventItem.estado !== 'cancelado';

      const confirmed = await App.UI.confirm({
        title: cancel ? 'Cancelar evento' : 'Reactivar evento',
        message: cancel
          ? `¿Deseas cancelar <strong>${escape(eventItem.titulo)}</strong>? Seguirá visible en el calendario como cancelado.`
          : `¿Deseas reactivar <strong>${escape(eventItem.titulo)}</strong>?`,
        confirmLabel: cancel ? 'Cancelar evento' : 'Reactivar',
        danger: cancel
      });

      if (!confirmed) return;

      App.Services.events.setStatus(eventItem.id, cancel ? 'cancelado' : 'programado');
      App.UI.toast(cancel ? 'Evento cancelado.' : 'Evento reactivado.');
      draw();
    }

    function eventCard(eventItem) {
      const date = App.Utils.parseDate(eventItem.fecha);
      const isCancelled = eventItem.estado === 'cancelado';
      const ministry = eventItem.ministerioId
        ? App.Services.ministries.get(eventItem.ministerioId)
        : null;

      return `
        <div class="event-row ${isCancelled ? 'is-cancelled' : ''}">
          <div class="date-badge">
            <strong>${date ? date.getDate() : '—'}</strong>
            <small>${date ? date.toLocaleDateString('es-MX', { month: 'short' }) : ''}</small>
          </div>
          <div class="event-main">
            <strong>${escape(eventItem.titulo)}</strong>
            <span>${escape(eventItem.hora || '')} · ${escape(eventItem.lugar || 'Sin lugar')}${eventItem.responsable ? ' · ' + escape(eventItem.responsable) : ''}</span>
            <div class="event-tags">
              <span class="badge ${eventItem.tipo === 'administrativo' ? 'badge-violet' : 'badge-blue'}">${eventItem.tipo === 'administrativo' ? 'Administrativo' : 'Religioso'}</span>
              ${ministry ? `<span class="badge badge-gold">${escape(ministry.nombre)}</span>` : ''}
              ${App.UI.statusBadge(eventItem.estado)}
            </div>
          </div>
          <div class="event-actions">
            <button type="button" class="icon-btn" data-action="edit" data-id="${escape(eventItem.id)}" aria-label="Editar" title="Editar">${App.Icons.edit()}</button>
            <button type="button" class="icon-btn ${isCancelled ? 'icon-btn-success' : 'icon-btn-danger'}" data-action="status" data-id="${escape(eventItem.id)}" aria-label="${isCancelled ? 'Reactivar' : 'Cancelar'}" title="${isCancelled ? 'Reactivar' : 'Cancelar'}">
              ${isCancelled ? App.Icons.check() : App.Icons.x()}
            </button>
          </div>
        </div>
      `;
    }

    function draw() {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const events = App.Services.events.byMonth(year, month);

      title.textContent = App.Utils.monthLabel(
        `${year}-${App.Utils.pad2(month + 1)}`,
        { month: 'long', year: 'numeric' }
      );
      subtitle.textContent = `${events.length} ${events.length === 1 ? 'evento' : 'eventos'} programados`;
      count.textContent = String(events.length);

      const firstDay = new Date(year, month, 1);
      const offset = (firstDay.getDay() + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const todayISO = App.Utils.todayISO();

      let cells = '';

      for (let index = 0; index < offset; index += 1) {
        cells += '<div class="cal-day cal-day-empty"></div>';
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const iso = App.Utils.toISODate(new Date(year, month, day));
        const dayEvents = events.filter((eventItem) => eventItem.fecha === iso);

        cells += `
          <div class="cal-day ${iso === todayISO ? 'is-today' : ''}" data-date="${iso}">
            <span class="cal-day-num">${day}</span>
            <div class="cal-events">
              ${dayEvents.map((eventItem) => `
                <button type="button" class="cal-event ${eventItem.estado === 'cancelado' ? 'is-cancelled' : ''}" data-event="${escape(eventItem.id)}" title="${escape(eventItem.titulo)}">
                  ${escape(eventItem.titulo)}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      }

      grid.innerHTML = cells;

      if (!events.length) {
        list.innerHTML = App.UI.empty(
          'Sin eventos este mes',
          'Crea un nuevo evento o navega a otro mes.',
          App.Icons.events()
        );
        return;
      }

      list.innerHTML = events.map(eventCard).join('');
    }

    document.getElementById('cal-prev').addEventListener('click', () => {
      cursor = App.Utils.addMonths(cursor, -1);
      draw();
    });

    document.getElementById('cal-next').addEventListener('click', () => {
      cursor = App.Utils.addMonths(cursor, 1);
      draw();
    });

    document.getElementById('new-event').addEventListener('click', () => {
      openForm(null, null);
    });

    grid.addEventListener('click', (event) => {
      const chip = event.target.closest('button[data-event]');
      if (chip) {
        event.stopPropagation();
        const eventItem = App.Services.events.get(chip.dataset.event);
        if (eventItem) openForm(eventItem, null);
        return;
      }

      const cell = event.target.closest('.cal-day[data-date]');
      if (cell) openForm(null, cell.dataset.date);
    });

    list.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const eventItem = App.Services.events.get(button.dataset.id);
      if (!eventItem) return;

      if (button.dataset.action === 'edit') openForm(eventItem, null);
      if (button.dataset.action === 'status') changeStatus(eventItem);
    });

    draw();
  }
};

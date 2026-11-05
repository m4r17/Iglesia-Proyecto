App.Views = App.Views || {};

App.Views.attendance = {
  title: 'Asistencia',

  render() {
    return `
      <div class="view-head">
        <div>
          <p class="eyebrow">RF-03 · Control de asistencia</p>
          <h2>Registro de asistencia</h2>
          <p class="view-sub">Selecciona el evento y la fecha para marcar a los miembros presentes y ausentes.</p>
        </div>
        <button type="button" class="btn btn-primary" id="att-save">
          ${App.Icons.check()}
          Guardar asistencia
        </button>
      </div>

      <div class="grid grid-attendance">
        <div class="card">
          <div class="card-head">
            <h3>Lista de asistencia</h3>
            <span class="badge" id="att-badge">Nuevo registro</span>
          </div>

          <div class="form-grid form-grid-2">
            <div class="field">
              <label for="att-event">Evento</label>
              <select id="att-event"></select>
            </div>
            <div class="field">
              <label for="att-date">Fecha</label>
              <input type="date" id="att-date">
            </div>
          </div>

          <div class="att-toolbar">
            <div class="att-actions">
              <button type="button" class="btn btn-sm btn-ghost" id="att-all-present">Todos presentes</button>
              <button type="button" class="btn btn-sm btn-ghost" id="att-all-absent">Todos ausentes</button>
            </div>
            <span class="toolbar-meta" id="att-summary"></span>
          </div>

          <p class="inline-note" id="att-cancelled-note" hidden>El evento está cancelado: puedes consultar el registro, pero no guardar cambios.</p>

          <div id="att-list"></div>
        </div>

        <div class="card">
          <div class="card-head">
            <h3>Resumen de asistencia</h3>
          </div>
          <div id="att-report" class="report-stack"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <h3>Historial de asistencia</h3>
          <span class="badge" id="att-history-count"></span>
        </div>
        <div id="att-history"></div>
      </div>
    `;
  },

  mount() {
    const escape = App.Utils.escapeHtml;
    const eventSelect = document.getElementById('att-event');
    const dateInput = document.getElementById('att-date');
    const listContainer = document.getElementById('att-list');
    const summary = document.getElementById('att-summary');
    const badge = document.getElementById('att-badge');
    const saveButton = document.getElementById('att-save');
    const cancelledNote = document.getElementById('att-cancelled-note');
    const report = document.getElementById('att-report');
    const historyContainer = document.getElementById('att-history');
    const historyCount = document.getElementById('att-history-count');

    const events = App.Services.events.list();
    const activeMembers = App.Services.members.active();
    const present = new Set();

    eventSelect.innerHTML = events.map((eventItem) => `
      <option value="${escape(eventItem.id)}">
        ${escape(eventItem.titulo)} · ${escape(App.Utils.formatDate(eventItem.fecha))}${eventItem.estado === 'cancelado' ? ' (cancelado)' : ''}
      </option>
    `).join('');

    function currentEvent() {
      return App.Services.events.get(eventSelect.value);
    }

    function updateSaveState() {
      const eventItem = currentEvent();
      const blocked = !eventItem || eventItem.estado === 'cancelado' || !dateInput.value || !activeMembers.length;
      saveButton.disabled = blocked;
      cancelledNote.hidden = !eventItem || eventItem.estado !== 'cancelado';
    }

    function updateSummary() {
      const absent = Math.max(activeMembers.length - present.size, 0);
      summary.textContent = `${present.size} presentes · ${absent} ausentes de ${activeMembers.length}`;
    }

    function drawList() {
      if (!activeMembers.length) {
        listContainer.innerHTML = App.UI.empty(
          'Sin miembros activos',
          'Registra o reactiva miembros para tomar asistencia.',
          App.Icons.users()
        );
        updateSummary();
        return;
      }

      listContainer.innerHTML = `
        <div class="att-list">
          ${activeMembers.map((member) => {
            const isPresent = present.has(member.id);
            const ministries = App.Services.ministries.namesForMember(member.id).join(' · ');
            return `
              <label class="att-row ${isPresent ? 'is-present' : ''}">
                <span class="avatar avatar-sm">${escape(App.Utils.initials(member.nombre))}</span>
                <span class="att-name">
                  <strong>${escape(member.nombre)}</strong>
                  <span>${escape(ministries || member.telefono || '')}</span>
                </span>
                <span class="att-state">${isPresent ? 'Presente' : 'Ausente'}</span>
                <input type="checkbox" class="att-check" data-member="${escape(member.id)}" ${isPresent ? 'checked' : ''} aria-label="Marcar a ${escape(member.nombre)} como presente">
              </label>
            `;
          }).join('')}
        </div>
      `;

      updateSummary();
    }

    function loadRecord() {
      const eventItem = currentEvent();
      if (!eventItem || !dateInput.value) {
        present.clear();
        listContainer.innerHTML = App.UI.empty('Selecciona un evento', 'Elige un evento y una fecha para comenzar.');
        summary.textContent = '';
        badge.textContent = 'Sin evento';
        updateSaveState();
        return;
      }

      const record = App.Services.attendance.find(eventItem.id, dateInput.value);
      const activeIds = new Set(activeMembers.map((member) => member.id));

      present.clear();

      if (record) {
        record.registros.forEach((entry) => {
          if (entry.presente && activeIds.has(entry.memberId)) present.add(entry.memberId);
        });
      }

      badge.textContent = record ? 'Registro existente' : 'Nuevo registro';
      drawList();
      updateSaveState();
    }

    function eventName(eventId) {
      const eventItem = App.Services.events.get(eventId);
      return eventItem ? eventItem.titulo : 'Evento no encontrado';
    }

    function drawHistory() {
      const records = App.Services.attendance.records();
      historyCount.textContent = `${records.length} ${records.length === 1 ? 'registro' : 'registros'}`;

      if (!records.length) {
        historyContainer.innerHTML = App.UI.empty(
          'Sin asistencias registradas',
          'Guarda la primera lista de asistencia para ver el historial.',
          App.Icons.attendance()
        );
        return;
      }

      historyContainer.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Evento</th>
                <th>Presentes</th>
                <th>Ausentes</th>
                <th>Asistencia</th>
                <th class="align-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${records.map((record) => {
                const presentCount = App.Services.attendance.presentCount(record);
                const absentCount = App.Services.attendance.absentCount(record);
                const total = presentCount + absentCount;
                const percent = total ? Math.round((presentCount / total) * 100) : 0;

                return `
                  <tr>
                    <td>${escape(App.Utils.formatDate(record.fecha))}</td>
                    <td><strong class="cell-soft">${escape(eventName(record.eventId))}</strong></td>
                    <td><span class="badge badge-success">${presentCount}</span></td>
                    <td><span class="badge badge-muted">${absentCount}</span></td>
                    <td>${percent}%</td>
                    <td class="align-right">
                      <div class="row-actions">
                        <button type="button" class="icon-btn" data-action="view" data-id="${escape(record.id)}" aria-label="Ver registro" title="Ver registro">${App.Icons.search()}</button>
                        <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${escape(record.id)}" aria-label="Eliminar registro" title="Eliminar registro">${App.Icons.trash()}</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    function drawReport() {
      const todayISO = App.Utils.todayISO();
      const weekStart = App.Utils.toISODate(App.Utils.startOfWeek(todayISO));
      const weekEnd = App.Utils.toISODate(App.Utils.endOfWeek(todayISO));
      const weekRecords = App.Services.attendance.inRange(weekStart, weekEnd);
      const weekTotals = App.Services.attendance.totals(weekRecords);
      const month = App.Services.attendance.summaryForMonth(App.Utils.monthKey(todayISO));

      report.innerHTML = `
        <div class="report-block">
          <span class="report-label">Esta semana</span>
          <strong>${weekTotals.present} asistencias</strong>
          <p>${weekTotals.events} ${weekTotals.events === 1 ? 'evento registrado' : 'eventos registrados'} · ${weekTotals.absent} ausencias</p>
        </div>
        <div class="report-block">
          <span class="report-label">${escape(App.Utils.monthLabel(App.Utils.monthKey(todayISO)))}</span>
          <strong>${month.present} asistencias</strong>
          <p>${month.events} ${month.events === 1 ? 'evento registrado' : 'eventos registrados'} · promedio ${month.average} por evento</p>
        </div>
        <div class="report-block report-block-highlight">
          <span class="report-label">Reporte rápido</span>
          <p>Semanal: ${weekTotals.present} presentes en ${weekTotals.events} eventos.</p>
          <p>Mensual: ${month.present} presentes, ${month.absent} ausentes.</p>
        </div>
      `;
    }

    function initialize() {
      const upcoming = App.Services.events.upcoming(1)[0];
      const fallback = events[events.length - 1];
      const selected = upcoming || fallback;

      if (selected) {
        eventSelect.value = selected.id;
        dateInput.value = selected.fecha;
      } else {
        dateInput.value = App.Utils.todayISO();
        listContainer.innerHTML = App.UI.empty(
          'Sin eventos disponibles',
          'Crea un evento para poder registrar asistencia.',
          App.Icons.events()
        );
      }

      loadRecord();
      drawHistory();
      drawReport();
    }

    eventSelect.addEventListener('change', () => {
      const eventItem = currentEvent();
      if (eventItem) dateInput.value = eventItem.fecha;
      loadRecord();
    });

    dateInput.addEventListener('change', loadRecord);

    listContainer.addEventListener('change', (event) => {
      const checkbox = event.target.closest('input[data-member]');
      if (!checkbox) return;

      if (checkbox.checked) present.add(checkbox.dataset.member);
      else present.delete(checkbox.dataset.member);

      const row = checkbox.closest('.att-row');
      if (row) {
        row.classList.toggle('is-present', checkbox.checked);
        const state = row.querySelector('.att-state');
        if (state) state.textContent = checkbox.checked ? 'Presente' : 'Ausente';
      }

      updateSummary();
    });

    document.getElementById('att-all-present').addEventListener('click', () => {
      activeMembers.forEach((member) => present.add(member.id));
      drawList();
    });

    document.getElementById('att-all-absent').addEventListener('click', () => {
      present.clear();
      drawList();
    });

    saveButton.addEventListener('click', () => {
      const eventItem = currentEvent();
      if (!eventItem) {
        App.UI.toast('Selecciona un evento.', 'error');
        return;
      }
      if (eventItem.estado === 'cancelado') {
        App.UI.toast('No se puede guardar asistencia de un evento cancelado.', 'error');
        return;
      }
      if (!dateInput.value) {
        App.UI.toast('Selecciona una fecha.', 'error');
        return;
      }

      const registros = activeMembers.map((member) => ({
        memberId: member.id,
        presente: present.has(member.id)
      }));

      App.Services.attendance.save({
        eventId: eventItem.id,
        fecha: dateInput.value,
        registros
      });

      App.UI.toast(`Asistencia guardada: ${present.size} presentes.`);
      loadRecord();
      drawHistory();
      drawReport();
    });

    historyContainer.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const record = App.Services.attendance.get(button.dataset.id);
      if (!record) return;

      if (button.dataset.action === 'view') {
        eventSelect.value = record.eventId;
        dateInput.value = record.fecha;
        loadRecord();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (button.dataset.action === 'delete') {
        const confirmed = await App.UI.confirm({
          title: 'Eliminar registro',
          message: `¿Deseas eliminar el registro de asistencia del <strong>${escape(App.Utils.formatDate(record.fecha))}</strong> para <strong>${escape(eventName(record.eventId))}</strong>?`,
          confirmLabel: 'Eliminar',
          danger: true
        });

        if (!confirmed) return;

        App.Services.attendance.remove(record.id);
        App.UI.toast('Registro de asistencia eliminado.');
        loadRecord();
        drawHistory();
        drawReport();
      }
    });

    initialize();
  }
};

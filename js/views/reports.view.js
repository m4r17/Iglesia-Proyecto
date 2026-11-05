App.Views = App.Views || {};

App.Views.reports = {
  title: 'Reportes',

  render() {
    return `
      <div class="view-head">
        <div>
          <p class="eyebrow">RF-09 · Reportes</p>
          <h2>Reportes e informes</h2>
          <p class="view-sub">Consulta reportes de miembros, asistencia, ministerios e ingresos. Exporta a CSV o genera un PDF mediante impresión.</p>
        </div>
      </div>

      <div class="card report-shell">
        <div class="report-tabs" id="report-tabs"></div>

        <div class="report-toolbar">
          <div class="report-filters" id="report-filters"></div>
          <div class="report-actions">
            <button type="button" class="btn btn-ghost btn-sm" id="export-csv">
              ${App.Icons.download()}
              Exportar CSV
            </button>
            <button type="button" class="btn btn-ghost btn-sm" id="print-report">
              ${App.Icons.printer()}
              Imprimir / PDF
            </button>
          </div>
        </div>

        <div id="report-content"></div>
      </div>
    `;
  },

  mount() {
    const escape = App.Utils.escapeHtml;
    const tabsContainer = document.getElementById('report-tabs');
    const filtersContainer = document.getElementById('report-filters');
    const content = document.getElementById('report-content');
    const csvButton = document.getElementById('export-csv');
    const printButton = document.getElementById('print-report');

    const definitions = [
      { key: 'members', label: 'Miembros', description: 'Listado general', icon: 'users', module: 'members' },
      { key: 'attendance', label: 'Asistencia', description: 'Por evento', icon: 'attendance', module: 'attendance' },
      { key: 'ministries', label: 'Ministerios', description: 'Participación', icon: 'church', module: 'ministries' },
      { key: 'income', label: 'Ingresos', description: 'Por periodo', icon: 'donations', module: 'donations' }
    ];

    const reports = definitions.filter((definition) => App.Auth.can(definition.module));
    const today = App.Utils.todayISO();
    const currentMonth = App.Utils.monthKey(today);
    const firstOfMonth = `${currentMonth}-01`;

    const state = {
      active: reports.length ? reports[0].key : null,
      filters: {
        membersStatus: 'all',
        attendanceEvent: '',
        attendanceFrom: firstOfMonth,
        attendanceTo: today,
        ministryMonth: currentMonth,
        incomeFrom: firstOfMonth,
        incomeTo: today
      }
    };

    let currentReport = null;

    function reportDefinition(key) {
      return reports.find((definition) => definition.key === key);
    }

    function withinRange(value, from, to) {
      if (from && value < from) return false;
      if (to && value > to) return false;
      return true;
    }

    function eventName(eventId) {
      const eventItem = App.Services.events.get(eventId);
      return eventItem ? eventItem.titulo : 'Evento no encontrado';
    }

    function memberName(memberId) {
      const member = App.Services.members.get(memberId);
      return member ? member.nombre : 'Sin asociar';
    }

    function donorName(donation) {
      if (donation.anonimo || !donation.donanteId) return 'Anónimo';
      return memberName(donation.donanteId);
    }

    function statusLabel(value) {
      return value === 'activo' ? 'Activo' : value === 'inactivo' ? 'Inactivo' : value;
    }

    function displayValue(value, column) {
      if (value === null || value === undefined || value === '') return '—';
      if (column.type === 'date') return App.Utils.formatDate(value);
      if (column.type === 'money') return App.Utils.formatMoney(value);
      if (column.type === 'percent') return `${value}%`;
      if (column.type === 'method') return App.UI.methodLabel(value);
      if (column.type === 'status') return statusLabel(value);
      return String(value);
    }

    function exportValue(value, column) {
      if (value === null || value === undefined || value === '') return '';
      if (column.type === 'date') return value;
      if (column.type === 'money') return Number(value).toFixed(2);
      if (column.type === 'percent' || column.type === 'number') return String(value);
      if (column.type === 'method') return App.UI.methodLabel(value);
      if (column.type === 'status') return statusLabel(value);
      return String(value);
    }

    function cellHtml(value, column) {
      if (value === null || value === undefined || value === '') return '—';
      if (column.type === 'status') return App.UI.statusBadge(value);
      if (column.type === 'method') return `<span class="badge badge-blue">${escape(App.UI.methodLabel(value))}</span>`;
      return escape(displayValue(value, column));
    }

    function buildMembersReport() {
      const status = state.filters.membersStatus;
      const list = App.Services.members.list({ status });
      const counts = App.Services.members.counts();
      const withMinistry = list.filter((member) => App.Services.ministries.namesForMember(member.id).length > 0).length;
      const statusText = status === 'all' ? 'Todos los estados' : status === 'activo' ? 'Solo activos' : 'Solo inactivos';

      return {
        title: 'Reporte general de miembros',
        subtitle: `${statusText} · ${list.length} ${list.length === 1 ? 'registro' : 'registros'}`,
        columns: [
          { label: 'Miembro', type: 'text' },
          { label: 'Teléfono', type: 'text' },
          { label: 'Correo', type: 'text' },
          { label: 'Ingreso', type: 'date' },
          { label: 'Ministerios', type: 'text' },
          { label: 'Estado', type: 'status' }
        ],
        rows: list.map((member) => [
          member.nombre,
          member.telefono || '',
          member.correo || '',
          member.fechaIngreso,
          App.Services.ministries.namesForMember(member.id).join(', '),
          member.estado
        ]),
        summary: [
          { label: 'En el reporte', value: String(list.length) },
          { label: 'Activos', value: String(counts.activos) },
          { label: 'Inactivos', value: String(counts.inactivos) },
          { label: 'Con ministerio', value: String(withMinistry) }
        ],
        note: 'Incluye todos los miembros registrados; la desactivación no elimina el registro.'
      };
    }

    function buildAttendanceReport() {
      const eventId = state.filters.attendanceEvent;
      const from = state.filters.attendanceFrom;
      const to = state.filters.attendanceTo;
      let records = App.Services.attendance.records();

      if (eventId) records = records.filter((record) => record.eventId === eventId);
      records = records.filter((record) => withinRange(record.fecha, from, to));

      let present = 0;
      let absent = 0;

      const rows = records.map((record) => {
        const recordPresent = App.Services.attendance.presentCount(record);
        const recordAbsent = App.Services.attendance.absentCount(record);
        const total = recordPresent + recordAbsent;
        const percent = total ? Math.round((recordPresent / total) * 100) : 0;
        present += recordPresent;
        absent += recordAbsent;

        return [
          record.fecha,
          eventName(record.eventId),
          recordPresent,
          recordAbsent,
          total,
          percent
        ];
      });

      const period = from || to
        ? `${from ? `Desde ${App.Utils.formatDate(from)}` : 'Sin fecha inicial'} · ${to ? `Hasta ${App.Utils.formatDate(to)}` : 'Sin fecha final'}`
        : 'Todo el periodo';

      return {
        title: 'Reporte de asistencia por evento',
        subtitle: `${eventId ? eventName(eventId) : 'Todos los eventos'} · ${period}`,
        columns: [
          { label: 'Fecha', type: 'date' },
          { label: 'Evento', type: 'text' },
          { label: 'Presentes', type: 'number', align: 'right' },
          { label: 'Ausentes', type: 'number', align: 'right' },
          { label: 'Total', type: 'number', align: 'right' },
          { label: 'Asistencia', type: 'percent', align: 'right' }
        ],
        rows,
        summary: [
          { label: 'Eventos registrados', value: String(records.length) },
          { label: 'Presentes', value: String(present) },
          { label: 'Ausentes', value: String(absent) },
          { label: 'Promedio por evento', value: records.length ? String(Math.round((present / records.length) * 10) / 10) : '0' }
        ],
        note: 'El porcentaje se calcula con los registros de asistencia guardados para cada evento y fecha.'
      };
    }

    function buildMinistriesReport() {
      const month = state.filters.ministryMonth;
      const events = App.Services.events.list().filter((eventItem) => {
        if (eventItem.estado === 'cancelado') return false;
        return !month || String(eventItem.fecha).slice(0, 7) === month;
      });
      const records = App.Services.attendance.records().filter(
        (record) => !month || String(record.fecha).slice(0, 7) === month
      );

      const rows = App.Services.ministries.list().map((ministry) => {
        const memberIds = new Set(ministry.miembros || []);
        const coordinator = App.Services.ministries.coordinator(ministry);
        const activities = events.filter((eventItem) => eventItem.ministerioId === ministry.id).length;
        const present = records.reduce((sum, record) => (
          sum + record.registros.filter((entry) => entry.presente && memberIds.has(entry.memberId)).length
        ), 0);
        const average = activities ? Math.round((present / activities) * 10) / 10 : 0;

        return [
          ministry.nombre,
          coordinator ? coordinator.nombre : 'Sin coordinador',
          memberIds.size,
          activities,
          present,
          average
        ];
      });

      const stats = App.Services.ministries.stats();
      const totalActivities = rows.reduce((sum, row) => sum + Number(row[3]), 0);
      const totalPresent = rows.reduce((sum, row) => sum + Number(row[4]), 0);
      const period = month ? App.Utils.monthLabel(month) : 'Todo el periodo';

      return {
        title: 'Reporte de participación por ministerio',
        subtitle: period,
        columns: [
          { label: 'Ministerio', type: 'text' },
          { label: 'Coordinador', type: 'text' },
          { label: 'Integrantes', type: 'number', align: 'right' },
          { label: 'Actividades', type: 'number', align: 'right' },
          { label: 'Asistencias', type: 'number', align: 'right' },
          { label: 'Promedio', type: 'number', align: 'right' }
        ],
        rows,
        summary: [
          { label: 'Ministerios', value: String(stats.total) },
          { label: 'Miembros vinculados', value: String(stats.linked) },
          { label: 'Actividades', value: String(totalActivities) },
          { label: 'Asistencias', value: String(totalPresent) }
        ],
        note: 'Un miembro puede pertenecer a varios ministerios, por lo que sus asistencias pueden contarse en más de uno.'
      };
    }

    function buildIncomeReport() {
      const from = state.filters.incomeFrom;
      const to = state.filters.incomeTo;
      const list = App.Services.donations.list().filter(
        (donation) => withinRange(donation.fecha, from, to)
      );
      const total = App.Services.donations.total(list);
      const anonymous = list.filter((donation) => donation.anonimo || !donation.donanteId).length;
      const period = from || to
        ? `${from ? `Desde ${App.Utils.formatDate(from)}` : 'Sin fecha inicial'} · ${to ? `Hasta ${App.Utils.formatDate(to)}` : 'Sin fecha final'}`
        : 'Todo el periodo';

      return {
        title: 'Reporte de ingresos por periodo',
        subtitle: period,
        columns: [
          { label: 'Fecha', type: 'date' },
          { label: 'Donante', type: 'text' },
          { label: 'Concepto', type: 'text' },
          { label: 'Método', type: 'method' },
          { label: 'Monto', type: 'money', align: 'right' }
        ],
        rows: list.map((donation) => [
          donation.fecha,
          donorName(donation),
          donation.concepto || 'Aportación',
          donation.metodo,
          donation.monto
        ]),
        summary: [
          { label: 'Total', value: App.Utils.formatMoney(total) },
          { label: 'Aportaciones', value: String(list.length) },
          { label: 'Promedio', value: App.Utils.formatMoney(list.length ? total / list.length : 0) },
          { label: 'Anónimas', value: String(anonymous) }
        ],
        note: 'Las aportaciones anónimas se incluyen en los totales sin asociarse a un miembro.'
      };
    }

    function buildReport() {
      if (!state.active) return null;

      if (state.active === 'members') return buildMembersReport();
      if (state.active === 'attendance') return buildAttendanceReport();
      if (state.active === 'ministries') return buildMinistriesReport();
      if (state.active === 'income') return buildIncomeReport();
      return null;
    }

    function drawTabs() {
      tabsContainer.innerHTML = reports.map((definition) => `
        <button type="button" class="report-tab ${state.active === definition.key ? 'is-active' : ''}" data-report="${definition.key}">
          <span class="report-tab-icon">${App.Icons[definition.icon]()}</span>
          <span class="report-tab-text">
            <strong>${escape(definition.label)}</strong>
            <small>${escape(definition.description)}</small>
          </span>
        </button>
      `).join('');
    }

    function optionsMarkup(options, selected) {
      return options.map((option) => `
        <option value="${escape(option.value)}" ${option.value === selected ? 'selected' : ''}>${escape(option.label)}</option>
      `).join('');
    }

    function drawFilters() {
      if (state.active === 'members') {
        filtersContainer.innerHTML = `
          <div class="field field-inline">
            <label for="report-member-status">Estado</label>
            <select id="report-member-status" data-filter="membersStatus">
              ${optionsMarkup([
                { value: 'all', label: 'Todos' },
                { value: 'activo', label: 'Activos' },
                { value: 'inactivo', label: 'Inactivos' }
              ], state.filters.membersStatus)}
            </select>
          </div>
        `;
        return;
      }

      if (state.active === 'attendance') {
        const events = App.Services.events.list().map((eventItem) => ({
          value: eventItem.id,
          label: `${eventItem.titulo} · ${App.Utils.formatDate(eventItem.fecha)}`
        }));

        filtersContainer.innerHTML = `
          <div class="field field-inline">
            <label for="report-attendance-event">Evento</label>
            <select id="report-attendance-event" data-filter="attendanceEvent">
              ${optionsMarkup([{ value: '', label: 'Todos los eventos' }, ...events], state.filters.attendanceEvent)}
            </select>
          </div>
          <div class="field field-inline">
            <label for="report-attendance-from">Desde</label>
            <input type="date" id="report-attendance-from" data-filter="attendanceFrom" value="${escape(state.filters.attendanceFrom)}">
          </div>
          <div class="field field-inline">
            <label for="report-attendance-to">Hasta</label>
            <input type="date" id="report-attendance-to" data-filter="attendanceTo" value="${escape(state.filters.attendanceTo)}">
          </div>
          <button type="button" class="btn btn-sm btn-ghost" data-clear="attendanceFrom,attendanceTo">Todo el periodo</button>
        `;
        return;
      }

      if (state.active === 'ministries') {
        filtersContainer.innerHTML = `
          <div class="field field-inline">
            <label for="report-ministry-month">Periodo</label>
            <input type="month" id="report-ministry-month" data-filter="ministryMonth" value="${escape(state.filters.ministryMonth)}">
          </div>
          <button type="button" class="btn btn-sm btn-ghost" data-clear="ministryMonth">Todo el periodo</button>
        `;
        return;
      }

      filtersContainer.innerHTML = `
        <div class="field field-inline">
          <label for="report-income-from">Desde</label>
          <input type="date" id="report-income-from" data-filter="incomeFrom" value="${escape(state.filters.incomeFrom)}">
        </div>
        <div class="field field-inline">
          <label for="report-income-to">Hasta</label>
          <input type="date" id="report-income-to" data-filter="incomeTo" value="${escape(state.filters.incomeTo)}">
        </div>
        <button type="button" class="btn btn-sm btn-ghost" data-clear="incomeFrom,incomeTo">Todo el periodo</button>
      `;
    }

    function drawContent(report) {
      if (!report) {
        content.innerHTML = App.UI.empty(
          'Sin reportes disponibles',
          'Tu rol no tiene permisos para consultar reportes en este momento.',
          App.Icons.chart()
        );
        return;
      }

      const summaryHtml = report.summary.map((item) => `
        <div class="report-summary-item">
          <span>${escape(item.label)}</span>
          <strong>${escape(item.value)}</strong>
        </div>
      `).join('');

      const tableHtml = report.rows.length
        ? `
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  ${report.columns.map((column) => `<th class="${column.align === 'right' ? 'align-right' : ''}">${escape(column.label)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${report.rows.map((row) => `
                  <tr>
                    ${report.columns.map((column, index) => `<td class="${column.align === 'right' ? 'align-right' : ''}">${cellHtml(row[index], column)}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `
        : App.UI.empty(
            'Sin datos para el periodo',
            'Ajusta los filtros para consultar otros registros.',
            App.Icons.inbox()
          );

      content.innerHTML = `
        <div class="report-document-head">
          <div>
            <h3>${escape(report.title)}</h3>
            <p>${escape(report.subtitle)}</p>
          </div>
          <span class="badge">${report.rows.length} ${report.rows.length === 1 ? 'fila' : 'filas'}</span>
        </div>
        <div class="report-summary">${summaryHtml}</div>
        ${tableHtml}
        <p class="report-note">${escape(report.note)}</p>
      `;
    }

    function drawReport() {
      drawTabs();
      drawFilters();

      currentReport = buildReport();
      drawContent(currentReport);

      const hasRows = Boolean(currentReport && currentReport.rows.length);
      csvButton.disabled = !hasRows;
      printButton.disabled = !hasRows;
    }

    function slug(text) {
      return App.Utils.normalize(text)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'reporte';
    }

    function csvCell(value) {
      let text = String(value == null ? '' : value);
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    }

    function exportCsv() {
      if (!currentReport || !currentReport.rows.length) return;

      const lines = [
        currentReport.columns.map((column) => column.label),
        ...currentReport.rows.map((row) => currentReport.columns.map((column, index) => exportValue(row[index], column)))
      ];

      const csv = `\ufeff${lines.map((line) => line.map(csvCell).join(';')).join('\r\n')}`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `${slug(currentReport.title)}_${App.Utils.todayISO()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 800);
      App.UI.toast('Reporte exportado en CSV.');
    }

    function printTable(report) {
      return `
        <table>
          <thead>
            <tr>${report.columns.map((column) => `<th class="${column.align === 'right' ? 'right' : ''}">${escape(column.label)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${report.rows.map((row) => `
              <tr>${report.columns.map((column, index) => `<td class="${column.align === 'right' ? 'right' : ''}">${escape(displayValue(row[index], column))}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    function printReport() {
      if (!currentReport || !currentReport.rows.length) return;

      const church = App.Services.church.get();
      const printWindow = window.open('', '_blank', 'width=980,height=760');

      if (!printWindow) {
        App.UI.toast('Permite las ventanas emergentes para generar el PDF.', 'error');
        return;
      }

      const logo = church.logo
        ? `<img class="print-logo" src="${escape(church.logo)}" alt="Logotipo">`
        : '';

      const summary = currentReport.summary.map((item) => `
        <div class="summary-item">
          <span>${escape(item.label)}</span>
          <strong>${escape(item.value)}</strong>
        </div>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>${escape(currentReport.title)}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #1b2432; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 12px; }
            .print-head { display: flex; align-items: center; gap: 14px; padding-bottom: 14px; border-bottom: 2px solid #14213d; margin-bottom: 18px; }
            .print-logo { width: 54px; height: 54px; object-fit: contain; border-radius: 10px; }
            .print-church { flex: 1; }
            .print-church strong { display: block; font-size: 16px; }
            .print-church span { display: block; color: #5c6878; font-size: 10px; margin-top: 2px; }
            h1 { font-size: 19px; margin: 0 0 4px; }
            .subtitle { color: #5c6878; margin: 0 0 16px; font-size: 11px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
            .summary-item { border: 1px solid #dbe2ea; border-radius: 8px; padding: 9px; background: #f8fafc; }
            .summary-item span { display: block; color: #5c6878; text-transform: uppercase; letter-spacing: .05em; font-size: 8px; margin-bottom: 4px; }
            .summary-item strong { font-size: 15px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #eef2f7; text-align: left; text-transform: uppercase; letter-spacing: .05em; font-size: 8.5px; color: #4a5565; padding: 7px 8px; border-bottom: 1px solid #cfd8e3; }
            td { padding: 7px 8px; border-bottom: 1px solid #e8edf3; font-size: 10px; }
            tbody tr:nth-child(even) { background: #fafbfd; }
            .right { text-align: right; }
            .note { margin-top: 14px; color: #5c6878; font-size: 9.5px; }
            .print-foot { margin-top: 22px; padding-top: 10px; border-top: 1px solid #dbe2ea; color: #7b8797; font-size: 9px; display: flex; justify-content: space-between; gap: 10px; }
          </style>
        </head>
        <body>
          <div class="print-head">
            ${logo}
            <div class="print-church">
              <strong>${escape(church.name)}</strong>
              <span>${escape(church.address || '')}${church.phone ? ` · ${escape(church.phone)}` : ''}${church.email ? ` · ${escape(church.email)}` : ''}</span>
            </div>
          </div>
          <h1>${escape(currentReport.title)}</h1>
          <p class="subtitle">${escape(currentReport.subtitle)}</p>
          <div class="summary">${summary}</div>
          ${printTable(currentReport)}
          <p class="note">${escape(currentReport.note)}</p>
          <div class="print-foot">
            <span>Generado el ${escape(App.Utils.formatLongDate(App.Utils.todayISO()))}</span>
            <span>${escape(church.slogan || '')}</span>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      window.setTimeout(() => printWindow.print(), 350);
    }

    tabsContainer.addEventListener('click', (event) => {
      const tab = event.target.closest('button[data-report]');
      if (!tab) return;
      state.active = tab.dataset.report;
      drawReport();
    });

    filtersContainer.addEventListener('change', (event) => {
      const key = event.target.dataset.filter;
      if (!key) return;
      state.filters[key] = event.target.value;
      drawReport();
    });

    filtersContainer.addEventListener('click', (event) => {
      const clearButton = event.target.closest('button[data-clear]');
      if (!clearButton) return;
      clearButton.dataset.clear.split(',').forEach((key) => {
        state.filters[key] = '';
      });
      drawReport();
    });

    csvButton.addEventListener('click', exportCsv);
    printButton.addEventListener('click', printReport);

    if (!reports.length) {
      tabsContainer.innerHTML = '';
      filtersContainer.innerHTML = '';
      content.innerHTML = App.UI.empty(
        'Sin reportes disponibles',
        'Tu rol no tiene permisos para consultar reportes.',
        App.Icons.chart()
      );
      csvButton.disabled = true;
      printButton.disabled = true;
      return;
    }

    drawReport();
  }
};

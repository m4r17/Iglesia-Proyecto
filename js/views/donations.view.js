App.Views = App.Views || {};

App.Views.donations = {
  title: 'Donaciones',

  render() {
    const canManage = App.Auth.canManage('donations');

    return `
      <div class="view-head">
        <div>
          <p class="eyebrow">RF-06 · Donaciones y aportaciones</p>
          <h2>Control de ingresos</h2>
          <p class="view-sub">Registra aportaciones, consulta ingresos por periodos y permite registros anónimos.</p>
        </div>
        ${canManage ? `
          <button type="button" class="btn btn-primary" id="new-donation">
            ${App.Icons.plus()}
            Nueva aportación
          </button>
        ` : '<span class="badge badge-muted">Solo consulta</span>'}
      </div>

      <div class="grid grid-stats">
        <article class="stat-card">
          <div class="stat-icon stat-icon-teal">${App.Icons.donations()}</div>
          <span class="stat-label">Ingresos del mes</span>
          <strong class="stat-value" id="don-total-month">—</strong>
          <span class="stat-foot" id="don-count-month"></span>
        </article>
        <article class="stat-card">
          <div class="stat-icon stat-icon-blue">${App.Icons.chart()}</div>
          <span class="stat-label">Ingresos del año</span>
          <strong class="stat-value" id="don-total-year">—</strong>
          <span class="stat-foot" id="don-count-year"></span>
        </article>
        <article class="stat-card">
          <div class="stat-icon stat-icon-gold">${App.Icons.inbox()}</div>
          <span class="stat-label">Aportaciones registradas</span>
          <strong class="stat-value" id="don-total-count">—</strong>
          <span class="stat-foot">Historial completo</span>
        </article>
        <article class="stat-card">
          <div class="stat-icon stat-icon-violet">${App.Icons.chart()}</div>
          <span class="stat-label">Promedio por aportación</span>
          <strong class="stat-value" id="don-average">—</strong>
          <span class="stat-foot">Sobre el total histórico</span>
        </article>
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="field field-inline">
            <label for="don-month">Periodo</label>
            <input type="month" id="don-month">
          </div>
          <div class="field field-inline">
            <label for="don-method">Método</label>
            <select id="don-method">
              <option value="all">Todos los métodos</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <button type="button" class="btn btn-sm btn-ghost" id="don-clear">Ver todo</button>
          <span class="toolbar-meta" id="don-filter-meta"></span>
        </div>
        <div id="donations-table"></div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-head">
            <h3 id="don-summary-title">Resumen mensual</h3>
          </div>
          <div id="don-monthly"></div>
        </div>
        <div class="card chart-card">
          <div class="card-head">
            <h3>Distribución por método</h3>
            <span class="muted" id="don-chart-meta"></span>
          </div>
          <canvas id="don-method-chart"></canvas>
        </div>
      </div>
    `;
  },

  mount() {
    const escape = App.Utils.escapeHtml;
    const state = { month: '', method: 'all' };
    const canManage = App.Auth.canManage('donations');

    const tableContainer = document.getElementById('donations-table');
    const monthlyContainer = document.getElementById('don-monthly');
    const summaryTitle = document.getElementById('don-summary-title');
    const filterMeta = document.getElementById('don-filter-meta');
    const chartCanvas = document.getElementById('don-method-chart');
    const chartMeta = document.getElementById('don-chart-meta');
    const monthInput = document.getElementById('don-month');
    const methodSelect = document.getElementById('don-method');

    function memberName(memberId) {
      const member = App.Services.members.get(memberId);
      return member ? member.nombre : 'Sin asociar';
    }

    function donorLabel(donation) {
      if (donation.anonimo || !donation.donanteId) {
        return '<span class="badge badge-muted">Anónimo</span>';
      }
      return `<strong class="cell-soft">${escape(memberName(donation.donanteId))}</strong>`;
    }

    function drawKpis() {
      const currentMonth = App.Utils.monthKey(App.Utils.todayISO());
      const currentYear = new Date().getFullYear();
      const monthTotals = App.Services.donations.totalsForMonth(currentMonth);
      const yearTotals = App.Services.donations.totalsForYear(currentYear);
      const all = App.Services.donations.list();

      document.getElementById('don-total-month').textContent = App.Utils.formatMoney(monthTotals.total);
      document.getElementById('don-count-month').textContent = `${monthTotals.count} ${monthTotals.count === 1 ? 'aportación' : 'aportaciones'}`;
      document.getElementById('don-total-year').textContent = App.Utils.formatMoney(yearTotals.total);
      document.getElementById('don-count-year').textContent = `${yearTotals.count} ${yearTotals.count === 1 ? 'aportación' : 'aportaciones'}`;
      document.getElementById('don-total-count').textContent = String(all.length);
      document.getElementById('don-average').textContent = all.length
        ? App.Utils.formatMoney(App.Services.donations.total(all) / all.length)
        : App.Utils.formatMoney(0);
    }

    function drawTable() {
      const list = App.Services.donations.list(state);
      const total = App.Services.donations.total(list);

      filterMeta.textContent = `${list.length} ${list.length === 1 ? 'registro' : 'registros'} · ${App.Utils.formatMoney(total)}`;

      if (!list.length) {
        tableContainer.innerHTML = App.UI.empty(
          'Sin aportaciones en este periodo',
          'Cambia el filtro o registra una nueva aportación.',
          App.Icons.donations()
        );
        return;
      }

      tableContainer.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Donante</th>
                <th>Concepto</th>
                <th>Método</th>
                <th class="align-right">Monto</th>
                <th class="align-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((donation) => `
                <tr>
                  <td>${escape(App.Utils.formatDate(donation.fecha))}</td>
                  <td>${donorLabel(donation)}</td>
                  <td>${escape(donation.concepto || '—')}</td>
                  <td><span class="badge badge-blue">${escape(App.UI.methodLabel(donation.metodo))}</span></td>
                  <td class="align-right money">${escape(App.Utils.formatMoney(donation.monto))}</td>
                  <td class="align-right">
                    ${canManage ? `<div class="row-actions">
                      <button type="button" class="icon-btn" data-action="edit" data-id="${escape(donation.id)}" aria-label="Editar" title="Editar">${App.Icons.edit()}</button>
                      <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${escape(donation.id)}" aria-label="Eliminar" title="Eliminar">${App.Icons.trash()}</button>
                    </div>` : '—'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    function drawMonthlySummary() {
      const year = state.month
        ? Number(state.month.slice(0, 4))
        : new Date().getFullYear();
      const months = App.Services.donations.monthlySummary(year);
      const total = months.reduce((sum, month) => sum + month.total, 0);
      const currentMonth = App.Utils.monthKey(App.Utils.todayISO());

      summaryTitle.textContent = `Resumen mensual · ${year}`;

      monthlyContainer.innerHTML = `
        <div class="table-wrap">
          <table class="table table-compact">
            <thead>
              <tr>
                <th>Mes</th>
                <th class="align-right">Aportaciones</th>
                <th class="align-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${months.map((month) => `
                <tr class="${month.key === currentMonth ? 'row-highlight' : ''}">
                  <td>${escape(month.label)}</td>
                  <td class="align-right">${month.count}</td>
                  <td class="align-right money">${escape(App.Utils.formatMoney(month.total))}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th>Total</th>
                <th class="align-right">${months.reduce((sum, month) => sum + month.count, 0)}</th>
                <th class="align-right money">${escape(App.Utils.formatMoney(total))}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }

    function drawChart() {
      const list = App.Services.donations.list(state);
      const groups = App.Services.donations.byMethod(list);
      const colors = {
        efectivo: '#1f8a5b',
        transferencia: '#2f5d8a',
        tarjeta: '#c8a24a',
        otro: '#6d5bb8'
      };

      chartMeta.textContent = `${App.Utils.formatMoney(App.Services.donations.total(list))} filtrados`;
      const moneyCompact = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        notation: 'compact',
        maximumFractionDigits: 1
      });

      App.Charts.donut(chartCanvas, groups.map((group) => ({
        label: App.UI.methodLabel(group.method),
        value: group.total,
        color: colors[group.method]
      })), {
        formatter: (value) => moneyCompact.format(value)
      });
    }

    function openForm(donation) {
      const isEdit = Boolean(donation);
      const data = donation || {};
      const members = App.Services.members.all().slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

      const donorOptions = [
        '<option value="">Sin asociar</option>',
        ...members.map((member) => `
          <option value="${escape(member.id)}" ${data.donanteId === member.id ? 'selected' : ''}>
            ${escape(member.nombre)}${member.estado === 'inactivo' ? ' (inactivo)' : ''}
          </option>
        `)
      ].join('');

      const form = App.UI.modal({
        title: isEdit ? 'Editar aportación' : 'Nueva aportación',
        submitLabel: isEdit ? 'Guardar cambios' : 'Registrar aportación',
        formHtml: `
          <div class="form-grid">
            <div class="field">
              <label for="donation-date">Fecha</label>
              <input type="date" id="donation-date" name="fecha" required value="${escape(data.fecha || App.Utils.todayISO())}">
            </div>
            <div class="field">
              <label for="donation-amount">Monto (MXN)</label>
              <input type="number" id="donation-amount" name="monto" min="0.01" step="0.01" required value="${data.monto != null ? escape(data.monto) : ''}" placeholder="0.00">
            </div>
            <div class="field field-full">
              <label for="donation-concept">Concepto</label>
              <input type="text" id="donation-concept" name="concepto" maxlength="80" required value="${escape(data.concepto || '')}" placeholder="Ej. Diezmo, ofrenda, donativo especial">
            </div>
            <div class="field">
              <label for="donation-method">Método de recepción</label>
              <select id="donation-method" name="metodo">
                <option value="efectivo" ${data.metodo === 'efectivo' || !data.metodo ? 'selected' : ''}>Efectivo</option>
                <option value="transferencia" ${data.metodo === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                <option value="tarjeta" ${data.metodo === 'tarjeta' ? 'selected' : ''}>Tarjeta</option>
                <option value="otro" ${data.metodo === 'otro' ? 'selected' : ''}>Otro</option>
              </select>
            </div>
            <div class="field">
              <label for="donation-donor">Donante</label>
              <select id="donation-donor" name="donanteId">${donorOptions}</select>
            </div>
            <div class="field field-full">
              <label class="check-row">
                <input type="checkbox" id="donation-anonymous" name="anonimo" ${data.anonimo ? 'checked' : ''}>
                <span>Registrar como anónimo</span>
              </label>
              <small class="field-hint">El registro anónimo no se asocia a ningún miembro.</small>
            </div>
          </div>
        `,
        onSubmit(formData) {
          if (isEdit) {
            App.Services.donations.update(donation.id, formData);
            App.UI.toast('Aportación actualizada.');
          } else {
            App.Services.donations.create(formData);
            App.UI.toast('Aportación registrada.');
          }
          drawAll();
        }
      });

      const anonymous = form.querySelector('#donation-anonymous');
      const donor = form.querySelector('#donation-donor');

      function syncDonorField() {
        donor.disabled = anonymous.checked;
        if (anonymous.checked) donor.value = '';
      }

      anonymous.addEventListener('change', syncDonorField);
      syncDonorField();
    }

    async function removeDonation(donation) {
      const confirmed = await App.UI.confirm({
        title: 'Eliminar aportación',
        message: `¿Deseas eliminar la aportación de <strong>${escape(App.Utils.formatMoney(donation.monto))}</strong> del <strong>${escape(App.Utils.formatDate(donation.fecha))}</strong>?`,
        confirmLabel: 'Eliminar',
        danger: true
      });

      if (!confirmed) return;

      App.Services.donations.remove(donation.id);
      App.UI.toast('Aportación eliminada.');
      drawAll();
    }

    function drawAll() {
      drawKpis();
      drawTable();
      drawMonthlySummary();
      drawChart();
    }

    monthInput.addEventListener('change', () => {
      state.month = monthInput.value;
      drawTable();
      drawMonthlySummary();
      drawChart();
    });

    methodSelect.addEventListener('change', () => {
      state.method = methodSelect.value;
      drawTable();
      drawChart();
    });

    document.getElementById('don-clear').addEventListener('click', () => {
      state.month = '';
      state.method = 'all';
      monthInput.value = '';
      methodSelect.value = 'all';
      drawTable();
      drawMonthlySummary();
      drawChart();
    });

    const newButton = document.getElementById('new-donation');
    if (newButton) newButton.addEventListener('click', () => openForm(null));

    tableContainer.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button || !canManage) return;

      const donation = App.Services.donations.get(button.dataset.id);
      if (!donation) return;

      if (button.dataset.action === 'edit') openForm(donation);
      if (button.dataset.action === 'delete') removeDonation(donation);
    });

    drawAll();
  }
};

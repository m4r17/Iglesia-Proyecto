App.Views = App.Views || {};

App.Views.dashboard = {
  title: 'Panel principal',

  render() {
    const escape = App.Utils.escapeHtml;
    const user = App.Auth.current();
    const canFinance = App.Auth.can('donations');
    const todayISO = App.Utils.todayISO();
    const currentMonth = App.Utils.monthKey(todayISO);

    const memberCounts = App.Services.members.counts();
    const upcomingEvents = App.Services.events.upcoming(5);
    const attendanceMonth = App.Services.attendance.totalPresentInMonth(currentMonth);
    const ministries = App.Repositories.ministries.all().length;
    const incomeMonth = App.Services.donations.totalsForMonth(currentMonth);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

    const statCards = [
      {
        label: 'Miembros activos',
        value: memberCounts.activos,
        foot: `${memberCounts.total} registrados en total`,
        icon: 'users',
        tone: 'blue'
      },
      {
        label: 'Eventos próximos',
        value: upcomingEvents.length,
        foot: 'programados a partir de hoy',
        icon: 'events',
        tone: 'gold'
      },
      {
        label: 'Asistencias del mes',
        value: attendanceMonth,
        foot: `presencias en ${App.Utils.monthLabel(currentMonth)}`,
        icon: 'attendance',
        tone: 'green'
      },
      {
        label: 'Ministerios',
        value: ministries,
        foot: 'grupos de trabajo registrados',
        icon: 'church',
        tone: 'violet'
      }
    ];

    if (canFinance) {
      statCards.push({
        label: 'Ingresos del mes',
        value: App.Utils.formatMoney(incomeMonth.total),
        foot: `${incomeMonth.count} ${incomeMonth.count === 1 ? 'aportación' : 'aportaciones'}`,
        icon: 'donations',
        tone: 'teal'
      });
    }

    const quickLinks = [
      { path: '/miembros', label: 'Consultar miembros', icon: 'users', module: 'members' },
      { path: '/asistencia', label: 'Tomar asistencia', icon: 'attendance', module: 'attendance' },
      { path: '/eventos', label: 'Ver calendario', icon: 'events', module: 'events' },
      { path: '/ministerios', label: 'Gestionar ministerios', icon: 'church', module: 'ministries' },
      { path: '/comunicados', label: 'Ver comunicados', icon: 'megaphone', module: 'announcements' },
      { path: '/donaciones', label: 'Registrar aportación', icon: 'donations', module: 'donations' }
    ].filter((link) => App.Auth.can(link.module));

    const importantAnnouncements = App.Services.announcements.latest(3, true);
    const announcements = importantAnnouncements.length
      ? importantAnnouncements
      : App.Services.announcements.latest(3, false);
    const hasImportant = importantAnnouncements.length > 0;

    return `
      <div class="view-head">
        <div>
          <p class="eyebrow">RF-08 · Panel principal</p>
          <h2>${greeting}, ${escape(App.Utils.firstName(user.nombre))}</h2>
          <p class="view-sub">${escape(App.Utils.formatLongDate(todayISO))} · ${escape(App.Services.church.name())}</p>
        </div>
        <span class="badge badge-role">${escape(App.Auth.roleLabel(user.rol))}</span>
      </div>

      <div class="grid grid-stats">
        ${statCards.map((card) => `
          <article class="stat-card">
            <div class="stat-icon stat-icon-${card.tone}">${App.Icons[card.icon]()}</div>
            <span class="stat-label">${escape(card.label)}</span>
            <strong class="stat-value">${escape(String(card.value))}</strong>
            <span class="stat-foot">${escape(card.foot)}</span>
          </article>
        `).join('')}
      </div>

      <div class="grid grid-2">
        <div class="card chart-card">
          <div class="card-head">
            <h3>Asistencia por evento</h3>
            <span class="muted">Últimos registros</span>
          </div>
          <canvas id="chart-attendance"></canvas>
        </div>

        <div class="card chart-card">
          <div class="card-head">
            <h3>Miembros por estado</h3>
            <span class="muted">${memberCounts.total} en total</span>
          </div>
          <canvas id="chart-members"></canvas>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-head">
            <h3>Próximos eventos</h3>
            <a class="link" href="#/eventos">Ver calendario</a>
          </div>
          <div id="upcoming-events">
            ${upcomingEvents.length ? upcomingEvents.map((eventItem) => {
              const date = App.Utils.parseDate(eventItem.fecha);
              const ministry = eventItem.ministerioId
                ? App.Services.ministries.get(eventItem.ministerioId)
                : null;
              return `
                <div class="event-row">
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
                    </div>
                  </div>
                </div>
              `;
            }).join('') : App.UI.empty('Sin eventos próximos', 'El calendario está libre por ahora.', App.Icons.events())}
          </div>
        </div>

        ${canFinance ? `
          <div class="card chart-card">
            <div class="card-head">
              <h3>Ingresos de los últimos 6 meses</h3>
              <a class="link" href="#/donaciones">Ver donaciones</a>
            </div>
            <canvas id="chart-income"></canvas>
          </div>
        ` : `
          <div class="card">
            <div class="card-head">
              <h3>Accesos rápidos</h3>
            </div>
            <div class="quick-links">
              ${quickLinks.map((link) => `
                <a class="quick-link" href="#${link.path}">
                  <span class="quick-link-icon">${App.Icons[link.icon]()}</span>
                  <span>${escape(link.label)}</span>
                  ${App.Icons.chevronRight()}
                </a>
              `).join('')}
            </div>
          </div>
        `}
      </div>

      <div class="card">
        <div class="card-head">
          <h3>${hasImportant ? 'Avisos importantes' : 'Últimos comunicados'}</h3>
          <a class="link" href="#/comunicados">Ver todos</a>
        </div>
        <div class="announcement-strip">
          ${announcements.length ? announcements.map((announcement) => {
            const date = App.Utils.parseDate(announcement.fechaPublicacion);
            const excerpt = announcement.contenido.length > 140
              ? `${announcement.contenido.slice(0, 140).trim()}…`
              : announcement.contenido;

            return `
              <a class="announcement-strip-item" href="#/comunicados">
                <div class="date-badge">
                  <strong>${date ? date.getDate() : '—'}</strong>
                  <small>${date ? date.toLocaleDateString('es-MX', { month: 'short' }) : ''}</small>
                </div>
                <div class="event-main">
                  <strong>${escape(announcement.titulo)}</strong>
                  <span>${escape(App.Utils.formatDate(announcement.fechaPublicacion))} · ${escape(announcement.autor || 'Administración')}</span>
                  <p class="announcement-excerpt">${escape(excerpt)}</p>
                </div>
                ${announcement.importante ? '<span class="badge badge-gold">Importante</span>' : ''}
              </a>
            `;
          }).join('') : App.UI.empty(
            'Sin comunicados publicados',
            'Los avisos de la iglesia aparecerán en este espacio.',
            App.Icons.megaphone()
          )}
        </div>
      </div>
    `;
  },

  mount() {
    const attendanceRecords = App.Services.attendance.records().slice(0, 5).reverse();
    const attendanceLabels = attendanceRecords.map((record) => {
      const eventItem = App.Services.events.get(record.eventId);
      return eventItem ? eventItem.titulo : App.Utils.formatDate(record.fecha);
    });
    const attendanceValues = attendanceRecords.map((record) => App.Services.attendance.presentCount(record));

    App.Charts.bar(
      document.getElementById('chart-attendance'),
      attendanceLabels,
      attendanceValues
    );

    const memberCounts = App.Services.members.counts();

    App.Charts.donut(document.getElementById('chart-members'), [
      { label: 'Activos', value: memberCounts.activos, color: '#1f8a5b' },
      { label: 'Inactivos', value: memberCounts.inactivos, color: '#c8a24a' }
    ]);

    if (App.Auth.can('donations')) {
      const months = App.Services.donations.lastMonths(6);
      const moneyCompact = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        notation: 'compact',
        maximumFractionDigits: 1
      });

      App.Charts.bar(
        document.getElementById('chart-income'),
        months.map((month) => month.label),
        months.map((month) => month.total),
        { formatter: (value) => moneyCompact.format(value) }
      );
    }
  }
};

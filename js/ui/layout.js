App.Layout = (function () {
  const navItems = [
    { path: '/dashboard', label: 'Panel principal', icon: 'dashboard', module: 'dashboard', group: 'Principal' },
    { path: '/miembros', label: 'Miembros', icon: 'users', module: 'members', group: 'Gestión' },
    { path: '/asistencia', label: 'Asistencia', icon: 'attendance', module: 'attendance', group: 'Gestión' },
    { path: '/eventos', label: 'Eventos', icon: 'events', module: 'events', group: 'Gestión' },
    { path: '/ministerios', label: 'Ministerios', icon: 'church', module: 'ministries', group: 'Gestión' },
    { path: '/comunicados', label: 'Comunicados', icon: 'megaphone', module: 'announcements', group: 'Comunicación' },
    { path: '/donaciones', label: 'Donaciones', icon: 'donations', module: 'donations', group: 'Finanzas' },
    { path: '/reportes', label: 'Reportes', icon: 'chart', module: 'reports', group: 'Análisis' },
    { path: '/configuracion', label: 'Configuración', icon: 'settings', module: 'settings', group: 'Sistema' },
    { path: '/usuarios', label: 'Usuarios', icon: 'usersGroup', module: 'users', group: 'Sistema' }
  ];

  function shell(activePath, title) {
    const user = App.Auth.current();
    const app = document.getElementById('app');
    const church = App.Services.church.get();
    const visibleItems = navItems.filter((item) => App.Auth.can(item.module));

    let navHtml = '';
    let currentGroup = '';

    visibleItems.forEach((item) => {
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        navHtml += `<span class="nav-section">${App.Utils.escapeHtml(item.group)}</span>`;
      }

      navHtml += `
        <a href="#${item.path}" class="nav-item ${activePath === item.path ? 'is-active' : ''}">
          ${App.Icons[item.icon]()}
          <span>${App.Utils.escapeHtml(item.label)}</span>
        </a>
      `;
    });

    app.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar" id="sidebar">
          <div class="brand">
            ${App.UI.churchLogo()}
            <div class="brand-text">
              <strong>${App.Utils.escapeHtml(church.name)}</strong>
              <span>Gestión eclesiástica</span>
            </div>
          </div>

          <nav class="nav" aria-label="Menú principal">
            ${navHtml}
          </nav>

          <div class="sidebar-footer">
            <div class="user-mini">
              <div class="avatar avatar-sidebar">${App.Utils.escapeHtml(App.Utils.initials(user.nombre))}</div>
              <div class="user-mini-text">
                <strong>${App.Utils.escapeHtml(user.nombre)}</strong>
                <span>${App.Utils.escapeHtml(App.Auth.roleLabel(user.rol))}</span>
              </div>
            </div>
            <div class="sidebar-actions">
              <button type="button" class="btn btn-sidebar" id="password-btn" title="Cambiar contraseña">
                ${App.Icons.lock()}
                Contraseña
              </button>
              <button type="button" class="btn btn-sidebar" id="logout-btn">
                ${App.Icons.logout()}
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        <div class="sidebar-overlay" id="sidebar-overlay"></div>

        <div class="main">
          <header class="topbar">
            <button type="button" class="icon-btn menu-btn" id="menu-btn" aria-label="Abrir menú">
              ${App.Icons.menu()}
            </button>
            <div class="topbar-title">
              <h1>${App.Utils.escapeHtml(title)}</h1>
              <p>${App.Utils.escapeHtml(App.Utils.formatLongDate(App.Utils.todayISO()))}</p>
            </div>
            <div class="topbar-right">
              <span class="badge badge-role">${App.Utils.escapeHtml(App.Auth.roleLabel(user.rol))}</span>
              <div class="avatar">${App.Utils.escapeHtml(App.Utils.initials(user.nombre))}</div>
            </div>
          </header>
          <main class="view" id="view"></main>
        </div>
      </div>
    `;

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const menuButton = document.getElementById('menu-btn');

    function closeSidebar() {
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-visible');
    }

    menuButton.addEventListener('click', () => {
      sidebar.classList.toggle('is-open');
      overlay.classList.toggle('is-visible');
    });

    overlay.addEventListener('click', closeSidebar);

    document.getElementById('password-btn').addEventListener('click', () => {
      closeSidebar();
      App.UI.modal({
        title: 'Cambiar contraseña',
        submitLabel: 'Actualizar contraseña',
        formHtml: `
          <div class="field">
            <label for="own-current">Contraseña actual</label>
            <input type="password" id="own-current" name="actual" autocomplete="current-password" required>
          </div>
          <div class="field">
            <label for="own-password">Nueva contraseña</label>
            <input type="password" id="own-password" name="password" minlength="6" autocomplete="new-password" required>
          </div>
          <div class="field">
            <label for="own-confirm">Confirmar contraseña</label>
            <input type="password" id="own-confirm" name="confirm" minlength="6" autocomplete="new-password" required>
          </div>
        `,
        onSubmit(data) {
          App.Services.users.changePassword(user.id, data.actual, data.password, data.confirm);
          App.UI.toast('Contraseña actualizada.');
        }
      });
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      App.Auth.logout();
      window.location.hash = '#/login';
    });

    return document.getElementById('view');
  }

  function forbidden() {
    return `
      <div class="card forbidden">
        <div class="forbidden-icon">${App.Icons.lock()}</div>
        <p class="eyebrow">Acceso restringido</p>
        <h2>No tienes permiso para ver este módulo</h2>
        <p class="view-sub">Tu rol no incluye esta sección. Si necesitas acceso, contacta al administrador del sistema.</p>
        <a href="#/dashboard" class="btn btn-primary">Volver al panel principal</a>
      </div>
    `;
  }

  return { shell, forbidden };
})();

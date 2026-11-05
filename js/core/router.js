App.Router = (function () {
  const routes = {
    '/login': { view: App.Views.login, public: true },
    '/dashboard': { view: App.Views.dashboard, module: 'dashboard' },
    '/miembros': { view: App.Views.members, module: 'members' },
    '/asistencia': { view: App.Views.attendance, module: 'attendance' },
    '/eventos': { view: App.Views.events, module: 'events' },
    '/ministerios': { view: App.Views.ministries, module: 'ministries' },
    '/comunicados': { view: App.Views.announcements, module: 'announcements' },
    '/donaciones': { view: App.Views.donations, module: 'donations' },
    '/reportes': { view: App.Views.reports, module: 'reports' },
    '/configuracion': { view: App.Views.settings, module: 'settings' },
    '/usuarios': { view: App.Views.users, module: 'users' }
  };

  function currentPath() {
    const hash = window.location.hash.replace(/^#/, '');
    return hash.startsWith('/') ? hash : '/dashboard';
  }

  function renderLogin() {
    document.title = `${App.Views.login.title} · ${App.Services.church.name()}`;
    const app = document.getElementById('app');
    app.innerHTML = App.Views.login.render();
    App.Views.login.mount();
  }

  function handle() {
    const path = currentPath();
    const authenticated = App.Auth.isAuthenticated();
    const route = routes[path];

    if (!authenticated) {
      if (path !== '/login') {
        window.location.replace('#/login');
        return;
      }
      renderLogin();
      return;
    }

    if (path === '/login' || !route || route.public) {
      window.location.replace('#/dashboard');
      return;
    }

    if (route.module && !App.Auth.can(route.module)) {
      App.Layout.shell(path, 'Acceso restringido');
      document.title = `Acceso restringido · ${App.Services.church.name()}`;
      document.getElementById('view').innerHTML = App.Layout.forbidden();
      return;
    }

    const title = route.view.title || '';
    document.title = `${title} · ${App.Services.church.name()}`;

    const viewContainer = App.Layout.shell(path, title);
    viewContainer.innerHTML = route.view.render();

    if (typeof route.view.mount === 'function') {
      route.view.mount();
    }
  }

  function start() {
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/dashboard');
    }

    window.addEventListener('hashchange', handle);
    handle();
  }

  function navigate(path) {
    if (currentPath() === path) {
      handle();
      return;
    }
    window.location.hash = `#${path}`;
  }

  return { start, navigate, handle };
})();

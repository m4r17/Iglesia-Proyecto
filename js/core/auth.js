App.Auth = {
  login(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = App.Repositories.users.all().find(
      (item) => item.correo.toLowerCase() === normalizedEmail
    );

    if (!user || user.passwordHash !== App.Utils.hashPassword(password)) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    App.Storage.set('session', {
      userId: user.id,
      iniciadoEn: new Date().toISOString()
    });

    return user;
  },

  current() {
    const session = App.Storage.get('session', null);
    if (!session) return null;
    const user = App.Repositories.users.findById(session.userId);
    if (!user) {
      this.logout();
      return null;
    }
    return user;
  },

  logout() {
    App.Storage.remove('session');
  },

  isAuthenticated() {
    return Boolean(this.current());
  },

  can(moduleName) {
    const user = this.current();
    if (!user) return false;
    const role = App.Config.roles[user.rol];
    return Boolean(role && role.modules.includes(moduleName));
  },

  canManage(moduleName) {
    const user = this.current();
    if (!user) return false;
    const role = App.Config.roles[user.rol];
    return Boolean(role && Array.isArray(role.manage) && role.manage.includes(moduleName));
  },

  roleLabel(roleName) {
    const role = App.Config.roles[roleName];
    return role ? role.label : roleName;
  },

  restorePassword(email, newPassword) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = App.Repositories.users.all().find(
      (item) => item.correo.toLowerCase() === normalizedEmail
    );

    if (!user) {
      throw new Error('No existe una cuenta registrada con ese correo.');
    }

    App.Repositories.users.update(user.id, {
      passwordHash: App.Utils.hashPassword(newPassword)
    });
  }
};

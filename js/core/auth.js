App.Auth = {
  login(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = App.Repositories.users.all().find(
      (item) => item.correo.toLowerCase() === normalizedEmail
    );

    if (!user || user.passwordHash !== App.Utils.hashPassword(password)) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    if (user.estado === 'inactivo') {
      throw new Error('Tu cuenta está desactivada. Contacta al administrador del sistema.');
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
    if (!user || user.estado === 'inactivo') {
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

  requestRecovery(email) {
    const user = App.Services.users.findByEmail(email);

    if (!user || user.estado === 'inactivo') {
      throw new Error('No existe una cuenta activa registrada con ese correo.');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const minutes = App.Config.recoveryCodeMinutes || 15;

    App.Storage.set('recovery', {
      userId: user.id,
      codeHash: App.Utils.hashPassword(code),
      expiraEn: Date.now() + minutes * 60 * 1000
    });

    return { code, minutes, correo: user.correo };
  },

  restorePassword(email, code, newPassword) {
    const user = App.Services.users.findByEmail(email);
    const recovery = App.Storage.get('recovery', null);

    if (!user) {
      throw new Error('No existe una cuenta registrada con ese correo.');
    }

    if (!recovery || recovery.userId !== user.id) {
      throw new Error('Solicita primero un código de recuperación.');
    }

    if (Date.now() > recovery.expiraEn) {
      App.Storage.remove('recovery');
      throw new Error('El código de recuperación expiró. Solicita uno nuevo.');
    }

    if (recovery.codeHash !== App.Utils.hashPassword(String(code || '').trim())) {
      throw new Error('El código de recuperación es incorrecto.');
    }

    const password = App.Services.users.validatePassword(newPassword);

    App.Repositories.users.update(user.id, {
      passwordHash: App.Utils.hashPassword(password)
    });
    App.Storage.remove('recovery');
  }
};

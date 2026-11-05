App.Services = App.Services || {};

App.Services.users = {
  roles() {
    return Object.keys(App.Config.roles).map((key) => ({
      value: key,
      label: App.Config.roles[key].label
    }));
  },

  list(filters) {
    const options = filters || {};
    const query = App.Utils.normalize(options.query || '');
    const role = options.role || 'all';
    const status = options.status || 'all';

    return App.Repositories.users.all()
      .map((user) => Object.assign({ estado: 'activo' }, user))
      .filter((user) => role === 'all' || user.rol === role)
      .filter((user) => status === 'all' || user.estado === status)
      .filter((user) => !query || App.Utils.normalize(`${user.nombre} ${user.correo}`).includes(query))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  },

  get(userId) {
    return App.Repositories.users.findById(userId);
  },

  findByEmail(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    return App.Repositories.users.all().find(
      (user) => String(user.correo || '').toLowerCase() === normalizedEmail
    ) || null;
  },

  isActive(user) {
    return Boolean(user) && user.estado !== 'inactivo';
  },

  validate(data, userId) {
    const nombre = String(data.nombre || '').trim();
    const correo = String(data.correo || '').trim().toLowerCase();
    const rol = String(data.rol || '');

    if (!nombre) throw new Error('El nombre del usuario es obligatorio.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error('Ingresa un correo electrónico válido.');
    if (!App.Config.roles[rol]) throw new Error('Selecciona un rol válido.');

    const duplicate = this.findByEmail(correo);
    if (duplicate && duplicate.id !== userId) {
      throw new Error('Ya existe un usuario registrado con ese correo.');
    }

    return { nombre, correo, rol };
  },

  validatePassword(password, confirm) {
    const value = String(password || '');
    if (value.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    if (confirm !== undefined && value !== String(confirm || '')) {
      throw new Error('Las contraseñas no coinciden.');
    }
    return value;
  },

  activeAdmins(excludeId) {
    return App.Repositories.users.all().filter(
      (user) => user.rol === 'administrador' && this.isActive(user) && user.id !== excludeId
    );
  },

  create(data) {
    const fields = this.validate(data, null);
    const password = this.validatePassword(data.password, data.confirm);

    return App.Repositories.users.create(Object.assign(fields, {
      passwordHash: App.Utils.hashPassword(password),
      estado: 'activo'
    }));
  },

  update(userId, data) {
    const user = this.get(userId);
    if (!user) throw new Error('El usuario no existe.');

    const fields = this.validate(data, userId);

    if (user.rol === 'administrador' && fields.rol !== 'administrador' && !this.activeAdmins(userId).length) {
      throw new Error('Debe existir al menos un administrador activo.');
    }

    const updates = Object.assign({}, fields);

    if (String(data.password || '')) {
      updates.passwordHash = App.Utils.hashPassword(this.validatePassword(data.password, data.confirm));
    }

    return App.Repositories.users.update(userId, updates);
  },

  setStatus(userId, status, currentUserId) {
    const user = this.get(userId);
    if (!user) throw new Error('El usuario no existe.');

    const estado = status === 'inactivo' ? 'inactivo' : 'activo';

    if (estado === 'inactivo') {
      if (userId === currentUserId) throw new Error('No puedes desactivar tu propia cuenta.');
      if (user.rol === 'administrador' && !this.activeAdmins(userId).length) {
        throw new Error('Debe existir al menos un administrador activo.');
      }
    }

    return App.Repositories.users.update(userId, { estado });
  },

  changePassword(userId, currentPassword, newPassword, confirm) {
    const user = this.get(userId);
    if (!user) throw new Error('El usuario no existe.');
    if (user.passwordHash !== App.Utils.hashPassword(currentPassword)) {
      throw new Error('La contraseña actual es incorrecta.');
    }

    const password = this.validatePassword(newPassword, confirm);
    return App.Repositories.users.update(userId, {
      passwordHash: App.Utils.hashPassword(password)
    });
  }
};

App.Services = App.Services || {};

App.Services.members = {
  list(filters) {
    const options = filters || {};
    const status = options.status || 'all';
    const query = App.Utils.normalize(options.query || '');

    let list = App.Repositories.members.all();

    if (status !== 'all') {
      list = list.filter((member) => member.estado === status);
    }

    if (query) {
      list = list.filter((member) => {
        const ministryNames = App.Services.ministries
          ? App.Services.ministries.namesForMember(member.id)
          : [];
        const haystack = [
          member.nombre,
          member.correo,
          member.telefono,
          ...ministryNames
        ].map(App.Utils.normalize).join(' ');
        return haystack.includes(query);
      });
    }

    return list.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  },

  all() {
    return App.Repositories.members.all();
  },

  active() {
    return this.all()
      .filter((member) => member.estado === 'activo')
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  },

  get(memberId) {
    return App.Repositories.members.findById(memberId);
  },

  create(data) {
    const nombre = String(data.nombre || '').trim();
    if (!nombre) throw new Error('El nombre del miembro es obligatorio.');

    return App.Repositories.members.create({
      nombre,
      telefono: String(data.telefono || '').trim(),
      correo: String(data.correo || '').trim(),
      fechaIngreso: data.fechaIngreso || App.Utils.todayISO(),
      notas: String(data.notas || '').trim(),
      estado: 'activo'
    });
  },

  update(memberId, data) {
    const nombre = String(data.nombre || '').trim();
    if (!nombre) throw new Error('El nombre del miembro es obligatorio.');

    return App.Repositories.members.update(memberId, {
      nombre,
      telefono: String(data.telefono || '').trim(),
      correo: String(data.correo || '').trim(),
      fechaIngreso: data.fechaIngreso,
      notas: String(data.notas || '').trim()
    });
  },

  setStatus(memberId, status) {
    return App.Repositories.members.update(memberId, {
      estado: status === 'inactivo' ? 'inactivo' : 'activo'
    });
  },

  counts() {
    const list = this.all();
    const activos = list.filter((member) => member.estado === 'activo').length;
    return {
      total: list.length,
      activos,
      inactivos: list.length - activos
    };
  }
};

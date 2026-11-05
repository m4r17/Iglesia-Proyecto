App.Services = App.Services || {};

App.Services.ministries = {
  list() {
    return App.Repositories.ministries.all()
      .slice()
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  },

  get(ministryId) {
    return App.Repositories.ministries.findById(ministryId);
  },

  create(data) {
    const nombre = String(data.nombre || '').trim();
    if (!nombre) throw new Error('El nombre del ministerio es obligatorio.');

    return App.Repositories.ministries.create({
      nombre,
      descripcion: String(data.descripcion || '').trim(),
      coordinadorId: String(data.coordinadorId || ''),
      coordinadorMiembroId: String(data.coordinadorMiembroId || ''),
      miembros: []
    });
  },

  update(ministryId, data) {
    const nombre = String(data.nombre || '').trim();
    if (!nombre) throw new Error('El nombre del ministerio es obligatorio.');

    return App.Repositories.ministries.update(ministryId, {
      nombre,
      descripcion: String(data.descripcion || '').trim(),
      coordinadorId: String(data.coordinadorId || ''),
      coordinadorMiembroId: String(data.coordinadorMiembroId || '')
    });
  },

  remove(ministryId) {
    App.Repositories.ministries.remove(ministryId);
  },

  memberIds(ministryId) {
    const ministry = this.get(ministryId);
    if (!ministry || !Array.isArray(ministry.miembros)) return [];
    return ministry.miembros.slice();
  },

  membersOf(ministryId) {
    const ids = new Set(this.memberIds(ministryId));
    return App.Repositories.members.all()
      .filter((member) => ids.has(member.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  },

  setMember(ministryId, memberId, linked) {
    const ministry = this.get(ministryId);
    if (!ministry) return null;

    const current = new Set(Array.isArray(ministry.miembros) ? ministry.miembros : []);

    if (linked) current.add(memberId);
    else current.delete(memberId);

    const updates = { miembros: Array.from(current) };
    if (!linked && ministry.coordinadorMiembroId === memberId) {
      updates.coordinadorMiembroId = '';
    }

    return App.Repositories.ministries.update(ministryId, updates);
  },

  namesForMember(memberId) {
    return this.list()
      .filter((ministry) => Array.isArray(ministry.miembros) && ministry.miembros.includes(memberId))
      .map((ministry) => ministry.nombre);
  },

  coordinator(ministry) {
    if (!ministry) return null;

    if (ministry.coordinadorMiembroId) {
      const member = App.Repositories.members.findById(ministry.coordinadorMiembroId);
      if (member) return Object.assign({}, member, { tipo: 'miembro' });
    }

    if (ministry.coordinadorId) {
      const user = App.Repositories.users.findById(ministry.coordinadorId);
      if (user) return Object.assign({}, user, { tipo: 'usuario' });
    }

    return null;
  },

  activitiesOf(ministryId, onlyUpcoming) {
    const today = App.Utils.todayISO();
    return App.Services.events.list().filter((eventItem) => {
      if (eventItem.ministerioId !== ministryId) return false;
      if (eventItem.estado === 'cancelado') return false;
      return onlyUpcoming ? eventItem.fecha >= today : true;
    });
  },

  stats() {
    const ministries = this.list();
    const linked = new Set();

    ministries.forEach((ministry) => {
      (ministry.miembros || []).forEach((memberId) => linked.add(memberId));
    });

    const upcoming = ministries.reduce(
      (sum, ministry) => sum + this.activitiesOf(ministry.id, true).length,
      0
    );

    return {
      total: ministries.length,
      linked: linked.size,
      coordinators: ministries.filter((ministry) => Boolean(this.coordinator(ministry))).length,
      upcoming
    };
  }
};

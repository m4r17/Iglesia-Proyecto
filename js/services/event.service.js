App.Services = App.Services || {};

App.Services.events = {
  list() {
    return App.Repositories.events.all().slice().sort((a, b) => {
      const first = `${a.fecha || ''} ${a.hora || ''}`;
      const second = `${b.fecha || ''} ${b.hora || ''}`;
      return first.localeCompare(second);
    });
  },

  get(eventId) {
    return App.Repositories.events.findById(eventId);
  },

  byMonth(year, month) {
    return this.list().filter((event) => {
      const date = App.Utils.parseDate(event.fecha);
      return date && date.getFullYear() === year && date.getMonth() === month;
    });
  },

  upcoming(limit) {
    const today = App.Utils.todayISO();
    const list = this.list().filter(
      (event) => event.fecha >= today && event.estado !== 'cancelado'
    );
    return typeof limit === 'number' ? list.slice(0, limit) : list;
  },

  create(data) {
    const titulo = String(data.titulo || '').trim();
    if (!titulo) throw new Error('El título del evento es obligatorio.');
    if (!data.fecha) throw new Error('La fecha del evento es obligatoria.');

    return App.Repositories.events.create({
      titulo,
      fecha: data.fecha,
      hora: data.hora || '10:00',
      lugar: String(data.lugar || '').trim(),
      tipo: data.tipo === 'administrativo' ? 'administrativo' : 'religioso',
      responsable: String(data.responsable || '').trim(),
      ministerioId: String(data.ministerioId || ''),
      descripcion: String(data.descripcion || '').trim(),
      estado: data.estado === 'cancelado' ? 'cancelado' : 'programado'
    });
  },

  update(eventId, data) {
    const titulo = String(data.titulo || '').trim();
    if (!titulo) throw new Error('El título del evento es obligatorio.');
    if (!data.fecha) throw new Error('La fecha del evento es obligatoria.');

    return App.Repositories.events.update(eventId, {
      titulo,
      fecha: data.fecha,
      hora: data.hora || '10:00',
      lugar: String(data.lugar || '').trim(),
      tipo: data.tipo === 'administrativo' ? 'administrativo' : 'religioso',
      responsable: String(data.responsable || '').trim(),
      ministerioId: String(data.ministerioId || ''),
      descripcion: String(data.descripcion || '').trim(),
      estado: data.estado === 'cancelado' ? 'cancelado' : 'programado'
    });
  },

  setStatus(eventId, status) {
    return App.Repositories.events.update(eventId, {
      estado: status === 'cancelado' ? 'cancelado' : 'programado'
    });
  },

  countUpcoming() {
    return this.upcoming().length;
  }
};

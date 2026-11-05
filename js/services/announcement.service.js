App.Services = App.Services || {};

App.Services.announcements = {
  list() {
    return App.Repositories.announcements.all().slice().sort((a, b) => {
      const byDate = String(b.fechaPublicacion || '').localeCompare(String(a.fechaPublicacion || ''));
      if (byDate !== 0) return byDate;
      return String(b.creadoEn || '').localeCompare(String(a.creadoEn || ''));
    });
  },

  get(announcementId) {
    return App.Repositories.announcements.findById(announcementId);
  },

  important() {
    return this.list().filter((announcement) => announcement.importante);
  },

  latest(limit, onlyImportant) {
    const list = onlyImportant ? this.important() : this.list();
    return typeof limit === 'number' ? list.slice(0, limit) : list;
  },

  create(data, author) {
    const titulo = String(data.titulo || '').trim();
    const contenido = String(data.contenido || '').trim();

    if (!titulo) throw new Error('El título del comunicado es obligatorio.');
    if (!contenido) throw new Error('El contenido del comunicado es obligatorio.');

    return App.Repositories.announcements.create({
      titulo,
      contenido,
      fechaPublicacion: data.fechaPublicacion || App.Utils.todayISO(),
      importante: data.importante === 'on' || data.importante === true,
      autor: author ? author.nombre : ''
    });
  },

  update(announcementId, data) {
    const titulo = String(data.titulo || '').trim();
    const contenido = String(data.contenido || '').trim();

    if (!titulo) throw new Error('El título del comunicado es obligatorio.');
    if (!contenido) throw new Error('El contenido del comunicado es obligatorio.');

    return App.Repositories.announcements.update(announcementId, {
      titulo,
      contenido,
      fechaPublicacion: data.fechaPublicacion || App.Utils.todayISO(),
      importante: data.importante === 'on' || data.importante === true
    });
  },

  toggleImportant(announcementId) {
    const announcement = this.get(announcementId);
    if (!announcement) return null;

    return App.Repositories.announcements.update(announcementId, {
      importante: !announcement.importante
    });
  },

  remove(announcementId) {
    App.Repositories.announcements.remove(announcementId);
  }
};

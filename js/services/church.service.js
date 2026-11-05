App.Services = App.Services || {};

App.Services.church = {
  defaults() {
    const church = App.Config.church;
    return {
      name: church.name,
      slogan: church.slogan,
      address: church.address,
      phone: church.phone,
      email: church.email,
      logo: '',
      schedules: (church.schedules || []).map((schedule) => Object.assign({}, schedule))
    };
  },

  get() {
    const defaults = this.defaults();
    const stored = App.Storage.get('churchSettings', {});
    const settings = Object.assign({}, defaults, stored);

    if (!Array.isArray(settings.schedules)) {
      settings.schedules = defaults.schedules;
    } else {
      settings.schedules = settings.schedules.map((schedule) => ({
        id: schedule.id || App.Utils.id('sch'),
        dia: schedule.dia || 'Domingo',
        hora: schedule.hora || '10:00',
        actividad: schedule.actividad || ''
      }));
    }

    if (!settings.name) settings.name = defaults.name;

    return settings;
  },

  save(data) {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('El nombre de la iglesia es obligatorio.');

    const schedules = (data.schedules || [])
      .filter((schedule) => String(schedule.actividad || '').trim())
      .map((schedule) => ({
        id: schedule.id || App.Utils.id('sch'),
        dia: schedule.dia || 'Domingo',
        hora: schedule.hora || '10:00',
        actividad: String(schedule.actividad || '').trim()
      }));

    const settings = {
      name,
      slogan: String(data.slogan || '').trim(),
      address: String(data.address || '').trim(),
      phone: String(data.phone || '').trim(),
      email: String(data.email || '').trim(),
      logo: typeof data.logo === 'string' ? data.logo : '',
      schedules
    };

    App.Storage.set('churchSettings', settings);
    return settings;
  },

  reset() {
    App.Storage.remove('churchSettings');
  },

  logo() {
    return this.get().logo;
  },

  name() {
    return this.get().name;
  }
};

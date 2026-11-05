App.Repositories = (function () {
  function create(name) {
    return {
      all() {
        return App.Storage.get(name, []);
      },

      save(list) {
        App.Storage.set(name, list);
      },

      findById(entityId) {
        return this.all().find((item) => item.id === entityId) || null;
      },

      create(data) {
        const list = this.all();
        const item = Object.assign({}, data, {
          id: App.Utils.id(name),
          creadoEn: new Date().toISOString()
        });
        list.push(item);
        this.save(list);
        return item;
      },

      update(entityId, data) {
        const list = this.all();
        const index = list.findIndex((item) => item.id === entityId);
        if (index < 0) return null;
        list[index] = Object.assign({}, list[index], data, {
          actualizadoEn: new Date().toISOString()
        });
        this.save(list);
        return list[index];
      },

      remove(entityId) {
        this.save(this.all().filter((item) => item.id !== entityId));
      }
    };
  }

  return {
    users: create('users'),
    members: create('members'),
    events: create('events'),
    attendance: create('attendance'),
    donations: create('donations'),
    ministries: create('ministries'),
    announcements: create('announcements')
  };
})();

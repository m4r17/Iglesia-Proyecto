App.Storage = {
  key(name) {
    return App.Config.storagePrefix + name;
  },

  get(name, fallback) {
    try {
      const raw = window.localStorage.getItem(this.key(name));
      return raw == null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  },

  set(name, value) {
    window.localStorage.setItem(this.key(name), JSON.stringify(value));
  },

  remove(name) {
    window.localStorage.removeItem(this.key(name));
  }
};

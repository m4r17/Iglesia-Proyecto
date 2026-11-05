App.Services = App.Services || {};

App.Services.donations = {
  list(filters) {
    const options = filters || {};
    let list = App.Repositories.donations.all();

    if (options.month) {
      const month = App.Utils.monthKey(options.month);
      list = list.filter((donation) => String(donation.fecha).slice(0, 7) === month);
    }

    if (options.method && options.method !== 'all') {
      list = list.filter((donation) => donation.metodo === options.method);
    }

    return list.slice().sort(App.Utils.sortByDateDesc);
  },

  get(donationId) {
    return App.Repositories.donations.findById(donationId);
  },

  create(data) {
    const amount = Number(data.monto);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('El monto debe ser mayor que cero.');
    }
    if (!data.fecha) throw new Error('La fecha es obligatoria.');

    const anonymous = data.anonimo === 'on' || data.anonimo === true;

    return App.Repositories.donations.create({
      fecha: data.fecha,
      monto: Math.round(amount * 100) / 100,
      concepto: String(data.concepto || '').trim() || 'Aportación',
      metodo: data.metodo || 'efectivo',
      donanteId: anonymous ? '' : String(data.donanteId || ''),
      anonimo: anonymous
    });
  },

  update(donationId, data) {
    const amount = Number(data.monto);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('El monto debe ser mayor que cero.');
    }
    if (!data.fecha) throw new Error('La fecha es obligatoria.');

    const anonymous = data.anonimo === 'on' || data.anonimo === true;

    return App.Repositories.donations.update(donationId, {
      fecha: data.fecha,
      monto: Math.round(amount * 100) / 100,
      concepto: String(data.concepto || '').trim() || 'Aportación',
      metodo: data.metodo || 'efectivo',
      donanteId: anonymous ? '' : String(data.donanteId || ''),
      anonimo: anonymous
    });
  },

  remove(donationId) {
    App.Repositories.donations.remove(donationId);
  },

  total(list) {
    return list.reduce((sum, donation) => sum + (Number(donation.monto) || 0), 0);
  },

  totalsForMonth(key) {
    const month = App.Utils.monthKey(key);
    const list = this.list({ month });
    return {
      list,
      total: this.total(list),
      count: list.length
    };
  },

  totalsForYear(year) {
    const list = this.list().filter(
      (donation) => App.Utils.parseDate(donation.fecha) &&
        App.Utils.parseDate(donation.fecha).getFullYear() === year
    );
    return {
      list,
      total: this.total(list),
      count: list.length
    };
  },

  monthlySummary(year) {
    const months = [];
    for (let index = 0; index < 12; index += 1) {
      const key = `${year}-${App.Utils.pad2(index + 1)}`;
      const totals = this.totalsForMonth(key);
      months.push({
        key,
        label: App.Utils.monthLabel(key, { month: 'short' }),
        total: totals.total,
        count: totals.count
      });
    }
    return months;
  },

  lastMonths(count) {
    const result = [];
    const now = new Date();
    for (let index = count - 1; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${App.Utils.pad2(date.getMonth() + 1)}`;
      const totals = this.totalsForMonth(key);
      result.push({
        key,
        label: App.Utils.monthLabel(key, { month: 'short' }),
        total: totals.total,
        count: totals.count
      });
    }
    return result;
  },

  byMethod(list) {
    const methods = ['efectivo', 'transferencia', 'tarjeta', 'otro'];
    const result = methods.map((method) => ({
      method,
      total: list
        .filter((donation) => donation.metodo === method)
        .reduce((sum, donation) => sum + (Number(donation.monto) || 0), 0)
    }));
    return result.filter((item) => item.total > 0);
  }
};

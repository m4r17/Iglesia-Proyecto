App.Services = App.Services || {};

App.Services.attendance = {
  records() {
    return App.Repositories.attendance.all().slice().sort((a, b) => {
      const byDate = String(b.fecha || '').localeCompare(String(a.fecha || ''));
      if (byDate !== 0) return byDate;
      return String(b.creadoEn || '').localeCompare(String(a.creadoEn || ''));
    });
  },

  get(recordId) {
    return App.Repositories.attendance.findById(recordId);
  },

  find(eventId, fecha) {
    return this.records().find(
      (record) => record.eventId === eventId && record.fecha === fecha
    ) || null;
  },

  save(data) {
    if (!data.eventId) throw new Error('Selecciona un evento.');
    if (!data.fecha) throw new Error('Selecciona una fecha.');

    const registros = (data.registros || []).map((entry) => ({
      memberId: entry.memberId,
      presente: Boolean(entry.presente)
    }));

    const existing = this.find(data.eventId, data.fecha);

    if (existing) {
      return App.Repositories.attendance.update(existing.id, {
        registros
      });
    }

    return App.Repositories.attendance.create({
      eventId: data.eventId,
      fecha: data.fecha,
      registros
    });
  },

  remove(recordId) {
    App.Repositories.attendance.remove(recordId);
  },

  presentCount(record) {
    if (!record || !Array.isArray(record.registros)) return 0;
    return record.registros.filter((entry) => entry.presente).length;
  },

  absentCount(record) {
    if (!record || !Array.isArray(record.registros)) return 0;
    return record.registros.filter((entry) => !entry.presente).length;
  },

  inRange(startISO, endISO) {
    return this.records().filter(
      (record) => record.fecha >= startISO && record.fecha <= endISO
    );
  },

  totals(records) {
    return records.reduce((acc, record) => {
      acc.present += this.presentCount(record);
      acc.absent += this.absentCount(record);
      acc.events += 1;
      return acc;
    }, { present: 0, absent: 0, events: 0 });
  },

  totalPresentInMonth(key) {
    const month = App.Utils.monthKey(key);
    const records = this.records().filter(
      (record) => String(record.fecha).slice(0, 7) === month
    );
    return this.totals(records).present;
  },

  summaryForMonth(key) {
    const month = App.Utils.monthKey(key);
    const records = this.records().filter(
      (record) => String(record.fecha).slice(0, 7) === month
    );
    const totals = this.totals(records);
    return {
      records,
      present: totals.present,
      absent: totals.absent,
      events: totals.events,
      average: totals.events ? Math.round((totals.present / totals.events) * 10) / 10 : 0
    };
  }
};

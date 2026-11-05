window.App = window.App || {};

App.Config = {
  church: {
    name: 'Iglesia Cristiana Casa de Fe',
    slogan: 'Un lugar de restauración y esperanza',
    address: 'Av. Central 123, Col. Centro',
    phone: '+52 555 123 4567',
    email: 'contacto@casadefe.org',
    schedules: [
      { id: 'sch01', dia: 'Domingo', hora: '10:00', actividad: 'Culto de adoración' },
      { id: 'sch02', dia: 'Miércoles', hora: '19:00', actividad: 'Reunión de oración' },
      { id: 'sch03', dia: 'Viernes', hora: '18:30', actividad: 'Ensayo del ministerio de música' }
    ]
  },
  storagePrefix: 'iglesia.casaDeFe.',
  seedVersion: '2026.11.2',
  toastDuration: 3200,
  recoveryCodeMinutes: 15,
  roles: {
    administrador: {
      label: 'Administrador',
      modules: ['dashboard', 'members', 'attendance', 'events', 'ministries', 'announcements', 'donations', 'reports', 'settings', 'users'],
      manage: ['members', 'attendance', 'events', 'ministries', 'announcements', 'donations', 'settings', 'users']
    },
    pastor: {
      label: 'Pastor',
      modules: ['dashboard', 'members', 'attendance', 'events', 'ministries', 'announcements', 'donations', 'reports', 'settings'],
      manage: ['members', 'attendance', 'events', 'ministries', 'announcements', 'settings']
    },
    secretario: {
      label: 'Secretario',
      modules: ['dashboard', 'members', 'attendance', 'events', 'ministries', 'announcements', 'reports', 'settings'],
      manage: ['members', 'attendance', 'events', 'ministries', 'announcements', 'settings']
    },
    tesorero: {
      label: 'Tesorero',
      modules: ['dashboard', 'donations', 'announcements', 'reports'],
      manage: ['donations']
    },
    coordinador: {
      label: 'Coordinador',
      modules: ['dashboard', 'members', 'attendance', 'events', 'ministries', 'announcements', 'reports'],
      manage: ['attendance', 'events', 'ministries']
    }
  }
};

App.Seed = (function () {
  function daysFromToday(offset) {
    return App.Utils.toISODate(App.Utils.addDays(new Date(), offset));
  }

  function monthDay(monthOffset, day) {
    const now = new Date();
    return App.Utils.toISODate(new Date(now.getFullYear(), now.getMonth() - monthOffset, day));
  }

  function user(entityId, nombre, correo, password, rol) {
    return {
      id: entityId,
      nombre,
      correo,
      passwordHash: App.Utils.hashPassword(password),
      rol,
      estado: 'activo',
      creadoEn: new Date().toISOString()
    };
  }

  function buildUsers() {
    return [
      user('u01', 'Ana Beltrán', 'admin@iglesia.com', 'admin123', 'administrador'),
      user('u02', 'Daniel Ríos', 'pastor@iglesia.com', 'pastor123', 'pastor'),
      user('u03', 'María Solís', 'secretario@iglesia.com', 'secretario123', 'secretario'),
      user('u04', 'Jorge Medina', 'tesorero@iglesia.com', 'tesorero123', 'tesorero'),
      user('u05', 'Lucía Herrera', 'coordinador@iglesia.com', 'coordinador123', 'coordinador')
    ];
  }

  function buildMembers() {
    const people = [
      ['m01', 'Carlos Ramírez', '555 101 2001', 'carlos.ramirez@correo.com', -420, 'activo'],
      ['m02', 'Laura Jiménez', '555 101 2002', 'laura.jimenez@correo.com', -380, 'activo'],
      ['m03', 'Miguel Ángel Torres', '555 101 2003', 'miguel.torres@correo.com', -350, 'activo'],
      ['m04', 'Sofía Navarro', '555 101 2004', 'sofia.navarro@correo.com', -300, 'activo'],
      ['m05', 'Andrés Castillo', '555 101 2005', 'andres.castillo@correo.com', -280, 'activo'],
      ['m06', 'Valeria Ortiz', '555 101 2006', 'valeria.ortiz@correo.com', -240, 'activo'],
      ['m07', 'Ricardo Peña', '555 101 2007', 'ricardo.pena@correo.com', -210, 'inactivo'],
      ['m08', 'Elena Morales', '555 101 2008', 'elena.morales@correo.com', -190, 'activo'],
      ['m09', 'Héctor Guzmán', '555 101 2009', 'hector.guzman@correo.com', -160, 'activo'],
      ['m10', 'Paola Ríos', '555 101 2010', 'paola.rios@correo.com', -120, 'activo'],
      ['m11', 'Diego Salazar', '555 101 2011', 'diego.salazar@correo.com', -90, 'activo'],
      ['m12', 'Renata Flores', '555 101 2012', 'renata.flores@correo.com', -45, 'inactivo']
    ];

    return people.map((row) => ({
      id: row[0],
      nombre: row[1],
      telefono: row[2],
      correo: row[3],
      fechaIngreso: daysFromToday(row[4]),
      estado: row[5],
      notas: ''
    }));
  }

  function buildEvents() {
    return [
      {
        id: 'e01',
        titulo: 'Culto de adoración',
        fecha: daysFromToday(2),
        hora: '10:00',
        lugar: 'Templo principal',
        tipo: 'religioso',
        responsable: 'Daniel Ríos',
        ministerioId: '',
        descripcion: 'Culto dominical con alabanza, predicación y santa cena.',
        estado: 'programado'
      },
      {
        id: 'e02',
        titulo: 'Reunión de líderes',
        fecha: daysFromToday(4),
        hora: '19:00',
        lugar: 'Sala de reuniones',
        tipo: 'administrativo',
        responsable: 'Ana Beltrán',
        ministerioId: '',
        descripcion: 'Revisión de actividades y planificación del mes.',
        estado: 'programado'
      },
      {
        id: 'e03',
        titulo: 'Ensayo del ministerio de música',
        fecha: daysFromToday(6),
        hora: '18:30',
        lugar: 'Salón anexo',
        tipo: 'religioso',
        responsable: 'Lucía Herrera',
        ministerioId: 'mi01',
        descripcion: 'Preparación del repertorio para el culto dominical.',
        estado: 'programado'
      },
      {
        id: 'e04',
        titulo: 'Culto de jóvenes',
        fecha: daysFromToday(-3),
        hora: '19:00',
        lugar: 'Templo principal',
        tipo: 'religioso',
        responsable: 'Lucía Herrera',
        ministerioId: 'mi02',
        descripcion: 'Encuentro de jóvenes con dinámicas y estudio bíblico.',
        estado: 'programado'
      },
      {
        id: 'e05',
        titulo: 'Campaña de oración',
        fecha: daysFromToday(-7),
        hora: '20:00',
        lugar: 'Templo principal',
        tipo: 'religioso',
        responsable: 'Daniel Ríos',
        ministerioId: '',
        descripcion: 'Vigilia de oración por las familias de la iglesia.',
        estado: 'programado'
      },
      {
        id: 'e06',
        titulo: 'Clase de discipulado',
        fecha: daysFromToday(9),
        hora: '17:00',
        lugar: 'Aula 2',
        tipo: 'religioso',
        responsable: 'María Solís',
        ministerioId: 'mi04',
        descripcion: 'Formación básica para nuevos creyentes.',
        estado: 'programado'
      },
      {
        id: 'e07',
        titulo: 'Bazar solidario',
        fecha: daysFromToday(12),
        hora: '09:00',
        lugar: 'Patio central',
        tipo: 'administrativo',
        responsable: 'Jorge Medina',
        ministerioId: 'mi05',
        descripcion: 'Actividad cancelada por ajustes de logística.',
        estado: 'cancelado'
      }
    ];
  }

  function buildAttendance() {
    return [
      {
        id: 'a01',
        eventId: 'e04',
        fecha: daysFromToday(-3),
        registros: [
          { memberId: 'm01', presente: true },
          { memberId: 'm02', presente: true },
          { memberId: 'm03', presente: true },
          { memberId: 'm04', presente: false },
          { memberId: 'm05', presente: true },
          { memberId: 'm06', presente: true },
          { memberId: 'm08', presente: true },
          { memberId: 'm09', presente: true },
          { memberId: 'm10', presente: false },
          { memberId: 'm11', presente: true }
        ],
        creadoEn: new Date().toISOString()
      },
      {
        id: 'a02',
        eventId: 'e05',
        fecha: daysFromToday(-7),
        registros: [
          { memberId: 'm01', presente: true },
          { memberId: 'm02', presente: true },
          { memberId: 'm03', presente: false },
          { memberId: 'm04', presente: true },
          { memberId: 'm05', presente: true },
          { memberId: 'm06', presente: false },
          { memberId: 'm08', presente: true },
          { memberId: 'm09', presente: true },
          { memberId: 'm10', presente: true },
          { memberId: 'm11', presente: false }
        ],
        creadoEn: new Date().toISOString()
      }
    ];
  }

  function buildDonations() {
    return [
      { id: 'd01', fecha: monthDay(0, 2), monto: 1500, concepto: 'Diezmo', metodo: 'transferencia', donanteId: 'm01', anonimo: false },
      { id: 'd02', fecha: monthDay(0, 5), monto: 800, concepto: 'Ofrenda', metodo: 'efectivo', donanteId: '', anonimo: true },
      { id: 'd03', fecha: monthDay(0, 8), monto: 2500, concepto: 'Donativo especial', metodo: 'transferencia', donanteId: 'm05', anonimo: false },
      { id: 'd04', fecha: monthDay(1, 12), monto: 1200, concepto: 'Diezmo', metodo: 'tarjeta', donanteId: 'm02', anonimo: false },
      { id: 'd05', fecha: monthDay(1, 20), monto: 600, concepto: 'Ofrenda misionera', metodo: 'efectivo', donanteId: '', anonimo: true },
      { id: 'd06', fecha: monthDay(2, 10), monto: 1800, concepto: 'Ofrenda', metodo: 'transferencia', donanteId: 'm03', anonimo: false },
      { id: 'd07', fecha: monthDay(3, 15), monto: 950, concepto: 'Diezmo', metodo: 'efectivo', donanteId: 'm06', anonimo: false },
      { id: 'd08', fecha: monthDay(4, 7), monto: 2200, concepto: 'Donativo especial', metodo: 'transferencia', donanteId: '', anonimo: true },
      { id: 'd09', fecha: monthDay(5, 18), monto: 1400, concepto: 'Ofrenda', metodo: 'tarjeta', donanteId: 'm09', anonimo: false }
    ];
  }

  function buildMinistries() {
    return [
      {
        id: 'mi01',
        nombre: 'Música',
        coordinadorId: 'u05',
        descripcion: 'Alabanza y adoración para los cultos y actividades especiales.',
        miembros: ['m01', 'm06', 'm12']
      },
      {
        id: 'mi02',
        nombre: 'Jóvenes',
        coordinadorId: 'u05',
        descripcion: 'Discipulado, encuentros y actividades para la juventud.',
        miembros: ['m03', 'm09']
      },
      {
        id: 'mi03',
        nombre: 'Niños',
        coordinadorId: 'u03',
        descripcion: 'Escuela dominical y acompañamiento a la infancia.',
        miembros: ['m02', 'm08']
      },
      {
        id: 'mi04',
        nombre: 'Enseñanza',
        coordinadorId: 'u02',
        descripcion: 'Formación bíblica y clases de discipulado.',
        miembros: ['m05', 'm10']
      },
      {
        id: 'mi05',
        nombre: 'Servicio',
        coordinadorId: 'u04',
        descripcion: 'Apoyo logístico, comunitario y de hospitalidad.',
        miembros: ['m04', 'm07', 'm11']
      }
    ];
  }

  function buildAnnouncements() {
    return [
      {
        id: 'an01',
        titulo: 'Culto de adoración este domingo',
        contenido: 'Te esperamos en el culto dominical a las 10:00 AM. Habrá santa cena y un espacio especial para los niños.',
        fechaPublicacion: daysFromToday(-2),
        importante: true,
        autor: 'Daniel Ríos',
        creadoEn: new Date().toISOString()
      },
      {
        id: 'an02',
        titulo: 'Reunión de líderes y coordinadores',
        contenido: 'La reunión mensual de líderes se realizará en la sala de reuniones. Es importante confirmar asistencia con la secretaría.',
        fechaPublicacion: daysFromToday(-4),
        importante: false,
        autor: 'Ana Beltrán',
        creadoEn: new Date().toISOString()
      },
      {
        id: 'an03',
        titulo: 'Inscripciones abiertas para el discipulado',
        contenido: 'Las personas interesadas en la clase de discipulado pueden registrarse con el ministerio de enseñanza. Las clases inician esta semana.',
        fechaPublicacion: daysFromToday(-6),
        importante: true,
        autor: 'María Solís',
        creadoEn: new Date().toISOString()
      },
      {
        id: 'an04',
        titulo: 'Apoyo para el bazar solidario',
        contenido: 'El ministerio de servicio organiza un bazar para recaudar fondos. Si deseas colaborar, acércate con el coordinador del ministerio.',
        fechaPublicacion: daysFromToday(-9),
        importante: false,
        autor: 'Jorge Medina',
        creadoEn: new Date().toISOString()
      }
    ];
  }

  return {
    ensure() {
      const current = App.Storage.get('seedVersion', null);
      if (current === App.Config.seedVersion) return;
      this.reset();
    },

    reset() {
      App.Repositories.users.save(buildUsers());
      App.Repositories.members.save(buildMembers());
      App.Repositories.events.save(buildEvents());
      App.Repositories.attendance.save(buildAttendance());
      App.Repositories.donations.save(buildDonations());
      App.Repositories.ministries.save(buildMinistries());
      App.Repositories.announcements.save(buildAnnouncements());
      App.Storage.set('seedVersion', App.Config.seedVersion);
    }
  };
})();

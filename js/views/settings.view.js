App.Views = App.Views || {};

App.Views.settings = {
  title: 'Configuración',

  render() {
    return `
      <div class="view-head">
        <div>
          <p class="eyebrow">RF-10 · Configuración de la iglesia</p>
          <h2>Información institucional</h2>
          <p class="view-sub">Actualiza el nombre, logotipo, datos de contacto y horarios habituales de reuniones.</p>
        </div>
      </div>

      <form id="settings-form" class="settings-form" novalidate>
        <div class="grid grid-2">
          <div class="card">
            <div class="card-head">
              <h3>Identidad y contacto</h3>
            </div>
            <div class="form-grid">
              <div class="field field-full">
                <label for="settings-name">Nombre de la iglesia</label>
                <input type="text" id="settings-name" name="name" maxlength="90" required>
              </div>
              <div class="field field-full">
                <label for="settings-slogan">Lema o descripción breve</label>
                <input type="text" id="settings-slogan" name="slogan" maxlength="120">
              </div>
              <div class="field field-full">
                <label for="settings-address">Dirección</label>
                <input type="text" id="settings-address" name="address" maxlength="140">
              </div>
              <div class="field">
                <label for="settings-phone">Teléfono</label>
                <input type="tel" id="settings-phone" name="phone" maxlength="40">
              </div>
              <div class="field">
                <label for="settings-email">Correo de contacto</label>
                <input type="email" id="settings-email" name="email" maxlength="100">
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <h3>Logotipo</h3>
            </div>
            <div class="logo-editor">
              <div class="logo-preview" id="settings-logo-preview"></div>
              <div class="logo-controls">
                <input type="file" id="settings-logo-file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
                <button type="button" class="btn btn-ghost" id="settings-logo-button">
                  ${App.Icons.image()}
                  Subir imagen
                </button>
                <button type="button" class="btn btn-ghost" id="settings-logo-remove">Quitar logo</button>
                <small class="field-hint">PNG, JPG, WEBP o SVG. Tamaño máximo 1 MB.</small>
              </div>
            </div>
            <p class="inline-note inline-note-soft">El logotipo y el nombre se mostrarán en el inicio de sesión, el menú lateral y los reportes impresos.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <h3>Horarios habituales de reuniones</h3>
            <button type="button" class="btn btn-sm btn-ghost" id="add-schedule">
              ${App.Icons.plus()}
              Agregar horario
            </button>
          </div>
          <div id="settings-schedules" class="schedule-list"></div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="reset-settings">Restaurar valores iniciales</button>
          <button type="submit" class="btn btn-primary">Guardar configuración</button>
        </div>
      </form>
    `;
  },

  mount() {
    const escape = App.Utils.escapeHtml;
    const form = document.getElementById('settings-form');
    const schedulesContainer = document.getElementById('settings-schedules');
    const logoPreview = document.getElementById('settings-logo-preview');
    const logoFile = document.getElementById('settings-logo-file');
    const settings = App.Services.church.get();
    const state = {
      logo: settings.logo || '',
      schedules: (settings.schedules || []).map((schedule) => Object.assign({}, schedule))
    };

    document.getElementById('settings-name').value = settings.name || '';
    document.getElementById('settings-slogan').value = settings.slogan || '';
    document.getElementById('settings-address').value = settings.address || '';
    document.getElementById('settings-phone').value = settings.phone || '';
    document.getElementById('settings-email').value = settings.email || '';

    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    function drawLogo() {
      logoPreview.innerHTML = state.logo
        ? `<img src="${escape(state.logo)}" alt="Vista previa del logotipo">`
        : `<div class="logo-placeholder">${App.Icons.image()}<span>Sin logotipo</span></div>`;
    }

    function drawSchedules() {
      if (!state.schedules.length) {
        schedulesContainer.innerHTML = App.UI.empty(
          'Sin horarios registrados',
          'Agrega los días y horas habituales de reunión.',
          App.Icons.events()
        );
        return;
      }

      schedulesContainer.innerHTML = state.schedules.map((schedule, index) => `
        <div class="schedule-row" data-index="${index}">
          <select class="select-inline" data-field="dia" aria-label="Día">
            ${days.map((day) => `<option value="${day}" ${schedule.dia === day ? 'selected' : ''}>${day}</option>`).join('')}
          </select>
          <input type="time" data-field="hora" value="${escape(schedule.hora || '10:00')}" aria-label="Hora">
          <input type="text" data-field="actividad" maxlength="90" value="${escape(schedule.actividad || '')}" placeholder="Actividad o reunión" aria-label="Actividad">
          <button type="button" class="icon-btn icon-btn-danger" data-remove="${index}" aria-label="Eliminar horario" title="Eliminar horario">
            ${App.Icons.trash()}
          </button>
        </div>
      `).join('');
    }

    function updateScheduleField(target) {
      const row = target.closest('.schedule-row');
      if (!row) return;
      const index = Number(row.dataset.index);
      const field = target.dataset.field;
      if (!state.schedules[index] || !field) return;
      state.schedules[index][field] = target.value;
    }

    drawLogo();
    drawSchedules();

    document.getElementById('settings-logo-button').addEventListener('click', () => {
      logoFile.click();
    });

    logoFile.addEventListener('change', () => {
      const file = logoFile.files && logoFile.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        App.UI.toast('Selecciona un archivo de imagen válido.', 'error');
        logoFile.value = '';
        return;
      }

      if (file.size > 1024 * 1024) {
        App.UI.toast('El logotipo supera el tamaño máximo de 1 MB.', 'error');
        logoFile.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        state.logo = String(reader.result || '');
        drawLogo();
        App.UI.toast('Logotipo cargado. Guarda la configuración para aplicarlo.');
      };
      reader.onerror = () => App.UI.toast('No se pudo leer la imagen.', 'error');
      reader.readAsDataURL(file);
      logoFile.value = '';
    });

    document.getElementById('settings-logo-remove').addEventListener('click', () => {
      state.logo = '';
      drawLogo();
      App.UI.toast('Logotipo retirado. Guarda la configuración para aplicarlo.');
    });

    document.getElementById('add-schedule').addEventListener('click', () => {
      state.schedules.push({
        id: App.Utils.id('sch'),
        dia: 'Domingo',
        hora: '10:00',
        actividad: ''
      });
      drawSchedules();
      const rows = schedulesContainer.querySelectorAll('.schedule-row');
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        const activity = lastRow.querySelector('[data-field="actividad"]');
        if (activity) activity.focus();
      }
    });

    schedulesContainer.addEventListener('input', (event) => {
      if (event.target.dataset.field) updateScheduleField(event.target);
    });

    schedulesContainer.addEventListener('change', (event) => {
      if (event.target.dataset.field) updateScheduleField(event.target);
    });

    schedulesContainer.addEventListener('click', (event) => {
      const removeButton = event.target.closest('button[data-remove]');
      if (!removeButton) return;
      state.schedules.splice(Number(removeButton.dataset.remove), 1);
      drawSchedules();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      const data = Object.fromEntries(new FormData(form).entries());

      try {
        App.Services.church.save({
          name: data.name,
          slogan: data.slogan,
          address: data.address,
          phone: data.phone,
          email: data.email,
          logo: state.logo,
          schedules: state.schedules
        });
        App.UI.toast('Configuración de la iglesia actualizada.');
        App.Router.handle();
      } catch (error) {
        App.UI.toast(error.message || 'No se pudo guardar la configuración.', 'error');
      }
    });

    document.getElementById('reset-settings').addEventListener('click', async () => {
      const confirmed = await App.UI.confirm({
        title: 'Restaurar configuración',
        message: '¿Deseas restaurar el nombre, logotipo, contacto y horarios iniciales? Se perderán los cambios guardados.',
        confirmLabel: 'Restaurar',
        danger: true
      });

      if (!confirmed) return;

      App.Services.church.reset();
      App.UI.toast('Configuración restaurada.');
      App.Router.handle();
    });
  }
};

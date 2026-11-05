App.Views = App.Views || {};

App.Views.login = {
  title: 'Iniciar sesión',

  demoAccounts: [
    { email: 'admin@iglesia.com', password: 'admin123', role: 'Administrador' },
    { email: 'pastor@iglesia.com', password: 'pastor123', role: 'Pastor' },
    { email: 'secretario@iglesia.com', password: 'secretario123', role: 'Secretario' },
    { email: 'tesorero@iglesia.com', password: 'tesorero123', role: 'Tesorero' },
    { email: 'coordinador@iglesia.com', password: 'coordinador123', role: 'Coordinador' }
  ],

  render() {
    const church = App.Services.church.get();
    const scheduleText = (church.schedules || [])
      .map((schedule) => `${schedule.dia} ${schedule.hora}`)
      .join(' · ');

    return `
      <div class="login-shell">
        <section class="login-brand">
          <div class="login-brand-top">
            ${App.UI.churchLogo('brand-logo-lg')}
            <span>${App.Utils.escapeHtml(church.name)}</span>
          </div>

          <div class="login-brand-copy">
            <p class="eyebrow eyebrow-light">Gestión eclesiástica</p>
            <h1>Resguarda la memoria y administra tu comunidad.</h1>
            <p>Un espacio para conservar la información de la iglesia, acompañar a los miembros y organizar la obra con orden.</p>
          </div>

          <blockquote>
            “Todo lo puedo en Cristo que me fortalece.”
            <cite>Filipenses 4:13</cite>
          </blockquote>

          <p class="login-brand-foot">${App.Utils.escapeHtml(church.slogan)}${scheduleText ? ` · ${App.Utils.escapeHtml(scheduleText)}` : ''}</p>
        </section>

        <section class="login-panel">
          <div class="login-card">
            <div class="login-head">
              <p class="eyebrow">Bienvenido</p>
              <h2>Iniciar sesión</h2>
              <p>Ingresa con tu correo y contraseña para continuar.</p>
            </div>

            <form id="login-form" novalidate>
              <div class="field">
                <label for="login-email">Correo electrónico</label>
                <input type="email" id="login-email" name="correo" placeholder="correo@iglesia.com" autocomplete="email" required>
              </div>

              <div class="field">
                <label for="login-password">Contraseña</label>
                <input type="password" id="login-password" name="password" placeholder="••••••••" autocomplete="current-password" required>
              </div>

              <div class="login-alert" id="login-alert" hidden></div>

              <button type="submit" class="btn btn-primary btn-block">Entrar al sistema</button>
              <button type="button" class="link-btn" id="forgot-btn">¿Olvidaste tu contraseña?</button>
            </form>

            <div class="demo-box">
              <div class="demo-title">
                <span>Cuentas de demostración</span>
                <small>Haz clic para completar el formulario</small>
              </div>
              <div class="demo-grid">
                ${this.demoAccounts.map((account) => `
                  <button type="button" class="demo-account" data-email="${App.Utils.escapeHtml(account.email)}" data-password="${App.Utils.escapeHtml(account.password)}">
                    <strong>${App.Utils.escapeHtml(account.role)}</strong>
                    <span>${App.Utils.escapeHtml(account.email)}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <p class="login-foot">Prototipo local · ${App.Utils.escapeHtml(church.name)}</p>
        </section>
      </div>
    `;
  },

  mount() {
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const alertBox = document.getElementById('login-alert');

    function showAlert(message) {
      alertBox.textContent = message;
      alertBox.hidden = false;
    }

    document.querySelectorAll('.demo-account').forEach((button) => {
      button.addEventListener('click', () => {
        emailInput.value = button.dataset.email;
        passwordInput.value = button.dataset.password;
        alertBox.hidden = true;
        passwordInput.focus();
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      alertBox.hidden = true;

      if (!form.reportValidity()) return;

      try {
        const user = App.Auth.login(emailInput.value, passwordInput.value);
        App.UI.toast(`Bienvenido, ${App.Utils.firstName(user.nombre)}.`);
        window.location.hash = '#/dashboard';
      } catch (error) {
        showAlert(error.message);
        passwordInput.value = '';
        passwordInput.focus();
      }
    });

    document.getElementById('forgot-btn').addEventListener('click', () => {
      App.UI.modal({
        title: 'Recuperar contraseña',
        submitLabel: 'Enviar código',
        formHtml: `
          <p class="muted">Ingresa el correo registrado. Se generará un código de verificación para restablecer la contraseña.</p>
          <div class="field">
            <label for="recover-email">Correo registrado</label>
            <input type="email" id="recover-email" name="correo" placeholder="correo@iglesia.com" value="${App.Utils.escapeHtml(emailInput.value)}" required>
          </div>
        `,
        onSubmit(data) {
          const result = App.Auth.requestRecovery(data.correo);
          window.setTimeout(() => openResetForm(result), 0);
        }
      });
    });

    function openResetForm(result) {
      const escape = App.Utils.escapeHtml;

      App.UI.modal({
        title: 'Restablecer contraseña',
        submitLabel: 'Restablecer contraseña',
        formHtml: `
          <p class="inline-note inline-note-soft">
            Código enviado a <strong>${escape(result.correo)}</strong>. Mientras no exista un servidor de correo, el código se muestra aquí:
            <strong class="recovery-code">${escape(result.code)}</strong>
            Vence en ${escape(String(result.minutes))} minutos.
          </p>
          <input type="hidden" name="correo" value="${escape(result.correo)}">
          <div class="field">
            <label for="recover-code">Código de verificación</label>
            <input type="text" id="recover-code" name="codigo" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="000000" required>
          </div>
          <div class="field">
            <label for="recover-password">Nueva contraseña</label>
            <input type="password" id="recover-password" name="password" minlength="6" autocomplete="new-password" required>
          </div>
          <div class="field">
            <label for="recover-confirm">Confirmar contraseña</label>
            <input type="password" id="recover-confirm" name="confirm" minlength="6" autocomplete="new-password" required>
          </div>
        `,
        onSubmit(data) {
          if (data.password !== data.confirm) {
            throw new Error('Las contraseñas no coinciden.');
          }

          App.Auth.restorePassword(data.correo, data.codigo, data.password);
          emailInput.value = data.correo;
          passwordInput.value = '';
          App.UI.toast('Contraseña actualizada. Ya puedes iniciar sesión.');
        }
      });
    }
  }
};

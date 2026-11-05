App.UI = (function () {
  function escClose(event) {
    if (event.key === 'Escape') App.UI.closeModal();
  }

  function toast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const element = document.createElement('div');
    element.className = `toast toast-${type || 'success'}`;
    element.innerHTML = `<span class="toast-dot"></span><span>${App.Utils.escapeHtml(message)}</span>`;
    container.appendChild(element);

    window.setTimeout(() => {
      element.classList.add('toast-out');
      window.setTimeout(() => element.remove(), 260);
    }, App.Config.toastDuration);
  }

  function closeModal() {
    const modal = document.getElementById('app-modal');
    if (modal) modal.remove();
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', escClose);
  }

  function modal(config) {
    closeModal();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'app-modal';
    backdrop.innerHTML = `
      <div class="modal ${config.size || ''}" role="dialog" aria-modal="true" aria-label="${App.Utils.escapeHtml(config.title)}">
        <div class="modal-head">
          <h3>${App.Utils.escapeHtml(config.title)}</h3>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${App.Icons.x()}</button>
        </div>
        <form id="modal-form" class="modal-body" novalidate>
          ${config.formHtml || ''}
        </form>
        <div class="modal-foot">
          <button type="button" class="btn btn-ghost" data-close>${App.Utils.escapeHtml(config.cancelLabel || 'Cancelar')}</button>
          <button type="submit" form="modal-form" class="btn btn-primary">${App.Utils.escapeHtml(config.submitLabel || 'Guardar')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.classList.add('modal-open');

    const form = backdrop.querySelector('#modal-form');

    backdrop.querySelectorAll('[data-close]').forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop) closeModal();
    });

    document.addEventListener('keydown', escClose);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      const data = Object.fromEntries(new FormData(form).entries());

      try {
        const result = await config.onSubmit(data, form);
        if (result !== false) closeModal();
      } catch (error) {
        toast(error.message || 'No se pudo completar la operación.', 'error');
      }
    });

    const firstField = form.querySelector('input, select, textarea');
    if (firstField) window.setTimeout(() => firstField.focus(), 60);

    return form;
  }

  function confirm(config) {
    return new Promise((resolve) => {
      closeModal();

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.id = 'app-modal';
      backdrop.innerHTML = `
        <div class="modal modal-sm" role="dialog" aria-modal="true">
          <div class="modal-head">
            <h3>${App.Utils.escapeHtml(config.title || 'Confirmar acción')}</h3>
          </div>
          <div class="modal-body">
            <p class="confirm-text">${config.message || ''}</p>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>
            <button type="button" class="btn ${config.danger ? 'btn-danger' : 'btn-primary'}" data-ok>${App.Utils.escapeHtml(config.confirmLabel || 'Confirmar')}</button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);
      document.body.classList.add('modal-open');

      let resolved = false;

      function localClose(event) {
        if (event && event.key && event.key !== 'Escape') return;
        finish(false);
      }

      function finish(value) {
        if (resolved) return;
        resolved = true;
        document.removeEventListener('keydown', localClose);
        closeModal();
        resolve(value);
      }

      backdrop.querySelector('[data-ok]').addEventListener('click', () => finish(true));
      backdrop.querySelector('[data-cancel]').addEventListener('click', () => finish(false));
      backdrop.addEventListener('mousedown', (event) => {
        if (event.target === backdrop) finish(false);
      });
      document.addEventListener('keydown', localClose);
    });
  }

  function empty(title, text, icon) {
    return `
      <div class="empty">
        <div class="empty-icon">${icon || App.Icons.inbox()}</div>
        <h4>${App.Utils.escapeHtml(title)}</h4>
        <p>${App.Utils.escapeHtml(text || '')}</p>
      </div>
    `;
  }

  function statusBadge(status) {
    const config = {
      activo: { label: 'Activo', className: 'badge-success' },
      inactivo: { label: 'Inactivo', className: 'badge-muted' },
      programado: { label: 'Programado', className: 'badge-success' },
      cancelado: { label: 'Cancelado', className: 'badge-danger' }
    }[status] || { label: status, className: 'badge-muted' };

    return `<span class="badge ${config.className}">${App.Utils.escapeHtml(config.label)}</span>`;
  }

  function methodLabel(method) {
    return {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia',
      tarjeta: 'Tarjeta',
      otro: 'Otro'
    }[method] || method;
  }

  function churchLogo(sizeClass) {
    const logo = App.Services.church ? App.Services.church.logo() : '';

    return `
      <div class="brand-logo ${sizeClass || ''} ${logo ? 'has-image' : ''}">
        ${logo
          ? `<img src="${App.Utils.escapeHtml(logo)}" alt="Logotipo de la iglesia">`
          : App.Icons.church()}
      </div>
    `;
  }

  return {
    toast,
    modal,
    closeModal,
    confirm,
    empty,
    statusBadge,
    methodLabel,
    churchLogo
  };
})();

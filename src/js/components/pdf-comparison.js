import { escapeHtml } from '../utils.js';

export function showPdfComparison(current, existing, newName, onOpen, onDelete) {
  const dialog = document.createElement('dialog');
  dialog.className = 'modal-box pdf-comparison';
  dialog.setAttribute('aria-labelledby', 'comparison-title');
  dialog.setAttribute('aria-describedby', 'comparison-description');
  dialog.innerHTML = `
    <h2 id="comparison-title" class="modal-title">Comparar archivos</h2>
    <p id="comparison-description" class="modal-desc">Ya existe un archivo con el nombre
      <strong>${escapeHtml(newName)}</strong>. Compara los documentos y vuelve para elegir otro nombre o una variante.</p>
    <div class="comparison-files"></div>
    <form method="dialog" class="modal-footer">
      <button class="btn btn-primary" autofocus>Volver a renombrar</button>
    </form>`;

  const loadingTasks = [];
  const renderTasks = new Set();
  dialog.addEventListener('close', () => {
    renderTasks.forEach(task => task.cancel());
    loadingTasks.forEach(task => task.destroy().catch(() => {}));
    dialog.remove();
  }, { once: true });
  document.body.appendChild(dialog);
  dialog.showModal();

  [current, existing].forEach((file, index) => {
    const bytes = file.modifiedBytes || file.originalBytes;
    const pane = document.createElement('section');
    pane.className = 'comparison-file';
    pane.innerHTML = `
      <h3>${index === 0 ? 'Archivo a renombrar' : 'Archivo existente'}</h3>
      <p class="comparison-name">${escapeHtml(file.name)}</p>
      <p class="modal-desc">${(bytes.byteLength / 1024).toLocaleString('es', { maximumFractionDigits: 1 })} KB${file.modifiedBytes ? ' · Con cambios de edición' : ''}</p>
      <div class="comparison-page-nav">
        <button class="btn btn-ghost btn-sm" disabled aria-label="Página anterior del ${index === 0 ? 'archivo a renombrar' : 'archivo existente'}">Anterior</button>
        <span role="status">Cargando PDF…</span>
        <button class="btn btn-ghost btn-sm" disabled aria-label="Página siguiente del ${index === 0 ? 'archivo a renombrar' : 'archivo existente'}">Siguiente</button>
      </div>
      <div class="comparison-canvas-wrapper"><canvas aria-label="Vista previa del ${index === 0 ? 'archivo a renombrar' : 'archivo existente'}"></canvas></div>`;
    dialog.querySelector('.comparison-files').appendChild(pane);

    const actions = document.createElement('div');
    actions.className = 'comparison-file-actions';
    if (index === 1) {
      const open = document.createElement('button');
      open.className = 'btn btn-ghost btn-sm';
      open.textContent = 'Ir al archivo existente';
      open.addEventListener('click', () => {
        dialog.close();
        onOpen(file);
      });
      actions.appendChild(open);
    }
    const remove = document.createElement('button');
    remove.className = 'btn btn-danger btn-sm';
    remove.textContent = index === 0 ? 'Eliminar archivo a renombrar' : 'Eliminar archivo existente';
    remove.addEventListener('click', () => {
      if (onDelete(file)) dialog.close();
    });
    actions.appendChild(remove);
    pane.appendChild(actions);

    const [prev, next] = pane.querySelectorAll('.comparison-page-nav button');
    const status = pane.querySelector('[role="status"]');
    const canvas = pane.querySelector('canvas');
    let pageNumber = 1;
    let pdf;
    async function render() {
      prev.disabled = next.disabled = true;
      let task;
      try {
        const page = await pdf.getPage(pageNumber);
        if (!dialog.open) return;
        const original = page.getViewport({ scale: 1 });
        const scale = (pane.clientWidth - 2) / original.width;
        const ratio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * ratio });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
        canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
        task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
        renderTasks.add(task);
        await task.promise;
        status.textContent = `Página ${pageNumber} de ${pdf.numPages}`;
      } catch (error) {
        if (dialog.open) status.textContent = `No se pudo mostrar la página: ${error.message}`;
      } finally {
        renderTasks.delete(task);
        prev.disabled = pageNumber <= 1;
        next.disabled = pageNumber >= pdf.numPages;
      }
    }
    prev.addEventListener('click', () => { pageNumber--; render(); });
    next.addEventListener('click', () => { pageNumber++; render(); });

    const loading = pdfjsLib.getDocument({ data: bytes.slice(0) });
    loadingTasks.push(loading);
    loading.promise.then(doc => {
      pdf = doc;
      if (dialog.open) return render();
    }).catch(error => {
      if (dialog.open) status.textContent = `No se pudo abrir el PDF: ${error.message}. Cierra e intenta de nuevo.`;
    });
  });
}

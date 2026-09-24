import { state } from '../services/state.js';
import { dom } from '../constants.js';
import { showToast } from '../components/toast.js';

export async function loadPdfForViewing(bytes) {
  dom.canvasLoading().style.display = 'flex';

  try {
    if (state.pdfJsDoc) {
      await state.pdfJsDoc.destroy();
      state.pdfJsDoc = null;
    }

    const copy = bytes.slice(0); // Don't let PDF.js detach the buffer
    state.pdfJsDoc = await pdfjsLib.getDocument({ data: copy }).promise;
    state.totalPages = state.pdfJsDoc.numPages;
    state.currentPage = 0;

    await renderPage();
  } catch (e) {
    showToast(`Error al cargar PDF: ${e.message}`, 'error');
  } finally {
    dom.canvasLoading().style.display = 'none';
  }
}

export async function renderPage() {
  if (!state.pdfJsDoc) return;

  dom.canvasLoading().style.display = 'flex';

  try {
    if (state.renderTask) {
      state.renderTask.cancel();
    }

    const page = await state.pdfJsDoc.getPage(state.currentPage + 1);
    const canvas = dom.pdfCanvas();
    const ctx = canvas.getContext('2d');

    const viewerPanel = document.getElementById('viewer-panel');
    const maxW = viewerPanel.clientWidth - 40;
    const maxH = viewerPanel.clientHeight - 80;

    const viewport0 = page.getViewport({ scale: 1 });
    const scaleW = maxW / viewport0.width;
    const scaleH = maxH / viewport0.height;
    const scale = Math.min(scaleW, scaleH, 2.5);

    const viewport = page.getViewport({ scale });
    const devicePixelRatio = window.devicePixelRatio || 1;

    canvas.width  = Math.floor(viewport.width  * devicePixelRatio);
    canvas.height = Math.floor(viewport.height * devicePixelRatio);
    canvas.style.width  = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    ctx.scale(devicePixelRatio, devicePixelRatio);

    const renderContext = { canvasContext: ctx, viewport };
    state.renderTask = page.render(renderContext);
    await state.renderTask.promise;

    dom.pageCounter().textContent = `Página ${state.currentPage + 1} de ${state.totalPages}`;
    dom.prevPageBtn().disabled = state.currentPage === 0;
    dom.nextPageBtn().disabled = state.currentPage >= state.totalPages - 1;

  } catch (e) {
    if (e.name !== 'RenderingCancelledException') {
      showToast(`Error al renderizar: ${e.message}`, 'error');
    }
  } finally {
    dom.canvasLoading().style.display = 'none';
  }
}

export async function prevPage() {
  if (state.currentPage > 0) {
    state.currentPage--;
    await renderPage();
  }
}

export async function nextPage() {
  if (state.currentPage < state.totalPages - 1) {
    state.currentPage++;
    await renderPage();
  }
}

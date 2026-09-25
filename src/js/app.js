/* ============================================================
   Gestor de Exámenes PDF — Application Entry Point
   ============================================================ */

import { dom } from './constants.js';
import { triggerDownload } from './utils.js';
import { addFiles } from './services/loader.js';
import { showToast } from './components/toast.js';
import { prevPage, nextPage } from './components/pdf-viewer.js';
import { switchModule } from './router.js';
import { updateFileCount } from './views/render-sidebar.js';
import {
  buildYearDropdown,
  updateRenamePreview,
  applyRename,
  skipFile,
  quarantineFile
} from './views/render-rename.js';
import {
  toggleMark,
  prevFile,
  nextFile,
  saveMarks
} from './views/render-viewer.js';
import {
  addSplitRow,
  executeDeletePages,
  executeMultiSplit
} from './views/render-editor.js';
import { state } from './services/state.js';

// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function downloadCurrentFile() {
  if (state.currentIndex < 0) return;
  const file = state.files[state.currentIndex];
  const bytes = file.modifiedBytes || file.originalBytes;
  const blob = new Blob([bytes], { type: 'application/pdf' });
  triggerDownload(blob, file.name);
  showToast(`Descargando: ${file.name}`, 'success');
}

async function downloadAllAsZip() {
  if (state.files.length === 0) {
    showToast('No hay archivos para descargar.', 'info'); return;
  }

  showToast('Generando ZIP…', 'info');
  const zip = new JSZip();

  for (const file of state.files) {
    const bytes = file.modifiedBytes || file.originalBytes;
    zip.file(file.name, bytes);
  }

  try {
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    triggerDownload(blob, 'examenes.zip');
    showToast(`ZIP con ${state.files.length} archivo(s) descargado.`, 'success');
  } catch (e) {
    showToast(`Error al generar ZIP: ${e.message}`, 'error');
  }
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); prevPage(); break;
      case 'ArrowRight': e.preventDefault(); nextPage(); break;
      case 'ArrowUp':    e.preventDefault(); prevFile(); break;
      case 'ArrowDown':  e.preventDefault(); nextFile(); break;
    }
  });
}

function wireEvents() {
  dom.fileInput().addEventListener('change', e => addFiles(e.target.files));

  document.body.addEventListener('dragover', e => {
    e.preventDefault();
    dom.dropZone().classList.add('drag-over');
  });
  document.body.addEventListener('dragleave', e => {
    if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) {
      dom.dropZone().classList.remove('drag-over');
    }
  });
  document.body.addEventListener('drop', e => {
    e.preventDefault();
    dom.dropZone().classList.remove('drag-over');
    addFiles(e.dataTransfer.files);
  });

  dom.dropZone().addEventListener('click', () => dom.fileInput().click());
  dom.downloadAllBtn().addEventListener('click', downloadAllAsZip);
  dom.downloadSingleBtn().addEventListener('click', downloadCurrentFile);

  dom.prevPageBtn().addEventListener('click', prevPage);
  dom.nextPageBtn().addEventListener('click', nextPage);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchModule(btn.dataset.module));
  });

  document.querySelectorAll('input[name="tipo"], input[name="semestre"], input[name="doc"]').forEach(el => {
    el.addEventListener('change', updateRenamePreview);
  });
  dom.anoSelect().addEventListener('change', updateRenamePreview);
  dom.chkExtra().addEventListener('change', updateRenamePreview);
  dom.chkVariation().addEventListener('change', () => {
    const enabled = dom.chkVariation().checked;
    dom.variationSelect().disabled = !enabled;
    updateRenamePreview();
  });
  dom.variationSelect().addEventListener('change', updateRenamePreview);

  dom.renameApplyBtn().addEventListener('click', applyRename);
  dom.renameSkipBtn().addEventListener('click', skipFile);
  dom.renameQuarantineBtn().addEventListener('click', quarantineFile);

  dom.chkMark().addEventListener('change', e => toggleMark(e.target.checked));
  dom.prevFileBtn().addEventListener('click', prevFile);
  dom.nextFileBtn().addEventListener('click', nextFile);
  dom.saveMarksBtn().addEventListener('click', saveMarks);

  dom.deletePagesBtn().addEventListener('click', executeDeletePages);
  dom.addSplitRowBtn().addEventListener('click', addSplitRow);
  dom.executeSplitBtn().addEventListener('click', executeMultiSplit);

  dom.dupDismissBtn().addEventListener('click', () => {
    dom.dupModal().style.display = 'none';
  });
  dom.dupModal().addEventListener('click', e => {
    if (e.target === dom.dupModal()) dom.dupModal().style.display = 'none';
  });

  window.addEventListener('resize', checkScreenSize);

  setupKeyboardShortcuts();
}

function checkScreenSize() {
  const modal = dom.screenWarningModal();
  if (!modal) return;

  // Permanently block usage on screens narrower than 1000px — no dismiss allowed
  modal.style.display = window.innerWidth < 1000 ? 'flex' : 'none';
}

function init() {
  buildYearDropdown();
  updateRenamePreview();
  updateFileCount();

  addSplitRow();
  addSplitRow();

  wireEvents();
  checkScreenSize();
  dom.dropZone().classList.add('visible');
}

document.addEventListener('DOMContentLoaded', init);

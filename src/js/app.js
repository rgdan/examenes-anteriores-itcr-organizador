/* ============================================================
   Gestor de Exámenes PDF — Application Entry Point
   ============================================================ */

import { dom } from './constants.js';
import { triggerDownload } from './utils.js';
import { addFiles } from './services/loader.js';
import { showToast } from './components/toast.js';
import { prevPage, nextPage, zoomIn, zoomOut } from './components/pdf-viewer.js';
import { setAppMode } from './router.js';
import { updateFileCount } from './views/render-sidebar.js';
import {
  buildYearDropdown,
  updateRenamePreview,
  applyRename,
  deleteFile
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

// ============================================================
//  Onboarding flow
// ============================================================

/** Tracks files staged in the upload step (before confirmed) */
let stagedFiles = null;

function showOnboardingStep(step) {
  const upload = dom.onboardingStepUpload();
  const mode   = dom.onboardingStepMode();
  if (step === 'upload') {
    upload.style.display = '';
    mode.style.display   = 'none';
  } else {
    upload.style.display = 'none';
    mode.style.display   = '';
  }
}

function openOnboarding(step = 'upload') {
  showOnboardingStep(step);
  dom.onboardingModal().style.display = 'flex';
}

function closeOnboarding() {
  dom.onboardingModal().style.display = 'none';
}

/** Called when the user picks a mode card */
function selectMode(name) {
  closeOnboarding();
  state.onboardingComplete = true;
  setAppMode(name);
}

/** Update the drop zone UI when files are staged */
function updateStagedUI(files) {
  if (files) {
    stagedFiles = stagedFiles ? stagedFiles.concat(Array.from(files)) : Array.from(files);
  } else {
    stagedFiles = null;
  }
  
  const count = stagedFiles ? stagedFiles.length : 0;
  const continueBtn = dom.onboardingContinueBtn();
  const preview     = dom.onboardingFileListPreview();
  const countEl     = dom.onboardingFileCount();
  const dropZone    = dom.onboardingDropZone();

  if (count > 0) {
    const valid = stagedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    countEl.textContent = `${valid.length} archivo(s) PDF seleccionado(s)`;
    preview.style.display = '';
    continueBtn.disabled = valid.length === 0;
    dropZone.classList.add('has-files');
  } else {
    preview.style.display = 'none';
    continueBtn.disabled = true;
    dropZone.classList.remove('has-files');
  }
}

function wireOnboarding() {
  const dropZone    = dom.onboardingDropZone();
  const continueBtn = dom.onboardingContinueBtn();
  const backBtn     = dom.onboardingBackBtn();

  // Click drop zone → open file picker
  dropZone.addEventListener('click', () => dom.fileInput().click());

  // Drag & Drop on the onboarding drop zone
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', e => {
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('drag-over');
    }
  });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    updateStagedUI(e.dataTransfer.files);
  });

  // File input change (triggered by click on drop zone or file picker)
  dom.fileInput().addEventListener('change', e => {
    updateStagedUI(e.target.files);
  });

  // Continue → load staged files then show mode picker
  continueBtn.addEventListener('click', async () => {
    if (!stagedFiles || stagedFiles.length === 0) return;
    await addFiles(stagedFiles);
    // Reset file input so re-uploading same files works
    dom.fileInput().value = '';
    stagedFiles = null;
    updateStagedUI(null);
    showOnboardingStep('mode');
  });

  // Back → return to upload step
  backBtn.addEventListener('click', () => {
    showOnboardingStep('upload');
  });

  // Mode cards
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => selectMode(card.dataset.mode));
  });

  // "Cambiar Modo" header button → reopen mode picker
  dom.changeModeBtn().addEventListener('click', () => {
    openOnboarding('mode');
  });
}

// ============================================================
//  Download helpers
// ============================================================

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

// ============================================================
//  Keyboard shortcuts
// ============================================================

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); prevPage(); break;
      case 'ArrowRight': e.preventDefault(); nextPage(); break;
      case 'ArrowUp':    e.preventDefault(); prevFile(); break;
      case 'ArrowDown':  e.preventDefault(); nextFile(); break;
      case '+':
      case '=':          e.preventDefault(); zoomIn(); break;
      case '-':
      case '_':          e.preventDefault(); zoomOut(); break;
    }
  });
}

// ============================================================
//  Screen size guard
// ============================================================

function checkScreenSize() {
  const modal = dom.screenWarningModal();
  if (!modal) return;

  // Permanently block usage on screens narrower than 1000px — no dismiss allowed
  modal.style.display = window.innerWidth < 1000 ? 'flex' : 'none';
}

// ============================================================
//  General event wiring (after onboarding is done)
// ============================================================

function wireEvents() {
  // Dropdown toggle logic
  dom.downloadDropdownBtn().addEventListener('click', (e) => {
    e.stopPropagation();
    dom.downloadDropdown().classList.toggle('active');
  });

  // Close dropdown on outside click
  document.addEventListener('click', () => {
    if (dom.downloadDropdown()) {
      dom.downloadDropdown().classList.remove('active');
    }
  });

  dom.downloadAllBtn().addEventListener('click', () => {
    dom.downloadDropdown().classList.remove('active');
    downloadAllAsZip();
  });
  dom.downloadSingleBtn().addEventListener('click', () => {
    dom.downloadDropdown().classList.remove('active');
    downloadCurrentFile();
  });

  dom.prevPageBtn().addEventListener('click', prevPage);
  dom.nextPageBtn().addEventListener('click', nextPage);
  dom.zoomInBtn().addEventListener('click', zoomIn);
  dom.zoomOutBtn().addEventListener('click', zoomOut);

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
  dom.renameDeleteBtn().addEventListener('click', deleteFile);

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

// ============================================================
//  Init
// ============================================================

function init() {
  buildYearDropdown();
  updateRenamePreview();
  updateFileCount();

  addSplitRow();
  addSplitRow();

  wireEvents();
  wireOnboarding();
  checkScreenSize();

  // Setup complete
  // Show the onboarding modal immediately on load
  openOnboarding('upload');
}

document.addEventListener('DOMContentLoaded', init);


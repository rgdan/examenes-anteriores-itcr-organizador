/* ============================================================
   Gestor de Exámenes PDF — Main Application Logic
   Modules: Upload, Rename, Viewer/Marker, Editor (Delete/Split)
   Dependencies: PDF.js (CDN), pdf-lib (CDN), JSZip (CDN)
   ============================================================ */

'use strict';

// ============================================================
// PDF.js worker setup
// ============================================================
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ============================================================
// APPLICATION STATE
// ============================================================
const state = {
  /** @type {Array<{name: string, originalBytes: ArrayBuffer, modifiedBytes: ArrayBuffer|null, marked: boolean}>} */
  files: [],
  currentIndex: -1,
  currentPage: 0,     // 0-based
  totalPages: 0,
  pdfJsDoc: null,     // PDF.js document for rendering
  renderTask: null,   // active PDF.js render task
  activeModule: 'rename',
  markedSet: new Set(), // indices of marked files
};

// ============================================================
// DOM REFERENCES
// ============================================================
const dom = {
  fileInput:         () => document.getElementById('file-input'),
  downloadAllBtn:    () => document.getElementById('download-all-btn'),
  dropZone:          () => document.getElementById('drop-zone'),
  fileList:          () => document.getElementById('file-list'),
  fileCount:         () => document.getElementById('file-count'),
  emptyState:        () => document.getElementById('empty-state'),
  workArea:          () => document.getElementById('work-area'),
  currentFilename:   () => document.getElementById('current-filename'),
  markBadge:         () => document.getElementById('mark-badge'),
  downloadSingleBtn: () => document.getElementById('download-single-btn'),

  // PDF Canvas
  pdfCanvas:         () => document.getElementById('pdf-canvas'),
  canvasLoading:     () => document.getElementById('canvas-loading'),
  prevPageBtn:       () => document.getElementById('prev-page-btn'),
  nextPageBtn:       () => document.getElementById('next-page-btn'),
  pageCounter:       () => document.getElementById('page-counter'),

  // Modules
  moduleRename:      () => document.getElementById('module-rename'),
  moduleViewer:      () => document.getElementById('module-viewer'),
  moduleEditor:      () => document.getElementById('module-editor'),

  // Rename
  renamePreviewName: () => document.getElementById('rename-preview-name'),
  anoSelect:         () => document.getElementById('ano-select'),
  chkExtra:          () => document.getElementById('chk-extra'),
  chkVariation:      () => document.getElementById('chk-variation'),
  variationSelect:   () => document.getElementById('variation-select'),
  renameApplyBtn:    () => document.getElementById('rename-apply-btn'),
  renameSkipBtn:     () => document.getElementById('rename-skip-btn'),
  renameQuarantineBtn:() => document.getElementById('rename-quarantine-btn'),
  renameProgress:    () => document.getElementById('rename-progress'),

  // Viewer
  chkMark:           () => document.getElementById('chk-mark'),
  markedItemsList:   () => document.getElementById('marked-items-list'),
  prevFileBtn:       () => document.getElementById('prev-file-btn'),
  nextFileBtn:       () => document.getElementById('next-file-btn'),
  saveMarksBtn:      () => document.getElementById('save-marks-btn'),
  viewerProgress:    () => document.getElementById('viewer-progress'),

  // Editor
  deletePagesInput:  () => document.getElementById('delete-pages-input'),
  deletePagesBtn:    () => document.getElementById('delete-pages-btn'),
  splitRowsContainer:() => document.getElementById('split-rows-container'),
  addSplitRowBtn:    () => document.getElementById('add-split-row-btn'),
  executeSplitBtn:   () => document.getElementById('execute-split-btn'),
  editorProgress:    () => document.getElementById('editor-progress'),

  // Modal
  dupModal:          () => document.getElementById('dup-modal'),
  dupTableBody:      () => document.getElementById('dup-table-body'),
  dupDismissBtn:     () => document.getElementById('dup-dismiss-btn'),

  // Toast
  toastContainer:    () => document.getElementById('toast-container'),
};

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.textContent = `${icon} ${message}`;
  dom.toastContainer().appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

// ============================================================
// FILE MANAGEMENT
// ============================================================

/**
 * Adds new PDF files to state, detecting duplicates via SHA-256 hash.
 * @param {FileList|File[]} fileList
 */
async function addFiles(fileList) {
  const incoming = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.pdf'));
  if (!incoming.length) {
    showToast('No se encontraron archivos PDF.', 'error');
    return;
  }

  // Read all files as ArrayBuffers and compute hashes
  const toAdd = [];
  const hashMap = new Map(); // hash -> existing file name (already in state)

  // Build hash map of already-loaded files
  for (const existing of state.files) {
    const h = await computeHash(existing.originalBytes);
    hashMap.set(h, existing.name);
  }

  const duplicates = [];

  for (const file of incoming) {
    const bytes = await file.arrayBuffer();
    const hash = await computeHash(bytes);

    if (hashMap.has(hash)) {
      duplicates.push({ dup: file.name, orig: hashMap.get(hash) });
    } else {
      hashMap.set(hash, file.name);
      toAdd.push({ name: file.name, originalBytes: bytes, modifiedBytes: null, marked: false });
    }
  }

  state.files.push(...toAdd);
  renderFileList();
  updateFileCount();

  if (state.currentIndex === -1 && state.files.length > 0) {
    selectFile(0);
  }

  if (toAdd.length > 0) {
    showToast(`${toAdd.length} archivo(s) cargado(s).`, 'success');
  }

  if (duplicates.length > 0) {
    showDuplicatesModal(duplicates);
  }

  dom.downloadAllBtn().style.display = state.files.length > 0 ? 'inline-flex' : 'none';
}

/**
 * Computes SHA-256 hash of an ArrayBuffer, returned as hex string.
 * @param {ArrayBuffer} buffer
 */
async function computeHash(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function updateFileCount() {
  dom.fileCount().textContent = state.files.length;
  // Toggle drop zone visibility
  const show = state.files.length === 0;
  dom.dropZone().classList.toggle('visible', show);
}

function renderFileList() {
  const list = dom.fileList();
  list.innerHTML = '';

  state.files.forEach((file, idx) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.dataset.index = idx;
    if (idx === state.currentIndex) li.classList.add('active');
    if (file.marked) li.classList.add('marked');
    if (file.modifiedBytes) li.classList.add('modified');

    li.innerHTML = `
      <span class="file-item-icon">📄</span>
      <span class="file-item-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
      <span class="file-item-mark" title="Marcado">📌</span>
      <span class="file-item-modified" title="Modificado"></span>
    `;

    li.addEventListener('click', () => selectFile(idx));
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// FILE SELECTION
// ============================================================
async function selectFile(index) {
  if (index < 0 || index >= state.files.length) return;

  state.currentIndex = index;
  state.currentPage = 0;

  // Update UI visibility
  dom.emptyState().style.display = 'none';
  dom.workArea().style.display = 'flex';

  const file = state.files[index];
  dom.currentFilename().textContent = file.name;

  // Mark badge
  dom.markBadge().style.display = file.marked ? 'inline-flex' : 'none';

  // Sync viewer mark checkbox
  dom.chkMark().checked = file.marked;

  // Render file list (highlight active)
  renderFileList();

  // Update progress labels
  updateProgress();

  // Render preview
  await loadPdfForViewing(file.modifiedBytes || file.originalBytes);

  // Update rename preview
  updateRenamePreview();
}

async function loadPdfForViewing(bytes) {
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

async function renderPage() {
  if (!state.pdfJsDoc) return;

  dom.canvasLoading().style.display = 'flex';

  try {
    if (state.renderTask) {
      state.renderTask.cancel();
    }

    const page = await state.pdfJsDoc.getPage(state.currentPage + 1);
    const canvas = dom.pdfCanvas();
    const ctx = canvas.getContext('2d');

    // Scale to fill viewer panel width
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

    // Update navigation
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

function updateProgress() {
  const total = state.files.length;
  const idx = state.currentIndex;
  const text = total > 0 ? `Archivo ${idx + 1} de ${total}` : '';
  dom.renameProgress().textContent = text;
  dom.viewerProgress().textContent = text;
}

// ============================================================
// PAGE NAVIGATION
// ============================================================
async function prevPage() {
  if (state.currentPage > 0) {
    state.currentPage--;
    await renderPage();
  }
}

async function nextPage() {
  if (state.currentPage < state.totalPages - 1) {
    state.currentPage++;
    await renderPage();
  }
}

// ============================================================
// MODULE SWITCHING
// ============================================================
function switchModule(name) {
  state.activeModule = name;

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.module === name);
  });

  // Module panes
  ['rename', 'viewer', 'editor'].forEach(m => {
    const pane = document.getElementById(`module-${m}`);
    pane.classList.toggle('active', m === name);
  });
}

// ============================================================
// MODULE 1: RENAME
// ============================================================
function buildYearDropdown() {
  const select = dom.anoSelect();
  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 1; y >= 2015; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    select.appendChild(opt);
  }
}

function buildRenamePreviewName() {
  const tipo = document.querySelector('input[name="tipo"]:checked')?.value || 'P1';
  const semestre = document.querySelector('input[name="semestre"]:checked')?.value || 'IS';
  const ano = dom.anoSelect().value;
  const doc = document.querySelector('input[name="doc"]:checked')?.value || 'E';
  const extra = dom.chkExtra().checked ? '_E' : '';
  const variation = dom.chkVariation().checked ? `_${dom.variationSelect().value}` : '';

  // Build type prefix
  let prefix = tipo;
  // e.g. P1 -> P1, RP -> RP, S -> S
  return `${prefix}_${semestre}_${ano}_${doc}${extra}${variation}.pdf`;
}

function updateRenamePreview() {
  dom.renamePreviewName().textContent = buildRenamePreviewName();
}

function applyRename() {
  if (state.currentIndex < 0 || state.currentIndex >= state.files.length) return;

  const newName = buildRenamePreviewName();
  const file = state.files[state.currentIndex];

  // Check collision
  const collision = state.files.some((f, i) => i !== state.currentIndex && f.name === newName);
  if (collision) {
    showToast(`Ya existe un archivo con el nombre "${newName}"`, 'error');
    return;
  }

  file.name = newName;
  showToast(`Renombrado a: ${newName}`, 'success');

  // Reset extras for next file
  dom.chkExtra().checked = false;
  dom.chkVariation().checked = false;
  dom.variationSelect().disabled = true;

  goToNextFile();
}

function quarantineFile() {
  if (state.currentIndex < 0 || state.currentIndex >= state.files.length) return;
  const name = state.files[state.currentIndex].name;
  state.files.splice(state.currentIndex, 1);
  showToast(`"${name}" movido a cuarentena (eliminado de la sesión).`, 'info');

  if (state.files.length === 0) {
    state.currentIndex = -1;
    dom.workArea().style.display = 'none';
    dom.emptyState().style.display = 'flex';
    updateFileCount();
    renderFileList();
    return;
  }

  if (state.currentIndex >= state.files.length) {
    state.currentIndex = state.files.length - 1;
  }

  updateFileCount();
  renderFileList();
  selectFile(state.currentIndex);
}

function skipFile() {
  goToNextFile();
}

function goToNextFile() {
  if (state.files.length === 0) return;
  const next = state.currentIndex + 1;
  if (next < state.files.length) {
    selectFile(next);
  } else {
    showToast('¡Todos los archivos han sido procesados!', 'success');
    renderFileList();
    updateProgress();
  }
}

// ============================================================
// MODULE 2: VIEWER & MARKER
// ============================================================
function toggleMark(checked) {
  if (state.currentIndex < 0) return;
  const file = state.files[state.currentIndex];
  file.marked = checked;

  if (checked) {
    state.markedSet.add(state.currentIndex);
  } else {
    state.markedSet.delete(state.currentIndex);
  }

  dom.markBadge().style.display = checked ? 'inline-flex' : 'none';
  renderFileList();
  renderMarkedList();
}

function renderMarkedList() {
  const list = dom.markedItemsList();
  list.innerHTML = '';
  state.files.forEach((f, i) => {
    if (!f.marked) return;
    const li = document.createElement('li');
    li.textContent = f.name;
    li.title = f.name;
    list.appendChild(li);
  });
}

function saveMarks() {
  const marked = state.files.filter(f => f.marked).map(f => f.name);
  if (marked.length === 0) {
    showToast('No hay documentos marcados.', 'info');
    return;
  }
  const content = marked.join('\n');
  triggerDownload(new Blob([content], { type: 'text/plain' }), 'marked_pdfs.txt');
  showToast(`Lista de ${marked.length} marcas guardada.`, 'success');
}

function prevFile() {
  if (state.currentIndex > 0) {
    selectFile(state.currentIndex - 1);
  }
}

function nextFile() {
  if (state.currentIndex < state.files.length - 1) {
    selectFile(state.currentIndex + 1);
  }
}

// ============================================================
// MODULE 3: VISUAL EDITOR (Delete / Split)
// ============================================================

// ---- Split rows ----
let splitRowCounter = 0;
const splitRows = []; // { id, inputEl }

function addSplitRow() {
  splitRowCounter++;
  const id = splitRowCounter;
  const container = dom.splitRowsContainer();

  const row = document.createElement('div');
  row.className = 'split-row';
  row.dataset.rowId = id;

  const label = document.createElement('span');
  label.className = 'split-row-label';
  label.textContent = `Doc ${splitRows.length + 1}:`;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-input';
  input.placeholder = 'Ej: 1-3';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'split-row-remove';
  removeBtn.textContent = '✕';
  removeBtn.title = 'Eliminar corte';
  removeBtn.addEventListener('click', () => {
    if (splitRows.length <= 1) {
      showToast('Debe haber al menos un corte.', 'info');
      return;
    }
    row.remove();
    const idx = splitRows.findIndex(r => r.id === id);
    if (idx > -1) splitRows.splice(idx, 1);
    reindexSplitRows();
  });

  row.appendChild(label);
  row.appendChild(input);
  row.appendChild(removeBtn);
  container.appendChild(row);

  splitRows.push({ id, inputEl: input, rowEl: row });
}

function reindexSplitRows() {
  splitRows.forEach((r, i) => {
    const label = r.rowEl.querySelector('.split-row-label');
    if (label) label.textContent = `Doc ${i + 1}:`;
  });
}

async function executeDeletePages() {
  if (state.currentIndex < 0) {
    showToast('Selecciona un archivo primero.', 'error'); return;
  }

  const raw = dom.deletePagesInput().value.trim();
  if (!raw) { showToast('Indica las páginas a eliminar.', 'error'); return; }

  const pageNums = raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  if (!pageNums.length) { showToast('Formato inválido. Usa: 1,3,5', 'error'); return; }

  const file = state.files[state.currentIndex];
  const sourceBytes = file.modifiedBytes || file.originalBytes;
  const totalPgs = state.totalPages;

  const invalid = pageNums.filter(n => n < 1 || n > totalPgs);
  if (invalid.length) {
    showToast(`Páginas fuera de rango: ${invalid.join(', ')} (total: ${totalPgs})`, 'error');
    return;
  }

  dom.editorProgress().textContent = 'Procesando…';
  try {
    const pdfDoc = await PDFLib.PDFDocument.load(sourceBytes);
    // Delete in reverse order to keep indices stable
    const indices = pageNums.map(n => n - 1).sort((a, b) => b - a);
    for (const i of indices) {
      pdfDoc.removePage(i);
    }
    const newBytes = await pdfDoc.save();
    file.modifiedBytes = newBytes.buffer;

    // Mark as modified in sidebar
    renderFileList();
    // Reload viewer
    await loadPdfForViewing(file.modifiedBytes);

    dom.deletePagesInput().value = '';
    dom.editorProgress().textContent = '';
    showToast(`${pageNums.length} página(s) eliminada(s).`, 'success');
  } catch (e) {
    dom.editorProgress().textContent = '';
    showToast(`Error al eliminar páginas: ${e.message}`, 'error');
  }
}

async function executeMultiSplit() {
  if (state.currentIndex < 0) {
    showToast('Selecciona un archivo primero.', 'error'); return;
  }

  if (splitRows.length === 0) {
    showToast('Añade al menos un rango de corte.', 'error'); return;
  }

  const file = state.files[state.currentIndex];
  const sourceBytes = file.modifiedBytes || file.originalBytes;
  const totalPgs = state.totalPages;

  const parsed = [];
  for (let i = 0; i < splitRows.length; i++) {
    const raw = splitRows[i].inputEl.value.trim();
    if (!raw) continue;

    if (!raw.includes('-')) {
      showToast(`Doc ${i+1}: formato inválido. Usa: 1-3`, 'error'); return;
    }

    const parts = raw.split('-');
    const start = parseInt(parts[0].trim(), 10);
    const end   = parseInt(parts[1].trim(), 10);

    if (isNaN(start) || isNaN(end) || start < 1 || end < start || end > totalPgs) {
      showToast(`Doc ${i+1}: rango inválido "${raw}" (total: ${totalPgs} págs.)`, 'error');
      return;
    }

    parsed.push({ start: start - 1, end: end - 1, docNum: i + 1 });
  }

  if (parsed.length === 0) {
    showToast('Configura al menos un rango de corte.', 'error'); return;
  }

  dom.editorProgress().textContent = 'Dividiendo…';
  try {
    const sourcePdf = await PDFLib.PDFDocument.load(sourceBytes);
    const baseName = file.name.replace(/\.pdf$/i, '');

    for (const { start, end, docNum } of parsed) {
      const newDoc = await PDFLib.PDFDocument.create();
      const copiedPages = await newDoc.copyPages(sourcePdf, range(start, end));
      copiedPages.forEach(p => newDoc.addPage(p));
      const bytes = await newDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      triggerDownload(blob, `${baseName}_parte_${docNum}.pdf`);
    }

    dom.editorProgress().textContent = '';
    showToast(`${parsed.length} subarchivo(s) generado(s) y descargado(s).`, 'success');
  } catch (e) {
    dom.editorProgress().textContent = '';
    showToast(`Error al dividir: ${e.message}`, 'error');
  }
}

/** Returns array [start, start+1, ..., end] */
function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

// ============================================================
// DOWNLOAD HELPERS
// ============================================================
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

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
// DUPLICATES MODAL
// ============================================================
function showDuplicatesModal(duplicates) {
  const tbody = dom.dupTableBody();
  tbody.innerHTML = '';

  duplicates.forEach(({ dup, orig }) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td title="${escapeHtml(dup)}">${escapeHtml(shortenName(dup))}</td>
      <td title="${escapeHtml(orig)}">${escapeHtml(shortenName(orig))}</td>
      <td><span style="color: var(--warning); font-size:11px; font-weight:600;">No cargado</span></td>
    `;
    tbody.appendChild(tr);
  });

  dom.dupModal().style.display = 'flex';
}

function shortenName(name, max = 30) {
  if (name.length <= max) return name;
  return name.slice(0, max - 3) + '…';
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
  // Ignore when typing in inputs
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

  switch (e.key) {
    case 'ArrowLeft':  e.preventDefault(); prevPage(); break;
    case 'ArrowRight': e.preventDefault(); nextPage(); break;
    case 'ArrowUp':    e.preventDefault(); prevFile(); break;
    case 'ArrowDown':  e.preventDefault(); nextFile(); break;
  }
});

// ============================================================
// EVENT WIRING
// ============================================================
function wireEvents() {
  // File upload via button
  dom.fileInput().addEventListener('change', e => addFiles(e.target.files));

  // Drag and drop on entire body
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

  // Clicking the drop zone also triggers file input
  dom.dropZone().addEventListener('click', () => dom.fileInput().click());

  // Download all
  dom.downloadAllBtn().addEventListener('click', downloadAllAsZip);

  // Download single
  dom.downloadSingleBtn().addEventListener('click', downloadCurrentFile);

  // Page navigation
  dom.prevPageBtn().addEventListener('click', prevPage);
  dom.nextPageBtn().addEventListener('click', nextPage);

  // Module tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchModule(btn.dataset.module));
  });

  // ---- RENAME MODULE ----
  // Live preview on any form change
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

  // ---- VIEWER MODULE ----
  dom.chkMark().addEventListener('change', e => toggleMark(e.target.checked));
  dom.prevFileBtn().addEventListener('click', prevFile);
  dom.nextFileBtn().addEventListener('click', nextFile);
  dom.saveMarksBtn().addEventListener('click', saveMarks);

  // ---- EDITOR MODULE ----
  dom.deletePagesBtn().addEventListener('click', executeDeletePages);
  dom.addSplitRowBtn().addEventListener('click', addSplitRow);
  dom.executeSplitBtn().addEventListener('click', executeMultiSplit);

  // Duplicate modal dismiss
  dom.dupDismissBtn().addEventListener('click', () => {
    dom.dupModal().style.display = 'none';
  });
  dom.dupModal().addEventListener('click', e => {
    if (e.target === dom.dupModal()) dom.dupModal().style.display = 'none';
  });
}

// ============================================================
// INITIALISATION
// ============================================================
function init() {
  buildYearDropdown();
  updateRenamePreview();
  updateFileCount();

  // Add two default split rows
  addSplitRow();
  addSplitRow();

  wireEvents();

  // Show drop zone initially
  dom.dropZone().classList.add('visible');
}

document.addEventListener('DOMContentLoaded', init);

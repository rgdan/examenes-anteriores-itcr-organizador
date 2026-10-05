import { state } from '../services/state.js';
import { dom } from '../constants.js';
import { range, triggerDownload } from '../utils.js';
import { showToast } from '../components/toast.js';
import { renderFileList } from './render-sidebar.js';
import { loadPdfForViewing } from '../components/pdf-viewer.js';

let splitRowCounter = 0;
export const splitRows = [];

export function addSplitRow() {
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
  input.placeholder = 'Rango';

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

export function reindexSplitRows() {
  splitRows.forEach((r, i) => {
    const label = r.rowEl.querySelector('.split-row-label');
    if (label) label.textContent = `Doc ${i + 1}:`;
  });
}

export async function executeDeletePages() {
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
    const indices = pageNums.map(n => n - 1).sort((a, b) => b - a);
    for (const i of indices) {
      pdfDoc.removePage(i);
    }
    const newBytes = await pdfDoc.save();
    file.modifiedBytes = newBytes.buffer;

    renderFileList();
    await loadPdfForViewing(file.modifiedBytes);

    dom.deletePagesInput().value = '';
    dom.editorProgress().textContent = '';
    showToast(`${pageNums.length} página(s) eliminada(s).`, 'success');
  } catch (e) {
    dom.editorProgress().textContent = '';
    showToast(`Error al eliminar páginas: ${e.message}`, 'error');
  }
}

export async function executeReorderPages() {
  if (state.currentIndex < 0) {
    showToast('Selecciona un archivo primero.', 'error'); return;
  }

  const raw = dom.reorderPagesInput().value.trim();
  if (!raw) { showToast('Indica el nuevo orden de las páginas.', 'error'); return; }

  const pageNums = raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  if (!pageNums.length) { showToast('Formato inválido. Usa: 3,1,2', 'error'); return; }

  const file = state.files[state.currentIndex];
  const sourceBytes = file.modifiedBytes || file.originalBytes;
  const totalPgs = state.totalPages;

  const invalid = pageNums.filter(n => n < 1 || n > totalPgs);
  if (invalid.length) {
    showToast(`Páginas fuera de rango: ${invalid.join(', ')} (total: ${totalPgs})`, 'error');
    return;
  }

  const unique = new Set(pageNums);
  if (unique.size !== pageNums.length) {
    showToast('Hay páginas duplicadas en la lista.', 'error');
    return;
  }

  // Auto-append missing pages
  for (let i = 1; i <= totalPgs; i++) {
    if (!unique.has(i)) {
      pageNums.push(i);
    }
  }

  dom.editorProgress().textContent = 'Reordenando…';
  try {
    const sourcePdf = await PDFLib.PDFDocument.load(sourceBytes);
    const newDoc = await PDFLib.PDFDocument.create();
    
    const indices = pageNums.map(n => n - 1);
    const copiedPages = await newDoc.copyPages(sourcePdf, indices);
    copiedPages.forEach(p => newDoc.addPage(p));
    
    const newBytes = await newDoc.save();
    file.modifiedBytes = newBytes.buffer;

    renderFileList();
    await loadPdfForViewing(file.modifiedBytes);

    dom.reorderPagesInput().value = '';
    dom.editorProgress().textContent = '';
    showToast('Páginas reordenadas con éxito.', 'success');
  } catch (e) {
    dom.editorProgress().textContent = '';
    showToast(`Error al reordenar páginas: ${e.message}`, 'error');
  }
}

export async function executeMovePage() {
  if (state.currentIndex < 0) {
    showToast('Selecciona un archivo primero.', 'error'); return;
  }

  const fromRaw = dom.movePageFrom().value.trim();
  const toRaw = dom.movePageTo().value.trim();

  if (!fromRaw || !toRaw) {
    showToast('Indica la página de origen y el destino.', 'error'); return;
  }

  const from = parseInt(fromRaw, 10);
  const to = parseInt(toRaw, 10);

  const file = state.files[state.currentIndex];
  const sourceBytes = file.modifiedBytes || file.originalBytes;
  const totalPgs = state.totalPages;

  if (isNaN(from) || isNaN(to) || from < 1 || from > totalPgs || to < 1 || to > totalPgs) {
    showToast(`Las páginas deben estar entre 1 y ${totalPgs}.`, 'error');
    return;
  }
  
  if (from === to) {
    showToast('La página de origen y destino son la misma.', 'info');
    return;
  }

  dom.editorProgress().textContent = 'Moviendo…';
  try {
    const sourcePdf = await PDFLib.PDFDocument.load(sourceBytes);
    const newDoc = await PDFLib.PDFDocument.create();
    
    const indices = [];
    for (let i = 1; i <= totalPgs; i++) {
      if (i === from) continue;
      indices.push(i - 1);
    }
    indices.splice(to - 1, 0, from - 1);

    const copiedPages = await newDoc.copyPages(sourcePdf, indices);
    copiedPages.forEach(p => newDoc.addPage(p));
    
    const newBytes = await newDoc.save();
    file.modifiedBytes = newBytes.buffer;

    renderFileList();
    await loadPdfForViewing(file.modifiedBytes);

    dom.movePageFrom().value = '';
    dom.movePageTo().value = '';
    dom.editorProgress().textContent = '';
    showToast(`Página ${from} movida a la posición ${to}.`, 'success');
  } catch (e) {
    dom.editorProgress().textContent = '';
    showToast(`Error al mover página: ${e.message}`, 'error');
  }
}

export async function executeMultiSplit() {
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

import { state } from '../services/state.js';
import { dom } from '../constants.js';
import { showToast } from '../components/toast.js';
import { selectFile, renderFileList, updateFileCount, updateProgress } from './render-sidebar.js';

export function buildYearDropdown() {
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

export function buildRenamePreviewName() {
  const tipo = document.querySelector('input[name="tipo"]:checked')?.value || 'P1';
  const semestre = document.querySelector('input[name="semestre"]:checked')?.value || 'IS';
  const ano = dom.anoSelect().value;
  const doc = document.querySelector('input[name="doc"]:checked')?.value || 'E';
  const extra = dom.chkExtra().checked ? '_E' : '';
  const variation = dom.chkVariation().checked ? `_${dom.variationSelect().value}` : '';

  return `${tipo}_${semestre}_${ano}_${doc}${extra}${variation}.pdf`;
}

export function updateRenamePreview() {
  dom.renamePreviewName().textContent = buildRenamePreviewName();
}

export function applyRename() {
  if (state.currentIndex < 0 || state.currentIndex >= state.files.length) return;

  const newName = buildRenamePreviewName();
  const file = state.files[state.currentIndex];

  const collision = state.files.some((f, i) => i !== state.currentIndex && f.name === newName);
  if (collision) {
    showToast(`Ya existe un archivo con el nombre "${newName}"`, 'error');
    return;
  }

  file.name = newName;
  showToast(`Renombrado a: ${newName}`, 'success');

  dom.chkExtra().checked = false;
  dom.chkVariation().checked = false;
  dom.variationSelect().disabled = true;

  goToNextFile();
}

export function deleteFile() {
  if (state.currentIndex < 0 || state.currentIndex >= state.files.length) return;
  const name = state.files[state.currentIndex].name;
  state.files.splice(state.currentIndex, 1);
  showToast(`"${name}" eliminado de la sesión.`, 'info');

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

export function goToNextFile() {
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

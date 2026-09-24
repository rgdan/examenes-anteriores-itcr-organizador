import { state } from '../services/state.js';
import { dom } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { loadPdfForViewing } from '../components/pdf-viewer.js';
import { updateRenamePreview } from '../views/render-rename.js';

export function updateFileCount() {
  dom.fileCount().textContent = state.files.length;
  const show = state.files.length === 0;
  dom.dropZone().classList.toggle('visible', show);
}

export function renderFileList() {
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

export async function selectFile(index) {
  if (index < 0 || index >= state.files.length) return;

  state.currentIndex = index;
  state.currentPage = 0;

  dom.emptyState().style.display = 'none';
  dom.workArea().style.display = 'flex';

  const file = state.files[index];
  dom.currentFilename().textContent = file.name;
  dom.markBadge().style.display = file.marked ? 'inline-flex' : 'none';
  dom.chkMark().checked = file.marked;

  renderFileList();
  updateProgress();
  await loadPdfForViewing(file.modifiedBytes || file.originalBytes);
  updateRenamePreview();
}

export function updateProgress() {
  const total = state.files.length;
  const idx = state.currentIndex;
  const text = total > 0 ? `Archivo ${idx + 1} de ${total}` : '';
  dom.renameProgress().textContent = text;
  dom.viewerProgress().textContent = text;
}

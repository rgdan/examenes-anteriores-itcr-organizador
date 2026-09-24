import { state } from '../services/state.js';
import { dom } from '../constants.js';
import { triggerDownload } from '../utils.js';
import { showToast } from '../components/toast.js';
import { selectFile, renderFileList } from './render-sidebar.js';

export function toggleMark(checked) {
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

export function renderMarkedList() {
  const list = dom.markedItemsList();
  list.innerHTML = '';
  state.files.forEach((f) => {
    if (!f.marked) return;
    const li = document.createElement('li');
    li.textContent = f.name;
    li.title = f.name;
    list.appendChild(li);
  });
}

export function saveMarks() {
  const marked = state.files.filter(f => f.marked).map(f => f.name);
  if (marked.length === 0) {
    showToast('No hay documentos marcados.', 'info');
    return;
  }
  const content = marked.join('\n');
  triggerDownload(new Blob([content], { type: 'text/plain' }), 'marked_pdfs.txt');
  showToast(`Lista de ${marked.length} marcas guardada.`, 'success');
}

export function prevFile() {
  if (state.currentIndex > 0) {
    selectFile(state.currentIndex - 1);
  }
}

export function nextFile() {
  if (state.currentIndex < state.files.length - 1) {
    selectFile(state.currentIndex + 1);
  }
}
